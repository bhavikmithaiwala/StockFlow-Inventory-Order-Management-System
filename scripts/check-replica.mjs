import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const client = new MongoClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true');
const databaseName = `stockflow_probe_${randomUUID().replaceAll('-', '')}`;
try {
  await client.connect();
  const db = client.db(databaseName);
  const records = db.collection('records');
  await records.insertOne({ value: 0 });
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await records.updateOne({}, { $inc: { value: 1 } }, { session });
      await db.collection('ledger').insertOne({ delta: 1 }, { session });
    });
    assert.equal((await records.findOne({})).value, 1);
    await assert.rejects(
      session.withTransaction(async () => {
        await records.updateOne({}, { $inc: { value: 7 } }, { session });
        throw new Error('Probe rollback');
      }),
      /Probe rollback/,
    );
    assert.equal((await records.findOne({})).value, 1);
    assert.equal(await db.collection('ledger').countDocuments(), 1);
    console.log('Real MongoDB multi-document commit and rollback probe passed');
  } finally {
    await session.endSession();
  }
} finally {
  await client.db(databaseName).dropDatabase();
  await client.close();
}
