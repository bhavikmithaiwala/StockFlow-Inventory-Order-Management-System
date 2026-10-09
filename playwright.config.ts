import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';

process.env['STOCKFLOW_E2E_DB'] ??= `stockflow_e2e_${randomUUID().replaceAll('-', '')}`;
const mongoUri = `mongodb://127.0.0.1:27018/${process.env['STOCKFLOW_E2E_DB']}?replicaSet=rs0&directConnection=true`;
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 120000,
  globalSetup: './e2e/setup.mjs',
  globalTeardown: './e2e/teardown.mjs',
  use: {
    baseURL: 'http://localhost:4200',
    channel: process.env['CI'] ? undefined : 'chrome',
    viewport: { width: 1360, height: 900 },
    video: 'on',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run start --workspace @stockflow/api',
      url: 'http://127.0.0.1:3000/api/health',
      timeout: 120000,
      reuseExistingServer: false,
      env: { NODE_ENV: 'test', MONGODB_URI: mongoUri },
    },
    {
      command: 'npm run dev:client',
      url: 'http://localhost:4200',
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
});
