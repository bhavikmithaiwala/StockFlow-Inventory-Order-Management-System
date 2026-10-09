import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { objectId } from '../validation.js';

export const normalizeSku = (value: string) => value.trim().replace(/\s+/g, '').toUpperCase();
export const productInput = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .transform(normalizeSku)
      .pipe(z.string().regex(/^[A-Z0-9._-]+$/)),
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(2000).default(''),
    categoryId: objectId,
    supplierId: objectId,
    unitPriceCents: z.number().int().min(0).max(100000000),
    reorderLevel: z.number().int().min(0).max(1000000).default(5),
    active: z.boolean().default(true),
  })
  .strict();
const integer = { type: Number, required: true, min: 0, validate: Number.isSafeInteger };
const schema = new Schema(
  {
    skuNormalized: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    unitPriceCents: { ...integer, max: 100000000 },
    quantity: { ...integer, default: 0, max: 1000000 },
    reorderLevel: { ...integer, default: 5, max: 1000000 },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);
schema.index({ active: 1, categoryId: 1, name: 1 });
schema.index({ active: 1, supplierId: 1 });
export const Product = model('Product', schema);
