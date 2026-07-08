import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  name: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  badge?: string;
  description: string;
  ingredients: string[];
  image: string;
  imagePublicId?: string;
  isVeg: boolean;
  isSpicy: boolean;
  available: boolean;
  appetizers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, trim: true, lowercase: true, index: true },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    badge: { type: String },
    description: { type: String, required: true },
    ingredients: [{ type: String }],
    image: { type: String, required: true },
    imagePublicId: { type: String },
    isVeg: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    available: { type: Boolean, default: true, index: true },
    appetizers: [{ type: Schema.Types.ObjectId, ref: "Appetizer" }],
  },
  { timestamps: true }
);

MenuItemSchema.index({ category: 1, available: 1 });

export const MenuItem = mongoose.models.MenuItem || mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
