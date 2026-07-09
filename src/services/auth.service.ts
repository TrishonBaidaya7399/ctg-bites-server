import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/config/env";
import { RefreshToken } from "@/models/RefreshToken";
import type { Role } from "@/models/User";
import type { Types } from "mongoose";

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Verifies a Google Identity Services ID token (signature, audience, expiry) and
// extracts the profile fields we need to find-or-create a User. Throws if Google
// Sign-In isn't configured (no GOOGLE_CLIENT_ID) or the token is invalid.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured on this server.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google token payload.");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    avatarUrl: payload.picture,
  };
}

interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = { sub: userId, role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function msFromDuration(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
  return value * unitMs;
}

export async function issueRefreshToken(userId: string | Types.ObjectId): Promise<string> {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + msFromDuration(env.JWT_REFRESH_EXPIRES_IN));

  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(rawToken),
    expiresAt,
  });

  return rawToken;
}

export async function rotateRefreshToken(rawToken: string): Promise<{ userId: string; newRawToken: string } | null> {
  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }

  const newRawToken = crypto.randomBytes(48).toString("hex");
  const newExpiresAt = new Date(Date.now() + msFromDuration(env.JWT_REFRESH_EXPIRES_IN));

  const newToken = await RefreshToken.create({
    user: existing.user,
    tokenHash: hashToken(newRawToken),
    expiresAt: newExpiresAt,
  });

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newToken.tokenHash;
  await existing.save();

  return { userId: existing.user.toString(), newRawToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
}
