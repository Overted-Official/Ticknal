import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { positions } from '@/db/schema';
import { getCachedTickers } from '@/lib/data-cache';
import {
  getUserBankAccounts,
  getUserBankTransactions,
  getUsdRate,
} from '@/lib/server/portfolio-queries';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { type ClosedTradeItem } from '@/components/platform/transactions/types';
import TransactionsPageView from '@/components/platform/transactions/TransactionsPageView';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-auto bg-plt-base p-8 text-center text-plt-text">
        <h2 className="text-2xl font-bold mb-4">Welcome to Ticknal</h2>
        <p className="mb-6 text-plt-muted">Please sign in to view your transactions and activity ledger.</p>
        <Link href="/" className="rounded-xl bg-plt-accent px-6 py-2 text-plt-base transition hover:opacity-90">
          Sign In
        </Link>
      </div>
    );
  }

  let accounts: BankAccount[] = [];
  let transactions: BankTransaction[] = [];
  let usdRate = 50.2;
  let closedTrades: ClosedTradeItem[] = [];

  try {
    const [accRes, txRes, usdRes, closedRes, tickersRes] = await Promise.allSettled([
      getUserBankAccounts(user.id),
      getUserBankTransactions(user.id),
      getUsdRate(),
      db
        .select()
        .from(positions)
        .where(and(eq(positions.status, 'CLOSED'), eq(positions.userId, user.id)))
        .orderBy(desc(positions.exitDate), desc(positions.createdAt)),
      getCachedTickers(),
    ]);

    if (accRes.status === 'fulfilled') {
      accounts = accRes.value;
    } else {
      console.error('Error fetching accounts for TransactionsPage:', accRes.reason);
    }

    if (txRes.status === 'fulfilled') {
      transactions = txRes.value;
    } else {
      console.error('Error fetching transactions for TransactionsPage:', txRes.reason);
    }

    if (usdRes.status === 'fulfilled' && usdRes.value > 0) {
      usdRate = usdRes.value;
    }

    const tickerMap = new Map<string, { companyName: string; logoUrl: string | null }>();
    if (tickersRes.status === 'fulfilled' && Array.isArray(tickersRes.value)) {
      for (const t of tickersRes.value) {
        tickerMap.set(t.symbol, {
          companyName: t.companyName || t.symbol,
          logoUrl: t.logoUrl ?? null,
        });
      }
    }

    const accountMap = new Map<number, string>();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc.accountName || acc.bankName || 'Account');
    }

    if (closedRes.status === 'fulfilled' && Array.isArray(closedRes.value)) {
      closedTrades = closedRes.value.map((row) => {
        const entryPrice = Number(row.entryPrice);
        const exitPrice = Number(row.exitPrice ?? row.entryPrice);
        const quantity = Number(row.quantity);
        const isShort = String(row.side).toUpperCase() === 'SHORT';
        const profitLoss = isShort
          ? (entryPrice - exitPrice) * quantity
          : (exitPrice - entryPrice) * quantity;
        const costBasis = entryPrice * quantity;
        const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
        const tickerInfo = tickerMap.get(row.tickerSymbol);

        const entryDateStr =
          typeof row.entryDate === 'string'
            ? row.entryDate
            : new Date(row.entryDate).toISOString().split('T')[0];

        const exitDateStr = row.exitDate
          ? typeof row.exitDate === 'string'
            ? row.exitDate
            : new Date(row.exitDate).toISOString().split('T')[0]
          : entryDateStr;

        return {
          id: row.id,
          tickerSymbol: row.tickerSymbol,
          companyName: tickerInfo?.companyName ?? row.tickerSymbol,
          logoUrl: tickerInfo?.logoUrl ?? null,
          side: row.side,
          quantity,
          entryPrice,
          entryDate: entryDateStr,
          exitPrice,
          exitDate: exitDateStr,
          profitLoss,
          profitLossPct,
          strategyId: row.entryStrategyId ?? null,
          notes: row.notes ?? null,
          accountId: row.accountId ?? null,
          accountName: row.accountId ? accountMap.get(row.accountId) ?? null : null,
        };
      });
    }
  } catch (err) {
    console.error('Unexpected error loading TransactionsPage data:', err);
  }

  return (
    <TransactionsPageView
      initialAccounts={accounts}
      initialTransactions={transactions}
      closedTrades={closedTrades}
      usdRate={usdRate}
    />
  );
}
