import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { Category } from './models/category.js';
import { Supplier } from './models/supplier.js';
import { Product } from './models/product.js';
import { tokenHash } from './auth.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';
const token = 'd'.repeat(64);
const app = createApp();
let input: {
  sku: string;
  name: string;
  categoryId: string;
  supplierId: string;
  unitPriceCents: number;
};
beforeAll(async () => {
  await openTestDatabase();
  const user = await User.create({
    name: 'Admin',
    emailNormalized: 'products@example.test',
    passwordHash: 'not-used-in-session-test',
    role: 'admin',
  });
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 60000),
  });
  const category = await Category.create({ name: 'Books' });
  const supplier = await Supplier.create({ name: 'North Supply' });
  input = {
    sku: ' sku-1001 ',
    name: 'Notebook',
    categoryId: category.id,
    supplierId: supplier.id,
    unitPriceCents: 350,
  };
});
afterAll(closeTestDatabase);
it('creates, edits and deactivates products without deleting history', async () => {
  const created = await request(app)
    .post('/api/products')
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send(input);
  expect(created.status).toBe(201);
  expect(created.body.data.skuNormalized).toBe('SKU-1001');
  expect(created.body.data.quantity).toBe(0);
  const id = created.body.data._id;
  expect(
    (
      await request(app)
        .patch(`/api/products/${id}`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ unitPriceCents: 400 })
    ).body.data.unitPriceCents,
  ).toBe(400);
  expect(
    (
      await request(app)
        .delete(`/api/products/${id}`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
    ).body.data.active,
  ).toBe(false);
  expect(await Product.countDocuments()).toBe(1);
  expect(
    (await request(app).get(`/api/products/${id}`).set('Cookie', `sf_session=${token}`)).status,
  ).toBe(200);
});
it('searches, sorts and bounds pagination without accepting MongoDB query operators', async () => {
  const result = await request(app)
    .get('/api/products?search=Notebook&active=false&limit=1&sort=unitPriceCents&direction=desc')
    .set('Cookie', `sf_session=${token}`);
  expect(result.status).toBe(200);
  expect(result.body.meta.total).toBe(1);
  expect(result.body.data[0].skuNormalized).toBe('SKU-1001');
  expect(
    (await request(app).get('/api/products?limit=101').set('Cookie', `sf_session=${token}`)).status,
  ).toBe(400);
  expect(
    (await request(app).get('/api/products?active[$ne]=true').set('Cookie', `sf_session=${token}`))
      .status,
  ).toBe(400);
});
it('rejects duplicate SKUs, stock spoofing, bad money, malformed IDs and missing references', async () => {
  const post = (body: unknown) =>
    request(app)
      .post('/api/products')
      .set('Cookie', `sf_session=${token}`)
      .set('Origin', 'http://localhost:4200')
      .send(body);
  expect((await post({ ...input, sku: 'SKU-1001' })).status).toBe(409);
  for (const body of [
    { ...input, quantity: 100 },
    { ...input, unitPriceCents: -1 },
    { ...input, unitPriceCents: 1.1 },
    { ...input, name: ' ' },
    { ...input, categoryId: 'invalid' },
  ])
    expect((await post(body)).status).toBe(400);
  expect(
    (await post({ ...input, sku: 'MISSING-REFERENCE', categoryId: '0'.repeat(24) })).body.error
      .code,
  ).toBe('INACTIVE_REFERENCE');
  expect(
    (await request(app).get('/api/products/not-an-id').set('Cookie', `sf_session=${token}`)).status,
  ).toBe(400);
  expect(await Product.countDocuments()).toBe(1);
});
