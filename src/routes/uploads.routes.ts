import { Router } from "express";
import * as uploadsController from "@/controllers/uploads.controller";
import { requireAuth, requirePermission } from "@/middleware/auth.middleware";
import { uploadImage } from "@/middleware/upload.middleware";

const router = Router();

router.post(
  "/image",
  requireAuth,
  requirePermission("uploads:write"),
  uploadImage,
  uploadsController.uploadImageHandler
);

export default router;
