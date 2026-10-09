import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { hashPassword } from './security/password.js';
import { openTestDatabase, closeTestDatabase } from './test-database.js';
import { tokenHash } from './auth.js';

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
  it('rejects expired tokens even before TTL removal and deactivated users', async () => {
    const user = await User.findOne({ emailNormalized: 'admin@example.test' });
    const token = 'a'.repeat(64);
    await Session.create({
      userId: user!._id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', `sf_session=${token}`)).status,
    ).toBe(401);
    await Session.updateOne(
      { tokenHash: tokenHash(token) },
      { expiresAt: new Date(Date.now() + 60000) },
    );
    await User.updateOne({ _id: user!._id }, { active: false });
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', `sf_session=${token}`)).status,
    ).toBe(401);
    await User.updateOne({ _id: user!._id }, { active: true });
  });
  it('rejects forged and malformed cookies', async () => {
    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Cookie', `sf_session=${'b'.repeat(64)}`)
      ).status,
    ).toBe(401);
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', 'sf_session=malformed')).status,
    ).toBe(401);
  });
  it('persists only the current user profile and rejects role escalation', async () => {
    const user = await User.findOne({ emailNormalized: 'admin@example.test' });
    const token = '3'.repeat(64);
    await Session.create({
      userId: user!._id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 60000),
    });
    const profile = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', `sf_session=${token}`)
      .set('Origin', 'http://localhost:4200')
      .send({ name: 'Updated Admin', preferences: { pageSize: 50 } });
    expect(profile.status).toBe(200);
    expect(profile.body.data.preferences.pageSize).toBe(50);
    expect((await User.findById(user!._id))!.name).toBe('Updated Admin');
    expect(
      (
        await request(app)
          .patch('/api/auth/profile')
          .set('Cookie', `sf_session=${token}`)
          .set('Origin', 'http://localhost:4200')
          .send({ name: 'Escalation', preferences: { pageSize: 20 }, role: 'admin' })
      ).status,
    ).toBe(400);
  });
  it('rate-limits login attempts and rejects writes without an origin', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(403);
    let status = 0;
    for (let attempt = 0; attempt < 11; attempt++)
      status = (
        await request(app).post('/api/auth/login').set('Origin', 'http://localhost:4200').send({})
      ).status;
    expect(status).toBe(429);
  });
});
