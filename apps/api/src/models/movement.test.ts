import { expect, it } from 'vitest';
import { StockMovement } from './movement.js';
it('rejects ledger entries that do not reconcile', async () => {
  const base = {
    productId: 'a'.repeat(24),
    actorId: 'b'.repeat(24),
    type: 'receipt',
    delta: 3,
    beforeQuantity: 0,
    afterQuantity: 3,
    reason: 'Delivery',
  };
  await expect(new StockMovement(base).validate()).resolves.toBeUndefined();
  await expect(new StockMovement({ ...base, afterQuantity: 2 }).validate()).rejects.toThrow(
    'reconcile',
  );
  await expect(StockMovement.updateOne({}, { reason: 'Tamper' })).rejects.toThrow('append-only');
});
