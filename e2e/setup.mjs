import { MongoClient } from 'mongodb';
import { hashPassword } from '../apps/api/dist/security/password.js';

export default async function setup() {
  const name = process.env.STOCKFLOW_E2E_DB;
  if (!name?.startsWith('stockflow_e2e_')) throw new Error('Expected isolated E2E database');
  const client = new MongoClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true');
  try {
    await client.connect();
    const db = client.db(name);
    const passwordHash = await hashPassword('StockFlowDemo!2026');
    await db.collection('users').insertMany([
      {
        name: 'Demo Admin',
        emailNormalized: 'admin@stockflow.test',
        passwordHash,
        role: 'admin',
        active: true,
        preferences: { pageSize: 20 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Demo Staff',
        emailNormalized: 'staff@stockflow.test',
        passwordHash,
        role: 'staff',
        active: true,
        preferences: { pageSize: 20 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  } finally {
    await client.close();
  }
}
