import { Router } from "express";
import * as rolesController from "@/controllers/roles.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

// Editing what each role can do is owner-only, non-negotiable — this is the one
// checkpoint that must never itself be made permission-gated, or a role could grant
// itself more access.
router.use(requireAuth, requireRole("owner"));

router.get("/permission-keys", rolesController.listPermissionKeys);
router.get("/permissions", rolesController.getRolePermissionMatrix);
router.patch("/:role/permissions", rolesController.updateRolePermissions);

export default router;
