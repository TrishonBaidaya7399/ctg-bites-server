import { baseLayout, brandColors } from "./baseLayout";
import type { IRecipe } from "@/models/Recipe";

export function recipeDripEmail(recipe: IRecipe, unsubscribeUrl: string): { subject: string; html: string } {
  const ingredientRows = recipe.ingredients
    .slice(0, 8)
    .map((ing) => `<li style="margin-bottom:4px;">${ing}</li>`)
    .join("");

  const body = `
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;color:${brandColors.brown};margin:0 0 4px;">Today's Recipe: ${recipe.title}</h1>
    <p style="margin:0 0 16px;color:${brandColors.brownMid};">${recipe.excerpt}</p>
    <img src="${recipe.image}" width="456" alt="${recipe.title}" style="width:100%;max-width:456px;height:auto;border-radius:16px;display:block;margin:0 0 16px;" />
    <table role="presentation" width="100%" style="margin:0 0 16px;">
      <tr>
        <td style="font-size:13px;color:${brandColors.brownMid};padding-right:16px;">⏱ ${recipe.time}</td>
        <td style="font-size:13px;color:${brandColors.brownMid};padding-right:16px;">👥 Serves ${recipe.servings}</td>
        <td style="font-size:13px;color:${brandColors.brownMid};">📊 ${recipe.difficulty}</td>
      </tr>
    </table>
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:16px;color:${brandColors.brown};margin:0 0 8px;">Ingredients</h2>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:${brandColors.brown};">
      ${ingredientRows}
    </ul>
    <p style="margin:20px 0 0;font-size:13px;color:${brandColors.brownMid};">We'll send you another recipe tomorrow. Bon appétit!</p>
    <p style="margin:16px 0 0;font-size:11px;color:${brandColors.brownMid};opacity:0.7;">
      <a href="${unsubscribeUrl}" style="color:${brandColors.brownMid};">Unsubscribe</a> from these daily recipe emails.
    </p>
  `;
  return { subject: `Today's Recipe — ${recipe.title}`, html: baseLayout("Today's Recipe", body) };
}
