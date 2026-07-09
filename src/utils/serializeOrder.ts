import type { IOrder } from "@/models/Order";

export function serializeOrder(order: IOrder) {
  return {
    id: order.orderNumber,
    mode: order.mode,
    type: order.type,
    status: order.status,
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
    createdAt: order.createdAt.toISOString(),
  };
}
