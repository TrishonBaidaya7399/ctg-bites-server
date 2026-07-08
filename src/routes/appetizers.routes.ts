import { Router } from "express";
import * as appetizersController from "@/controllers/appetizers.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", appetizersController.listAppetizers);
router.get("/:id", appetizersController.getAppetizer);
router.post("/", requireAuth, requireRole("owner", "manager"), appetizersController.createAppetizer);
router.patch("/:id", requireAuth, requireRole("owner", "manager"), appetizersController.updateAppetizer);
router.patch(
  "/:id/availability",
  requireAuth,
  requireRole("owner", "manager", "staff"),
  appetizersController.updateAvailability
);
router.delete("/:id", requireAuth, requireRole("owner", "manager"), appetizersController.deleteAppetizer);

export default router;
