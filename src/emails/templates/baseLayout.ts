const COLORS = {
  orange: "#E8622A",
  orangeLight: "#F07B45",
  cream: "#F5F0E8",
  brown: "#2C1A0E",
  brownMid: "#5C3D2E",
  greenHerb: "#4A7C59",
};

export function baseLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:${COLORS.cream};font-family:'Inter',Arial,sans-serif;color:${COLORS.brown};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(44,26,14,0.08);">
          <tr>
            <td style="background:linear-gradient(90deg, ${COLORS.orange}, ${COLORS.orangeLight});height:6px;"></td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;text-align:center;">
              <div style="font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700;color:${COLORS.brown};">CTG Bites</div>
              <div style="font-size:12px;color:${COLORS.brownMid};letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Authentic Chittagong Cuisine</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;font-size:15px;line-height:1.6;color:${COLORS.brown};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:${COLORS.brown};padding:20px 32px;text-align:center;">
              <div style="font-size:12px;color:${COLORS.cream};opacity:0.8;">CTG Bites &middot; Chittagong, Bangladesh</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const brandColors = COLORS;
