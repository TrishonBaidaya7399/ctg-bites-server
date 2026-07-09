import type { IReview } from "@/models/Review";
import { getIo } from "./io";
import { DASHBOARD_ROOM, roomForRole, STAFF_ROLES } from "./rooms";
import { serializeReview } from "@/utils/serializeReview";

export function emitReviewCreated(review: IReview): void {
  const io = getIo();
  const payload = serializeReview(review);
  STAFF_ROLES.forEach((role) => io.to(roomForRole(role)).emit("review:created", payload));
  io.to(DASHBOARD_ROOM).emit("review:created", payload);
}
