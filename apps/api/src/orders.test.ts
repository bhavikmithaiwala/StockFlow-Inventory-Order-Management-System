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
import { createDraft, confirmOrder, cancelOrder } from './services/orders.js';
import { receiveStock } from './services/inventory.js';
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
it('enforces unique per-product order movements in the database', async () => {
  const movement = await StockMovement.findOne({ orderId, type: 'order-confirmed' });
  await expect(
    StockMovement.create({
      productId: movement!.productId,
      orderId: movement!.orderId,
      actorId: movement!.actorId,
      type: movement!.type,
      delta: movement!.delta,
      beforeQuantity: movement!.beforeQuantity,
      afterQuantity: movement!.afterQuantity,
      reason: 'Duplicate attempt',
    }),
  ).rejects.toMatchObject({ code: 11000 });
  expect(await StockMovement.countDocuments({ orderId })).toBe(1);
});
it('fulfills only as admin without a second deduction', async () => {
  expect(
    (
      await request(app)
        .post(`/api/orders/${orderId}/fulfill`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({})
    ).status,
  ).toBe(403);
  await User.updateOne({ _id: actorId }, { role: 'admin' });
  expect(
    (
      await request(app)
        .post(`/api/orders/${orderId}/fulfill`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({})
    ).body.data.status,
  ).toBe('fulfilled');
  expect((await Product.findById(productId))!.quantity).toBe(3);
  expect(await StockMovement.countDocuments({ orderId })).toBe(1);
  expect(
    (
      await request(app)
        .post(`/api/orders/${orderId}/fulfill`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({})
    ).status,
  ).toBe(409);
});
it('cancels confirmed orders and restores stock exactly once', async () => {
  const draft = await createDraft({ items: [{ productId, quantity: 1 }] }, actorId);
  await confirmOrder(draft.id, actorId);
  expect((await Product.findById(productId))!.quantity).toBe(2);
  const res = await request(app)
    .post(`/api/orders/${draft.id}/cancel`)
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send({ reason: 'Customer changed plans' });
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('cancelled');
  expect((await Product.findById(productId))!.quantity).toBe(3);
  expect(await StockMovement.countDocuments({ orderId: draft._id, type: 'order-cancelled' })).toBe(
    1,
  );
  await expect(cancelOrder(draft.id, 'Duplicate cancellation', actorId)).rejects.toThrow(
    'Cannot change',
  );
  await expect(cancelOrder(orderId, 'Fulfilled cancellation', actorId)).rejects.toThrow(
    'Cannot change',
  );
  expect((await Product.findById(productId))!.quantity).toBe(3);
});
it('normalizes valid product IDs and cancels a draft without restoring unreserved stock', async () => {
  const before = (await Product.findById(productId))!.quantity;
  const movements = await StockMovement.countDocuments();
  const draft = await createDraft(
    { items: [{ productId: productId.toUpperCase(), quantity: 1 }] },
    actorId,
  );
  await expect(cancelOrder(draft.id, ' ', actorId)).rejects.toThrow();
  expect((await Order.findById(draft.id))!.status).toBe('draft');
  await cancelOrder(draft.id, 'Draft no longer needed', actorId);
  expect((await Product.findById(productId))!.quantity).toBe(before);
  expect(await StockMovement.countDocuments()).toBe(movements);
});
it('serializes a concurrent double-click on the same order', async () => {
  const draft = await createDraft({ items: [{ productId, quantity: 1 }] }, actorId);
  const before = (await Product.findById(productId))!.quantity;
  const results = await Promise.all([
    request(app)
      .post(`/api/orders/${draft.id}/confirm`)
      .set('Cookie', `sf_session=${token}`)
      .set('Origin', 'http://localhost:4200')
      .send({}),
    request(app)
      .post(`/api/orders/${draft.id}/confirm`)
      .set('Cookie', `sf_session=${token}`)
      .set('Origin', 'http://localhost:4200')
      .send({}),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  expect((await Product.findById(productId))!.quantity).toBe(before - 1);
  expect(await StockMovement.countDocuments({ orderId: draft._id })).toBe(1);
});
it('rejects draft fulfillment, processed-order editing and client status/price injection', async () => {
  const draft = await createDraft({ items: [{ productId, quantity: 1 }] }, actorId);
  expect(
    (
      await request(app)
        .post(`/api/orders/${draft.id}/fulfill`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({})
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ items: [{ productId, quantity: 1 }] })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/orders')
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ items: [{ productId, quantity: 1, unitPriceCents: 1 }] })
    ).status,
  ).toBe(400);
});
it('rolls back all restoration if one product has reached stock capacity', async () => {
  const fields = {
    name: 'Capacity fixture',
    categoryId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    unitPriceCents: 100,
    quantity: 5,
  };
  const a = await Product.create({
    ...fields,
    _id: '333333333333333333333333',
    skuNormalized: 'CAPACITY-A',
  });
  const b = await Product.create({
    ...fields,
    _id: '444444444444444444444444',
    skuNormalized: 'CAPACITY-B',
  });
  const order = await createDraft(
    {
      items: [
        { productId: a.id, quantity: 2 },
        { productId: b.id, quantity: 2 },
      ],
    },
    actorId,
  );
  await confirmOrder(order.id, actorId);
  await receiveStock({ productId: b.id, quantity: 999997, reason: 'Capacity delivery' }, actorId);
  await expect(cancelOrder(order.id, 'Attempt restoration', actorId)).rejects.toThrow('capacity');
  expect((await Product.findById(a.id))!.quantity).toBe(3);
  expect((await Product.findById(b.id))!.quantity).toBe(1000000);
  expect((await Order.findById(order.id))!.status).toBe('confirmed');
  expect(await StockMovement.countDocuments({ orderId: order._id, type: 'order-cancelled' })).toBe(
    0,
  );
});
it('rejects inactive confirmation and preserves historical locked prices', async () => {
  const draft = await createDraft({ items: [{ productId, quantity: 1 }] }, actorId);
  await Product.updateOne({ _id: productId }, { active: false, unitPriceCents: 999 });
  await expect(confirmOrder(draft.id, actorId)).rejects.toThrow('inactive');
  expect((await Order.findById(draft.id))!.status).toBe('draft');
  expect(await StockMovement.countDocuments({ orderId: draft._id })).toBe(0);
  expect((await Order.findById(orderId))!.items[0]!.unitPriceCents).toBe(450);
});
