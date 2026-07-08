import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { User } from "@/models/User";

async function run() {
  if (!env.DEFAULT_OWNER_EMAIL || !env.DEFAULT_OWNER_PASSWORD) {
    throw new Error("DEFAULT_OWNER_EMAIL/DEFAULT_OWNER_PASSWORD not set in .env");
  }

  await connectDB();

  const user = await User.findOne({ email: env.DEFAULT_OWNER_EMAIL.toLowerCase() });
  if (!user) {
    throw new Error(`No user found with email ${env.DEFAULT_OWNER_EMAIL}`);
  }

  user.passwordHash = await bcrypt.hash(env.DEFAULT_OWNER_PASSWORD, 12);
  await user.save();

  console.log(`[reset-owner-password] Updated password for ${user.email} (role: ${user.role})`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[reset-owner-password] Failed:", err);
  process.exit(1);
});
