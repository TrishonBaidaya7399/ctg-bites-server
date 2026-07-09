import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/appError";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("UNSUPPORTED_TYPE"));
      return;
    }
    cb(null, true);
  },
}).single("image");

export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  multerUpload(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Image must be smaller than 10MB.", 400));
      return;
    }
    if (err instanceof Error && err.message === "UNSUPPORTED_TYPE") {
      next(new AppError("Only PNG, JPEG, WebP, or AVIF images are allowed.", 400));
      return;
    }
    next(new AppError("Failed to process uploaded file.", 400));
  });
}
