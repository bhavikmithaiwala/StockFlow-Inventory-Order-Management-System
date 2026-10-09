import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { hashPassword } from './security/password.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';

beforeAll(async () => {
  await openTestDatabase();
  const passwordHash = await hashPassword('example-password');
  await User.create([
    { name: 'Staff', emailNormalized: 'staff@example.test', passwordHash, role: 'staff' },
    { name: 'Admin', emailNormalized: 'admin@example.test', passwordHash, role: 'admin' },
  ]);
});
afterAll(closeTestDatabase);
it('enforces admin-only user operations when staff calls the API directly', async () => {
  const agent = request.agent(createApp());
  expect((await agent.get('/api/users')).status).toBe(401);
  await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:4200')
    .send({ email: 'staff@example.test', password: 'example-password' });
  expect((await agent.get('/api/users')).status).toBe(403);
  expect(
    (await agent.post('/api/users').set('Origin', 'http://localhost:4200').send({})).status,
  ).toBe(403);
});
it('allows admin staff creation and prevents admin lockout', async () => {
  const agent = request.agent(createApp());
  const login = await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:4200')
    .send({ email: 'admin@example.test', password: 'example-password' });
  const created = await agent
    .post('/api/users')
    .set('Origin', 'http://localhost:4200')
    .send({ name: 'New staff', email: 'new@example.test', password: 'example-password' });
  expect(created.status).toBe(201);
  expect(created.body.data.passwordHash).toBeUndefined();
  expect((await agent.get('/api/users')).status).toBe(200);
  expect(
    (
      await agent
        .patch(`/api/users/${login.body.data.id}`)
        .set('Origin', 'http://localhost:4200')
        .send({ active: false })
    ).status,
  ).toBe(409);
});
