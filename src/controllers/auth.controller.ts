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
  verifyGoogleIdToken,
  generateOtp,
  hashOtp,
  OTP_EXPIRES_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
} from "@/services/auth.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { sendPasswordResetEmail, sendWelcomeEmail, sendOtpVerificationEmail } from "@/services/email.service";
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

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
});

async function issueOtp(user: InstanceType<typeof User>): Promise<string> {
  const otp = generateOtp();
  user.otpCodeHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();
  return otp;
}

function toPublicUser(user: { _id: unknown; name: string; email: string; role: string; avatarUrl?: string }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email.toLowerCase() });
  if (existing && existing.emailVerified !== false) {
    throw new AppError("An account with this email already exists.", 409);
  }

  // An unverified account from an abandoned signup isn't a conflict — resume it with
  // the freshly submitted details and send a new code, rather than dead-ending the user.
  const passwordHash = await bcrypt.hash(body.password, 12);
  const user =
    existing ??
    (await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      phone: body.phone,
      role: "customer",
      emailVerified: false,
    }));

  if (existing) {
    user.name = body.name;
    user.passwordHash = passwordHash;
    user.phone = body.phone;
  }

  const otp = await issueOtp(user);
  sendOtpVerificationEmail(user.email, user.name, otp, OTP_EXPIRES_MINUTES).catch((err) =>
    console.error("[email] otp verification email failed:", err)
  );

  // No tokens yet — the account only becomes usable once /verify-otp confirms the code.
  res.status(201).json({ requiresVerification: true, email: user.email });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = verifyOtpSchema.parse(req.body);

  const user = await User.findOne({ email: body.email.toLowerCase() }).select(
    "+otpCodeHash +otpExpiresAt +otpAttempts"
  );
  if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
    throw new AppError("Invalid or expired code. Please request a new one.", 400);
  }
  if (user.emailVerified) {
    throw new AppError("This account is already verified.", 400);
  }
  if (user.otpExpiresAt < new Date()) {
    throw new AppError("This code has expired. Please request a new one.", 400);
  }
  if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw new AppError("Too many incorrect attempts. Please request a new code.", 429);
  }

  if (hashOtp(body.otp) !== user.otpCodeHash) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await user.save();
    throw new AppError("Incorrect code. Please try again.", 400);
  }

  user.emailVerified = true;
  user.otpCodeHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = undefined;
  await user.save();

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = await issueRefreshToken(user._id);

  sendWelcomeEmail(user.email, user.name).catch((err) =>
    console.error("[email] welcome email failed:", err)
  );

  res.json({ accessToken, refreshToken, user: toPublicUser(user) });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = resendOtpSchema.parse(req.body);

  const user = await User.findOne({ email: body.email.toLowerCase() }).select("+otpLastSentAt");
  // Same generic response whether or not the account exists / is already verified —
  // this endpoint is unauthenticated and shouldn't leak which emails have accounts.
  if (user && user.emailVerified !== true) {
    const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS * 1000;
    if (!user.otpLastSentAt || Date.now() - user.otpLastSentAt.getTime() >= cooldownMs) {
      const otp = await issueOtp(user);
      sendOtpVerificationEmail(user.email, user.name, otp, OTP_EXPIRES_MINUTES).catch((err) =>
        console.error("[email] otp verification email failed:", err)
      );
    }
  }

  res.json({ message: "If that account needs verification, a new code has been sent." });
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

  // Strict `=== false` — accounts created before this field existed have it
  // `undefined` and must keep working without ever having seen an OTP screen.
  if (user.emailVerified === false) {
    throw new AppError(
      "Please verify your email before signing in. We can resend the code if you need it.",
      403,
      { code: "EMAIL_NOT_VERIFIED", email: user.email }
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = await issueRefreshToken(user._id);

  res.json({ accessToken, refreshToken, user: toPublicUser(user) });
});

export const google = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : "Invalid Google token.", 401);
  }

  let user = await User.findOne({ googleId: profile.googleId });

  if (!user) {
    // Link to an existing email/password account instead of creating a duplicate.
    user = await User.findOne({ email: profile.email.toLowerCase() });
    if (user) {
      user.googleId = profile.googleId;
      if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      await user.save();
    }
  }

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email.toLowerCase(),
      role: "customer",
      googleId: profile.googleId,
      avatarUrl: profile.avatarUrl,
      emailVerified: true,
    });

    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("[email] welcome email failed:", err)
    );
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated.", 403);
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
