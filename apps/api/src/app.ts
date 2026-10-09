import express from 'express';
import { randomUUID } from 'node:crypto';
import { authRouter, checkOrigin } from './auth.js';
import { errorHandler } from './errors.js';
import { usersRouter } from './users.js';
import { categoriesRouter } from './categories.js';
import { suppliersRouter } from './suppliers.js';
import { productsRouter } from './products.js';
import { inventoryRouter } from './inventory.js';
import { ordersRouter } from './orders.js';
import { dashboardRouter } from './dashboard.js';
import { reportsRouter } from './reports.js';
import helmet from 'helmet';
import { config } from './config.js';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import mongoose from 'mongoose';

export function createApp(staticDirectory?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_req, res, next) => {
    res.locals['requestId'] = randomUUID();
    res.setHeader('X-Request-ID', res.locals['requestId']);
    const started = Date.now();
    res.on('finish', () => {
      if (config.NODE_ENV !== 'test')
        console.log(
          JSON.stringify({
            event: 'http_request',
            requestId: res.locals['requestId'],
            method: _req.method,
            route: _req.route?.path ?? 'unmatched',
            status: res.statusCode,
            durationMs: Date.now() - started,
          }),
        );
    });
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  app.get('/api/ready', async (_req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) throw new Error('Database disconnected');
      const hello = await mongoose.connection
        .db!.admin()
        .command({ hello: 1 }, { timeoutMS: 3000 });
      if (!hello.setName || !hello.isWritablePrimary) throw new Error('Replica set not writable');
      res.json({ data: { status: 'ready', replicaSet: hello.setName } });
    } catch {
      res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database is not ready',
          requestId: res.locals['requestId'],
        },
      });
    }
  });
  app.get('/api/openapi.json', (_req, res) =>
    res.sendFile(fileURLToPath(new URL('../../../docs/openapi.json', import.meta.url))),
  );
  app.use(checkOrigin);
  app.use((req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) z.object({}).strict().parse(req.query);
    next();
  });
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get('/{*path}', (req, res, next) => {
      if (
        req.path === '/api' ||
        req.path.startsWith('/api/') ||
        !req.accepts('html') ||
        /\.[a-z0-9]+$/i.test(req.path)
      )
        return next();
      res.sendFile(join(staticDirectory, 'index.html'));
    });
  }
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
