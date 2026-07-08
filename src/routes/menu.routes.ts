import { Router } from "express";
import * as menuController from "@/controllers/menu.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", menuController.listMenuItems);
router.get("/:id", menuController.getMenuItem);
router.post("/", requireAuth, requireRole("owner", "manager"), menuController.createMenuItem);
router.patch("/:id", requireAuth, requireRole("owner", "manager"), menuController.updateMenuItem);
router.patch(
  "/:id/availability",
  requireAuth,
  requireRole("owner", "manager", "staff"),
  menuController.updateAvailability
);
router.delete("/:id", requireAuth, requireRole("owner", "manager"), menuController.deleteMenuItem);

export default router;
