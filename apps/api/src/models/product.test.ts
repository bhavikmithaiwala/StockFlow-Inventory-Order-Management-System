import { expect, it } from 'vitest';
import { normalizeSku, productInput, Product } from './product.js';
it('normalizes SKUs and rejects client stock and fractional money', () => {
  expect(normalizeSku(' sku- 1001 ')).toBe('SKU-1001');
  const input = {
    sku: 'SKU-1',
    name: 'Notebook',
    categoryId: 'a'.repeat(24),
    supplierId: 'b'.repeat(24),
    unitPriceCents: 350,
  };
  expect(productInput.parse(input).reorderLevel).toBe(5);
  expect(productInput.safeParse({ ...input, quantity: 999 }).success).toBe(false);
  expect(productInput.safeParse({ ...input, unitPriceCents: 1.5 }).success).toBe(false);
  expect(
    new Product({ ...input, skuNormalized: input.sku, quantity: -1 }).validateSync()?.errors[
      'quantity'
    ],
  ).toBeDefined();
});
