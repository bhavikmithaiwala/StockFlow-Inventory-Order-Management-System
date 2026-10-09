import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { chromium } from '@playwright/test';
import { hashPassword } from '../apps/api/dist/security/password.js';

const databaseName = `stockflow_probe_${randomUUID().replaceAll('-', '')}`;
const mongoUri = `mongodb://127.0.0.1:27018/${databaseName}?replicaSet=rs0&directConnection=true`;
const client = new MongoClient(mongoUri);
const origin = 'http://localhost:3001';
let server;
let browser;
try {
  await client.connect();
  await client
    .db()
    .collection('users')
    .insertOne({
      name: 'Production probe admin',
      emailNormalized: 'probe@stockflow.test',
      passwordHash: await hashPassword('StockFlowProbe!2026'),
      role: 'admin',
      active: true,
      preferences: { pageSize: 20 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  server = spawn(process.execPath, ['dist/server.js'], {
    cwd: new URL('../apps/api/', import.meta.url),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '3001',
      APP_ORIGIN: origin,
      MONGODB_URI: mongoUri,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  server.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${logs}`);
    try {
      ready = (await fetch(`${origin}/api/ready`)).status === 200;
    } catch {
      /* startup */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Production did not become ready: ${logs}`);
  assert.equal((await (await fetch(`${origin}/api/ready`)).json()).data.replicaSet, 'rs0');
  const html = await (await fetch(origin)).text();
  assert.ok(html.includes('<app-root>'));
  const asset = html.match(/src="(main-[^"]+\.js)"/)[1];
  const assetResponse = await fetch(`${origin}/${asset}`);
  assert.equal(assetResponse.status, 200);
  assert.ok(assetResponse.headers.get('content-type').includes('javascript'));
  assert.equal((await fetch(`${origin}/products`)).status, 200);
  assert.equal((await fetch(`${origin}/api/absent`)).status, 404);
  assert.equal((await fetch(`${origin}/missing.js`)).status, 404);
  assert.equal((await fetch(`${origin}/api/openapi.json`)).status, 200);
  browser = await chromium.launch({ ...(process.env.CI ? {} : { channel: 'chrome' }) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto(`${origin}/products`);
  await page.getByLabel('Email', { exact: true }).fill('probe@stockflow.test');
  await page.getByLabel('Password', { exact: true }).fill('StockFlowProbe!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Warehouse dashboard' }).waitFor();
  const session = (await context.cookies()).find((cookie) => cookie.name === 'sf_session');
  assert.ok(session?.httpOnly && session.secure);
  assert.equal(session.sameSite, 'Strict');
  assert.equal(session.path, '/api');
  assert.equal((await page.request.get(`${origin}/api/auth/me`)).status(), 200);
  await page.goto(`${origin}/orders`);
  await page.getByRole('heading', { name: 'Orders', exact: true }).waitFor();
  assert.deepEqual(failures, []);
  console.log(
    'Production probe passed: real DB readiness, compiled assets, Angular deep links, authenticated browser, Secure/HttpOnly/Strict cookies, JSON API 404, missing asset 404',
  );
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
  if (!databaseName.startsWith('stockflow_probe_')) throw new Error('Refusing unsafe cleanup');
  await client.db(databaseName).dropDatabase();
  await client.close();
}
