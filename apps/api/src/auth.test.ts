import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { hashPassword } from './security/password.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';

describe('session API with real MongoDB', () => {
  beforeAll(async () => {
    await openTestDatabase();
    await User.create({
      name: 'Admin',
      emailNormalized: 'admin@example.test',
      passwordHash: await hashPassword('example-password'),
      role: 'admin',
    });
  });
  afterAll(closeTestDatabase);
  const app = createApp();
  it('logs in with an opaque cookie, returns current user and invalidates logout', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send({ email: 'admin@example.test', password: 'example-password' });
    expect(login.status).toBe(200);
    expect(login.body.data.passwordHash).toBeUndefined();
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Strict');
    expect((await agent.get('/api/auth/me')).body.data.role).toBe('admin');
    expect(await Session.countDocuments()).toBe(1);
    expect(
      (await agent.post('/api/auth/logout').set('Origin', 'http://localhost:4200')).status,
    ).toBe(204);
    expect(await Session.countDocuments()).toBe(0);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
  it('rejects bad credentials and foreign write origins', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Origin', 'http://localhost:4200')
          .send({ email: 'admin@example.test', password: 'wrong' })
      ).status,
    ).toBe(401);
    expect(
      (await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({}))
        .status,
    ).toBe(403);
  });
});
