import { Router } from "express";
import * as usersController from "@/controllers/users.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth, requirePermission("users:manage"));

router.get("/", usersController.listUsers);
router.post("/", usersController.createUser);
router.patch("/:id", usersController.updateUser);
router.patch("/:id/deactivate", usersController.deactivateUser);
router.delete("/:id", requirePermission("users:delete"), usersController.deleteUser);

export default router;
