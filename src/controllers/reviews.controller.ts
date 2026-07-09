import type { Request, Response } from "express";
import { z } from "zod";
import { REVIEW_STATUSES } from "@/models/Review";
import * as reviewService from "@/services/review.service";
import { serializeReview } from "@/utils/serializeReview";
import { asyncHandler } from "@/utils/asyncHandler";

const createReviewSchema = z.object({
  orderId: z.string().min(1),
  customerName: z.string().min(1).optional(),
  customerAvatar: z.string().url().optional(),
  comment: z.string().max(2000).optional(),
  mode: z.enum(["together", "separate"]),
  items: z
    .array(
      z.object({
        itemIndex: z.number().int().min(0),
        rating: z.number().int().min(1).max(5),
      })
    )
    .min(1),
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const body = createReviewSchema.parse(req.body);
  const created = await reviewService.createReviewGroup({
    ...body,
    customer: req.user?.role === "customer" ? req.user.id : undefined,
  });
  res.status(201).json({ reviews: created.map(serializeReview) });
});

export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.isOrderReviewable(req.params.orderId);
  res.json(result);
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const menuItemId = typeof req.query.menuItemId === "string" ? req.query.menuItemId : undefined;
  const reviews = await reviewService.listApprovedReviews(menuItemId);
  res.json({ reviews: reviews.map(serializeReview) });
});

export const listReviewsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const status = REVIEW_STATUSES.includes(statusParam as (typeof REVIEW_STATUSES)[number])
    ? (statusParam as (typeof REVIEW_STATUSES)[number])
    : undefined;
  const reviews = await reviewService.listReviewsForAdmin(status);
  res.json({ reviews: reviews.map(serializeReview) });
});

export const updateReviewStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.enum(REVIEW_STATUSES) }).parse(req.body);
  const review = await reviewService.setReviewStatus(req.params.id, status);
  res.json({ review: serializeReview(review) });
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const { comment } = z.object({ comment: z.string().max(2000) }).parse(req.body);
  const review = await reviewService.updateReviewComment(req.params.id, comment);
  res.json({ review: serializeReview(review) });
});

export const removeReview = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteReview(req.params.id);
  res.status(204).send();
});
