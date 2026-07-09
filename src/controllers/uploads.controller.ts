import type { Request, Response } from "express";
import { z } from "zod";
import { compressAndUploadImage } from "@/services/upload.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { featureFlags } from "@/config/featureFlags";

const folderSchema = z.object({ folder: z.enum(["menu-items", "appetizers", "recipes"]).default("menu-items") });

export const uploadImageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!featureFlags.cloudinary.enabled) {
    throw new AppError("Image upload is not configured on this server.", 503);
  }

  if (!req.file) {
    throw new AppError("No image file provided.", 400);
  }

  const { folder } = folderSchema.parse(req.body);
  const result = await compressAndUploadImage(req.file.buffer, folder);

  res.status(201).json({ url: result.url, publicId: result.publicId });
});
