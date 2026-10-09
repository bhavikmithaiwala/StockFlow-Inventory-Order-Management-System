import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { tokenHash } from './auth.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';

const token = 'c'.repeat(64);
const app = createApp();
beforeAll(async () => {
  await openTestDatabase();
  const user = await User.create({
    name: 'Admin',
    emailNormalized: 'catalog@example.test',
    passwordHash: 'not-used-in-session-test',
    role: 'admin',
  });
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 60000),
  });
});
afterAll(closeTestDatabase);
it('persists categories, enforces normalized uniqueness and protects references', async () => {
  const created = await request(app)
    .post('/api/categories')
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send({ name: 'Office Supplies' });
  expect(created.status).toBe(201);
  const duplicate = await request(app)
    .post('/api/categories')
    .set('Cookie', `sf_session=${token}`)
    .set('Origin', 'http://localhost:4200')
    .send({ name: ' office   supplies ' });
  expect(duplicate.status).toBe(409);
  expect(
    (await request(app).get('/api/categories').set('Cookie', `sf_session=${token}`)).body.meta
      .total,
  ).toBe(1);
  await mongoose.connection
    .collection('products')
    .insertOne({ categoryId: new mongoose.Types.ObjectId(created.body.data._id) });
  expect(
    (
      await request(app)
        .patch(`/api/categories/${created.body.data._id}`)
        .set('Cookie', `sf_session=${token}`)
        .set('Origin', 'http://localhost:4200')
        .send({ active: false })
    ).status,
  ).toBe(409);
});
