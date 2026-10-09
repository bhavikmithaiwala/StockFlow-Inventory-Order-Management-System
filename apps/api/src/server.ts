import { createApp } from './app.js';
import { config } from './config.js';

const server = createApp().listen(config.PORT, '127.0.0.1', () => {
  console.log(JSON.stringify({ event: 'api_started', port: config.PORT }));
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
