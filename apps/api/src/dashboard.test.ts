import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { Product } from './models/product.js';
import { tokenHash } from './auth.js';
import { createDraft } from './services/orders.js';
import { receiveStock } from './services/inventory.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';
const token = '2'.repeat(64);
beforeAll(async () => {
  await openTestDatabase();
  const user = await User.create({
    name: 'Report Staff',
    emailNormalized: 'reports@example.test',
    passwordHash: 'not-used-in-session-test',
    role: 'staff',
  });
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 600000),
  });
  const product = await Product.create({
    skuNormalized: 'REPORT-1',
    name: 'Notebook',
    categoryId: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    unitPriceCents: 350,
  });
  await receiveStock(
    { productId: product.id, quantity: 3, reason: 'Report fixture receipt' },
    user.id,
  );
  await createDraft({ items: [{ productId: product.id, quantity: 2 }] }, user.id);
});
afterAll(closeTestDatabase);
it('aggregates actual inventory, order and movement records', async () => {
  const res = await request(createApp())
    .get('/api/dashboard/stats')
    .set('Cookie', `sf_session=${token}`);
  expect(res.status).toBe(200);
  expect(res.body.data.productCount).toBe(1);
  expect(res.body.data.totalUnits).toBe(3);
  expect(res.body.data.inventoryValueCents).toBe(1050);
  expect(res.body.data.lowStockCount).toBe(1);
  expect(res.body.data.orderStatuses).toEqual([{ _id: 'draft', count: 1 }]);
  expect(res.body.data.recentMovements).toHaveLength(1);
  expect(res.body.data.recentOrders).toHaveLength(1);
  expect(res.body.data.categoryBreakdown).toMatchObject([{ products: 1, units: 3 }]);
});
it('reports inventory valuation and low-stock filters with whole cents', async () => {
  const res = await request(createApp())
    .get('/api/reports/inventory?lowStock=true')
    .set('Cookie', `sf_session=${token}`);
  expect(res.status).toBe(200);
  expect(res.body.summary).toEqual({ quantity: 3, valueCents: 1050 });
  expect(res.body.data[0].valueCents).toBe(1050);
  expect(
    (
      await request(createApp())
        .get('/api/reports/inventory?active=false')
        .set('Cookie', `sf_session=${token}`)
    ).body.meta.total,
  ).toBe(0);
});
it('filters order status and movement type/date reports', async () => {
  const app = createApp();
  const orders = await request(app)
    .get('/api/reports/orders?status=draft')
    .set('Cookie', `sf_session=${token}`);
  expect(orders.status).toBe(200);
  expect(orders.body.meta.total).toBe(1);
  expect(orders.body.data[0].totalCents).toBe(700);
  expect(
    (
      await request(app)
        .get('/api/reports/orders?status=fulfilled')
        .set('Cookie', `sf_session=${token}`)
    ).body.meta.total,
  ).toBe(0);
  const movements = await request(app)
    .get('/api/reports/stock-movements?type=receipt&from=2020-01-01&to=2099-01-01')
    .set('Cookie', `sf_session=${token}`);
  expect(movements.status).toBe(200);
  expect(movements.body.data[0].delta).toBe(3);
  expect(
    (
      await request(app)
        .get('/api/reports/stock-movements?from=invalid')
        .set('Cookie', `sf_session=${token}`)
    ).status,
  ).toBe(400);
});
it('exports filtered real inventory and movements as downloadable CSV', async () => {
  const app = createApp();
  const inventory = await request(app)
    .get('/api/reports/inventory?format=csv&lowStock=true')
    .set('Cookie', `sf_session=${token}`);
  expect(inventory.status).toBe(200);
  expect(inventory.headers['content-type']).toContain('text/csv');
  expect(inventory.headers['content-disposition']).toContain('inventory.csv');
  expect(inventory.text).toContain('REPORT-1');
  expect(inventory.text).toContain('1050');
  const movements = await request(app)
    .get('/api/reports/stock-movements?format=csv&type=receipt')
    .set('Cookie', `sf_session=${token}`);
  expect(movements.text).toContain('Report fixture receipt');
});
