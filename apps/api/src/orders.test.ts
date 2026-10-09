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
import { openTestDatabase, closeTestDatabase } from './test-database.js';
import { createDraft, confirmOrder } from './services/orders.js';
const token = 'f'.repeat(64);
const app = createApp();
let productId: string;
let orderId: string;
let actorId: string;
beforeAll(async () => {
  await openTestDatabase();
  const user = await User.create({
    name: 'Order Staff',
    emailNormalized: 'orders@example.test',
    passwordHash: 'not-used-in-session-test',
    role: 'staff',
  });
  actorId = user.id;
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 600000),
  });
  const product = await Product.create({
    skuNormalized: 'ORDER-1',
    name: 'Notebook',
    categoryId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    unitPriceCents: 350,
    quantity: 5,
  });
  productId = product.id;
});
afterAll(closeTestDatabase);
it('creates a trusted draft total without reserving or deducting stock', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send({ items: [{ productId, quantity: 4 }] });
  expect(res.status).toBe(201);
  expect(res.body.data.totalCents).toBe(1400);
  expect(res.body.data.createdBy).toBe(actorId);
  orderId = res.body.data._id;
  expect((await Product.findById(productId))!.quantity).toBe(5);
  expect(await StockMovement.countDocuments()).toBe(0);
  expect(
    (
      await request(app)
        .post('/api/orders')
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ items: [{ productId, quantity: 1 }], totalCents: 1 })
    ).status,
  ).toBe(400);
  expect(
    (await request(app).get(`/api/orders/${orderId}`).set('Cookie', `sf_session=${token}`)).body
      .data.status,
  ).toBe('draft');
  expect(await Order.countDocuments()).toBe(1);
});
it('edits draft items, refreshes trusted totals, rejects duplicate lines and keeps stock unchanged', async () => {
  const edited = await request(app)
    .patch(`/api/orders/${orderId}`)
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send({ items: [{ productId, quantity: 2 }] });
  expect(edited.status).toBe(200);
  expect(edited.body.data.totalCents).toBe(700);
  expect(edited.body.data.history.at(-1).action).toBe('edited');
  expect((await Product.findById(productId))!.quantity).toBe(5);
  expect(
    (
      await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({
          items: [
            { productId, quantity: 1 },
            { productId, quantity: 1 },
          ],
        })
    ).status,
  ).toBe(400);
});
it('confirms exactly once and captures current trusted prices in the stock transaction', async () => {
  await Product.updateOne({ _id: productId }, { unitPriceCents: 450 });
  const res = await request(app)
    .post(`/api/orders/${orderId}/confirm`)
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send({});
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('confirmed');
  expect(res.body.data.totalCents).toBe(900);
  expect((await Product.findById(productId))!.quantity).toBe(3);
  expect(await StockMovement.countDocuments({ orderId, type: 'order-confirmed' })).toBe(1);
  expect(
    (
      await request(app)
        .post(`/api/orders/${orderId}/confirm`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({})
    ).status,
  ).toBe(409);
  expect((await Product.findById(productId))!.quantity).toBe(3);
});
it('allows only one competing confirmation for the last five units', async () => {
  const product = await Product.create({
    skuNormalized: 'RACE-1',
    name: 'Race item',
    categoryId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    unitPriceCents: 100,
    quantity: 5,
  });
  const a = await createDraft({ items: [{ productId: product.id, quantity: 4 }] }, actorId);
  const b = await createDraft({ items: [{ productId: product.id, quantity: 4 }] }, actorId);
  const results = await Promise.allSettled([
    confirmOrder(a.id, actorId),
    confirmOrder(b.id, actorId),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect((await Product.findById(product.id))!.quantity).toBe(1);
  expect(
    await StockMovement.countDocuments({ productId: product._id, type: 'order-confirmed' }),
  ).toBe(1);
  expect(await Order.countDocuments({ _id: { $in: [a._id, b._id] }, status: 'draft' })).toBe(1);
});
