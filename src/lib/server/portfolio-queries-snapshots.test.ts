import { describe, it, expect } from 'vitest';
import { buildCashTrendForMonthKeysWithSnapshots } from '@/lib/finance/portfolio-finance';

describe('buildCashTrendForMonthKeysWithSnapshots', () => {
  it('uses snapshot closing balance when available for a given month', () => {
    const snapshots = [
      { accountId: 1, yearMonth: '2026-09', closingBalance: '100000' },
      { accountId: 2, yearMonth: '2026-09', closingBalance: '50000' },
    ];
    const accounts = [
      { id: 1, balance: '120000', currency: 'EGP', accountType: 'CURRENT', accountName: 'CIB', isArchived: false, userId: 'u1' },
      { id: 2, balance: '55000', currency: 'EGP', accountType: 'SAVINGS', accountName: 'QNB', isArchived: false, userId: 'u1' },
    ];
    const trend = buildCashTrendForMonthKeysWithSnapshots(accounts, [], { USD: 50 }, ['2026-09'], snapshots);
    expect(trend[0].totalEgp).toBe(150000);
  });

  it('falls back to current balance if month is current and has no snapshot yet', () => {
    const snapshots: any[] = [];
    const accounts = [
      { id: 1, balance: '120000', currency: 'EGP', accountType: 'CURRENT', accountName: 'CIB', isArchived: false, userId: 'u1' },
      { id: 2, balance: '1000', currency: 'USD', accountType: 'SAVINGS', accountName: 'USD Account', isArchived: false, userId: 'u1' },
    ];
    const trend = buildCashTrendForMonthKeysWithSnapshots(accounts, [], { USD: 50 }, ['2026-10'], snapshots);
    expect(trend[0].totalEgp).toBe(170000); // 120k + (1000 * 50)
  });
});
