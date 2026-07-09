import sharp from "sharp";
import { cloudinary } from "@/config/cloudinary";
import { env } from "@/config/env";
import { AppError } from "@/utils/appError";

interface UploadResult {
  url: string;
  publicId: string;
}

export async function compressAndUploadImage(buffer: Buffer, folder: string): Promise<UploadResult> {
  const compressed = await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${env.CLOUDINARY_FOLDER}/${folder}`, resource_type: "image", format: "webp" },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("Image upload failed", 502));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(compressed);
  });
}
