import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase } from './database.js';
import mongoose from 'mongoose';

await connectDatabase();
const server = createApp().listen(config.PORT, '127.0.0.1', () => {
  console.log(JSON.stringify({ event: 'api_started', port: config.PORT }));
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () =>
    server.close(() => void mongoose.disconnect().then(() => process.exit(0))),
  );
}
