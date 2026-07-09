import { Router } from "express";
import * as ordersController from "@/controllers/orders.controller";
import { optionalAuth, requireAuth, requireRole, requirePermission, requireRoleOrPermission } from "@/middleware/auth.middleware";
import { orderCreateLimiter, orderTrackLimiter } from "@/middleware/rateLimiter";

const router = Router();

router.post("/", orderCreateLimiter, optionalAuth, ordersController.createOrder);
router.get("/track/:orderNumber", orderTrackLimiter, ordersController.trackOrder);
router.get("/mine", requireAuth, requireRole("customer"), ordersController.myOrders);
router.get("/", requireAuth, requirePermission("orders:view"), ordersController.listOrders);
router.get("/:id", requireAuth, ordersController.getOrder);
router.patch("/:id/accept", requireAuth, requirePermission("orders:accept"), ordersController.accept);
router.patch("/:id/status", requireAuth, requirePermission("orders:status"), ordersController.updateStatus);
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRoleOrPermission(["customer"], "orders:cancel"),
  ordersController.cancel
);
router.patch("/:id/assign-rider", requireAuth, requirePermission("orders:assign-rider"), ordersController.assignRider);

export default router;
