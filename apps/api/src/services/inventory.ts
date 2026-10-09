import { z } from 'zod';
import { objectId } from '../validation.js';
import { Product } from '../models/product.js';
import { StockMovement } from '../models/movement.js';
import { ApiError } from '../errors.js';
import { transaction } from './transaction.js';

export const receiptInput = z
  .object({
    productId: objectId,
    quantity: z.number().int().min(1).max(1000000),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export async function receiveStock(input: z.infer<typeof receiptInput>, actorId: string) {
  receiptInput.parse(input);
  return transaction(async (session) => {
    const before = await Product.findOneAndUpdate(
      { _id: input.productId, active: true, quantity: { $lte: 1000000 - input.quantity } },
      { $inc: { quantity: input.quantity } },
      { session, new: false },
    );
    if (!before)
      throw new ApiError(
        409,
        'STOCK_RECEIPT_CONFLICT',
        'Product inactive, missing, or stock capacity exceeded',
      );
    const [movement] = await StockMovement.create(
      [
        {
          productId: before._id,
          type: 'receipt',
          delta: input.quantity,
          beforeQuantity: before.quantity,
          afterQuantity: before.quantity + input.quantity,
          reason: input.reason,
          actorId,
        },
      ],
      { session },
    );
    return {
      productId: before.id,
      quantity: before.quantity + input.quantity,
      movementId: movement!.id,
    };
  });
}
export const adjustmentInput = z
  .object({
    productId: objectId,
    delta: z
      .number()
      .int()
      .min(-1000000)
      .max(1000000)
      .refine((value) => value !== 0),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export async function adjustStock(input: z.infer<typeof adjustmentInput>, actorId: string) {
  adjustmentInput.parse(input);
  return transaction(async (session) => {
    const before = await Product.findOneAndUpdate(
      {
        _id: input.productId,
        active: true,
        quantity: {
          $gte: Math.max(0, -input.delta),
          $lte: Math.min(1000000, 1000000 - input.delta),
        },
      },
      { $inc: { quantity: input.delta } },
      { session, new: false },
    );
    if (!before)
      throw new ApiError(
        409,
        'STOCK_ADJUSTMENT_CONFLICT',
        'Adjustment would create invalid stock, or product is inactive/missing',
      );
    const [movement] = await StockMovement.create(
      [
        {
          productId: before._id,
          type: 'adjustment',
          delta: input.delta,
          beforeQuantity: before.quantity,
          afterQuantity: before.quantity + input.delta,
          reason: input.reason,
          actorId,
        },
      ],
      { session },
    );
    return {
      productId: before.id,
      quantity: before.quantity + input.delta,
      movementId: movement!.id,
    };
  });
}
