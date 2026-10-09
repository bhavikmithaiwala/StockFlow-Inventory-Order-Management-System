import { Router, type RequestHandler } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { User } from './models/user.js';
import { Session } from './models/session.js';
import { hashPassword, verifyPassword } from './security/password.js';
import { ApiError } from './errors.js';
import { config } from './config.js';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.NODE_ENV === 'production',
  path: '/api',
};
const readToken = (cookie?: string) =>
  cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('sf_session='))
    ?.slice(11);
const publicUser = (user: InstanceType<typeof User>) => ({
  id: user.id,
  name: user.name,
  email: user.emailNormalized,
  role: user.role,
});
const dummyHash = hashPassword(randomBytes(32).toString('hex'));

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = readToken(req.headers.cookie);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  const session = await Session.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  const user = session && (await User.findOne({ _id: session.userId, active: true }));
  if (!user) throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired; sign in again');
  res.locals['user'] = publicUser(user);
  res.locals['sessionId'] = session!._id;
  next();
};
export const checkOrigin: RequestHandler = (req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin !== config.APP_ORIGIN
  ) {
    throw new ApiError(403, 'INVALID_ORIGIN', 'Request origin is not allowed');
  }
  next();
};

export const authRouter = Router();
authRouter.post('/login', async (req, res) => {
  const input = z
    .object({ email: z.email(), password: z.string().min(1).max(128) })
    .strict()
    .parse(req.body);
  const user = await User.findOne({
    emailNormalized: input.email.trim().toLowerCase(),
    active: true,
  }).select('+passwordHash');
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
  if (!user || !valid)
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  const token = randomBytes(32).toString('hex');
  await Session.create({
    userId: user._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
  });
  res.cookie('sf_session', token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
  res.json({ data: publicUser(user) });
});
authRouter.get('/me', requireAuth, (_req, res) => res.json({ data: res.locals['user'] }));
authRouter.post('/logout', requireAuth, async (_req, res) => {
  await Session.deleteOne({ _id: res.locals['sessionId'] });
  res.clearCookie('sf_session', cookieOptions);
  res.status(204).end();
});
