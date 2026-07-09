import { Router } from "express";
import * as recipesController from "@/controllers/recipes.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", recipesController.listRecipes);
router.get("/:slug", recipesController.getRecipeBySlug);
router.post("/", requireAuth, requirePermission("recipes:write"), recipesController.createRecipe);
router.patch("/:id", requireAuth, requirePermission("recipes:write"), recipesController.updateRecipe);
router.delete("/:id", requireAuth, requirePermission("recipes:write"), recipesController.deleteRecipe);

export default router;
