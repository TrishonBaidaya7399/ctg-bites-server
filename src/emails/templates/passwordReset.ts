import { baseLayout, brandColors } from "./baseLayout";

export function passwordResetEmail(name: string, resetUrl: string): { subject: string; html: string } {
  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:${brandColors.brown};margin:0 0 12px;">Reset your password</h1>
    <p style="margin:0 0 16px;">Hi ${name}, we received a request to reset your CTG Bites password. This link expires in 30 minutes.</p>
    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${resetUrl}" style="display:inline-block;background:${brandColors.orange};color:#ffffff;padding:12px 28px;border-radius:999px;font-weight:600;font-size:14px;text-decoration:none;">Reset Password</a>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:${brandColors.brownMid};">If you didn't request this, you can safely ignore this email.</p>
  `;
  return { subject: "Reset your CTG Bites password", html: baseLayout("Reset Password", body) };
}
