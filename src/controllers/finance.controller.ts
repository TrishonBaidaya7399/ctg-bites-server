import type { Request, Response } from "express";
import { z } from "zod";
import {
  Order,
  ORDER_MODES,
  ORDER_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/models/Order";
import { Expense, EXPENSE_CATEGORIES } from "@/models/Expense";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/appError";
import { generateOrderNumber } from "@/utils/generateOrderNumber";
import { serializeFinanceOrder } from "@/utils/serializeOrder";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateRange(query: Request["query"]): { from: Date; to: Date; days: number } {
  const days = Math.min(Math.max(Number(query.days) || 30, 1), 365);
  const to = query.to ? new Date(String(query.to)) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = query.from
    ? new Date(String(query.from))
    : new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  from.setHours(0, 0, 0, 0);
  return { from, to, days };
}

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDateRange(req.query);

  const [revenueByDay, expensesByDay, revenueByMode, revenueByPaymentMethod, totalsAgg, expenseTotalAgg] =
    await Promise.all([
      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, expenses: { $sum: "$amount" } } },
      ]),
      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: "$mode", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: "$payment.method", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" }, orderCount: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
      ]),
    ]);

  const revenueMap = new Map(revenueByDay.map((r) => [r._id as string, r.revenue as number]));
  const expenseMap = new Map(expensesByDay.map((r) => [r._id as string, r.expenses as number]));

  const series: { date: string; revenue: number; expenses: number; profit: number }[] = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    const revenue = revenueMap.get(key) ?? 0;
    const expenses = expenseMap.get(key) ?? 0;
    series.push({ date: key, revenue, expenses, profit: revenue - expenses });
  }

  const totalRevenue = totalsAgg[0]?.totalRevenue ?? 0;
  const orderCount = totalsAgg[0]?.orderCount ?? 0;
  const totalExpenses = expenseTotalAgg[0]?.totalExpenses ?? 0;

  res.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    series,
    totals: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      orderCount,
      averageOrderValue: orderCount ? totalRevenue / orderCount : 0,
    },
    byMode: revenueByMode.map((r) => ({ mode: r._id, revenue: r.revenue, orders: r.orders })),
    byPaymentMethod: revenueByPaymentMethod.map((r) => ({ method: r._id, revenue: r.revenue, orders: r.orders })),
  });
});

const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  from: z.string().optional(),
  to: z.string().optional(),
  mode: z.enum(ORDER_MODES).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  source: z.enum(["site", "manual"]).optional(),
  search: z.string().optional(),
});

export const listFinanceOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = listOrdersQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: new Date(query.from) } : {}),
      ...(query.to ? { $lte: new Date(query.to) } : {}),
    };
  }
  if (query.mode) filter.mode = query.mode;
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.search) {
    filter.$or = [
      { orderNumber: { $regex: query.search, $options: "i" } },
      { customerName: { $regex: query.search, $options: "i" } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    orders: orders.map((o) => serializeFinanceOrder(o)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

const manualOrderSchema = z.object({
  customerName: z.string().min(1).default("Walk-in"),
  description: z.string().min(1),
  amount: z.number().positive(),
  mode: z.enum(ORDER_MODES).default("table"),
  type: z.enum(ORDER_TYPES).default("table-food"),
  status: z.enum(ORDER_STATUSES).default("delivered"),
  paymentMethod: z.enum(PAYMENT_METHODS).default("cod"),
  date: z.string().optional(),
  note: z.string().optional(),
});

export const createManualOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = manualOrderSchema.parse(req.body);

  let orderNumber = generateOrderNumber(body.mode);
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await Order.exists({ orderNumber });
    if (!exists) break;
    orderNumber = generateOrderNumber(body.mode);
  }

  const order = await Order.create({
    orderNumber,
    mode: body.mode,
    type: body.type,
    status: body.status,
    customerName: body.customerName,
    items: [{ name: body.description, price: body.amount, quantity: 1, image: "" }],
    note: body.note,
    subtotal: body.amount,
    discountAmount: 0,
    total: body.amount,
    payment: { method: body.paymentMethod, status: "paid", amount: body.amount, currency: "BDT" },
    source: "manual",
    createdBy: req.user!.id,
  });

  // Manual entries log a sale that already happened — backdate createdAt to when it
  // actually occurred instead of when it was typed in, so it lands in the right day's
  // revenue bucket. Bypasses the timestamps plugin for this one write only.
  if (body.date) {
    order.set({ createdAt: new Date(body.date) });
    await order.save({ timestamps: false });
  }

  res.status(201).json({ order: serializeFinanceOrder(order) });
});

const updateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  note: z.string().optional(),
  total: z.number().positive().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  date: z.string().optional(),
});

export const updateFinanceOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = updateOrderSchema.parse(req.body);
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (body.customerName !== undefined) order.customerName = body.customerName;
  if (body.customerPhone !== undefined) order.customerPhone = body.customerPhone;
  if (body.customerAddress !== undefined) order.customerAddress = body.customerAddress;
  if (body.note !== undefined) order.note = body.note;
  if (body.status !== undefined) order.status = body.status;
  if (body.paymentMethod !== undefined) order.payment.method = body.paymentMethod;
  if (body.paymentStatus !== undefined) order.payment.status = body.paymentStatus;
  if (body.total !== undefined) {
    // Finance corrections adjust the bottom line directly rather than re-deriving it
    // from items — subtotal/discount stay as a record of the original breakdown.
    order.total = body.total;
    order.payment.amount = body.total;
  }

  if (body.date) {
    order.set({ createdAt: new Date(body.date) });
    await order.save({ timestamps: false });
  } else {
    await order.save();
  }

  res.json({ order: serializeFinanceOrder(order) });
});

export const deleteFinanceOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw new AppError("Order not found", 404);
  res.status(204).send();
});

const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
});

function serializeExpense(expense: InstanceType<typeof Expense>) {
  return {
    id: String(expense._id),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    date: expense.date.toISOString(),
    vendor: expense.vendor,
    note: expense.note,
    createdBy: String(expense.createdBy),
    createdAt: expense.createdAt.toISOString(),
  };
}

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const query = listExpensesQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};

  if (query.from || query.to) {
    filter.date = {
      ...(query.from ? { $gte: new Date(query.from) } : {}),
      ...(query.to ? { $lte: new Date(query.to) } : {}),
    };
  }
  if (query.category) filter.category = query.category;

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Expense.countDocuments(filter),
  ]);

  res.json({
    expenses: expenses.map(serializeExpense),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional(),
  vendor: z.string().optional(),
  note: z.string().optional(),
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const body = createExpenseSchema.parse(req.body);
  const expense = await Expense.create({
    category: body.category,
    description: body.description,
    amount: body.amount,
    date: body.date ? new Date(body.date) : new Date(),
    vendor: body.vendor,
    note: body.note,
    createdBy: req.user!.id,
  });
  res.status(201).json({ expense: serializeExpense(expense) });
});

const updateExpenseSchema = createExpenseSchema.partial();

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const body = updateExpenseSchema.parse(req.body);
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new AppError("Expense not found", 404);

  if (body.category !== undefined) expense.category = body.category;
  if (body.description !== undefined) expense.description = body.description;
  if (body.amount !== undefined) expense.amount = body.amount;
  if (body.date !== undefined) expense.date = new Date(body.date);
  if (body.vendor !== undefined) expense.vendor = body.vendor;
  if (body.note !== undefined) expense.note = body.note;
  await expense.save();

  res.json({ expense: serializeExpense(expense) });
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) throw new AppError("Expense not found", 404);
  res.status(204).send();
});
