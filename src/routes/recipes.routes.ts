import { Router } from "express";
import * as recipesController from "@/controllers/recipes.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.get("/", recipesController.listRecipes);
router.get("/:slug", recipesController.getRecipeBySlug);
router.post("/", requireAuth, requireRole("owner", "manager"), recipesController.createRecipe);
router.patch("/:id", requireAuth, requireRole("owner", "manager"), recipesController.updateRecipe);
router.delete("/:id", requireAuth, requireRole("owner", "manager"), recipesController.deleteRecipe);

export default router;
