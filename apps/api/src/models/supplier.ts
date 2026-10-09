import { Schema, model } from 'mongoose';
import { z } from 'zod';

export const supplierInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    contactName: z.string().trim().max(100).default(''),
    email: z.union([z.email(), z.literal('')]).default(''),
    phone: z.string().trim().max(40).default(''),
    address: z.string().trim().max(500).default(''),
    active: z.boolean().default(true),
  })
  .strict();
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ active: 1, name: 1 });
export const Supplier = model('Supplier', schema);
