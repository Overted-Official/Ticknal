import { describe, it, expect } from 'vitest';
import { isVirtualAccount } from './virtual-account-constants';
import { type BankAccount } from '@/types/bank';

describe('isVirtualAccount filter rules', () => {
  it('identifies standard virtual account variations', () => {
    expect(isVirtualAccount({ accountName: 'Virtual Account' })).toBe(true);
    expect(isVirtualAccount({ accountName: 'Virtual' })).toBe(true);
    expect(isVirtualAccount({ customBankName: 'Virtual Brokerage' })).toBe(true);
    expect(isVirtualAccount({ bankName: 'Virtual Brokerage' })).toBe(true);
    expect(isVirtualAccount({ accountNumber: 'VIRTUAL-001' })).toBe(true);
    expect(isVirtualAccount({ accountName: 'Paper Trading Account' })).toBe(true);
  });

  it('preserves genuine bank and brokerage accounts', () => {
    expect(isVirtualAccount({ accountName: 'CIB Current', bankName: 'Commercial International Bank' })).toBe(false);
    expect(isVirtualAccount({ accountName: 'Thndr', customBankName: 'Thndr', accountType: 'BROKERAGE' })).toBe(false);
    expect(isVirtualAccount({ accountName: 'Vodafone Cash', customBankName: 'Vodafone Cash' })).toBe(false);
    expect(isVirtualAccount({ accountName: 'Banque Misr Savings' })).toBe(false);
    expect(isVirtualAccount(null)).toBe(false);
    expect(isVirtualAccount(undefined)).toBe(false);
  });

  it('correctly filters out virtual accounts from liquid balances calculation', () => {
    const mixedAccounts: BankAccount[] = [
      { id: 1, userId: 'u1', accountName: 'Virtual', currency: 'EGP', balance: '1000000', accountType: 'BROKERAGE', isArchived: false },
      { id: 2, userId: 'u1', accountName: 'CIB Savings', currency: 'EGP', balance: '350000', accountType: 'SAVINGS', isArchived: false },
      { id: 3, userId: 'u1', accountName: 'Banque Misr', currency: 'EGP', balance: '100000', accountType: 'SAVINGS', isArchived: false },
      { id: 4, userId: 'u1', accountName: 'CIB USD', currency: 'USD', balance: '1000', accountType: 'CURRENT', isArchived: false },
    ];

    const usdRate = 50;
    const realAccounts = mixedAccounts.filter((a) => !a.isArchived && !isVirtualAccount(a));
    const totalLiquidEgp = realAccounts.reduce((sum, a) => {
      const b = Number(a.balance);
      return sum + (a.currency === 'USD' ? b * usdRate : b);
    }, 0);

    // 350,000 + 100,000 + (1,000 * 50) = 500,000 (1,000,000 virtual excluded)
    expect(realAccounts.length).toBe(3);
    expect(totalLiquidEgp).toBe(500000);
  });
});
