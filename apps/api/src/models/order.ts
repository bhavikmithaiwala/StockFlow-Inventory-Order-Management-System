import { Schema, model } from 'mongoose';
import { ApiError } from '../errors.js';

export type OrderStatus = 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
export function assertTransition(from: string, to: OrderStatus) {
  const allowed: Record<string, string[]> = {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['fulfilled', 'cancelled'],
    fulfilled: [],
    cancelled: [],
  };
  if (!allowed[from]?.includes(to))
    throw new ApiError(409, 'INVALID_ORDER_STATUS', `Cannot change ${from} order to ${to}`);
}
export function calculateTotal(items: { quantity: number; unitPriceCents: number }[]) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  if (!Number.isSafeInteger(total) || total < 0)
    throw new ApiError(400, 'MONEY_OVERFLOW', 'Order total exceeds supported integer cents');
  return total;
}
const line = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    skuSnapshot: { type: String, required: true },
    nameSnapshot: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 1000000,
      validate: Number.isSafeInteger,
    },
    unitPriceCents: {
      type: Number,
      required: true,
      min: 0,
      max: 100000000,
      validate: Number.isSafeInteger,
    },
  },
  { _id: false },
);
const event = new Schema(
  {
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  },
  { _id: false },
);
const schema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'fulfilled', 'cancelled'],
      default: 'draft',
      required: true,
    },
    items: {
      type: [line],
      required: true,
      validate: (items: unknown[]) => items.length > 0 && items.length <= 100,
    },
    totalCents: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    confirmedAt: Date,
    fulfilledAt: Date,
    cancelledAt: Date,
    cancellationReason: { type: String, default: '' },
    history: { type: [event], default: [] },
  },
  { timestamps: true },
);
schema.index({ status: 1, createdAt: -1 });
schema.index({ createdBy: 1, createdAt: -1 });
export const Order = model('Order', schema);
