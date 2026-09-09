import { NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bankTransactions, positions, userBankAccounts } from '@/db/schema';
import { normalizeTickerSymbol, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { createClient } from '@/lib/supabase/server';
import { getCachedDailyPrices } from '@/lib/data-cache';
import { evaluateHoldingConsensus, type HoldingConsensus } from '@/lib/multi-strategy-consensus';

class TradeValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function dateOnly(value: unknown): string {
  return String(value || new Date().toISOString()).split('T')[0];
}

function optionalNumber(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : null;
}

export async function handlePortfolioAnalysisGet(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedLookback = Number(searchParams.get('lookback') || 5);
  const lookback = Number.isFinite(requestedLookback) ? Math.min(20, Math.max(1, requestedLookback)) : 5;
  const symbols = Array.from(new Set(
    (searchParams.get('symbols') || '')
      .split(',')
      .map((symbol) => normalizeTickerSymbol(symbol))
      .filter(Boolean),
  )).slice(0, 100);

  if (symbols.length === 0) return NextResponse.json({ consensusMap: {}, dataAsOf: null });

  const analyses = await Promise.allSettled(symbols.map(async (symbol) => {
    const rows = await getCachedDailyPrices(symbol);
    const bars: PriceBar[] = rows.map((record) => ({
      date: String(record.date).split('T')[0],
      open: Number(record.open),
      high: Number(record.high),
      low: Number(record.low),
      close: Number(record.close),
      volume: Number(record.volume || 0),
    })).filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 80) return null;
    return { symbol, latestData: bars[bars.length - 1].date, consensus: await evaluateHoldingConsensus(symbol, bars, lookback) };
  }));

  const consensusMap: Record<string, HoldingConsensus> = {};
  let dataAsOf: string | null = null;
  for (const result of analyses) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    consensusMap[result.value.symbol] = result.value.consensus;
    if (!dataAsOf || result.value.latestData > dataAsOf) dataAsOf = result.value.latestData;
  }

  return NextResponse.json({ consensusMap, dataAsOf });
}

