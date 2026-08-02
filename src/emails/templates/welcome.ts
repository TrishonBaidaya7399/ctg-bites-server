import { baseLayout, brandColors } from "./baseLayout";
import { env } from "@/config/env";

export function welcomeEmail(name: string): { subject: string; html: string } {
  const siteUrl = env.PUBLIC_SITE_URL.replace(/\/$/, "");

  const body = `
    <div style="text-align:center;margin:0 0 20px;">
      <span style="display:inline-block;background:${brandColors.greenHerb};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">Account Verified</span>
    </div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;text-align:center;color:${brandColors.brown};margin:0 0 12px;">Welcome to the table, ${name}</h1>
    <p style="margin:0 0 16px;text-align:center;color:${brandColors.brownMid};">Your CTG Bites account is verified and ready. You're in for Mezzban feasts, slow-cooked Kala Bhuna, bold bhortas, and Ilish Paturi — the flavours of Chittagong, delivered.</p>

    <table role="presentation" width="100%" style="margin:28px 0;border-collapse:separate;border-spacing:0 10px;">
      <tr>
        <td style="width:36px;vertical-align:top;padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${brandColors.cream};text-align:center;line-height:28px;font-size:13px;font-weight:700;color:${brandColors.orange};">1</div>
        </td>
        <td style="font-size:14px;color:${brandColors.brown};padding-left:8px;">Browse the full menu and build your order — dine-in, parcel, or delivery.</td>
      </tr>
      <tr>
        <td style="width:36px;vertical-align:top;padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${brandColors.cream};text-align:center;line-height:28px;font-size:13px;font-weight:700;color:${brandColors.orange};">2</div>
        </td>
        <td style="font-size:14px;color:${brandColors.brown};padding-left:8px;">Track every order live, from kitchen to doorstep.</td>
      </tr>
      <tr>
        <td style="width:36px;vertical-align:top;padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${brandColors.cream};text-align:center;line-height:28px;font-size:13px;font-weight:700;color:${brandColors.orange};">3</div>
        </td>
        <td style="font-size:14px;color:${brandColors.brown};padding-left:8px;">Earn a spot on our table by leaving reviews after every order.</td>
      </tr>
    </table>

    <div style="text-align:center;margin:8px 0 4px;">
      <a href="${siteUrl}/menu" style="display:inline-block;background:${brandColors.orange};color:#ffffff;padding:14px 36px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 6px 16px rgba(232,98,42,0.3);">Start Ordering</a>
    </div>
  `;
  return {
    subject: "Welcome to CTG Bites — your account is ready",
    html: baseLayout("Welcome to CTG Bites", body, { preheader: "Your CTG Bites account is verified and ready to order." }),
  };
}
