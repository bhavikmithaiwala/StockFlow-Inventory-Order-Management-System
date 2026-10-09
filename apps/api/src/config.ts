import { z } from 'zod';

const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string()
    .startsWith('mongodb')
    .default('mongodb://127.0.0.1:27018/stockflow?replicaSet=rs0&directConnection=true'),
  APP_ORIGIN: z
    .url()
    .default('http://localhost:4200')
    .transform((value) => new URL(value).origin),
});

export const config = environment.parse(process.env);