export async function handlePortfolioTradesPost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action || '').toUpperCase();
    const accountId = Number(body.accountId);
    const ticker = normalizeTickerSymbol(String(body.symbol || body.tickerSymbol || ''));
    const price = Number(body.price ?? body.entryPrice ?? body.exitPrice);
    const quantity = Number(body.quantity ?? body.quantityToClose);

    if (!['BUY', 'SELL'].includes(action)) throw new TradeValidationError('action must be BUY or SELL');
    if (!Number.isInteger(accountId) || accountId <= 0) throw new TradeValidationError('A brokerage account is required');
    if (!ticker) throw new TradeValidationError('A ticker is required');
    if (!Number.isFinite(price) || price <= 0) throw new TradeValidationError('Price must be positive');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new TradeValidationError('Quantity must be positive');

    const tradeDate = dateOnly(body.date ?? body.entryDate ?? body.exitDate);
    const amount = price * quantity;
    const strategyId = body.strategyId ? String(body.strategyId) : null;
    const signalDate = body.signalDate ? dateOnly(body.signalDate) : null;
    const signalPrice = optionalNumber(body.signalPrice);
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    const entrySource = body.entrySource === 'CHART' ? 'CHART' : 'COMMAND_CENTER';

    const result = await db.transaction(async (tx) => {
      const [account] = await tx.select()
        .from(userBankAccounts)
        .where(and(
          eq(userBankAccounts.id, accountId),
          eq(userBankAccounts.userId, user.id),
          eq(userBankAccounts.isArchived, false),
        ));

      if (!account) throw new TradeValidationError('Brokerage account not found', 404);
      const canonicalType = account.accountType === 'BROKER_CASH' ? 'BROKERAGE' : account.accountType;
      if (canonicalType !== 'BROKERAGE') throw new TradeValidationError('Selected account is not a brokerage account');
      if (account.currency !== 'EGP') throw new TradeValidationError('Live EGX trades require an EGP brokerage account');

      if (action === 'BUY') {
        const [debitedAccount] = await tx.update(userBankAccounts)
          .set({ balance: sql`${userBankAccounts.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(
            eq(userBankAccounts.id, accountId),
            eq(userBankAccounts.userId, user.id),
            sql`CAST(${userBankAccounts.balance} AS NUMERIC) >= ${amount}`,
          ))
          .returning();

        if (!debitedAccount) throw new TradeValidationError('Insufficient brokerage cash');

        const [position] = await tx.insert(positions).values({
          userId: user.id,
          tickerSymbol: ticker,
          status: 'OPEN',
          side: 'LONG',
          accountId,
          entryDate: tradeDate,
          entryPrice: String(price),
          quantity: String(quantity),
          targetPrice: optionalNumber(body.targetPrice),
          stopPrice: optionalNumber(body.stopPrice),
          entryStrategyId: strategyId,
          entrySignalDate: signalDate,
          entrySignalPrice: signalPrice,
          entrySource,
          notes,
          updatedAt: new Date(),
        }).returning();

        const [transaction] = await tx.insert(bankTransactions).values({
          userId: user.id,
          accountId,
          type: 'BROKERAGE_BUY',
          amount: String(amount),
          currency: account.currency,
          category: 'Investments',
          transactionDate: tradeDate,
          positionId: position.id,
          notes: notes || `Buy ${ticker} · ${quantity} shares @ ${price}`,
        }).returning();

        return { action, position, transaction, account: debitedAccount };
      }

      const lots = await tx.select()
        .from(positions)
        .where(and(
          eq(positions.userId, user.id),
          eq(positions.accountId, accountId),
          eq(positions.tickerSymbol, ticker),
          eq(positions.status, 'OPEN'),
        ))
        .orderBy(asc(positions.entryDate), asc(positions.id));

      const available = lots.reduce((sum, lot) => sum + Number(lot.quantity), 0);
      if (quantity > available + 0.000001) throw new TradeValidationError(`Only ${available} shares of ${ticker} are available to sell`);

      let remaining = quantity;
      let firstClosedPositionId: number | null = null;
      for (const lot of lots) {
        if (remaining <= 0) break;
        const lotQuantity = Number(lot.quantity);
        const closeQuantity = Math.min(lotQuantity, remaining);
        const closesWholeLot = closeQuantity >= lotQuantity - 0.000001;
        if (closesWholeLot) {
          await tx.update(positions).set({
            status: 'CLOSED',
            quantity: String(lotQuantity),
            exitDate: tradeDate,
            exitPrice: String(price),
            notes: notes || lot.notes,
            updatedAt: new Date(),
          }).where(and(eq(positions.id, lot.id), eq(positions.userId, user.id)));
          firstClosedPositionId = firstClosedPositionId ?? lot.id;
        } else {
          await tx.update(positions).set({ quantity: String(lotQuantity - closeQuantity), updatedAt: new Date() })
            .where(and(eq(positions.id, lot.id), eq(positions.userId, user.id)));
          const [closedLot] = await tx.insert(positions).values({
            userId: user.id,
            tickerSymbol: ticker,
            status: 'CLOSED',
            side: lot.side,
            accountId,
            entryDate: lot.entryDate,
            entryPrice: lot.entryPrice,
            quantity: String(closeQuantity),
            targetPrice: lot.targetPrice,
            stopPrice: lot.stopPrice,
            exitDate: tradeDate,
            exitPrice: String(price),
            entryStrategyId: lot.entryStrategyId,
            entrySignalDate: lot.entrySignalDate,
            entrySignalPrice: lot.entrySignalPrice,
            entrySource: lot.entrySource,
            notes: notes || lot.notes,
            createdAt: lot.createdAt,
            updatedAt: new Date(),
          }).returning();
          firstClosedPositionId = firstClosedPositionId ?? closedLot.id;
        }
        remaining -= closeQuantity;
      }

      const [creditedAccount] = await tx.update(userBankAccounts)
        .set({ balance: sql`${userBankAccounts.balance} + ${amount}`, updatedAt: new Date() })
        .where(and(eq(userBankAccounts.id, accountId), eq(userBankAccounts.userId, user.id)))
        .returning();

      const [transaction] = await tx.insert(bankTransactions).values({
        userId: user.id,
        accountId,
        type: 'BROKERAGE_SELL',
        amount: String(amount),
        currency: account.currency,
        category: 'Investments',
        transactionDate: tradeDate,
        positionId: firstClosedPositionId,
        notes: notes || `Sell ${ticker} · ${quantity} shares @ ${price}`,
      }).returning();

      return { action, transaction, account: creditedAccount, ticker, quantity, price };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TradeValidationError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error executing portfolio trade:', error);
    return NextResponse.json({ error: 'Trade could not be completed. No account or position changes were saved.' }, { status: 500 });
  }
}
