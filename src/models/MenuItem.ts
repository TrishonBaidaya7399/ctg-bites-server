import mongoose, { Schema, Document } from "mongoose";

export const MENU_CATEGORIES = ["Mezzban", "Bhuna", "Bhorta", "Sides", "Drinks", "Mishti"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export interface IMenuItem extends Document {
  name: string;
  category: MenuCategory;
  price: number;
  rating: number;
  reviews: number;
  badge?: string;
  description: string;
  image: string;
  imagePublicId?: string;
  isVeg: boolean;
  isSpicy: boolean;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: MENU_CATEGORIES },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    badge: { type: String },
    description: { type: String, required: true },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    isVeg: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    available: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

MenuItemSchema.index({ category: 1, available: 1 });

export const MenuItem = mongoose.models.MenuItem || mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
