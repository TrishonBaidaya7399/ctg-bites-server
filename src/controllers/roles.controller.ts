import type { Request, Response } from "express";
import { z } from "zod";
import { PERMISSION_KEYS, EDITABLE_ROLES } from "@/models/RolePermission";
import { getAllRolePermissions, setRolePermissions } from "@/services/permissions.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";

export const listPermissionKeys = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ keys: PERMISSION_KEYS, roles: EDITABLE_ROLES });
});

export const getRolePermissionMatrix = asyncHandler(async (_req: Request, res: Response) => {
  const matrix = await getAllRolePermissions();
  res.json({ permissions: matrix });
});

const updateSchema = z.object({
  permissions: z.array(z.enum(PERMISSION_KEYS)),
});

export const updateRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const role = req.params.role as (typeof EDITABLE_ROLES)[number];
  if (!EDITABLE_ROLES.includes(role)) {
    throw new AppError(`"${req.params.role}" has no editable permissions.`, 400);
  }

  const body = updateSchema.parse(req.body);
  const saved = await setRolePermissions(role, body.permissions);
  res.json({ role, permissions: saved });
});
