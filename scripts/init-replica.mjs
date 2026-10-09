import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true', {
  serverSelectionTimeoutMS: 5000,
});
try {
  await client.connect();
  const admin = client.db('admin');
  try {
    await admin.command({ replSetGetStatus: 1 });
  } catch (error) {
    if (error.code !== 94) throw error;
    await admin.command({
      replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27018' }] },
    });
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    const hello = await admin.command({ hello: 1 });
    if (hello.isWritablePrimary && hello.setName === 'rs0') {
      console.log('Replica set rs0 is writable on 127.0.0.1:27018');
      process.exitCode = 0;
      break;
    }
    if (attempt === 29) throw new Error('Replica set did not become primary');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
} finally {
  await client.close();
}
