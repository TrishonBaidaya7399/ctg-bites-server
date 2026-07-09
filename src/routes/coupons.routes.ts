import { Router } from "express";
import * as couponsController from "@/controllers/coupons.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.post("/validate", couponsController.validateCoupon);
router.get("/", requireAuth, requirePermission("coupons:manage"), couponsController.listCoupons);
router.post("/", requireAuth, requirePermission("coupons:manage"), couponsController.createCoupon);
router.patch("/:id", requireAuth, requirePermission("coupons:manage"), couponsController.updateCoupon);
router.delete("/:id", requireAuth, requirePermission("coupons:delete"), couponsController.deleteCoupon);

export default router;
