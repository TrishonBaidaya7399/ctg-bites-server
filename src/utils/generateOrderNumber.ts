import type { OrderMode } from "@/models/Order";

export function generateOrderNumber(mode: OrderMode): string {
  const prefix = mode === "online" ? "ONL" : "TBL";
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${suffix}`;
}
