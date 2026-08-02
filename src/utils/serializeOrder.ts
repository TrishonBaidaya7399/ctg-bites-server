import type { IOrder } from "@/models/Order";

export interface QueueInfo {
  position: number;
  total: number;
}

export function serializeOrder(order: IOrder, queue?: QueueInfo) {
  return {
    id: order.orderNumber,
    mode: order.mode,
    type: order.type,
    status: order.status,
    queuePosition: queue?.position,
    queueTotal: queue?.total,
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    items: order.items.map((item) => ({
      menuItemId: item.menuItem ? String(item.menuItem) : "",
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      appetizers: (item.appetizers ?? []).map((a) => ({
        appetizerId: a.appetizer ? String(a.appetizer) : "",
        name: a.name,
        price: a.price,
        quantity: a.quantity,
        image: a.image,
      })),
    })),
    note: order.note,
    total: order.total,
    estimatedMinutes: order.estimatedMinutes,
    acceptedAt: order.acceptedAt?.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString(),
    cancelReason: order.cancelReason,
    reviewedAt: order.reviewedAt?.toISOString(),
    source: order.source,
    createdAt: order.createdAt.toISOString(),
  };
}

// Finance-only fields (payment/discount breakdown, who logged a manual entry) layered
// on top of the shared shape — kept separate so the customer-facing endpoints
// (track/lookup/mine) don't grow fields they have no use for.
export function serializeFinanceOrder(order: IOrder, queue?: QueueInfo) {
  return {
    ...serializeOrder(order, queue),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    couponCode: order.couponCode,
    paymentMethod: order.payment.method,
    paymentStatus: order.payment.status,
    createdBy: order.createdBy ? String(order.createdBy) : undefined,
  };
}
