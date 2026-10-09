import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('API foundation', () => {
  it('returns a live health response and request identifier', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
  it('returns predictable missing endpoint errors', async () => {
    const res = await request(createApp()).get('/api/absent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
  it('rejects malformed JSON without leaking a stack trace', async () => {
    const res = await request(createApp()).post('/api/absent').set('Content-Type', 'application/json').send('{');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(res.body.error.stack).toBeUndefined();
  });
});
