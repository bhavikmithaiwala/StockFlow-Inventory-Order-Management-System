import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { Product } from './models/product.js';
import { Order } from './models/order.js';
import { StockMovement } from './models/movement.js';
import { tokenHash } from './auth.js';
import { createDraft } from './services/orders.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';
const app = createApp();
const token = '1'.repeat(64);
let actorId: string;
const baseProduct = {
  name: 'Concurrency fixture',
  categoryId: new mongoose.Types.ObjectId(),
  supplierId: new mongoose.Types.ObjectId(),
  unitPriceCents: 199,
};
const action = (id: string, name: string, body: unknown = {}) =>
  request(app)
    .post(`/api/orders/${id}/${name}`)
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send(body);
beforeAll(async () => {
  await openTestDatabase();
  const user = await User.create({
    name: 'Race Staff',
    emailNormalized: 'race@example.test',
    passwordHash: 'not-used-in-session-test',
    role: 'staff',
  });
  actorId = user.id;
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 600000),
  });
});
afterAll(closeTestDatabase);
it('API: two distinct orders cannot both consume the last stock', async () => {
  const product = await Product.create({ ...baseProduct, skuNormalized: 'API-RACE', quantity: 5 });
  const a = await createDraft({ items: [{ productId: product.id, quantity: 4 }] }, actorId);
  const b = await createDraft({ items: [{ productId: product.id, quantity: 4 }] }, actorId);
  const outcomes = await Promise.all([action(a.id, 'confirm'), action(b.id, 'confirm')]);
  expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([200, 409]);
  expect((await Product.findById(product.id))!.quantity).toBe(1);
  expect(await StockMovement.countDocuments({ productId: product._id })).toBe(1);
  expect(await Order.countDocuments({ _id: { $in: [a._id, b._id] }, status: 'draft' })).toBe(1);
});
it('API: one insufficient product rolls back all products, ledger and order history', async () => {
  const first = await Product.create({
    ...baseProduct,
    _id: '111111111111111111111111',
    skuNormalized: 'ROLLBACK-A',
    quantity: 5,
  });
  const last = await Product.create({
    ...baseProduct,
    _id: '222222222222222222222222',
    skuNormalized: 'ROLLBACK-B',
    quantity: 0,
  });
  const order = await createDraft(
    {
      items: [
        { productId: first.id, quantity: 2 },
        { productId: last.id, quantity: 1 },
      ],
    },
    actorId,
  );
  expect((await action(order.id, 'confirm')).status).toBe(409);
  expect((await Product.findById(first.id))!.quantity).toBe(5);
  expect((await Product.findById(last.id))!.quantity).toBe(0);
  const unchanged = await Order.findById(order.id);
  expect(unchanged!.status).toBe('draft');
  expect(unchanged!.history).toHaveLength(1);
  expect(unchanged!.confirmedAt).toBeUndefined();
  expect(await StockMovement.countDocuments({ orderId: order._id })).toBe(0);
});
it('API: simultaneous cancellations restore stock only once', async () => {
  const product = await Product.create({
    ...baseProduct,
    skuNormalized: 'CANCEL-RACE',
    quantity: 5,
  });
  const order = await createDraft({ items: [{ productId: product.id, quantity: 4 }] }, actorId);
  expect((await action(order.id, 'confirm')).status).toBe(200);
  const outcomes = await Promise.all([
    action(order.id, 'cancel', { reason: 'Concurrent cancel A' }),
    action(order.id, 'cancel', { reason: 'Concurrent cancel B' }),
  ]);
  expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([200, 409]);
  expect((await Product.findById(product.id))!.quantity).toBe(5);
  expect(await StockMovement.countDocuments({ orderId: order._id, type: 'order-cancelled' })).toBe(
    1,
  );
});
