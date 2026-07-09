import { baseLayout, brandColors } from "./baseLayout";

export function newsletterManualEmail(
  subject: string,
  bodyHtml: string,
  unsubscribeUrl: string
): { subject: string; html: string } {
  const body = `
    <div style="font-size:15px;line-height:1.6;color:${brandColors.brown};">
      ${bodyHtml}
    </div>
    <p style="margin:24px 0 0;font-size:11px;color:${brandColors.brownMid};opacity:0.7;">
      <a href="${unsubscribeUrl}" style="color:${brandColors.brownMid};">Unsubscribe</a> from CTG Bites emails.
    </p>
  `;
  return { subject, html: baseLayout(subject, body) };
}
