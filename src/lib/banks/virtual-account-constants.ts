export const VIRTUAL_ACCOUNT_NAME = 'Virtual Account';
export const VIRTUAL_BROKER_NAME = 'Virtual Brokerage';
export const VIRTUAL_ACCOUNT_NUMBER = 'VIRTUAL-001';
export const VIRTUAL_INITIAL_BALANCE = '1000000.0000'; // 1,000,000 EGP starting paper capital

export interface VirtualAccountRecord {
  id: number;
  userId: string;
  accountName: string;
  customBankName: string | null;
  accountNumber: string | null;
  accountType: string;
  currency: string;
  balance: string;
  color: string | null;
  isDefaultExpense: boolean;
  isArchived: boolean;
}

/**
 * Checks whether an account is the system-provided Virtual Account.
 * Pure utility safe for both client and server components.
 */
export function isVirtualAccount(account: {
  accountName?: string | null;
  customBankName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
} | null | undefined): boolean {
  if (!account) return false;
  const name = (account.accountName || '').toLowerCase();
  const custom = (account.customBankName || '').toLowerCase();
  const bank = (account.bankName || '').toLowerCase();
  const num = (account.accountNumber || '').toUpperCase();
  return (
    name.includes('virtual') ||
    custom.includes('virtual') ||
    bank.includes('virtual') ||
    name.includes('paper') ||
    custom.includes('paper') ||
    num.includes('VIRTUAL')
  );
}
