import mongoose, { Schema, Document } from "mongoose";

export interface IRecipe extends Document {
  title: string;
  slug: string;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  servings: number;
  category: string;
  image: string;
  imagePublicId?: string;
  excerpt: string;
  ingredients: string[];
  steps: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RecipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    time: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    servings: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    excerpt: { type: String, required: true },
    ingredients: [{ type: String }],
    steps: [{ type: String }],
  },
  { timestamps: true }
);

export const Recipe = mongoose.models.Recipe || mongoose.model<IRecipe>("Recipe", RecipeSchema);
