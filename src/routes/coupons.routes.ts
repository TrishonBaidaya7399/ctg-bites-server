import { Router } from "express";
import * as couponsController from "@/controllers/coupons.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.post("/validate", couponsController.validateCoupon);
router.get("/", requireAuth, requireRole("owner", "manager"), couponsController.listCoupons);
router.post("/", requireAuth, requireRole("owner", "manager"), couponsController.createCoupon);
router.patch("/:id", requireAuth, requireRole("owner", "manager"), couponsController.updateCoupon);
router.delete("/:id", requireAuth, requireRole("owner"), couponsController.deleteCoupon);

export default router;
