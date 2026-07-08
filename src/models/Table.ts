import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ITable extends Document {
  number: string;
  isActive: boolean;
  qrToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    number: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    qrToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(16).toString("hex"),
    },
  },
  { timestamps: true }
);

export const Table = mongoose.models.Table || mongoose.model<ITable>("Table", TableSchema);
