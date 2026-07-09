import { Router } from "express";
import * as reviewsController from "@/controllers/reviews.controller";
import { optionalAuth, requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", reviewsController.listReviews);
router.get("/eligibility/:orderId", reviewsController.checkEligibility);
router.post("/", optionalAuth, reviewsController.createReview);

router.get("/admin", requireAuth, requirePermission("reviews:moderate"), reviewsController.listReviewsAdmin);
router.post("/admin/manual", requireAuth, requirePermission("reviews:moderate"), reviewsController.createManualReview);
router.patch("/:id/status", requireAuth, requirePermission("reviews:moderate"), reviewsController.updateReviewStatus);
router.patch("/:id", requireAuth, requirePermission("reviews:moderate"), reviewsController.updateReview);
router.delete("/:id", requireAuth, requirePermission("reviews:moderate"), reviewsController.removeReview);

export default router;
