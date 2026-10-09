import { Schema, model } from 'mongoose';
import { z } from 'zod';

export const categoryInput = z
  .object({ name: z.string().trim().min(1).max(100), active: z.boolean().default(true) })
  .strict();
export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    normalizedName: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);
schema.pre('validate', function () {
  if (this.name) this.normalizedName = normalizeName(this.name);
});
export const Category = model('Category', schema);
