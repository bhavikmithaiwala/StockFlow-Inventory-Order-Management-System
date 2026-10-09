import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

export async function openTestDatabase() {
  const dbName = `stockflow_test_${randomUUID().replaceAll('-', '')}`;
  await mongoose.connect('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true', {
    dbName,
  });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}
export async function closeTestDatabase() {
  if (!mongoose.connection.name.startsWith('stockflow_test_'))
    throw new Error('Refusing to drop non-test database');
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
