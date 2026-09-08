import type { BankAccount, BankTransaction } from '@/types/bank';

/** Legacy values remain readable, but all dashboard calculations use BROKERAGE semantics. */
export function isBrokerageAccount(account: Pick<BankAccount, 'accountType'> | { accountType?: string | null } | string): boolean {
  const accountType = typeof account === 'string' ? account : account.accountType;
  return accountType === 'BROKERAGE' || accountType === 'BROKER_CASH';
}

export function toEgp(amount: number, currency: string, usdRate: number): number {
  return currency === 'USD' ? amount * usdRate : amount;
}

export type DashboardCashFlowKind = 'INFLOW' | 'OUTFLOW' | 'INTERNAL' | 'IGNORED';

/**
 * Household cash-flow classification. Brokerage buys and sells are asset
 * conversions, not income or spending, so they stay out of the cash-flow
 * and spending charts while still affecting the account balance itself.
 */
export function getDashboardCashFlowKind(type: string): DashboardCashFlowKind {
  if (['INCOME', 'DEPOSIT', 'BROKER_WITHDRAWAL'].includes(type)) return 'INFLOW';
  if (['EXPENSE', 'WITHDRAWAL', 'BROKER_INJECTION'].includes(type)) return 'OUTFLOW';
  if (type === 'TRANSFER' || ['BROKERAGE_BUY', 'BROKERAGE_SELL'].includes(type)) return 'INTERNAL';
  return 'IGNORED';
}

/**
 * Household spending excludes capital movements to an external brokerage.
 * Those movements still belong in cash-flow activity because they reduce the
 * tracked bank balance, but they must not inflate expense categories.
 */
export function isDashboardSpending(type: string): boolean {
  return type === 'EXPENSE' || type === 'WITHDRAWAL';
}

/** Signed impact on the transaction's source account balance. */
export function getAccountCashImpact(type: string, amount: number): number {
  if (['INCOME', 'DEPOSIT', 'BROKER_WITHDRAWAL', 'BROKERAGE_SELL'].includes(type)) return amount;
  if (['EXPENSE', 'WITHDRAWAL', 'BROKER_INJECTION', 'BROKERAGE_BUY'].includes(type)) return -amount;
  return 0;
}

export type CashTrendPoint = {
  yearMonth: string;
  month: string;
  totalEgp: number;
  bankCashEgp: number;
  brokerageCashEgp: number;
  egpCash: number;
  usdCash: number;
};

export type NetWorthHistoryPoint = {
  yearMonth: string;
  month: string;
  nominalEgp: number;
  cashEgp: number;
  brokerageCashEgp: number;
  investedEgp: number;
};

export type NetWorthTrendPoint = {
  month: string;
  fullDate: string;
  nominal: number;
  real: number;
  drag: number;
  invested: number;
  cash: number;
  brokerageCash: number;
};

export function monthEnd(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function recentMonthKeys(months: number): string[] {
  const today = new Date();
  const keys: string[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/**
 * Reconstructs recorded account balances at month-end from today's balance
 * and the account ledger. This avoids inventing a sparkline when no balance
 * snapshot exists and handles transfers without counting them as new wealth.
 */
export function buildCashTrend(
  accounts: BankAccount[],
  transactions: BankTransaction[],
  usdRate: number,
  months = 12,
): CashTrendPoint[] {
  const monthKeys = recentMonthKeys(months);

  return monthKeys.map((yearMonth) => {
    const asOf = monthEnd(yearMonth);
    let totalEgp = 0;
    let bankCashEgp = 0;
    let brokerageCashEgp = 0;
    let egpCash = 0;
    let usdCash = 0;

    for (const account of accounts) {
      if (account.createdAt && String(account.createdAt).slice(0, 10) > asOf) continue;

      let balance = Number(account.balance) || 0;
      for (const transaction of transactions) {
        const transactionDate = String(transaction.transactionDate || '').slice(0, 10);
        if (transactionDate <= asOf) continue;

        const amount = Number(transaction.amount) || 0;
        if (transaction.type === 'TRANSFER') {
          if (transaction.accountId === account.id) balance += amount;
          if (transaction.toAccountId === account.id) balance -= amount;
          continue;
        }

        if (transaction.accountId === account.id) {
          // Prior balance = current balance - later ledger impact.
          balance -= getAccountCashImpact(transaction.type, amount);
        }
      }

      const egpValue = toEgp(balance, account.currency, usdRate);
      totalEgp += egpValue;
      if (isBrokerageAccount(account)) brokerageCashEgp += egpValue;
      else bankCashEgp += egpValue;
      if (account.currency === 'USD' && !isBrokerageAccount(account)) usdCash += balance;
      if (account.currency === 'EGP' && !isBrokerageAccount(account)) egpCash += balance;
    }

    const date = new Date(`${yearMonth}-01T00:00:00Z`);
    const monthLabel = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const yearLabel = String(date.getUTCFullYear()).slice(-2);

    return {
      yearMonth,
      month: `${monthLabel} '${yearLabel}`,
      totalEgp,
      bankCashEgp,
      brokerageCashEgp,
      egpCash,
      usdCash,
    };
  });
}
