import { env } from "./env";

export const featureFlags = {
  cod: { enabled: true },
  bkash: {
    enabled: Boolean(
      env.BKASH_APP_KEY && env.BKASH_APP_SECRET && env.BKASH_USERNAME && env.BKASH_PASSWORD
    ),
  },
  stripe: {
    enabled: Boolean(env.STRIPE_SECRET_KEY),
  },
  email: {
    enabled: Boolean(
      (env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL) ||
        (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) ||
        env.RESEND_API_KEY
    ),
  },
  brevo: {
    enabled: Boolean(env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL),
  },
  gmailSmtp: {
    enabled: Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD),
  },
  cloudinary: {
    enabled: Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
    ),
  },
  googleAuth: {
    enabled: Boolean(env.GOOGLE_CLIENT_ID),
  },
} as const;
