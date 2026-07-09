import { baseLayout, brandColors } from "./baseLayout";

export interface ReviewedItem {
  name: string;
  image: string;
  rating: number;
}

function starString(rating: number): string {
  return "&#9733;".repeat(rating) + "&#9734;".repeat(5 - rating);
}

export function reviewThankYouEmail(
  name: string,
  items: ReviewedItem[]
): { subject: string; html: string } {
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;width:56px;">
          <img src="${item.image}" width="48" height="48" alt="${item.name}" style="border-radius:10px;object-fit:cover;display:block;" />
        </td>
        <td style="padding:8px 0 8px 12px;">
          <div style="font-size:14px;color:${brandColors.brown};font-weight:600;">${item.name}</div>
          <div style="font-size:14px;color:#F0A83D;letter-spacing:1px;">${starString(item.rating)}</div>
        </td>
      </tr>`
    )
    .join("");

  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:${brandColors.brown};margin:0 0 4px;">Thank you, ${name}!</h1>
    <p style="margin:0 0 16px;color:${brandColors.brownMid};">We really appreciate you taking the time to share your thoughts. Your review helps us keep every plate up to the CTG Bites standard.</p>
    <table role="presentation" width="100%" style="border-top:1px solid #EDE8DF;border-bottom:1px solid #EDE8DF;padding:8px 0;margin:16px 0;">
      ${itemRows}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${brandColors.brownMid};">See you again soon — same bold flavours, same warm welcome.</p>
  `;
  return { subject: "Thanks for your review! — CTG Bites", html: baseLayout("Thanks for your review!", body) };
}
