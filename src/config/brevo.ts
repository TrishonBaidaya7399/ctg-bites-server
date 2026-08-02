import { env } from "./env";
import { featureFlags } from "./featureFlags";

interface SendBrevoEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Brevo's transactional email API — plain HTTPS, not SMTP, so it works on hosts (like
// Render's free tier) that block outbound SMTP ports entirely. Only requires a single
// verified sender address (click a confirmation link in Brevo's dashboard), not a
// verified domain, so it can reach arbitrary recipients without owning a domain.
export async function sendBrevoEmail({ to, subject, html }: SendBrevoEmailInput): Promise<void> {
  if (!featureFlags.brevo.enabled) {
    throw new Error("Brevo is not configured (missing BREVO_API_KEY or BREVO_SENDER_EMAIL).");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}
