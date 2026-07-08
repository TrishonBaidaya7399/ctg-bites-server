import type { Request, Response } from "express";
import { z } from "zod";
import { Order, ORDER_MODES, ORDER_TYPES, ORDER_STATUSES, PAYMENT_METHODS } from "@/models/Order";
import * as orderService from "@/services/order.service";
import { findOrderByIdOrNumber } from "@/services/order.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { serializeOrder } from "@/utils/serializeOrder";

const createOrderSchema = z.object({
  mode: z.enum(ORDER_MODES),
  type: z.enum(ORDER_TYPES),
  tableNumber: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  items: z.array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = createOrderSchema.parse(req.body);
  const order = await orderService.createOrder({
    ...body,
    customer: req.user?.role === "customer" ? req.user.id : undefined,
  });
  res.status(201).json({ order: serializeOrder(order) });
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { mode, status, type } = req.query;
  const filter: Record<string, unknown> = {};

  if (mode) filter.mode = mode;
  if (status) filter.status = status;
  if (type) filter.type = type;

  if (req.user?.role === "rider") {
    filter.assignedRider = req.user.id;
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ orders: orders.map(serializeOrder) });
});

export const myOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({ customer: req.user!.id }).sort({ createdAt: -1 });
  res.json({ orders: orders.map(serializeOrder) });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await findOrderByIdOrNumber(req.params.id);
  if (!order) throw new AppError("Order not found", 404);
  res.json({ order: serializeOrder(order) });
});

export const trackOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new AppError("Order not found", 404);
  res.json({ order: serializeOrder(order) });
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  const { estimatedMinutes } = z.object({ estimatedMinutes: z.number().int().positive() }).parse(req.body);
  const order = await orderService.acceptOrder(req.params.id, estimatedMinutes, req.user!.id);
  res.json({ order: serializeOrder(order) });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.enum(ORDER_STATUSES) }).parse(req.body);

  if (req.user!.role === "rider" && !["delivered"].includes(status)) {
    throw new AppError("Riders can only mark orders as delivered.", 403);
  }

  const order = await orderService.updateOrderStatus(req.params.id, status);
  res.json({ order: serializeOrder(order) });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});

  if (req.user!.role === "customer") {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "pending") {
      throw new AppError("You can only cancel an order before it's accepted.", 400);
    }
  }

  const order = await orderService.cancelOrder(req.params.id, req.user!.id, reason);
  res.json({ order: serializeOrder(order) });
});

export const assignRider = asyncHandler(async (req: Request, res: Response) => {
  const { riderId } = z.object({ riderId: z.string().min(1) }).parse(req.body);
  const order = await orderService.assignRider(req.params.id, riderId);
  res.json({ order: serializeOrder(order) });
});
