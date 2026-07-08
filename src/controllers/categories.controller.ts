import type { Request, Response } from "express";
import { z } from "zod";
import { Category, CATEGORY_KINDS } from "@/models/Category";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(CATEGORY_KINDS),
  sortOrder: z.number().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().optional(),
});

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const { kind } = req.query;
  const filter: Record<string, unknown> = {};
  if (kind) filter.kind = kind;

  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);
  const slug = slugify(body.name);

  const existing = await Category.findOne({ kind: body.kind, slug });
  if (existing) throw new AppError("A category with this name already exists.", 409);

  const category = await Category.create({ name: body.name, slug, kind: body.kind, sortOrder: body.sortOrder ?? 0 });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = updateSchema.parse(req.body);
  const update: Record<string, unknown> = { ...body };
  if (body.name) update.slug = slugify(body.name);

  const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!category) throw new AppError("Category not found", 404);
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new AppError("Category not found", 404);
  res.status(204).send();
});
