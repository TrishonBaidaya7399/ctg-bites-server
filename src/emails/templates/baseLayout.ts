import { env } from "@/config/env";

const COLORS = {
  orange: "#E8622A",
  orangeLight: "#F07B45",
  cream: "#F5F0E8",
  warmGray: "#EDE8DF",
  brown: "#2C1A0E",
  brownMid: "#5C3D2E",
  greenHerb: "#4A7C59",
};

const SITE_URL = env.PUBLIC_SITE_URL.replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/images/logo-wordmark.png`;

export interface BaseLayoutOptions {
  /** Small uppercase label shown above the headline inside the body, e.g. "Order Confirmed". Optional per-template eyebrow tag rendered in the header strip. */
  preheader?: string;
}

// Wraps every outbound email in the shared CTG Bites chrome: a hero header with the
// site logo/wordmark, a white content card for the template-specific body, and a
// footer with contact info + social links. Resend renders raw HTML with no access to
// local assets, so the logo is fetched from the deployed site (PUBLIC_SITE_URL) rather
// than bundled — this must stay a publicly reachable URL for images to render in inboxes.
export function baseLayout(title: string, bodyHtml: string, options: BaseLayoutOptions = {}): string {
  const { preheader } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:${COLORS.warmGray};font-family:'Inter',Arial,sans-serif;color:${COLORS.brown};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.warmGray};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(44,26,14,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg, ${COLORS.brown} 0%, #40261a 100%);padding:36px 32px 28px;text-align:center;">
              <img src="${LOGO_URL}" alt="CTG Bites" width="168" style="display:block;margin:0 auto;height:auto;max-width:168px;" />
              <div style="margin-top:10px;font-size:11px;font-weight:600;color:${COLORS.orangeLight};letter-spacing:0.16em;text-transform:uppercase;">Authentic Chittagong Cuisine</div>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(90deg, ${COLORS.orange}, ${COLORS.orangeLight}, ${COLORS.orange});height:4px;"></td>
          </tr>
          <tr>
            <td style="padding:36px 36px 32px;font-size:15px;line-height:1.65;color:${COLORS.brown};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px;">
              <div style="border-top:1px solid ${COLORS.warmGray};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 32px;text-align:center;">
              <div style="font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;color:${COLORS.brown};margin-bottom:4px;">CTG Bites</div>
              <div style="font-size:12px;color:${COLORS.brownMid};line-height:1.6;">
                Chittagong, Bangladesh &middot; <a href="tel:+8801800000000" style="color:${COLORS.brownMid};text-decoration:none;">+880 1800-000000</a>
              </div>
              <div style="margin:14px 0;">
                <a href="${SITE_URL}/menu" style="color:${COLORS.orange};font-size:12px;font-weight:600;text-decoration:none;margin:0 8px;">Order Online</a>
                <span style="color:${COLORS.warmGray};">|</span>
                <a href="${SITE_URL}/orders" style="color:${COLORS.orange};font-size:12px;font-weight:600;text-decoration:none;margin:0 8px;">Track Order</a>
              </div>
              <div style="font-size:11px;color:${COLORS.brownMid};opacity:0.7;">&copy; ${new Date().getFullYear()} CTG Bites. All rights reserved.</div>
            </td>
          </tr>
        </table>
        <p style="max-width:560px;margin:16px auto 0;font-size:11px;color:${COLORS.brownMid};text-align:center;">
          You're receiving this email because it relates to your CTG Bites account or order.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const brandColors = COLORS;
