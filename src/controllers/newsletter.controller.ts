import type { Request, Response } from "express";
import { z } from "zod";
import { SUBSCRIBER_STATUSES } from "@/models/NewsletterSubscriber";
import * as newsletterService from "@/services/newsletter.service";
import { asyncHandler } from "@/utils/asyncHandler";

function serializeSubscriber(sub: {
  _id: unknown;
  email: string;
  status: string;
  subscribedAt: Date;
  lastSentAt?: Date;
  sentRecipeIds: unknown[];
}) {
  return {
    id: String(sub._id),
    email: sub.email,
    status: sub.status,
    subscribedAt: sub.subscribedAt.toISOString(),
    lastSentAt: sub.lastSentAt?.toISOString(),
    recipesSent: sub.sentRecipeIds.length,
  };
}

const subscribeSchema = z.object({ email: z.string().email() });

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { email } = subscribeSchema.parse(req.body);
  const subscriber = await newsletterService.subscribe(email);
  res.status(201).json({ subscriber: serializeSubscriber(subscriber) });
});

const unsubscribeSchema = z.object({ token: z.string().min(1) });

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const { token } = unsubscribeSchema.parse(req.query.token ? req.query : req.body);
  await newsletterService.unsubscribeByToken(token);
  res.json({ message: "Unsubscribed successfully." });
});

export const listSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const status = SUBSCRIBER_STATUSES.includes(statusParam as (typeof SUBSCRIBER_STATUSES)[number])
    ? (statusParam as (typeof SUBSCRIBER_STATUSES)[number])
    : undefined;
  const subscribers = await newsletterService.listSubscribers(status);
  res.json({ subscribers: subscribers.map(serializeSubscriber) });
});

const sendManualSchema = z.object({
  subscriberIds: z.array(z.string().min(1)).min(1),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
});

export const sendManual = asyncHandler(async (req: Request, res: Response) => {
  const { subscriberIds, subject, bodyHtml } = sendManualSchema.parse(req.body);
  const sent = await newsletterService.sendManualEmail(subscriberIds, subject, bodyHtml);
  res.json({ sent });
});

export const triggerDailyDrip = asyncHandler(async (_req: Request, res: Response) => {
  const result = await newsletterService.sendDailyRecipeDrip();
  res.json(result);
});
