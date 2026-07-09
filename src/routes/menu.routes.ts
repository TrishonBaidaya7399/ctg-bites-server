import { Router } from "express";
import * as menuController from "@/controllers/menu.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", menuController.listMenuItems);
router.get("/:id", menuController.getMenuItem);
router.post("/", requireAuth, requirePermission("menu:write"), menuController.createMenuItem);
router.patch("/:id", requireAuth, requirePermission("menu:write"), menuController.updateMenuItem);
router.patch(
  "/:id/availability",
  requireAuth,
  requirePermission("menu:availability"),
  menuController.updateAvailability
);
router.delete("/:id", requireAuth, requirePermission("menu:write"), menuController.deleteMenuItem);

export default router;
