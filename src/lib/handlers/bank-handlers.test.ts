import { describe, it, expect } from 'vitest';
import { validateCloseoutPayload } from './bank-handlers-helpers';

describe('validateCloseoutPayload', () => {
  it('validates yearMonth and numeric balances correctly', () => {
    const payload = {
      yearMonth: '2026-10',
      accountBalances: [{ accountId: 1, balance: 115000 }],
      totalIncome: 50000,
      expenseBreakdown: [{ category: 'Food', amount: 8000, percentage: 25 }],
    };
    const valid = validateCloseoutPayload(payload);
    expect(valid.isValid).toBe(true);
    expect(valid.yearMonth).toBe('2026-10');
  });

  it('rejects invalid yearMonth format', () => {
    const payload = { yearMonth: 'invalid-date', accountBalances: [] };
    const valid = validateCloseoutPayload(payload);
    expect(valid.isValid).toBe(false);
  });

  it('rejects invalid account balance entries', () => {
    const payload = {
      yearMonth: '2026-10',
      accountBalances: [{ accountId: 'not-a-number', balance: 'abc' }],
    };
    const valid = validateCloseoutPayload(payload);
    expect(valid.isValid).toBe(false);
  });
});
