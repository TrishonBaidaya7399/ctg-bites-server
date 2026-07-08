import { Router } from "express";
import * as usersController from "@/controllers/users.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth, requireRole("owner", "manager"));

router.get("/", usersController.listUsers);
router.post("/", usersController.createUser);
router.patch("/:id", usersController.updateUser);
router.patch("/:id/deactivate", usersController.deactivateUser);
router.delete("/:id", requireRole("owner"), usersController.deleteUser);

export default router;
