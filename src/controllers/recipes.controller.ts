import type { Request, Response } from "express";
import { z } from "zod";
import { Recipe } from "@/models/Recipe";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";

const recipeSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  time: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  servings: z.number().int().positive(),
  category: z.string().min(1),
  image: z.string().min(1),
  imagePublicId: z.string().optional(),
  excerpt: z.string().min(1),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

const recipeUpdateSchema = recipeSchema.partial();

export const listRecipes = asyncHandler(async (req: Request, res: Response) => {
  const recipes = await Recipe.find().sort({ createdAt: -1 });
  res.json({ recipes });
});

export const getRecipeBySlug = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findOne({ slug: req.params.slug });
  if (!recipe) throw new AppError("Recipe not found", 404);
  res.json({ recipe });
});

export const createRecipe = asyncHandler(async (req: Request, res: Response) => {
  const body = recipeSchema.parse(req.body);
  const recipe = await Recipe.create(body);
  res.status(201).json({ recipe });
});

export const updateRecipe = asyncHandler(async (req: Request, res: Response) => {
  const body = recipeUpdateSchema.parse(req.body);
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!recipe) throw new AppError("Recipe not found", 404);
  res.json({ recipe });
});

export const deleteRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findByIdAndDelete(req.params.id);
  if (!recipe) throw new AppError("Recipe not found", 404);
  res.status(204).send();
});
