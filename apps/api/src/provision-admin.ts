import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDatabase } from './database.js';
import { User } from './models/user.js';
import { hashPassword } from './security/password.js';
import { config } from './config.js';

if (config.NODE_ENV === 'production')
  throw new Error('Development provisioning is disabled in production');
const input = z
  .object({
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(12).max(128),
    ADMIN_NAME: z.string().trim().min(1).max(100).default('Warehouse Admin'),
  })
  .parse(process.env);
try {
  await connectDatabase();
  await User.init();
  const emailNormalized = input.ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ emailNormalized }))
    throw new Error('Account already exists; provisioning will not overwrite it');
  await User.create({
    name: input.ADMIN_NAME,
    emailNormalized,
    passwordHash: await hashPassword(input.ADMIN_PASSWORD),
    role: 'admin',
  });
  console.log('Development admin created');
} finally {
  await mongoose.disconnect();
}
