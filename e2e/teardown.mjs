import { MongoClient } from 'mongodb';
export default async function teardown() {
  const name = process.env.STOCKFLOW_E2E_DB;
  if (!name?.startsWith('stockflow_e2e_')) throw new Error('Refusing non-E2E cleanup');
  const client = new MongoClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true');
  try {
    await client.connect();
    await client.db(name).dropDatabase();
  } finally {
    await client.close();
  }
}
