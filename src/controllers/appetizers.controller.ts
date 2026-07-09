import type { Request, Response } from "express";
import { z } from "zod";
import { Appetizer } from "@/models/Appetizer";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { deleteImage } from "@/services/upload.service";

const appetizerSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
  description: z.string().min(1),
  image: z.string().min(1),
  imagePublicId: z.string().optional(),
});

const appetizerUpdateSchema = appetizerSchema.partial();

export const listAppetizers = asyncHandler(async (req: Request, res: Response) => {
  const { category, includeUnavailable } = req.query;
  const filter: Record<string, unknown> = {};

  if (category) filter.category = category;
  if (includeUnavailable !== "true") filter.available = true;

  const appetizers = await Appetizer.find(filter).sort({ createdAt: -1 });
  res.json({ appetizers });
});

export const getAppetizer = asyncHandler(async (req: Request, res: Response) => {
  const appetizer = await Appetizer.findById(req.params.id);
  if (!appetizer) throw new AppError("Appetizer not found", 404);
  res.json({ appetizer });
});

export const createAppetizer = asyncHandler(async (req: Request, res: Response) => {
  const body = appetizerSchema.parse(req.body);
  const appetizer = await Appetizer.create(body);
  res.status(201).json({ appetizer });
});

export const updateAppetizer = asyncHandler(async (req: Request, res: Response) => {
  const body = appetizerUpdateSchema.parse(req.body);

  const previous = body.imagePublicId ? await Appetizer.findById(req.params.id) : null;

  const appetizer = await Appetizer.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!appetizer) throw new AppError("Appetizer not found", 404);

  if (previous?.imagePublicId && previous.imagePublicId !== body.imagePublicId) {
    void deleteImage(previous.imagePublicId);
  }

  res.json({ appetizer });
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { available } = z.object({ available: z.boolean() }).parse(req.body);
  const appetizer = await Appetizer.findByIdAndUpdate(req.params.id, { available }, { new: true });
  if (!appetizer) throw new AppError("Appetizer not found", 404);
  res.json({ appetizer });
});

export const deleteAppetizer = asyncHandler(async (req: Request, res: Response) => {
  const appetizer = await Appetizer.findByIdAndDelete(req.params.id);
  if (!appetizer) throw new AppError("Appetizer not found", 404);
  if (appetizer.imagePublicId) void deleteImage(appetizer.imagePublicId);
  res.status(204).send();
});
