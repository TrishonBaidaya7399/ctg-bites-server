import { NewsletterSubscriber, type INewsletterSubscriber, type SubscriberStatus } from "@/models/NewsletterSubscriber";
import { Recipe } from "@/models/Recipe";
import { AppError } from "@/utils/appError";
import { env } from "@/config/env";
import { sendRecipeDripEmail, sendNewsletterManualEmail } from "@/services/email.service";

function unsubscribeUrl(token: string): string {
  return `${env.PUBLIC_SITE_URL}/newsletter/unsubscribe?token=${token}`;
}

export async function subscribe(email: string): Promise<INewsletterSubscriber> {
  const normalized = email.trim().toLowerCase();
  const existing = await NewsletterSubscriber.findOne({ email: normalized });

  if (existing) {
    if (existing.status === "unsubscribed") {
      existing.status = "active";
      existing.unsubscribedAt = undefined;
      await existing.save();
    }
    return existing;
  }

  return NewsletterSubscriber.create({ email: normalized });
}

export async function unsubscribeByToken(token: string): Promise<void> {
  const subscriber = await NewsletterSubscriber.findOne({ unsubscribeToken: token });
  if (!subscriber) throw new AppError("Invalid unsubscribe link.", 404);

  subscriber.status = "unsubscribed";
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();
}

// Sends each active subscriber the next recipe they haven't received yet (oldest-created
// recipe first). Once every recipe has been sent, a subscriber is skipped until a new
// recipe is added — sentRecipeIds naturally shrinks the "unseen" set back down so the
// drip picks it up automatically without any extra bookkeeping.
export async function sendDailyRecipeDrip(): Promise<{ sent: number; skipped: number }> {
  const [subscribers, recipes] = await Promise.all([
    NewsletterSubscriber.find({ status: "active" }),
    Recipe.find().sort({ createdAt: 1 }),
  ]);

  if (recipes.length === 0) return { sent: 0, skipped: subscribers.length };

  let sent = 0;
  let skipped = 0;

  for (const subscriber of subscribers) {
    const sentIds = new Set(subscriber.sentRecipeIds.map((id: unknown) => String(id)));
    const nextRecipe = recipes.find((r) => !sentIds.has(String(r._id)));

    if (!nextRecipe) {
      skipped += 1;
      continue;
    }

    try {
      await sendRecipeDripEmail(subscriber.email, nextRecipe, unsubscribeUrl(subscriber.unsubscribeToken));
      subscriber.sentRecipeIds.push(nextRecipe._id as import("mongoose").Types.ObjectId);
      subscriber.lastSentAt = new Date();
      await subscriber.save();
      sent += 1;
    } catch (err) {
      console.error(`[newsletter] failed to send recipe drip to ${subscriber.email}:`, err);
      skipped += 1;
    }
  }

  return { sent, skipped };
}

export async function listSubscribers(status?: SubscriberStatus): Promise<INewsletterSubscriber[]> {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  return NewsletterSubscriber.find(filter).sort({ createdAt: -1 });
}

export async function sendManualEmail(subscriberIds: string[], subject: string, bodyHtml: string): Promise<number> {
  const subscribers = await NewsletterSubscriber.find({ _id: { $in: subscriberIds }, status: "active" });

  let sent = 0;
  for (const subscriber of subscribers) {
    try {
      await sendNewsletterManualEmail(subscriber.email, subject, bodyHtml, unsubscribeUrl(subscriber.unsubscribeToken));
      sent += 1;
    } catch (err) {
      console.error(`[newsletter] failed to send manual email to ${subscriber.email}:`, err);
    }
  }
  return sent;
}
