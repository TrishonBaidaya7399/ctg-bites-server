import type { Request, Response } from "express";
import { z } from "zod";
import { Coupon } from "@/models/Coupon";
import * as orderService from "@/services/order.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";

const couponSchema = z.object({
  code: z.string().min(1),
  discountPercent: z.number().min(1).max(100),
  active: z.boolean().optional(),
  minOrderAmount: z.number().positive().optional(),
  maxDiscountAmount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const body = couponSchema.parse(req.body);
  const coupon = await Coupon.create({ ...body, createdBy: req.user!.id });
  res.status(201).json({ coupon });
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const body = couponSchema.partial().parse(req.body);
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!coupon) throw new AppError("Coupon not found", 404);
  res.json({ coupon });
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError("Coupon not found", 404);
  res.status(204).send();
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal } = z.object({ code: z.string().min(1), subtotal: z.number().nonnegative() }).parse(req.body);
  const result = await orderService.validateCoupon(code, subtotal);
  res.json(result);
});
