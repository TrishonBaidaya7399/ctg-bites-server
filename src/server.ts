import http from "http";
import { Server } from "socket.io";
import { env } from "@/config/env";
import { connectDB } from "@/config/db";
import { createApp } from "@/app";
import { initSockets } from "@/sockets";

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()).concat(["http://localhost:3000", "http://localhost:3001"]),
      credentials: true,
    },
  });

  initSockets(io);

  server.listen(env.PORT, () => {
    console.log(`[server] CTG Bites API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
