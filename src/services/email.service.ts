import { resend } from "@/config/resend";
import { env } from "@/config/env";
import { welcomeEmail } from "@/emails/templates/welcome";
import { orderConfirmationEmail } from "@/emails/templates/orderConfirmation";
import { orderStatusUpdateEmail } from "@/emails/templates/orderStatusUpdate";
import { passwordResetEmail } from "@/emails/templates/passwordReset";
import { reviewThankYouEmail, type ReviewedItem } from "@/emails/templates/reviewThankYou";
import { recipeDripEmail } from "@/emails/templates/recipeDrip";
import { newsletterManualEmail } from "@/emails/templates/newsletterManual";
import type { IOrder, OrderStatus } from "@/models/Order";
import type { IRecipe } from "@/models/Recipe";

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log(`[email] Resend not configured, skipping send to ${to}: ${subject}`);
    return;
  }
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const { subject, html } = welcomeEmail(name);
  await send(to, subject, html);
}

export async function sendOrderConfirmationEmail(to: string, order: IOrder): Promise<void> {
  const { subject, html } = orderConfirmationEmail(order);
  await send(to, subject, html);
}

export async function sendOrderStatusUpdateEmail(
  to: string,
  orderNumber: string,
  status: OrderStatus
): Promise<void> {
  if (!env.EMAIL_ORDER_STATUS_UPDATES) return;
  const { subject, html } = orderStatusUpdateEmail(orderNumber, status);
  await send(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const { subject, html } = passwordResetEmail(name, resetUrl);
  await send(to, subject, html);
}

export async function sendReviewThankYouEmail(to: string, name: string, items: ReviewedItem[]): Promise<void> {
  const { subject, html } = reviewThankYouEmail(name, items);
  await send(to, subject, html);
}

export async function sendRecipeDripEmail(to: string, recipe: IRecipe, unsubscribeUrl: string): Promise<void> {
  const { subject, html } = recipeDripEmail(recipe, unsubscribeUrl);
  await send(to, subject, html);
}

export async function sendNewsletterManualEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  unsubscribeUrl: string
): Promise<void> {
  const rendered = newsletterManualEmail(subject, bodyHtml, unsubscribeUrl);
  await send(to, rendered.subject, rendered.html);
}
