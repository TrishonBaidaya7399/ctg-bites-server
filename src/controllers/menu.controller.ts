import type { Request, Response } from "express";
import { z } from "zod";
import { MenuItem } from "@/models/MenuItem";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";

const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
  badge: z.string().optional(),
  description: z.string().min(1),
  ingredients: z.array(z.string()).optional(),
  image: z.string().min(1),
  imagePublicId: z.string().optional(),
  isVeg: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  appetizers: z.array(z.string()).optional(),
});

const menuItemUpdateSchema = menuItemSchema.partial();

export const listMenuItems = asyncHandler(async (req: Request, res: Response) => {
  const { category, includeUnavailable } = req.query;
  const filter: Record<string, unknown> = {};

  if (category && category !== "All") filter.category = category;
  if (includeUnavailable !== "true") filter.available = true;

  const items = await MenuItem.find(filter).sort({ createdAt: -1 });
  res.json({ items });
});

export const getMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await MenuItem.findById(req.params.id).populate("appetizers");
  if (!item) throw new AppError("Menu item not found", 404);
  res.json({ item });
});

export const createMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const body = menuItemSchema.parse(req.body);
  const item = await MenuItem.create(body);
  res.status(201).json({ item });
});

export const updateMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const body = menuItemUpdateSchema.parse(req.body);
  const item = await MenuItem.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!item) throw new AppError("Menu item not found", 404);
  res.json({ item });
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { available } = z.object({ available: z.boolean() }).parse(req.body);
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { available }, { new: true });
  if (!item) throw new AppError("Menu item not found", 404);
  res.json({ item });
});

export const deleteMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError("Menu item not found", 404);
  res.status(204).send();
});
