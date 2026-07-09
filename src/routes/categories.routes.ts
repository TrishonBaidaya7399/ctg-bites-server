import { Router } from "express";
import * as categoriesController from "@/controllers/categories.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", categoriesController.listCategories);
router.post("/", requireAuth, requirePermission("categories:write"), categoriesController.createCategory);
router.patch("/:id", requireAuth, requirePermission("categories:write"), categoriesController.updateCategory);
router.delete("/:id", requireAuth, requirePermission("categories:write"), categoriesController.deleteCategory);

export default router;
