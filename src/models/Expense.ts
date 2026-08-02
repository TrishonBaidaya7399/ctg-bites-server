import mongoose, { Schema, Document, Types } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "ingredients",
  "salaries",
  "rent",
  "utilities",
  "equipment",
  "marketing",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense extends Document {
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  vendor?: string;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true, default: "other" },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    // When the expense actually occurred — distinct from createdAt (when it was
    // logged), since expenses are often entered after the fact.
    date: { type: Date, required: true, default: Date.now },
    vendor: { type: String, trim: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });

export const Expense = mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
