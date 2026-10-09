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
});
