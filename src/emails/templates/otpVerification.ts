import { baseLayout, brandColors } from "./baseLayout";

export function otpVerificationEmail(
  name: string,
  otp: string,
  expiresInMinutes: number
): { subject: string; html: string } {
  const digits = otp
    .split("")
    .map(
      (d) => `
      <td style="width:40px;height:52px;background:${brandColors.cream};border-radius:10px;text-align:center;vertical-align:middle;">
        <span style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:${brandColors.brown};">${d}</span>
      </td>`
    )
    .join(`<td style="width:8px;"></td>`);

  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;text-align:center;color:${brandColors.brown};margin:0 0 12px;">Verify your email</h1>
    <p style="margin:0 0 24px;text-align:center;color:${brandColors.brownMid};">Hi ${name}, use the code below to verify <strong>your CTG Bites</strong> account and finish creating it.</p>

    <table role="presentation" align="center" style="margin:0 auto 24px;">
      <tr>${digits}</tr>
    </table>

    <p style="margin:0 0 8px;text-align:center;font-size:13px;color:${brandColors.brownMid};">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p style="margin:20px 0 0;font-size:13px;color:${brandColors.brownMid};text-align:center;">Didn't try to create an account? You can safely ignore this email — no account will be created without this code.</p>
  `;
  return {
    subject: `${otp} is your CTG Bites verification code`,
    html: baseLayout("Verify your email", body, { preheader: `Your verification code is ${otp}` }),
  };
}
