import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { objectId } from '../validation.js';
import { Product } from '../models/product.js';
import { Order, calculateTotal } from '../models/order.js';
import { ApiError } from '../errors.js';

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
