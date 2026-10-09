import { z } from 'zod';
export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
