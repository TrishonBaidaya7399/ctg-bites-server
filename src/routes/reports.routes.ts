import { Router } from "express";
import * as reportsController from "@/controllers/reports.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", requireRole("owner", "manager", "staff"), reportsController.dashboardStats);
router.get("/revenue", requireRole("owner"), reportsController.revenueReport);
router.get("/sales-summary", requireRole("owner", "manager"), reportsController.salesSummary);

export default router;
