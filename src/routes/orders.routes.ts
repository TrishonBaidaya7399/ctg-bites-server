import { Router } from "express";
import * as ordersController from "@/controllers/orders.controller";
import { optionalAuth, requireAuth, requireRole } from "@/middleware/auth.middleware";
import { orderCreateLimiter, orderTrackLimiter } from "@/middleware/rateLimiter";

const router = Router();

router.post("/", orderCreateLimiter, optionalAuth, ordersController.createOrder);
router.get("/track/:orderNumber", orderTrackLimiter, ordersController.trackOrder);
router.get("/mine", requireAuth, requireRole("customer"), ordersController.myOrders);
router.get("/", requireAuth, requireRole("owner", "manager", "staff", "rider"), ordersController.listOrders);
router.get("/:id", requireAuth, ordersController.getOrder);
router.patch("/:id/accept", requireAuth, requireRole("owner", "manager", "staff"), ordersController.accept);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("owner", "manager", "staff", "rider"),
  ordersController.updateStatus
);
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("owner", "manager", "staff", "customer"),
  ordersController.cancel
);
router.patch("/:id/assign-rider", requireAuth, requireRole("owner", "manager"), ordersController.assignRider);

export default router;
