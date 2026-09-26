import { type BankAccount, type BankTransaction } from '@/types/bank';

export type LedgerFilterType = 'ALL' | 'INFLOWS' | 'EXPENSES' | 'TRANSFERS' | 'TRADES' | 'YIELD';

export type LedgerPeriod = '30D' | '90D' | 'YTD' | '1Y' | 'ALL';

export type TransactionsTimeframe = '3M' | '6M' | '1Y' | 'All';

export interface ClosedTradeItem {
  id: number;
  tickerSymbol: string;
  companyName?: string;
  logoUrl?: string | null;
  side: string;
  quantity: number;
  entryPrice: number;
  entryDate: string;
  exitPrice: number;
  exitDate: string;
  profitLoss: number;
  profitLossPct: number;
  strategyId?: string | null;
  notes?: string | null;
  accountId?: number | null;
  accountName?: string | null;
}

export interface UnifiedLedgerItem {
  id: string; // e.g. 'tx-123' or 'trade-45'
  originalId: number;
  kind: 'transaction' | 'trade';
  type: string; // 'EXPENSE', 'INCOME', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'BROKERAGE_BUY', 'BROKERAGE_SELL', 'INTEREST', 'TRADE_CLOSED'
  title: string;
  category: string;
  accountName: string;
  toAccountName?: string | null;
  bankLogoUrl?: string | null;
  tickerSymbol?: string;
  tickerLogoUrl?: string | null;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  isPositive: boolean;
  notes?: string | null;
  tradeDetails?: {
    side: string;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    realizedPnl: number;
    realizedPnlPct: number;
    strategyId?: string | null;
  };
  rawTransaction?: BankTransaction;
}
