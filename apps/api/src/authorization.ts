import type { RequestHandler } from 'express';
import { ApiError } from './errors.js';

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}
export function allowRoles(...roles: Actor['role'][]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals['user'] as Actor | undefined;
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    if (!roles.includes(user.role))
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission for this operation');
    next();
  };
}
