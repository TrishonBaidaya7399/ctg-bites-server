import mongoose, { Schema, Document } from "mongoose";

export interface IAppetizer extends Document {
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  imagePublicId?: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppetizerSchema = new Schema<IAppetizer>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, trim: true, lowercase: true, index: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    available: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

AppetizerSchema.index({ category: 1, available: 1 });

export const Appetizer =
  mongoose.models.Appetizer || mongoose.model<IAppetizer>("Appetizer", AppetizerSchema);
