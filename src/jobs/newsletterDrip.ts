import cron from "node-cron";
import { sendDailyRecipeDrip } from "@/services/newsletter.service";

// Runs once a day at 09:00 server time — sends each active subscriber the next recipe
// they haven't received yet.
export function scheduleNewsletterDrip(): void {
  cron.schedule("0 9 * * *", () => {
    sendDailyRecipeDrip()
      .then(({ sent, skipped }) => console.log(`[newsletter] daily drip: sent ${sent}, skipped ${skipped}`))
      .catch((err) => console.error("[newsletter] daily drip failed:", err));
  });
}
