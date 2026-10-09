import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

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
  app.use((_req, res) =>
    res
      .status(404)
      .json({
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          requestId: res.locals['requestId'],
        },
      }),
  );
  const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const malformed = error instanceof SyntaxError;
    res.status(malformed ? 400 : 500).json({
      error: {
        code: malformed ? 'INVALID_JSON' : 'INTERNAL_ERROR',
        message: malformed ? 'Request body is not valid JSON' : 'Unexpected server error',
        requestId: res.locals['requestId'],
      },
    });
  };
  app.use(onError);
  return app;
}
