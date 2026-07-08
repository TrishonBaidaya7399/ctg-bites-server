import type { Request, Response } from "express";
import { Order } from "@/models/Order";
import { asyncHandler } from "@/utils/asyncHandler";

export const dashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [ordersToday, pending, deliveredToday, activeTables] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ status: "pending" }),
    Order.find({ createdAt: { $gte: startOfToday }, status: "delivered" }),
    Order.distinct("tableNumber", {
      mode: "table",
      status: { $nin: ["delivered", "cancelled"] },
      tableNumber: { $ne: null },
    }),
  ]);

  const revenueToday = deliveredToday.reduce((sum, o) => sum + o.total, 0);

  res.json({
    ordersToday,
    pending,
    revenueToday,
    activeTables: activeTables.length,
  });
});

export const revenueReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const filter: Record<string, unknown> = { status: "delivered" };

  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: new Date(from as string) } : {}),
      ...(to ? { $lte: new Date(to as string) } : {}),
    };
  }

  const orders = await Order.find(filter);
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;

  res.json({ totalRevenue, orderCount, averageOrderValue: orderCount ? totalRevenue / orderCount : 0 });
});

export const salesSummary = asyncHandler(async (req: Request, res: Response) => {
  const byCategory = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        totalQuantity: { $sum: "$items.quantity" },
        totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 },
  ]);

  res.json({ items: byCategory });
});
