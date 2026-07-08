import mongoose, { Schema, Document } from "mongoose";

export const CATEGORY_KINDS = ["menu", "appetizer"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export interface ICategory extends Document {
  name: string;
  slug: string;
  kind: CategoryKind;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    kind: { type: String, enum: CATEGORY_KINDS, required: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ kind: 1, slug: 1 }, { unique: true });

export const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
