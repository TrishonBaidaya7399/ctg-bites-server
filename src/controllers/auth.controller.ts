import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "@/models/User";
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from "@/services/auth.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/services/email.service";
import { env } from "@/config/env";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: { _id: unknown; name: string; email: string; role: string }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email.toLowerCase() });
  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await User.create({
    name: body.name,
    email: body.email.toLowerCase(),
    passwordHash,
    phone: body.phone,
    role: "customer",
  });

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = await issueRefreshToken(user._id);

  sendWelcomeEmail(user.email, user.name).catch((err) =>
    console.error("[email] welcome email failed:", err)
  );

  res.status(201).json({ accessToken, refreshToken, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({ email: body.email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password.", 401);
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password.", 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = await issueRefreshToken(user._id);

  res.json({ accessToken, refreshToken, user: toPublicUser(user) });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const user = await User.findById(rotated.userId);
  if (!user || !user.isActive) {
    throw new AppError("Account not found or inactive.", 401);
  }

  const accessToken = signAccessToken(String(user._id), user.role);

  res.json({ accessToken, refreshToken: rotated.newRawToken, user: toPublicUser(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ user: toPublicUser(user) });
});

export const socketToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  const accessToken = signAccessToken(req.user.id, req.user.role);
  res.json({ token: accessToken });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const resetToken = jwt.sign({ sub: String(user._id) }, env.JWT_ACCESS_SECRET, { expiresIn: "30m" });
    const resetUrl = `${req.headers.origin ?? env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    sendPasswordResetEmail(user.email, user.name, resetUrl).catch((err) =>
      console.error("[email] password reset email failed:", err)
    );
  }

  res.json({ message: "If an account exists for that email, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = z
    .object({ token: z.string().min(1), password: z.string().min(6) })
    .parse(req.body);

  let payload: { sub: string };
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
  } catch {
    throw new AppError("Invalid or expired reset token.", 400);
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError("Invalid or expired reset token.", 400);

  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();

  res.json({ message: "Password reset successfully." });
});
