import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("CTG Bites <onboarding@resend.dev>"),
  EMAIL_ORDER_STATUS_UPDATES: z.coerce.boolean().default(false),
  EMAIL_ON_ADD_TO_CART: z.coerce.boolean().default(false),

  PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("ctg-bites"),

  BKASH_APP_KEY: z.string().optional(),
  BKASH_APP_SECRET: z.string().optional(),
  BKASH_USERNAME: z.string().optional(),
  BKASH_PASSWORD: z.string().optional(),
  BKASH_BASE_URL: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  DEFAULT_OWNER_EMAIL: z.string().optional(),
  DEFAULT_OWNER_PASSWORD: z.string().optional(),
  DEFAULT_OWNER_NAME: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),

  TURNSTILE_SECRET_KEY: z.string().optional(),
  CONTACT_NOTIFY_EMAIL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export type Env = typeof env;
