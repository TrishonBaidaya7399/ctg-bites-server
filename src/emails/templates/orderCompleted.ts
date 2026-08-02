import { baseLayout, brandColors } from "./baseLayout";
import { env } from "@/config/env";
import type { IOrder, OrderType } from "@/models/Order";

const TYPE_LABEL: Record<OrderType, string> = {
  "table-food": "Dine-in",
  parcel: "Parcel",
  delivery: "Delivery",
};

// Sent when an online-mode order (parcel or delivery) reaches "delivered" — the
// dine-in equivalent has a staff member closing out the table in person, so it
// doesn't need this notice.
export function orderCompletedEmail(order: IOrder): { subject: string; html: string } {
  const siteUrl = env.PUBLIC_SITE_URL.replace(/\/$/, "");

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:${brandColors.brown};">${item.name} &times;${item.quantity}</td>
        <td style="padding:8px 0;font-size:14px;color:${brandColors.brown};font-weight:600;text-align:right;">&#2547;${item.price * item.quantity}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div style="text-align:center;margin:0 0 16px;">
      <div style="width:64px;height:64px;border-radius:50%;background:${brandColors.greenHerb};margin:0 auto 16px;text-align:center;line-height:64px;">
        <span style="font-size:30px;color:#ffffff;">&#10003;</span>
      </div>
      <span style="display:inline-block;background:${brandColors.cream};color:${brandColors.brownMid};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${TYPE_LABEL[order.type]} &middot; ${order.orderNumber}</span>
    </div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;text-align:center;color:${brandColors.brown};margin:0 0 8px;">Order delivered — bon app&eacute;tit!</h1>
    <p style="margin:0 0 24px;text-align:center;color:${brandColors.brownMid};">Hi ${order.customerName}, your order has arrived. We hope it hit the spot.</p>

    <table role="presentation" width="100%" style="background:${brandColors.cream};border-radius:14px;padding:4px 20px;margin:0 0 20px;">
      ${itemRows}
      <tr>
        <td style="padding:12px 0 8px;border-top:1px solid rgba(44,26,14,0.1);font-weight:700;font-family:'Playfair Display',Georgia,serif;color:${brandColors.brown};">Total</td>
        <td style="padding:12px 0 8px;border-top:1px solid rgba(44,26,14,0.1);font-weight:700;color:${brandColors.orange};text-align:right;">&#2547;${order.total}</td>
      </tr>
    </table>

    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${siteUrl}/orders" style="display:inline-block;background:${brandColors.orange};color:#ffffff;padding:13px 32px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 6px 16px rgba(232,98,42,0.3);">Rate Your Order</a>
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:${brandColors.brownMid};text-align:center;">Craving more already? Your next order is one tap away.</p>
  `;
  return {
    subject: `Delivered — Order ${order.orderNumber} has arrived`,
    html: baseLayout("Order Delivered", body, { preheader: `Order ${order.orderNumber} has been delivered.` }),
  };
}
