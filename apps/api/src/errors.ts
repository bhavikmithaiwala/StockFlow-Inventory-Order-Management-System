import { ZodError } from 'zod';
import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { config } from './config.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const duplicate =
    typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  const oversized =
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large';
  const known =
    error instanceof ApiError
      ? error
      : oversized
        ? new ApiError(413, 'PAYLOAD_TOO_LARGE', 'JSON body exceeds the 64 KB limit')
        : error instanceof ZodError || error instanceof mongoose.Error.ValidationError
          ? new ApiError(400, 'VALIDATION_ERROR', 'Request failed validation')
          : error instanceof SyntaxError
            ? new ApiError(400, 'INVALID_JSON', 'Request body is not valid JSON')
            : duplicate
              ? new ApiError(409, 'DUPLICATE_VALUE', 'A unique value already exists')
              : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
  if (known.status >= 500 && config.NODE_ENV !== 'test')
    console.error(
      JSON.stringify({ event: 'api_error', requestId: res.locals['requestId'], code: known.code }),
    );
  res.status(known.status).json({
    error: { code: known.code, message: known.message, requestId: res.locals['requestId'] },
  });
};
