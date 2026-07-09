import crypto from "crypto";
import mongoose from "mongoose";
import { Review, REVIEW_STATUSES, type IReview, type ReviewStatus } from "@/models/Review";
import { MenuItem } from "@/models/MenuItem";
import { findOrderByIdOrNumber } from "@/services/order.service";
import { AppError } from "@/utils/appError";
import { sendReviewThankYouEmail } from "@/services/email.service";
import * as reviewEvents from "@/sockets/reviewEvents";

interface ItemRatingInput {
  // Position of this item within order.items (not the MenuItem id — order items are
  // snapshotted at purchase time and their MenuItem may since have been deleted, but
  // the order's own item list is stable, so index is the reliable way to match a
  // rating back to the dish it belongs to).
  itemIndex: number;
  rating: number;
}

interface CreateReviewGroupInput {
  orderId: string;
  customer?: string;
  customerName?: string;
  customerAvatar?: string;
  comment?: string;
  items: ItemRatingInput[];
  // "together" -> one groupId shared across every item in this submission.
  // "separate" -> each item gets its own groupId (still one shared comment per call,
  // matching the "still per-item ratings, but one shared comment" product decision).
  mode: "together" | "separate";
}

async function recalcMenuItemRating(menuItemId: mongoose.Types.ObjectId): Promise<void> {
  const stats = await Review.aggregate([
    { $match: { menuItem: menuItemId, status: "approved" } },
    { $group: { _id: "$menuItem", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] ?? {};
  await MenuItem.updateOne({ _id: menuItemId }, { rating: Math.round(avg * 10) / 10, reviews: count });
}

export async function createReviewGroup(input: CreateReviewGroupInput): Promise<IReview[]> {
  if (input.items.length === 0) {
    throw new AppError("At least one item rating is required.", 400);
  }
  if (input.items.some((i) => i.rating < 1 || i.rating > 5)) {
    throw new AppError("Ratings must be between 1 and 5.", 400);
  }

  const order = await findOrderByIdOrNumber(input.orderId);
  if (!order) throw new AppError("Order not found.", 404);
  if (order.status !== "delivered") {
    throw new AppError("Only delivered orders can be reviewed.", 400);
  }
  if (order.reviewedAt) {
    throw new AppError("This order has already been reviewed.", 409);
  }

  // Source the customer's name/email from the order itself, never from client input —
  // the order was already verified to belong to this customer, whereas an email passed
  // straight from the request body could be spoofed to spam an arbitrary address.
  const customerName = input.customerName?.trim() || order.customerName;
  const customerEmail = order.customerEmail;

  const sharedGroupId = crypto.randomUUID();

  const docs = input.items.map((itemRating) => {
    const orderItem = order.items[itemRating.itemIndex];
    if (!orderItem) {
      throw new AppError("One of the reviewed items was not found on this order.", 400);
    }
    return {
      groupId: input.mode === "together" ? sharedGroupId : crypto.randomUUID(),
      order: order._id,
      orderNumber: order.orderNumber,
      menuItem: orderItem.menuItem,
      itemName: orderItem.name,
      itemImage: orderItem.image,
      customer: input.customer,
      customerName,
      customerEmail,
      customerAvatar: input.customerAvatar,
      rating: itemRating.rating,
      comment: input.comment,
      status: "approved" as ReviewStatus,
    };
  });

  const created = await Review.insertMany(docs);

  order.reviewedAt = new Date();
  await order.save();

  await Promise.all(
    created.filter((r) => r.menuItem).map((r) => recalcMenuItemRating(r.menuItem as mongoose.Types.ObjectId))
  );

  created.forEach((review) => reviewEvents.emitReviewCreated(review));

  if (customerEmail) {
    sendReviewThankYouEmail(
      customerEmail,
      customerName,
      created.map((r) => ({ name: r.itemName, image: r.itemImage, rating: r.rating }))
    ).catch((err) => console.error("[email] review thank-you failed:", err));
  }

  return created;
}

export async function listApprovedReviews(menuItemId?: string): Promise<IReview[]> {
  const filter: Record<string, unknown> = { status: "approved" };
  if (menuItemId) filter.menuItem = menuItemId;
  return Review.find(filter).sort({ createdAt: -1 }).limit(100);
}

export async function listReviewsForAdmin(status?: ReviewStatus): Promise<IReview[]> {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  return Review.find(filter).sort({ createdAt: -1 }).limit(200);
}

export async function setReviewStatus(reviewId: string, status: ReviewStatus): Promise<IReview> {
  if (!REVIEW_STATUSES.includes(status)) {
    throw new AppError("Invalid review status.", 400);
  }
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found.", 404);

  review.status = status;
  await review.save();

  if (review.menuItem) {
    await recalcMenuItemRating(review.menuItem as mongoose.Types.ObjectId);
  }

  return review;
}

export async function updateReviewComment(reviewId: string, comment: string): Promise<IReview> {
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found.", 404);

  review.comment = comment;
  await review.save();
  return review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found.", 404);

  await review.deleteOne();

  if (review.menuItem) {
    await recalcMenuItemRating(review.menuItem as mongoose.Types.ObjectId);
  }
}

export async function isOrderReviewable(orderId: string): Promise<{ reviewable: boolean; reason?: string }> {
  const order = await findOrderByIdOrNumber(orderId);
  if (!order) return { reviewable: false, reason: "Order not found." };
  if (order.status !== "delivered") return { reviewable: false, reason: "Order is not yet delivered." };
  if (order.reviewedAt) return { reviewable: false, reason: "Order already reviewed." };
  return { reviewable: true };
}
