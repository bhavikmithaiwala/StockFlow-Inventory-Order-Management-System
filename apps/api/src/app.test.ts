import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('API foundation', () => {
  it('reports unavailable database readiness independently of process liveness', async () => {
    const res = await request(createApp()).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(res.body.error.requestId).toBeDefined();
  });
  it('serves the real public API contract', async () => {
    const res = await request(createApp()).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/orders/{id}/confirm'].post).toBeDefined();
    expect(res.body.components.securitySchemes.sessionCookie.name).toBe('sf_session');
  });
  it('returns a live health response and request identifier', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
  it('returns predictable missing endpoint errors', async () => {
    const res = await request(createApp()).get('/api/absent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
  it('rejects malformed JSON without leaking a stack trace', async () => {
    const res = await request(createApp())
      .post('/api/absent')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(res.body.error.stack).toBeUndefined();
  });
  it('reports oversized JSON as a safe 413 with request ID', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send({ padding: 'x'.repeat(70000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body.error.requestId).toBeDefined();
    expect(res.body.error.stack).toBeUndefined();
  });
});
