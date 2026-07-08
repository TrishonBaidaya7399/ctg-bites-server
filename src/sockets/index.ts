import type { Server, Socket } from "socket.io";
import { verifyAccessToken } from "@/services/auth.service";
import { Order } from "@/models/Order";
import { Table } from "@/models/Table";
import { roomForOrder, roomForRole, roomForTable, DASHBOARD_ROOM, STAFF_ROLES } from "./rooms";
import { setIo } from "./io";

const STAFF_ROLE_SET = new Set<string>(STAFF_ROLES);

export function initSockets(io: Server): void {
  setIo(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next();
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const role = socket.data.role as string | undefined;

    if (role && STAFF_ROLE_SET.has(role)) {
      socket.join(roomForRole(role));
      socket.join(DASHBOARD_ROOM);
    }

    socket.on("join:order", async ({ orderNumber }: { orderNumber?: string }) => {
      if (!orderNumber) return;
      const exists = await Order.exists({ orderNumber });
      if (exists) socket.join(roomForOrder(orderNumber));
    });

    socket.on("join:table", async ({ qrToken }: { qrToken?: string }) => {
      if (!qrToken) return;
      const table = await Table.findOne({ qrToken, isActive: true });
      if (table) socket.join(roomForTable(table.number));
    });
  });
}
