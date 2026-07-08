import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, ROLES, type Role } from "@/models/User";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";

const STAFF_ROLES: Role[] = ["owner", "manager", "staff", "rider"];
const MANAGER_CREATABLE_ROLES: Role[] = ["staff", "rider"];

function assertManagerCanTarget(actorRole: Role, targetRole: Role): void {
  if (actorRole === "owner") return;
  if (actorRole === "manager" && MANAGER_CREATABLE_ROLES.includes(targetRole)) return;
  throw new AppError("Insufficient permissions to manage this role.", 403);
}

function toPublicUser(user: { _id: unknown; name: string; email: string; role: string; phone?: string; isActive: boolean }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
  };
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(ROLES).optional(),
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const actorRole = req.user!.role;
  const filter: Record<string, unknown> = { role: { $in: STAFF_ROLES } };

  if (actorRole === "manager") {
    filter.role = { $in: MANAGER_CREATABLE_ROLES };
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users: users.map(toPublicUser) });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const body = createUserSchema.parse(req.body);
  assertManagerCanTarget(req.user!.role, body.role);

  const existing = await User.findOne({ email: body.email.toLowerCase() });
  if (existing) throw new AppError("An account with this email already exists.", 409);

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await User.create({
    name: body.name,
    email: body.email.toLowerCase(),
    passwordHash,
    role: body.role,
    phone: body.phone,
    createdBy: req.user!.id,
  });

  res.status(201).json({ user: toPublicUser(user) });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const body = updateUserSchema.parse(req.body);
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError("User not found", 404);

  assertManagerCanTarget(req.user!.role, target.role);
  if (body.role) assertManagerCanTarget(req.user!.role, body.role);

  Object.assign(target, body);
  await target.save();

  res.json({ user: toPublicUser(target) });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new AppError("User not found", 404);

  assertManagerCanTarget(req.user!.role, target.role);

  target.isActive = !target.isActive;
  await target.save();

  res.json({ user: toPublicUser(target) });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const target = await User.findByIdAndDelete(req.params.id);
  if (!target) throw new AppError("User not found", 404);
  res.status(204).send();
});
