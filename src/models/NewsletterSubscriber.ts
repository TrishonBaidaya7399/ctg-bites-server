import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export const SUBSCRIBER_STATUSES = ["active", "unsubscribed"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

export interface INewsletterSubscriber extends Document {
  email: string;
  status: SubscriberStatus;
  unsubscribeToken: string;
  // Recipes already emailed to this subscriber, in send order — drives "send the next
  // one they haven't seen yet" and lets the drip naturally pick up any newly-added
  // recipe once the backlog is exhausted, without needing a separate "caught up" flag.
  sentRecipeIds: mongoose.Types.ObjectId[];
  lastSentAt?: Date;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: SUBSCRIBER_STATUSES, default: "active", index: true },
    unsubscribeToken: { type: String, required: true, default: () => crypto.randomBytes(24).toString("hex") },
    sentRecipeIds: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],
    lastSentAt: { type: Date },
    subscribedAt: { type: Date, default: () => new Date() },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true }
);

export const NewsletterSubscriber =
  mongoose.models.NewsletterSubscriber ||
  mongoose.model<INewsletterSubscriber>("NewsletterSubscriber", NewsletterSubscriberSchema);
