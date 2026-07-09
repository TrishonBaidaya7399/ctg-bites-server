import { Router } from "express";
import * as appetizersController from "@/controllers/appetizers.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", appetizersController.listAppetizers);
router.get("/:id", appetizersController.getAppetizer);
router.post("/", requireAuth, requirePermission("appetizers:write"), appetizersController.createAppetizer);
router.patch("/:id", requireAuth, requirePermission("appetizers:write"), appetizersController.updateAppetizer);
router.patch(
  "/:id/availability",
  requireAuth,
  requirePermission("appetizers:availability"),
  appetizersController.updateAvailability
);
router.delete("/:id", requireAuth, requirePermission("appetizers:write"), appetizersController.deleteAppetizer);

export default router;
