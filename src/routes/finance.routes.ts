import { Router } from "express";
import * as financeController from "@/controllers/finance.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

// Owner-only, hardcoded — finance is never delegable via the Permissions page, even
// by mistake, unlike every other capability in this app.
router.use(requireAuth, requireRole("owner"));

router.get("/summary", financeController.getSummary);

router.get("/orders", financeController.listFinanceOrders);
router.post("/orders/manual", financeController.createManualOrder);
router.patch("/orders/:id", financeController.updateFinanceOrder);
router.delete("/orders/:id", financeController.deleteFinanceOrder);

router.get("/expenses", financeController.listExpenses);
router.post("/expenses", financeController.createExpense);
router.patch("/expenses/:id", financeController.updateExpense);
router.delete("/expenses/:id", financeController.deleteExpense);

export default router;
