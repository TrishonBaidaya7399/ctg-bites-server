import mongoose, { Schema, Document } from "mongoose";
import type { Role } from "@/models/User";

// One capability key per authorization checkpoint in the app. Keep this list in
// sync with every requirePermission(...) call site in src/routes/*.
export const PERMISSION_KEYS = [
  "menu:write",
  "menu:availability",
  "appetizers:write",
  "appetizers:availability",
  "categories:write",
  "recipes:write",
  "coupons:manage",
  "coupons:delete",
  "orders:view",
  "orders:accept",
  "orders:status",
  "orders:cancel",
  "orders:assign-rider",
  "uploads:write",
  "reports:dashboard",
  "reports:revenue",
  "reports:sales",
  "users:manage",
  "users:delete",
  "reviews:moderate",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

// Roles whose permissions are editable via the Permissions page. "owner" is
// intentionally excluded — it always has every permission, hardcoded, so the
// last owner account can never lock itself out.
export const EDITABLE_ROLES: Exclude<Role, "owner" | "customer">[] = ["manager", "staff", "rider"];

// Default grants mirror the hardcoded requireRole(...) checks that existed
// before this model was introduced, so migrating to permission-based auth
// doesn't change anyone's access until an owner edits it via the UI.
export const DEFAULT_PERMISSIONS: Record<(typeof EDITABLE_ROLES)[number], PermissionKey[]> = {
  manager: [
    "menu:write",
    "menu:availability",
    "appetizers:write",
    "appetizers:availability",
    "categories:write",
    "recipes:write",
    "coupons:manage",
    "orders:view",
    "orders:accept",
    "orders:status",
    "orders:cancel",
    "orders:assign-rider",
    "uploads:write",
    "reports:dashboard",
    "reports:sales",
    "users:manage",
    "reviews:moderate",
  ],
  staff: [
    "menu:availability",
    "appetizers:availability",
    "orders:view",
    "orders:accept",
    "orders:status",
    "orders:cancel",
    "reports:dashboard",
    "reviews:moderate",
  ],
  rider: ["orders:view", "orders:status"],
};

export interface IRolePermission extends Document {
  role: (typeof EDITABLE_ROLES)[number];
  permissions: PermissionKey[];
  updatedAt: Date;
  createdAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    role: { type: String, enum: EDITABLE_ROLES, required: true, unique: true },
    permissions: [{ type: String, enum: PERMISSION_KEYS }],
  },
  { timestamps: true }
);

export const RolePermission =
  mongoose.models.RolePermission || mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);
