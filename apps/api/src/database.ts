import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDatabase() {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName || !hello.isWritablePrimary) {
    await mongoose.disconnect();
    throw new Error('StockFlow requires a writable MongoDB replica set');
  }
}
