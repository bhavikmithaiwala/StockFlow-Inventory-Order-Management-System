import { createHash } from 'node:crypto';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
