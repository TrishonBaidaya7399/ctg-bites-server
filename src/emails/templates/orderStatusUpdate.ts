import { baseLayout, brandColors } from "./baseLayout";
import type { OrderStatus } from "@/models/Order";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Received",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function orderStatusUpdateEmail(
  orderNumber: string,
  status: OrderStatus
): { subject: string; html: string } {
  const label = STATUS_LABEL[status];
  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:${brandColors.brown};margin:0 0 12px;">Order ${orderNumber}: ${label}</h1>
    <p style="margin:0;">Your order status has been updated to <strong>${label}</strong>.</p>
  `;
  return { subject: `Order ${orderNumber} — ${label}`, html: baseLayout("Order Update", body) };
}
