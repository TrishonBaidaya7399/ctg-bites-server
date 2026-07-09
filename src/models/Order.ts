import mongoose, { Schema, Document, Types } from "mongoose";

export const ORDER_MODES = ["online", "table"] as const;
export const ORDER_TYPES = ["table-food", "parcel", "delivery"] as const;
export const ORDER_STATUSES = ["pending", "accepted", "preparing", "ready", "delivered", "cancelled"] as const;
export const PAYMENT_METHODS = ["cod", "bkash", "stripe"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export type OrderMode = (typeof ORDER_MODES)[number];
export type OrderType = (typeof ORDER_TYPES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface IOrderItemAppetizer {
  appetizer?: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrderItem {
  menuItem?: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image: string;
  appetizers?: IOrderItemAppetizer[];
}

export interface IOrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionId?: string;
  paidAt?: Date;
  bkash?: {
    paymentID?: string;
    trxID?: string;
    customerMsisdn?: string;
  };
  stripe?: {
    paymentIntentId?: string;
    clientSecret?: string;
  };
}

export interface IOrder extends Document {
  orderNumber: string;
  mode: OrderMode;
  type: OrderType;
  status: OrderStatus;
  tableNumber?: string;
  customer?: Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: IOrderItem[];
  note?: string;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  total: number;
  estimatedMinutes: number;
  acceptedAt?: Date;
  acceptedBy?: Types.ObjectId;
  assignedRider?: Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;
  payment: IOrderPayment;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemAppetizerSchema = new Schema<IOrderItemAppetizer>(
  {
    appetizer: { type: Schema.Types.ObjectId, ref: "Appetizer" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { _id: false }
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
    appetizers: [OrderItemAppetizerSchema],
  },
  { _id: false }
);

const OrderPaymentSchema = new Schema<IOrderPayment>(
  {
    method: { type: String, enum: PAYMENT_METHODS, required: true, default: "cod" },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, default: "pending" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "BDT" },
    transactionId: { type: String },
    paidAt: { type: Date },
    bkash: {
      paymentID: String,
      trxID: String,
      customerMsisdn: String,
    },
    stripe: {
      paymentIntentId: String,
      clientSecret: String,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    mode: { type: String, enum: ORDER_MODES, required: true },
    type: { type: String, enum: ORDER_TYPES, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    tableNumber: { type: String },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerAddress: { type: String },
    items: [OrderItemSchema],
    note: { type: String },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    total: { type: Number, required: true },
    estimatedMinutes: { type: Number, default: 10 },
    acceptedAt: { type: Date },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignedRider: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String },
    payment: { type: OrderPaymentSchema, required: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

OrderSchema.index({ mode: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
