import mongoose, { Schema, Document, Types } from "mongoose";

export const REVIEW_STATUSES = ["pending", "approved", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// One review document = one dish rated within one order. A multi-item order
// reviewed "all together" produces one document per item, all sharing the
// same `groupId` and `comment` (per-item ratings, one shared comment — see
// createReviewGroup). A "review separately" order also produces one document
// per item, but each gets its own unique `groupId` and independent comment.
export interface IReview extends Document {
  groupId: string;
  order: Types.ObjectId;
  orderNumber: string;
  menuItem?: Types.ObjectId;
  itemName: string;
  itemImage: string;
  customer?: Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  customerAvatar?: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    groupId: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem" },
    itemName: { type: String, required: true },
    itemImage: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerAvatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    status: { type: String, enum: REVIEW_STATUSES, default: "approved", index: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ menuItem: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ order: 1 });
ReviewSchema.index({ groupId: 1 });

export const Review = mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
