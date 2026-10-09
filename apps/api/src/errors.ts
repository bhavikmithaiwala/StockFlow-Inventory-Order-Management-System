import { ZodError } from 'zod';
import type { ErrorRequestHandler } from 'express';

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
  const known =
    error instanceof ApiError
      ? error
      : error instanceof ZodError
        ? new ApiError(400, 'VALIDATION_ERROR', 'Request failed validation')
        : error instanceof SyntaxError
          ? new ApiError(400, 'INVALID_JSON', 'Request body is not valid JSON')
          : duplicate
            ? new ApiError(409, 'DUPLICATE_VALUE', 'A unique value already exists')
            : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
  res
    .status(known.status)
    .json({
      error: { code: known.code, message: known.message, requestId: res.locals['requestId'] },
    });
};
