import { describe, expect, it } from 'vitest';
import { User } from './user.js';
import { Session } from './session.js';

describe('authentication schemas', () => {
  it('normalizes email and rejects unknown roles', () => {
    const user = new User({
      name: 'Staff',
      emailNormalized: ' STAFF@EXAMPLE.COM ',
      passwordHash: 'hash',
      role: 'owner',
    });
    expect(user.emailNormalized).toBe('staff@example.com');
    expect(user.validateSync()?.errors['role']).toBeDefined();
  });
  it('requires session expiration and hides secrets by default', () => {
    expect(new Session({ tokenHash: 'hash' }).validateSync()?.errors['expiresAt']).toBeDefined();
    expect(User.schema.path('passwordHash').options.select).toBe(false);
    expect(Session.schema.path('tokenHash').options.select).toBe(false);
  });
});
