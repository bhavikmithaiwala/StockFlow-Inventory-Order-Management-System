import express from 'express';
import { randomUUID } from 'node:crypto';
import { authRouter, checkOrigin } from './auth.js';
import { errorHandler } from './errors.js';
import { usersRouter } from './users.js';
import { categoriesRouter } from './categories.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.locals['requestId'] = randomUUID();
    res.setHeader('X-Request-ID', res.locals['requestId']);
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.use(checkOrigin);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/categories', categoriesRouter);
  app.use((_req, res) =>
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        requestId: res.locals['requestId'],
      },
    }),
  );
  app.use(errorHandler);
  return app;
}
