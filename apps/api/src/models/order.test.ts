import { expect, it } from 'vitest';
import { assertTransition, calculateTotal } from './order.js';
it('permits the documented order state machine and integer monetary totals', () => {
  expect(() => assertTransition('draft', 'confirmed')).not.toThrow();
  expect(() => assertTransition('confirmed', 'fulfilled')).not.toThrow();
  expect(() => assertTransition('fulfilled', 'cancelled')).toThrow('Cannot change');
  expect(() => assertTransition('confirmed', 'confirmed')).toThrow('Cannot change');
  expect(calculateTotal([{ quantity: 3, unitPriceCents: 199 }])).toBe(597);
  expect(() => calculateTotal([{ quantity: Number.MAX_SAFE_INTEGER, unitPriceCents: 2 }])).toThrow(
    'exceeds',
  );
});
