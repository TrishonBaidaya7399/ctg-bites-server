import { baseLayout, brandColors } from "./baseLayout";

export function welcomeEmail(name: string): { subject: string; html: string } {
  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:${brandColors.brown};margin:0 0 12px;">Welcome, ${name}!</h1>
    <p style="margin:0 0 16px;">Thanks for joining CTG Bites — your gateway to authentic Chittagong cuisine: Mezzban feasts, Kala Bhuna, and the bhortas that define home cooking back home.</p>
    <p style="margin:0 0 16px;">Your account is ready. Browse the menu, place an order, and taste Chittagong wherever you are.</p>
    <div style="text-align:center;margin:24px 0 8px;">
      <span style="display:inline-block;background:${brandColors.orange};color:#ffffff;padding:12px 28px;border-radius:999px;font-weight:600;font-size:14px;">Start Ordering</span>
    </div>
  `;
  return { subject: "Welcome to CTG Bites", html: baseLayout("Welcome to CTG Bites", body) };
}
