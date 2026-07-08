import { Router } from "express";
import * as categoriesController from "@/controllers/categories.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", categoriesController.listCategories);
router.post("/", requireAuth, requireRole("owner", "manager"), categoriesController.createCategory);
router.patch("/:id", requireAuth, requireRole("owner", "manager"), categoriesController.updateCategory);
router.delete("/:id", requireAuth, requireRole("owner", "manager"), categoriesController.deleteCategory);

export default router;
