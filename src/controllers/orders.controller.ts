import type { Request, Response } from "express";
import { z } from "zod";
import { Order, ORDER_MODES, ORDER_TYPES, ORDER_STATUSES, PAYMENT_METHODS } from "@/models/Order";
import { User } from "@/models/User";
import * as orderService from "@/services/order.service";
import { findOrderByIdOrNumber, getActiveQueueOrder, buildQueueMap, getQueueInfoForOrder } from "@/services/order.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { serializeOrder } from "@/utils/serializeOrder";
import { roleHasPermission } from "@/services/permissions.service";

const createOrderSchema = z.object({
  mode: z.enum(ORDER_MODES),
  type: z.enum(ORDER_TYPES),
  tableNumber: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().positive(),
        appetizers: z
          .array(z.object({ appetizerId: z.string().min(1), quantity: z.number().int().positive() }))
          .optional(),
      })
    )
    .min(1),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = createOrderSchema.parse(req.body);

  // Dine-in guests walk up to a table with no account — table orders stay guest-friendly.
  // Delivery/parcel orders have no staff member to vouch for the customer in person, so
  // an account is required to place one.
  if (body.mode === "online" && req.user?.role !== "customer") {
    throw new AppError("Please sign in to place an online order.", 401);
  }

  let customerName = body.customerName;
  let customerEmail = body.customerEmail;
  if (req.user?.role === "customer") {
    const account = await User.findById(req.user.id);
    if (!account) throw new AppError("Account not found.", 404);
    // The order's customer identity always comes from the authenticated account, never
    // client input — this is also what the admin panel displays for online orders.
    customerName = account.name;
    customerEmail = account.email;
  }

  const order = await orderService.createOrder({
    ...body,
    customerName,
    customerEmail,
    customer: req.user?.role === "customer" ? req.user.id : undefined,
  });
  const queue = await getQueueInfoForOrder(order);
  res.status(201).json({ order: serializeOrder(order, queue) });
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
  const queueMap = buildQueueMap(await getActiveQueueOrder());
  res.json({ orders: orders.map((o) => serializeOrder(o, queueMap.get(String(o._id)))) });
});

export const myOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({ customer: req.user!.id }).sort({ createdAt: -1 });
  const queueMap = buildQueueMap(await getActiveQueueOrder());
  res.json({ orders: orders.map((o) => serializeOrder(o, queueMap.get(String(o._id)))) });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await findOrderByIdOrNumber(req.params.id);
  if (!order) throw new AppError("Order not found", 404);
  const queue = await getQueueInfoForOrder(order);
  res.json({ order: serializeOrder(order, queue) });
});

export const trackOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new AppError("Order not found", 404);
  const queue = await getQueueInfoForOrder(order);
  res.json({ order: serializeOrder(order, queue) });
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  const { estimatedMinutes } = z.object({ estimatedMinutes: z.number().int().positive() }).parse(req.body);
  const order = await orderService.acceptOrder(req.params.id, estimatedMinutes, req.user!.id);
  const queue = await getQueueInfoForOrder(order);
  res.json({ order: serializeOrder(order, queue) });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.enum(ORDER_STATUSES) }).parse(req.body);

  if (req.user!.role === "rider" && !["delivered"].includes(status)) {
    throw new AppError("Riders can only mark orders as delivered.", 403);
  }

  const order = await orderService.updateOrderStatus(req.params.id, status);
  const queue = await getQueueInfoForOrder(order);
  res.json({ order: serializeOrder(order, queue) });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});

  // Table/online guests never hold a session (no login flow exists for them), so most
  // cancel requests arrive with no req.user at all — that's the normal customer path,
  // not a privilege gap. An authenticated staff member still needs the orders:cancel
  // permission even to cancel a merely-pending order — falling through to the
  // guest/customer branch below would silently skip that check.
  const isStaff = !!req.user && req.user.role !== "customer";

  if (isStaff) {
    const allowed = await roleHasPermission(req.user!.role, "orders:cancel");
    if (!allowed) throw new AppError("Insufficient permissions", 403);
    // Staff with the permission may cancel at any still-cancellable stage — enforced by
    // the service's status-transition check, not repeated here.
  } else {
    const order = await findOrderByIdOrNumber(req.params.id);
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "pending") {
      throw new AppError("This order has already been accepted by the kitchen and can no longer be cancelled.", 400);
    }
  }

  // No queue lookup needed — cancelling always moves the order out of QUEUE_STATUSES,
  // so serializeOrder's queuePosition is undefined regardless.
  const order = await orderService.cancelOrder(req.params.id, req.user?.id, reason);
  res.json({ order: serializeOrder(order) });
});

// GET /api/orders/lookup?ids=ORD1,ORD2 — public batch fetch by order number, capped and
// rate-limited since it's unauthenticated. Powers the guest "My Orders" page.
export const lookupOrders = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = z.object({ ids: z.string().min(1) }).parse(req.query);
  const orderNumbers = Array.from(
    new Set(
      ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, 50);

  if (orderNumbers.length === 0) {
    res.json({ orders: [] });
    return;
  }

  const orders = await Order.find({ orderNumber: { $in: orderNumbers } }).sort({ createdAt: -1 });
  const queueMap = buildQueueMap(await getActiveQueueOrder());
  res.json({ orders: orders.map((o) => serializeOrder(o, queueMap.get(String(o._id)))) });
});

export const assignRider = asyncHandler(async (req: Request, res: Response) => {
  const { riderId } = z.object({ riderId: z.string().min(1) }).parse(req.body);
  const order = await orderService.assignRider(req.params.id, riderId);
  const queue = await getQueueInfoForOrder(order);
  res.json({ order: serializeOrder(order, queue) });
});
