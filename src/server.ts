import http from "http";
import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { createApp } from "@/app";

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.log(`[server] CTG Bites API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
