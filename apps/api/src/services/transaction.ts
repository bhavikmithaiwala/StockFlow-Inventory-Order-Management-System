import mongoose, { type ClientSession } from 'mongoose';
import { ApiError } from '../errors.js';

export async function transaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  let attempts = 0;
  try {
    return await session.withTransaction(
      async () => {
        if (++attempts > 5)
          throw new ApiError(409, 'TRANSACTION_BUSY', 'Inventory is busy; retry the operation');
        return operation(session);
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 5000,
        timeoutMS: 20000,
      },
    );
  } finally {
    await session.endSession();
  }
}
