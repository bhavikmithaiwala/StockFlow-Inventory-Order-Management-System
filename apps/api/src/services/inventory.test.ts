import { beforeAll, afterAll, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Product } from '../models/product.js';
import { StockMovement } from '../models/movement.js';
import { openTestDatabase, closeTestDatabase } from '../test-database.js';
import { receiveStock, adjustStock } from './inventory.js';
import request from 'supertest';
import { createApp } from '../app.js';
import { User } from '../models/user.js';
import { Session } from '../models/session.js';
import { tokenHash } from '../auth.js';
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
it('allows staff receipts but denies adjustment and actor spoofing at the API', async () => {
  const user = await User.create({
    _id: actorId,
    name: 'Staff',
    emailNormalized: 'inventory@example.test',
    passwordHash: 'not-used-in-session-test',
    role: 'staff',
  });
  const token = 'e'.repeat(64);
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 60000),
  });
  const app = createApp();
  expect(
    (
      await request(app)
        .post('/api/inventory/receive')
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ productId, quantity: 2, reason: 'Second delivery' })
    ).status,
  ).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/inventory/adjust')
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ productId, delta: -1, reason: 'Attempt' })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/inventory/receive')
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ productId, quantity: 1, reason: 'Attempt', actorId })
    ).status,
  ).toBe(400);
});
