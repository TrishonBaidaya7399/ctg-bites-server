import mongoose from "mongoose";
import { Order, QUEUE_STATUSES, type IOrder, type IOrderItemAppetizer, type OrderStatus } from "@/models/Order";
import { MenuItem } from "@/models/MenuItem";
import { Appetizer } from "@/models/Appetizer";
import { Coupon } from "@/models/Coupon";
import { generateOrderNumber } from "@/utils/generateOrderNumber";
import { AppError } from "@/utils/appError";
import type { QueueInfo } from "@/utils/serializeOrder";
import { sendOrderConfirmationEmail, sendOrderCompletedEmail } from "@/services/email.service";
import * as orderEvents from "@/sockets/orderEvents";

export async function findOrderByIdOrNumber(idOrNumber: string): Promise<IOrder | null> {
  if (mongoose.isValidObjectId(idOrNumber)) {
    const byId = await Order.findById(idOrNumber);
    if (byId) return byId;
  }
  return Order.findOne({ orderNumber: idOrNumber });
}

// FIFO by _id (Mongo's ObjectId embeds a creation timestamp, so ascending _id order is
// equivalent to ascending createdAt without needing a separate sort key or tie-break).
export async function getActiveQueueOrder(): Promise<{ _id: unknown }[]> {
  return Order.find({ status: { $in: QUEUE_STATUSES } }).sort({ _id: 1 }).select("_id").lean();
}

export function buildQueueMap(activeQueue: { _id: unknown }[]): Map<string, QueueInfo> {
  const total = activeQueue.length;
  const map = new Map<string, QueueInfo>();
  activeQueue.forEach((o, i) => map.set(String(o._id), { position: i + 1, total }));
  return map;
}

// Single-order convenience wrapper for endpoints that only need one order's position
// (still fetches the whole active queue — cheap at single-restaurant scale — rather
// than a bespoke count query, so it can't disagree with the bulk path above).
export async function getQueueInfoForOrder(order: IOrder): Promise<QueueInfo | undefined> {
  if (!QUEUE_STATUSES.includes(order.status as OrderStatus)) return undefined;
  const map = buildQueueMap(await getActiveQueueOrder());
  return map.get(String(order._id));
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

interface CreateOrderInput {
  mode: "online" | "table";
  type: "table-food" | "parcel" | "delivery";
  tableNumber?: string;
  customer?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: {
    menuItemId: string;
    quantity: number;
    appetizers?: { appetizerId: string; quantity: number }[];
  }[];
  note?: string;
  couponCode?: string;
  paymentMethod?: "cod" | "bkash" | "stripe";
}

export async function validateCoupon(code: string, subtotal: number) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon || !coupon.active) {
    return { ok: false as const, message: "Invalid coupon code." };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false as const, message: "This coupon has expired." };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false as const, message: "This coupon has reached its usage limit." };
  }
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return { ok: false as const, message: `Minimum order amount is ৳${coupon.minOrderAmount}.` };
  }

  let discountAmount = Math.round((subtotal * coupon.discountPercent) / 100);
  if (coupon.maxDiscountAmount) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
  }

  return { ok: true as const, discountPercent: coupon.discountPercent, discountAmount };
}

