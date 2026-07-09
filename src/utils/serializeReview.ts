import type { IReview } from "@/models/Review";

export function serializeReview(review: IReview) {
  return {
    id: String(review._id),
    groupId: review.groupId,
    orderNumber: review.orderNumber,
    menuItemId: review.menuItem ? String(review.menuItem) : undefined,
    itemName: review.itemName,
    itemImage: review.itemImage,
    customerName: review.customerName,
    customerAvatar: review.customerAvatar,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
  };
}
