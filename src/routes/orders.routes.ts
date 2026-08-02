import { Router } from "express";
import * as ordersController from "@/controllers/orders.controller";
import { optionalAuth, requireAuth, requireRole, requirePermission } from "@/middleware/auth.middleware";
import { orderCreateLimiter, orderTrackLimiter } from "@/middleware/rateLimiter";

const router = Router();

router.post("/", orderCreateLimiter, optionalAuth, ordersController.createOrder);
router.get("/track/:orderNumber", orderTrackLimiter, ordersController.trackOrder);
// Public batch lookup by order number — powers the guest "My Orders" page, which has no
// account/session to key off of and instead relies on order numbers kept client-side.
router.get("/lookup", orderTrackLimiter, ordersController.lookupOrders);
router.get("/mine", requireAuth, requireRole("customer"), ordersController.myOrders);
router.get("/", requireAuth, requirePermission("orders:view"), ordersController.listOrders);
router.get("/:id", requireAuth, ordersController.getOrder);
router.patch("/:id/accept", requireAuth, requirePermission("orders:accept"), ordersController.accept);
router.patch("/:id/status", requireAuth, requirePermission("orders:status"), ordersController.updateStatus);
router.patch("/:id/cancel", orderTrackLimiter, optionalAuth, ordersController.cancel);
router.patch("/:id/assign-rider", requireAuth, requirePermission("orders:assign-rider"), ordersController.assignRider);

export default router;
