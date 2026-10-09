import { z } from 'zod';
import { objectId, pagination } from './validation.js';
export const orderQuery = pagination
  .extend({
    status: z.enum(['draft', 'confirmed', 'fulfilled', 'cancelled']).optional(),
    search: z.string().trim().max(100).default(''),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to);
export const movementQuery = pagination
  .extend({
    productId: objectId.optional(),
    type: z.enum(['receipt', 'adjustment', 'order-confirmed', 'order-cancelled']).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to);
export const productQuery = pagination
  .extend({
    search: z.string().trim().max(100).default(''),
    categoryId: objectId.optional(),
    supplierId: objectId.optional(),
    active: z.enum(['true', 'false']).optional(),
    sort: z
      .enum(['name', 'skuNormalized', 'quantity', 'unitPriceCents', 'createdAt'])
      .default('name'),
    direction: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
