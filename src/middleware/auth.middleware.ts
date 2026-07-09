import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "@/services/auth.service";
import { roleHasPermission } from "@/services/permissions.service";
import { AppError } from "@/utils/appError";
import type { Role } from "@/models/User";
import type { PermissionKey } from "@/models/RolePermission";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError("Insufficient permissions", 403));
      return;
    }
    next();
  };
}

// Authorizes against the editable RolePermission matrix instead of a hardcoded role
// list. "owner" always passes. Other roles pass only if an owner/manager has granted
// this specific capability via the Permissions page (defaults mirror the original
// requireRole(...) call this replaced — see RolePermission.ts DEFAULT_PERMISSIONS).
export function requirePermission(key: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    try {
      const allowed = await roleHasPermission(req.user.role, key);
      if (!allowed) {
        next(new AppError("Insufficient permissions", 403));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Passes if the actor's role is in `roles` (e.g. "customer", checked structurally —
// customers never hold RolePermission grants) OR they hold the given permission.
// Used for routes shared between a fixed non-staff role and permission-gated staff.
export function requireRoleOrPermission(roles: Role[], key: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    if (roles.includes(req.user.role)) {
      next();
      return;
    }
    try {
      const allowed = await roleHasPermission(req.user.role, key);
      if (!allowed) {
        next(new AppError("Insufficient permissions", 403));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
