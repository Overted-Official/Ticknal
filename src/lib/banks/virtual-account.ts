import { db } from '@/db';
import { userBankAccounts } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  VIRTUAL_ACCOUNT_NAME,
  VIRTUAL_BROKER_NAME,
  VIRTUAL_ACCOUNT_NUMBER,
  VIRTUAL_INITIAL_BALANCE,
  VirtualAccountRecord,
  isVirtualAccount,
} from './virtual-account-constants';

export {
  VIRTUAL_ACCOUNT_NAME,
  VIRTUAL_BROKER_NAME,
  VIRTUAL_ACCOUNT_NUMBER,
  VIRTUAL_INITIAL_BALANCE,
  type VirtualAccountRecord,
  isVirtualAccount,
};

/**
 * Ensures that a standard Virtual Account exists for the given user.
 * If one does not exist, it is created with standard paper trading capital.
 */
export async function ensureUserVirtualAccount(
  userId: string,
  currency = 'EGP'
): Promise<VirtualAccountRecord> {
  const normCurrency = (currency || 'EGP').toUpperCase();

  // 1. Look for an existing active Virtual Account for this user
  const existingRows = await db
    .select()
    .from(userBankAccounts)
    .where(
      and(
        eq(userBankAccounts.userId, userId),
        eq(userBankAccounts.accountName, VIRTUAL_ACCOUNT_NAME),
        eq(userBankAccounts.currency, normCurrency),
        eq(userBankAccounts.isArchived, false),
      )
    )
    .limit(1);

  if (existingRows.length > 0 && existingRows[0]) {
    return existingRows[0] as unknown as VirtualAccountRecord;
  }

  // 2. If not found, provision the standard Virtual Account
  const startingBalance = normCurrency === 'USD' ? '50000.0000' : VIRTUAL_INITIAL_BALANCE;

  const [created] = await db
    .insert(userBankAccounts)
    .values({
      userId,
      accountName: VIRTUAL_ACCOUNT_NAME,
      customBankName: VIRTUAL_BROKER_NAME,
      accountNumber: 'VIRTUAL-001',
      accountType: 'BROKERAGE',
      currency: normCurrency,
      balance: startingBalance,
      color: '#6366f1',
      isDefaultExpense: false,
      isArchived: false,
    })
    .returning();

  return created as unknown as VirtualAccountRecord;
}
