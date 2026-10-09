import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase } from './database.js';
import mongoose from 'mongoose';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const staticDirectory =
  config.NODE_ENV === 'production'
    ? fileURLToPath(new URL('../../client/dist/client/browser/', import.meta.url))
    : undefined;
if (staticDirectory && !existsSync(`${staticDirectory}/index.html`))
  throw new Error('Angular production build missing; run npm run build before starting production');

await connectDatabase();
const server = createApp(staticDirectory).listen(config.PORT, config.HOST, () => {
  console.log(JSON.stringify({ event: 'api_started', port: config.PORT }));
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () =>
    server.close(() => void mongoose.disconnect().then(() => process.exit(0))),
  );
}
