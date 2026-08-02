import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "./env";
import { featureFlags } from "./featureFlags";

// Gmail SMTP requires the authenticated account's own address as the actual envelope
// sender — a display name is fine, but Gmail silently rewrites any "from" address that
// isn't GMAIL_USER, so callers should not assume EMAIL_FROM's address survives.
//
// `family: 4` forces IPv4 for the connection. smtp.gmail.com resolves to both an IPv6
// and IPv4 address, and hosts like Render's free tier have no outbound IPv6 route —
// without this, connections silently fail with ENETUNREACH whenever Node picks the
// IPv6 address, with no error surfaced to the request/response cycle at all.
// (@types/nodemailer doesn't declare `family` on SMTPTransport.Options even though
// nodemailer passes it straight through to the underlying socket, hence the cast.)
const transportOptions: SMTPTransport.Options & { family?: number } = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  family: 4,
};

export const gmailTransporter = featureFlags.gmailSmtp.enabled
  ? nodemailer.createTransport(transportOptions)
  : null;
