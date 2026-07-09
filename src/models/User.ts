import mongoose, { Schema, Document, Types } from "mongoose";

export const ROLES = ["owner", "manager", "staff", "rider", "customer"] as const;
export type Role = (typeof ROLES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  lastLoginAt?: Date;
  googleId?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // Google-only accounts have no password — required only when there's no googleId.
    passwordHash: {
      type: String,
      required: function (this: IUser) { return !this.googleId; },
      select: false,
    },
    role: { type: String, enum: ROLES, required: true, default: "customer", index: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastLoginAt: { type: Date },
    googleId: { type: String, unique: true, sparse: true, index: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
