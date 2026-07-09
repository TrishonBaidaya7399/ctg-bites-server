import { Router } from "express";
import * as uploadsController from "@/controllers/uploads.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { uploadImage } from "@/middleware/upload.middleware";

const router = Router();

router.post(
  "/image",
  requireAuth,
  requireRole("owner", "manager"),
  uploadImage,
  uploadsController.uploadImageHandler
);

export default router;
