import { expect, it } from 'vitest';
import { Category, categoryInput, normalizeName } from './category.js';
it('normalizes category uniqueness and rejects blank/unknown input', () => {
  expect(normalizeName('  Office   Supplies ')).toBe('office supplies');
  expect(categoryInput.safeParse({ name: ' ' }).success).toBe(false);
  expect(categoryInput.safeParse({ name: 'Office', role: 'admin' }).success).toBe(false);
  expect(Category.schema.indexes()).toContainEqual([
    { normalizedName: 1 },
    { unique: true, background: true },
  ]);
});
