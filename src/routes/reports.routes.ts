import { Router } from "express";
import * as reportsController from "@/controllers/reports.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", requirePermission("reports:dashboard"), reportsController.dashboardStats);
router.get("/revenue", requirePermission("reports:revenue"), reportsController.revenueReport);
router.get("/sales-summary", requirePermission("reports:sales"), reportsController.salesSummary);

export default router;
