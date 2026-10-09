import { expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

it('salts password hashes and verifies only the correct password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  expect(hash).not.toBe(await hashPassword('correct horse battery staple'));
  expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  expect(await verifyPassword('wrong password', hash)).toBe(false);
  expect(await verifyPassword('anything', 'invalid')).toBe(false);
});
