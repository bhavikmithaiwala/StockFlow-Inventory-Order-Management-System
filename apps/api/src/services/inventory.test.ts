import { beforeAll, afterAll, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Product } from '../models/product.js';
import { StockMovement } from '../models/movement.js';
import { openTestDatabase, closeTestDatabase } from '../test-database.js';
import { receiveStock, adjustStock } from './inventory.js';
let productId: string;
const actorId = new mongoose.Types.ObjectId().toString();
beforeAll(async () => {
  await openTestDatabase();
  const product = await Product.create({
    skuNormalized: 'STOCK-1',
    name: 'Notebook',
    categoryId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    unitPriceCents: 350,
  });
  productId = product.id;
});
afterAll(closeTestDatabase);
it('receives stock and commits a reconciling movement atomically', async () => {
  await receiveStock({ productId, quantity: 5, reason: 'Delivery received' }, actorId);
  expect((await Product.findById(productId))?.quantity).toBe(5);
  const movement = await StockMovement.findOne({ productId });
  expect(movement?.delta).toBe(5);
  expect(movement?.beforeQuantity).toBe(0);
  expect(movement?.afterQuantity).toBe(5);
  await expect(
    receiveStock({ productId, quantity: 1000000, reason: 'Over capacity' }, actorId),
  ).rejects.toThrow('capacity');
  expect(await StockMovement.countDocuments()).toBe(1);
});
it('adjusts signed stock with a reason and rolls back excessive reductions', async () => {
  await adjustStock({ productId, delta: -2, reason: 'Damaged units' }, actorId);
  expect((await Product.findById(productId))?.quantity).toBe(3);
  await expect(adjustStock({ productId, delta: -4, reason: 'Too many' }, actorId)).rejects.toThrow(
    'invalid stock',
  );
  expect((await Product.findById(productId))?.quantity).toBe(3);
  expect(await StockMovement.countDocuments()).toBe(2);
  const movement = await StockMovement.findOne({ type: 'adjustment' });
  expect(movement?.beforeQuantity).toBe(5);
  expect(movement?.afterQuantity).toBe(3);
});
