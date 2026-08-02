import nodemailer from "nodemailer";
import { env } from "./env";
import { featureFlags } from "./featureFlags";

// Gmail SMTP requires the authenticated account's own address as the actual envelope
// sender — a display name is fine, but Gmail silently rewrites any "from" address that
// isn't GMAIL_USER, so callers should not assume EMAIL_FROM's address survives.
export const gmailTransporter = featureFlags.gmailSmtp.enabled
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    })
  : null;