export async function createOrder(input: CreateOrderInput): Promise<IOrder> {
  if (input.items.length === 0) {
    throw new AppError("Order must contain at least one item.", 400);
  }

  const invalidId = input.items.find((i) => !mongoose.isValidObjectId(i.menuItemId));
  if (invalidId) {
    throw new AppError(
      `Item "${invalidId.menuItemId}" is no longer available — please remove it from your cart and try again.`,
      400
    );
  }

  const allAppetizerIds = input.items.flatMap((i) => (i.appetizers ?? []).map((a) => a.appetizerId));
  const invalidAppetizerId = allAppetizerIds.find((id) => !mongoose.isValidObjectId(id));
  if (invalidAppetizerId) {
    throw new AppError(
      `Appetizer "${invalidAppetizerId}" is no longer available — please remove it from your cart and try again.`,
      400
    );
  }

  const menuItems = await MenuItem.find({ _id: { $in: input.items.map((i) => i.menuItemId) } });
  const menuItemMap = new Map(menuItems.map((m) => [String(m._id), m]));

  const appetizers = allAppetizerIds.length
    ? await Appetizer.find({ _id: { $in: allAppetizerIds } })
    : [];
  const appetizerMap = new Map(appetizers.map((a) => [String(a._id), a]));

  const orderItems = input.items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) throw new AppError(`Menu item ${item.menuItemId} not found.`, 400);
    if (!menuItem.available) throw new AppError(`${menuItem.name} is currently unavailable.`, 400);

    const itemAppetizers: IOrderItemAppetizer[] = (item.appetizers ?? []).map((a) => {
      const appetizer = appetizerMap.get(a.appetizerId);
      if (!appetizer) throw new AppError(`Appetizer ${a.appetizerId} not found.`, 400);
      if (!appetizer.available) throw new AppError(`${appetizer.name} is currently unavailable.`, 400);
      return {
        appetizer: appetizer._id,
        name: appetizer.name,
        price: appetizer.price,
        quantity: a.quantity,
        image: appetizer.image,
      };
    });

    return {
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      image: menuItem.image,
      appetizers: itemAppetizers,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => {
    const appetizersTotal = item.appetizers.reduce((s, a) => s + a.price * a.quantity, 0);
    return sum + item.price * item.quantity + appetizersTotal;
  }, 0);

  let discountAmount = 0;
  let couponCode: string | undefined;
  if (input.couponCode) {
    const result = await validateCoupon(input.couponCode, subtotal);
    if (!result.ok) throw new AppError(result.message, 400);
    discountAmount = result.discountAmount;
    couponCode = input.couponCode.trim().toUpperCase();
  }

  const total = subtotal - discountAmount;

  let orderNumber = generateOrderNumber(input.mode);
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await Order.exists({ orderNumber });
    if (!exists) break;
    orderNumber = generateOrderNumber(input.mode);
  }

  const order = await Order.create({
    orderNumber,
    mode: input.mode,
    type: input.type,
    tableNumber: input.tableNumber,
    customer: input.customer,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    items: orderItems,
    note: input.note,
    subtotal,
    discountAmount,
    couponCode,
    total,
    payment: {
      method: input.paymentMethod ?? "cod",
      status: "pending",
      amount: total,
      currency: "BDT",
    },
  });

  if (couponCode) {
    await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } });
  }

  if (order.customerEmail) {
    sendOrderConfirmationEmail(order.customerEmail, order).catch((err) =>
      console.error("[email] order confirmation failed:", err)
    );
  }

  orderEvents.emitNewOrder(order);

  return order;
}

export async function acceptOrder(orderId: string, estimatedMinutes: number, staffId: string): Promise<IOrder> {
  const order = await findOrderByIdOrNumber(orderId);
  if (!order) throw new AppError("Order not found", 404);
  const currentStatus = order.status as OrderStatus;
  if (!NEXT_STATUS[currentStatus].includes("accepted")) {
    throw new AppError(`Cannot accept an order in status "${currentStatus}".`, 400);
  }

  order.status = "accepted";
  order.estimatedMinutes = estimatedMinutes;
  order.acceptedAt = new Date();
  order.acceptedBy = staffId as unknown as IOrder["acceptedBy"];
  await order.save();

  orderEvents.emitOrderAccepted(order);
  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<IOrder> {
  const order = await findOrderByIdOrNumber(orderId);
  if (!order) throw new AppError("Order not found", 404);
  const currentStatus = order.status as OrderStatus;

  if (!NEXT_STATUS[currentStatus].includes(status)) {
    throw new AppError(`Cannot move order from "${currentStatus}" to "${status}".`, 400);
  }

  order.status = status;
  await order.save();

  // Only online (parcel/delivery) orders get a status email, and only on "delivered" —
  // that's the customer's closing receipt. No email for any other status transition,
  // and none at all for dine-in: staff close those tables out in person.
  if (order.customerEmail && status === "delivered" && order.mode === "online") {
    sendOrderCompletedEmail(order.customerEmail, order).catch((err) =>
      console.error("[email] order completed failed:", err)
    );
  }

  orderEvents.emitOrderStatusChanged(order);
  return order;
}

export async function cancelOrder(
  orderId: string,
  cancelledBy: string | undefined,
  reason?: string
): Promise<IOrder> {
  const order = await findOrderByIdOrNumber(orderId);
  if (!order) throw new AppError("Order not found", 404);
  const currentStatus = order.status as OrderStatus;
  if (!NEXT_STATUS[currentStatus].includes("cancelled")) {
    throw new AppError(`Cannot cancel an order in status "${currentStatus}".`, 400);
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  // Anonymous guest cancellations have no user id to attribute this to — leave it unset.
  if (cancelledBy) {
    order.cancelledBy = cancelledBy as unknown as IOrder["cancelledBy"];
  }
  order.cancelReason = reason;
  await order.save();

  orderEvents.emitOrderCancelled(order, cancelledBy ?? "guest");
  return order;
}

export async function assignRider(orderId: string, riderId: string): Promise<IOrder> {
  const order = await findOrderByIdOrNumber(orderId);
  if (!order) throw new AppError("Order not found", 404);

  order.assignedRider = riderId as unknown as IOrder["assignedRider"];
  await order.save();

  return order;
}
