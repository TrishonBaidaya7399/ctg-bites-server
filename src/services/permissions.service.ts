import { RolePermission, DEFAULT_PERMISSIONS, EDITABLE_ROLES, type PermissionKey } from "@/models/RolePermission";
import type { Role } from "@/models/User";

type EditableRole = (typeof EDITABLE_ROLES)[number];

// In-process cache — role→permission lookups happen on every gated request, so we
// avoid a DB round trip per request and only refetch after an explicit write.
let cache: Record<EditableRole, PermissionKey[]> | null = null;

async function loadFromDb(): Promise<Record<EditableRole, PermissionKey[]>> {
  const docs = await RolePermission.find({ role: { $in: EDITABLE_ROLES } });
  const byRole = new Map(docs.map((d) => [d.role, d.permissions as PermissionKey[]]));

  const result = {} as Record<EditableRole, PermissionKey[]>;
  for (const role of EDITABLE_ROLES) {
    result[role] = byRole.get(role) ?? DEFAULT_PERMISSIONS[role];
  }
  return result;
}

export async function getAllRolePermissions(): Promise<Record<EditableRole, PermissionKey[]>> {
  if (!cache) cache = await loadFromDb();
  return cache;
}

export async function getRolePermissions(role: Role): Promise<PermissionKey[]> {
  if (role === "owner") return [...(Object.values(DEFAULT_PERMISSIONS).flat() as PermissionKey[])];
  if (!isEditableRole(role)) return [];
  const all = await getAllRolePermissions();
  return all[role];
}

export async function roleHasPermission(role: Role, key: PermissionKey): Promise<boolean> {
  if (role === "owner") return true;
  if (!isEditableRole(role)) return false;
  const perms = await getRolePermissions(role);
  return perms.includes(key);
}

export async function setRolePermissions(role: EditableRole, permissions: PermissionKey[]): Promise<PermissionKey[]> {
  await RolePermission.findOneAndUpdate(
    { role },
    { role, permissions },
    { upsert: true, new: true }
  );
  cache = null; // invalidate — next read repopulates from DB
  return permissions;
}

export async function ensureDefaultsSeeded(): Promise<void> {
  for (const role of EDITABLE_ROLES) {
    const exists = await RolePermission.exists({ role });
    if (!exists) {
      await RolePermission.create({ role, permissions: DEFAULT_PERMISSIONS[role] });
    }
  }
}

function isEditableRole(role: Role): role is EditableRole {
  return (EDITABLE_ROLES as readonly string[]).includes(role);
}
