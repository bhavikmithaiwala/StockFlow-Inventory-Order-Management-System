import { randomBytes } from 'node:crypto';
import { User } from '../models/user.js';
import { Session } from '../models/session.js';
import { hashPassword, verifyPassword } from '../security/password.js';
import { tokenHash } from '../security/token.js';
import { ApiError } from '../errors.js';

const dummyHash = hashPassword(randomBytes(32).toString('hex'));
export async function authenticate(email: string, password: string) {
  const user = await User.findOne({
    emailNormalized: email.trim().toLowerCase(),
    active: true,
  }).select('+passwordHash');
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !valid)
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await Session.create({
    userId,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
  });
  return token;
}
export async function resolveSession(token: string) {
  const session = await Session.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  const user = session && (await User.findOne({ _id: session.userId, active: true }));
  if (!session || !user)
    throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired; sign in again');
  await Session.updateOne({ _id: session._id }, { $set: { lastUsedAt: new Date() } });
  return { session, user };
}
export const invalidateSession = (id: string) => Session.deleteOne({ _id: id });
