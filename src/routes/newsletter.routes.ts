import { Router } from "express";
import * as newsletterController from "@/controllers/newsletter.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.post("/subscribe", newsletterController.subscribe);
router.post("/unsubscribe", newsletterController.unsubscribe);
router.get("/unsubscribe", newsletterController.unsubscribe);

router.get("/subscribers", requireAuth, requirePermission("newsletter:manage"), newsletterController.listSubscribers);
router.post("/send", requireAuth, requirePermission("newsletter:manage"), newsletterController.sendManual);
router.post("/trigger-drip", requireAuth, requirePermission("newsletter:manage"), newsletterController.triggerDailyDrip);

export default router;
