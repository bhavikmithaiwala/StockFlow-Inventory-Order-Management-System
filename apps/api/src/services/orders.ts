import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { objectId } from '../validation.js';
import { Product } from '../models/product.js';
import { Order, calculateTotal, assertTransition } from '../models/order.js';
import { ApiError } from '../errors.js';
import { StockMovement } from '../models/movement.js';
import { transaction } from './transaction.js';

export const draftInput = z
  .object({
    items: z
      .array(
        z.object({ productId: objectId, quantity: z.number().int().min(1).max(1000000) }).strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (input) => new Set(input.items.map((item) => item.productId)).size === input.items.length,
    'Each product must appear once',
  );
export async function draftLines(input: z.infer<typeof draftInput>) {
  const products = await Product.find({
    _id: { $in: input.items.map((item) => item.productId) },
    active: true,
  });
  return input.items.map((item) => {
    const product = products.find((product) => product.id === item.productId);
    if (!product)
      throw new ApiError(409, 'PRODUCT_UNAVAILABLE', 'Order product is missing or inactive');
    return {
      productId: product._id,
      quantity: item.quantity,
      skuSnapshot: product.skuNormalized,
      nameSnapshot: product.name,
      unitPriceCents: product.unitPriceCents,
    };
  });
}
export async function createDraft(input: z.infer<typeof draftInput>, actorId: string) {
  draftInput.parse(input);
  const items = await draftLines(input);
  return Order.create({
    orderNumber: `SF-${randomUUID().toUpperCase()}`,
    status: 'draft',
    items,
    totalCents: calculateTotal(items),
    createdBy: actorId,
    history: [{ action: 'created', actorId }],
  });
}
export async function editDraft(id: string, input: z.infer<typeof draftInput>, actorId: string) {
  draftInput.parse(input);
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (order.status !== 'draft')
    throw new ApiError(409, 'INVALID_ORDER_STATUS', 'Only draft orders can be edited');
  const items = await draftLines(input);
  const updated = await Order.findOneAndUpdate(
    { _id: id, status: 'draft', __v: order.__v },
    {
      $set: { items, totalCents: calculateTotal(items) },
      $inc: { __v: 1 },
      $push: { history: { action: 'edited', actorId, at: new Date() } },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, 'ORDER_CHANGED', 'Order changed; reload before editing');
  return updated;
}
export async function confirmOrder(id: string, actorId: string) {
  return transaction(async (session) => {
    const snapshot = await Order.findById(id).session(session);
    if (!snapshot) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    assertTransition(snapshot.status, 'confirmed');
    const order = await Order.findOneAndUpdate(
      { _id: id, status: 'draft', __v: snapshot.__v },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!order) throw new ApiError(409, 'ORDER_CHANGED', 'Order changed; retry after reloading');
    const items = [];
    for (const line of [...order.items].sort((a, b) =>
      a.productId.toString().localeCompare(b.productId.toString()),
    )) {
      const before = await Product.findOneAndUpdate(
        { _id: line.productId, active: true, quantity: { $gte: line.quantity } },
        { $inc: { quantity: -line.quantity } },
        { session, new: false },
      );
      if (!before)
        throw new ApiError(
          409,
          'INSUFFICIENT_STOCK',
          'A product is inactive, missing, or has insufficient stock',
        );
      items.push({
        productId: before._id,
        quantity: line.quantity,
        skuSnapshot: before.skuNormalized,
        nameSnapshot: before.name,
        unitPriceCents: before.unitPriceCents,
      });
      await StockMovement.create(
        [
          {
            productId: before._id,
            type: 'order-confirmed',
            delta: -line.quantity,
            beforeQuantity: before.quantity,
            afterQuantity: before.quantity - line.quantity,
            reason: `Confirmed ${order.orderNumber}`,
            actorId,
            orderId: order._id,
          },
        ],
        { session },
      );
    }
    order.set({
      items,
      totalCents: calculateTotal(items),
      status: 'confirmed',
      confirmedAt: new Date(),
    });
    order.history.push({ action: 'confirmed', actorId, at: new Date(), reason: '' });
    return order.save({ session });
  });
}
export async function fulfillOrder(id: string, actorId: string) {
  const order = await Order.findOneAndUpdate(
    { _id: id, status: 'confirmed' },
    {
      $set: { status: 'fulfilled', fulfilledAt: new Date() },
      $inc: { __v: 1 },
      $push: { history: { action: 'fulfilled', actorId, at: new Date() } },
    },
    { new: true, runValidators: true },
  );
  if (!order) {
    const existing = await Order.findById(id);
    if (!existing) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    throw new ApiError(409, 'INVALID_ORDER_STATUS', 'Only confirmed orders can be fulfilled');
  }
  return order;
}
