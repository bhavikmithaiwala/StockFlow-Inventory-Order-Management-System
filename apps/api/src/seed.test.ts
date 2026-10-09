import { beforeAll, afterAll, expect, it } from 'vitest';
import { seedDemo } from './seed.js';
import { Product } from './models/product.js';
import { Order } from './models/order.js';
import { StockMovement } from './models/movement.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';
beforeAll(openTestDatabase);
afterAll(closeTestDatabase);
it('builds a consistent demo through real services and refuses destructive reseeding', async () => {
  expect(await seedDemo()).toEqual({ products: 6, orders: 4 });
  expect((await Product.findOne({ skuNormalized: 'OFFICE-001' }))!.quantity).toBe(36);
  expect((await Product.findOne({ skuNormalized: 'PKG-001' }))!.quantity).toBe(55);
  expect((await Product.findOne({ skuNormalized: 'EQP-002' }))!.quantity).toBe(10);
  expect(await Order.countDocuments({ status: 'fulfilled' })).toBe(1);
  expect(await StockMovement.countDocuments()).toBe(9);
  await expect(seedDemo()).rejects.toThrow('existing work');
  expect(await Product.countDocuments()).toBe(6);
});
