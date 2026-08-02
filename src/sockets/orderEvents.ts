import type { IOrder } from "@/models/Order";
import { Order, QUEUE_STATUSES } from "@/models/Order";
import { getIo } from "./io";
import { DASHBOARD_ROOM, roomForOrder, roomForRole, roomForTable, STAFF_ROLES } from "./rooms";
import { serializeOrder } from "@/utils/serializeOrder";

function dashboardTargets(order: IOrder): string[] {
  const rooms = STAFF_ROLES.map(roomForRole);
  rooms.push(DASHBOARD_ROOM);
  rooms.push(roomForOrder(order.orderNumber));
  if (order.tableNumber) rooms.push(roomForTable(order.tableNumber));
  return rooms;
}

// Recomputed from scratch on every order event rather than incrementally adjusted —
// at single-restaurant scale the full active-order set is small, and correctness from
// a fresh read beats bookkeeping a running position count that can drift.
export async function broadcastQueueUpdate(): Promise<void> {
  const io = getIo();

  const activeOrders = await Order.find({ status: { $in: QUEUE_STATUSES } })
    .sort({ _id: 1 })
    .select("_id orderNumber")
    .lean();
  const total = activeOrders.length;
  const updates = activeOrders.map((o, i) => ({
    orderNumber: o.orderNumber,
    queuePosition: i + 1,
    queueTotal: total,
  }));

  // Targeted per-customer push — each customer only learns their own order's position.
  updates.forEach((entry) => {
    io.to(roomForOrder(entry.orderNumber)).emit("order:queue-updated", entry);
  });

  // Batched push for staff — one event carries every active order's position so the
  // admin dashboard/order lists can re-sort without a round trip per order.
  const staffPayload = { total, updates };
  STAFF_ROLES.forEach((role) => io.to(roomForRole(role)).emit("queue:snapshot", staffPayload));
  io.to(DASHBOARD_ROOM).emit("queue:snapshot", staffPayload);
}

export async function broadcastDashboardCounts(): Promise<void> {
  const io = getIo();

  const [pendingCount, onlineActiveCount, tableActiveCount, activeTableNumbers] = await Promise.all([
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ mode: "online", status: { $nin: ["delivered", "cancelled"] } }),
    Order.countDocuments({ mode: "table", status: { $nin: ["delivered", "cancelled"] } }),
    Order.distinct("tableNumber", {
      mode: "table",
      status: { $nin: ["delivered", "cancelled"] },
      tableNumber: { $ne: null },
    }),
  ]);

  io.to(DASHBOARD_ROOM).emit("dashboard:counts", {
    pendingCount,
    activeTableCount: activeTableNumbers.length,
    onlineActiveCount,
    tableActiveCount,
  });
}

export function emitNewOrder(order: IOrder): void {
  const io = getIo();
  const payload = serializeOrder(order);
  STAFF_ROLES.forEach((role) => io.to(roomForRole(role)).emit("order:new", payload));
  broadcastDashboardCounts().catch((err) => console.error("[sockets] dashboard count broadcast failed:", err));
  broadcastQueueUpdate().catch((err) => console.error("[sockets] queue broadcast failed:", err));
}

export function emitOrderAccepted(order: IOrder): void {
  const io = getIo();
  const payload = {
    orderNumber: order.orderNumber,
    status: order.status,
    estimatedMinutes: order.estimatedMinutes,
    acceptedAt: order.acceptedAt?.toISOString(),
  };
  dashboardTargets(order).forEach((room) => io.to(room).emit("order:accepted", payload));
  broadcastDashboardCounts().catch((err) => console.error("[sockets] dashboard count broadcast failed:", err));
  broadcastQueueUpdate().catch((err) => console.error("[sockets] queue broadcast failed:", err));
}

export function emitOrderStatusChanged(order: IOrder): void {
  const io = getIo();
  const payload = { orderNumber: order.orderNumber, status: order.status, updatedAt: order.updatedAt.toISOString() };
  dashboardTargets(order).forEach((room) => io.to(room).emit("order:status-changed", payload));
  broadcastDashboardCounts().catch((err) => console.error("[sockets] dashboard count broadcast failed:", err));
  broadcastQueueUpdate().catch((err) => console.error("[sockets] queue broadcast failed:", err));
}

export function emitOrderCancelled(order: IOrder, cancelledBy: string): void {
  const io = getIo();
  const payload = { orderNumber: order.orderNumber, cancelledBy, reason: order.cancelReason };
  dashboardTargets(order).forEach((room) => io.to(room).emit("order:cancelled", payload));
  broadcastDashboardCounts().catch((err) => console.error("[sockets] dashboard count broadcast failed:", err));
  broadcastQueueUpdate().catch((err) => console.error("[sockets] queue broadcast failed:", err));
}
