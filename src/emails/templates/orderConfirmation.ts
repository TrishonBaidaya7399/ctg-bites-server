import { baseLayout, brandColors } from "./baseLayout";
import type { IOrder } from "@/models/Order";

export function orderConfirmationEmail(order: IOrder): { subject: string; html: string } {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${brandColors.brown};">${item.name} &times;${item.quantity}</td>
        <td style="padding:6px 0;font-size:14px;color:${brandColors.orange};font-weight:600;text-align:right;">&#2547;${item.price * item.quantity}</td>
      </tr>`
    )
    .join("");

  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:${brandColors.brown};margin:0 0 4px;">Order Confirmed</h1>
    <p style="margin:0 0 16px;color:${brandColors.brownMid};">Order <strong>${order.orderNumber}</strong> is in — we're firing up the kitchen.</p>
    <table role="presentation" width="100%" style="border-top:1px solid #EDE8DF;border-bottom:1px solid #EDE8DF;padding:12px 0;margin:16px 0;">
      ${itemRows}
    </table>
    <table role="presentation" width="100%">
      <tr>
        <td style="font-weight:700;font-family:'Playfair Display',Georgia,serif;color:${brandColors.brown};">Total</td>
        <td style="font-weight:700;color:${brandColors.orange};text-align:right;">&#2547;${order.total}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${brandColors.brownMid};">We'll email you again once your order is on its way.</p>
  `;
  return { subject: `Order Confirmed — ${order.orderNumber}`, html: baseLayout("Order Confirmed", body) };
}
