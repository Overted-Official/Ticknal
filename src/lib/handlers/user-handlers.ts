import { NextResponse } from 'next/server';
import { desc, eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { positions, profiles, systemLogs, userBankAccounts, bankTransactions, tickers } from '@/db/schema';
import { derivePositionLevels, getDailyPriceBars } from '@/lib/strategyOrders';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureUserVirtualAccount, isVirtualAccount } from '@/lib/banks/virtual-account';

type PositionRow = typeof positions.$inferSelect;

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getLatestPriceMap(): Promise<Record<string, number>> {
  const { getCachedRecentPrices } = await import('@/lib/data-cache');
  const raw = await getCachedRecentPrices();
  const rows = Array.isArray(raw) ? raw : (raw as any)?.rows ?? [];

  const priceMap: Record<string, number> = {};
  for (const row of rows) {
    if (Number(row.rn) === 1) {
      priceMap[String(row.ticker_symbol)] = Number(row.close);
    }
  }
  return priceMap;
}

async function getTickerMap(): Promise<Record<string, { companyName: string; sector: string; logoUrl: string | null; currency: string }>> {
  const { getCachedTickers } = await import('@/lib/data-cache');
  const rows = await getCachedTickers();
  
  const tickerMap: Record<string, { companyName: string; sector: string; logoUrl: string | null; currency: string }> = {};
  for (const ticker of rows) {
    tickerMap[ticker.symbol] = {
      companyName: ticker.companyName ?? ticker.symbol,
      sector: ticker.sector ?? 'Unclassified',
      logoUrl: ticker.logoUrl ?? null,
      currency: ticker.currency ?? 'EGP',
    };
  }
  return tickerMap;
}

function formatPosition(
  position: PositionRow,
  priceMap: Record<string, number>,
  tickerMap: Record<string, { companyName: string; sector: string; logoUrl: string | null; currency: string }>,
) {
  const entryPrice = Number(position.entryPrice);
  const quantity = Number(position.quantity);
  const currentPrice = position.status === 'CLOSED' && position.exitPrice ? Number(position.exitPrice) : priceMap[position.tickerSymbol] ?? entryPrice;
  const profitLoss = (currentPrice - entryPrice) * quantity;
  const profitLossPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

  return {
    id: position.id,
    tickerSymbol: position.tickerSymbol,
    accountId: position.accountId,
    entryStrategyId: position.entryStrategyId,
    entrySignalDate: position.entrySignalDate,
    entrySignalPrice: toNullableNumber(position.entrySignalPrice),
    entrySource: position.entrySource,
    companyName: tickerMap[position.tickerSymbol]?.companyName ?? position.tickerSymbol,
    sector: tickerMap[position.tickerSymbol]?.sector ?? 'Unclassified',
    logoUrl: tickerMap[position.tickerSymbol]?.logoUrl ?? null,
    currency: tickerMap[position.tickerSymbol]?.currency ?? 'EGP',
    status: position.status,
    side: position.side,
    entryDate: position.entryDate,
    entryPrice,
    quantity,
    targetPrice: toNullableNumber(position.targetPrice),
    stopPrice: toNullableNumber(position.stopPrice),
    exitDate: position.exitDate,
    exitPrice: toNullableNumber(position.exitPrice),
    currentPrice,
    profitLoss,
    profitLossPct,
    notes: position.notes,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
}

// ----------------------------------------------------
// POSITIONS HANDLERS
// ----------------------------------------------------
export async function handlePositionsGet(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const status = searchParams.get('status')?.toUpperCase();

  try {
    const allPositions = await db.select()
      .from(positions)
      .where(eq(positions.userId, user.id))
      .orderBy(desc(positions.createdAt));
      
    const filteredPositions = allPositions.filter((position) => {
      if (symbol && position.tickerSymbol !== normalizeTickerSymbol(symbol)) return false;
      if (status && position.status !== status) return false;
      return true;
    });

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    return NextResponse.json({
      orders: filteredPositions.map((position) => formatPosition(position, priceMap, tickerMap)),
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handlePositionsPost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ticker = normalizeTickerSymbol(String(body.symbol ?? body.tickerSymbol ?? ''));
    const entryDate = String(body.entryDate ?? '').split('T')[0];
    const entryPrice = Number(body.entryPrice);
    const quantity = Number(body.quantity ?? 1);

    if (!ticker || !entryDate || !Number.isFinite(entryPrice) || entryPrice <= 0) {
      return NextResponse.json({ error: 'symbol, entryDate, and entryPrice are required' }, { status: 400 });
    }

    const existingLevels =
      toNullableNumber(body.targetPrice) !== null || toNullableNumber(body.stopPrice) !== null
        ? {
            targetPrice: toNullableNumber(body.targetPrice),
            stopPrice: toNullableNumber(body.stopPrice),
          }
        : null;
    const levels =
      existingLevels ??
      derivePositionLevels(ticker, await getDailyPriceBars(ticker), entryDate, entryPrice);

    // Resolve brokerage account: explicit accountId or fallback to user's matching active brokerage account
    let targetAccountId = Number(body.accountId);
    if (!Number.isInteger(targetAccountId) || targetAccountId <= 0) {
      const [instrument] = await db.select({ currency: tickers.currency })
        .from(tickers)
        .where(eq(tickers.symbol, ticker));
      const targetCurrency = (instrument?.currency || 'EGP').toUpperCase();

      const userBrokerAccounts = await db.select()
        .from(userBankAccounts)
        .where(and(
          eq(userBankAccounts.userId, user.id),
          eq(userBankAccounts.isArchived, false),
        ));

      const matchingBroker = userBrokerAccounts.find(
        (a) => ['BROKERAGE', 'BROKER_CASH'].includes(a.accountType) && (a.currency || 'EGP').toUpperCase() === targetCurrency
      );

      if (matchingBroker) {
        targetAccountId = matchingBroker.id;
      } else {
        const virtual = await ensureUserVirtualAccount(user.id, targetCurrency);
        targetAccountId = virtual.id;
      }
    }

    const tradeAmount = entryPrice * quantity;
    const entrySource = body.entrySource === 'CHART' ? 'CHART' : (body.entrySource || 'CHART');

    const createdPosition = await db.transaction(async (tx) => {
      let resolvedAccountId: number | null = null;

      if (Number.isInteger(targetAccountId) && targetAccountId > 0) {
        const [account] = await tx.select()
          .from(userBankAccounts)
          .where(and(
            eq(userBankAccounts.id, targetAccountId),
            eq(userBankAccounts.userId, user.id),
            eq(userBankAccounts.isArchived, false),
          ));

        if (!account || !['BROKERAGE', 'BROKER_CASH'].includes(account.accountType)) {
          throw new Error('Selected account is not a valid brokerage account');
        }

        const isVirtual = isVirtualAccount(account);
        if (isVirtual && Number(account.balance) < tradeAmount) {
          await tx.update(userBankAccounts)
            .set({
              balance: sql`${userBankAccounts.balance} + ${Math.max(tradeAmount * 2, 1000000)}`,
              updatedAt: new Date(),
            })
            .where(eq(userBankAccounts.id, targetAccountId));
        }

        const [debited] = await tx.update(userBankAccounts)
          .set({
            balance: sql`${userBankAccounts.balance} - ${tradeAmount}`,
            updatedAt: new Date(),
          })
          .where(and(
            eq(userBankAccounts.id, targetAccountId),
            eq(userBankAccounts.userId, user.id),
            sql`CAST(${userBankAccounts.balance} AS NUMERIC) >= ${tradeAmount}`,
          ))
          .returning();

        if (!debited) {
          throw new Error('Insufficient brokerage cash');
        }

        resolvedAccountId = targetAccountId;
      }

      const [pos] = await tx
        .insert(positions)
        .values({
          userId: user.id,
          tickerSymbol: ticker,
          status: 'OPEN',
          side: 'LONG',
          accountId: resolvedAccountId,
          entryDate,
          entryPrice: entryPrice.toString(),
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity.toString() : '1',
          targetPrice: levels.targetPrice === null ? null : levels.targetPrice.toString(),
          stopPrice: levels.stopPrice === null ? null : levels.stopPrice.toString(),
          entrySource,
          notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
          updatedAt: new Date(),
        })
        .returning();

      if (resolvedAccountId) {
        const [acc] = await tx.select({ currency: userBankAccounts.currency })
          .from(userBankAccounts)
          .where(eq(userBankAccounts.id, resolvedAccountId));

        await tx.insert(bankTransactions).values({
          userId: user.id,
          accountId: resolvedAccountId,
          type: 'BROKERAGE_BUY',
          amount: tradeAmount.toFixed(4),
          currency: acc?.currency || 'EGP',
          category: 'Investments',
          transactionDate: entryDate,
          positionId: pos.id,
          notes: body.notes || `Buy ${ticker} · ${quantity} shares @ ${entryPrice.toFixed(2)}`,
        });
      }

      return pos;
    });

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    return NextResponse.json({ order: formatPosition(createdPosition, priceMap, tickerMap) }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating position:', error);
    if (error?.message === 'Insufficient brokerage cash' || error?.message === 'Selected account is not a valid brokerage account') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Resolves an eligible brokerage account for a user, prioritizing explicit choice,
 * then non-virtual real brokerage accounts (like Thndr) matching currency,
 * and falling back to paper virtual accounts if no real brokerages exist.
 */
async function resolveBrokerageAccount(
  tx: any,
  userId: string,
  preferredAccountId?: number | null,
  currency: string = 'EGP'
) {
  if (preferredAccountId && Number.isInteger(preferredAccountId) && preferredAccountId > 0) {
    const [acc] = await tx.select()
      .from(userBankAccounts)
      .where(and(
        eq(userBankAccounts.id, preferredAccountId),
        eq(userBankAccounts.userId, userId),
        eq(userBankAccounts.isArchived, false)
      ));
    if (acc) return acc;
  }

  const userAccounts = await tx.select()
    .from(userBankAccounts)
    .where(and(
      eq(userBankAccounts.userId, userId),
      eq(userBankAccounts.isArchived, false),
      inArray(userBankAccounts.accountType, ['BROKERAGE', 'BROKER_CASH'])
    ));

  if (!userAccounts || userAccounts.length === 0) {
    return null;
  }

  const nonVirtual = userAccounts.filter((a: any) => !isVirtualAccount(a));
  const targetCurr = (currency || 'EGP').toUpperCase();

  const nonVirtualMatching = nonVirtual.filter((a: any) => (a.currency || 'EGP').toUpperCase() === targetCurr);
  const allMatching = userAccounts.filter((a: any) => (a.currency || 'EGP').toUpperCase() === targetCurr);

  // 1. Non-virtual matching currency with isDefaultExpense
  const defaultNonVirtual = nonVirtualMatching.find((a: any) => a.isDefaultExpense);
  if (defaultNonVirtual) return defaultNonVirtual;

  // 2. Any non-virtual matching currency (e.g. Thndr)
  if (nonVirtualMatching.length > 0) return nonVirtualMatching[0];

  // 3. Any non-virtual account
  if (nonVirtual.length > 0) return nonVirtual[0];

  // 4. Any account matching currency (e.g. virtual)
  if (allMatching.length > 0) return allMatching[0];

  // 5. Any remaining brokerage account
  return userAccounts[0];
}

interface ClosePositionParams {
  tx: any;
  userId: string;
  positionId: number;
  existingPosition: PositionRow;
  exitDate: string;
  exitPrice: number;
  quantityToClose: number;
  preferredAccountId?: number | null;
  notes?: string | null;
}

async function executeClosePosition(params: ClosePositionParams) {
  const {
    tx,
    userId,
    positionId,
    existingPosition,
    exitDate,
    exitPrice,
    quantityToClose,
    preferredAccountId,
    notes,
  } = params;

  const currentQty = Number(existingPosition.quantity);
  const tradeProceeds = exitPrice * quantityToClose;

  // Determine target brokerage account to credit
  const targetAccount = await resolveBrokerageAccount(
    tx,
    userId,
    preferredAccountId ?? existingPosition.accountId,
    'EGP'
  );

  let closedPositionId = positionId;

  if (quantityToClose < currentQty) {
    // Partial close: update remaining open lot and insert new closed lot
    const remainingQty = currentQty - quantityToClose;
    await tx.update(positions)
      .set({ quantity: remainingQty.toString(), updatedAt: new Date() })
      .where(and(eq(positions.id, positionId), eq(positions.userId, userId)));

    const [closedLot] = await tx.insert(positions).values({
      userId,
      tickerSymbol: existingPosition.tickerSymbol,
      status: 'CLOSED',
      side: existingPosition.side,
      accountId: targetAccount ? targetAccount.id : existingPosition.accountId,
      entryDate: existingPosition.entryDate,
      entryPrice: existingPosition.entryPrice,
      quantity: quantityToClose.toString(),
      targetPrice: existingPosition.targetPrice,
      stopPrice: existingPosition.stopPrice,
      exitDate,
      exitPrice: exitPrice.toString(),
      entryStrategyId: existingPosition.entryStrategyId,
      entrySignalDate: existingPosition.entrySignalDate,
      entrySignalPrice: existingPosition.entrySignalPrice,
      entrySource: existingPosition.entrySource,
      notes: typeof notes === 'string' ? notes : existingPosition.notes,
      createdAt: existingPosition.createdAt,
      updatedAt: new Date(),
    }).returning();

    closedPositionId = closedLot.id;
  } else {
    // Full close
    await tx.update(positions)
      .set({
        status: 'CLOSED',
        exitDate,
        exitPrice: exitPrice.toString(),
        accountId: targetAccount ? targetAccount.id : existingPosition.accountId,
        notes: typeof notes === 'string' ? notes : existingPosition.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(positions.id, positionId), eq(positions.userId, userId)));
  }

  // Credit brokerage account and record BROKERAGE_SELL transaction
  if (targetAccount) {
    await tx.update(userBankAccounts)
      .set({
        balance: sql`${userBankAccounts.balance} + ${tradeProceeds}`,
        updatedAt: new Date(),
      })
      .where(and(eq(userBankAccounts.id, targetAccount.id), eq(userBankAccounts.userId, userId)));

    await tx.insert(bankTransactions).values({
      userId,
      accountId: targetAccount.id,
      type: 'BROKERAGE_SELL',
      amount: tradeProceeds.toFixed(4),
      currency: targetAccount.currency || 'EGP',
      category: 'Investments',
      transactionDate: exitDate,
      positionId: closedPositionId,
      notes: notes || `Sell ${existingPosition.tickerSymbol} · ${quantityToClose} shares @ ${exitPrice.toFixed(2)}`,
    });
  }

  return { closedPositionId, targetAccount, tradeProceeds };
}

/** Close a position or lot, credit brokerage balance, and record BROKERAGE_SELL transaction. */
export async function handlePositionsClosePost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const positionId = Number(body.positionId ?? body.id);
    const exitDate = typeof body.exitDate === 'string' && body.exitDate ? body.exitDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const exitPrice = toNullableNumber(body.exitPrice);
    const quantityToClose = toNullableNumber(body.quantityToClose);

    if (!Number.isInteger(positionId) || positionId <= 0) {
      return NextResponse.json({ error: 'A valid position id is required' }, { status: 400 });
    }
    if (exitPrice === null || exitPrice <= 0) {
      return NextResponse.json({ error: 'A valid exit price is required' }, { status: 400 });
    }
    if (quantityToClose === null || quantityToClose <= 0) {
      return NextResponse.json({ error: 'A valid quantity to close is required' }, { status: 400 });
    }

    const [existingPosition] = await db.select()
      .from(positions)
      .where(and(eq(positions.id, positionId), eq(positions.userId, user.id)));

    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const currentQty = Number(existingPosition.quantity);
    if (quantityToClose > currentQty) {
      return NextResponse.json({ error: `Cannot close ${quantityToClose} shares; only ${currentQty} open shares available.` }, { status: 400 });
    }

    // Execute in transaction
    await db.transaction(async (tx) => {
      await executeClosePosition({
        tx,
        userId: user.id,
        positionId,
        existingPosition,
        exitDate,
        exitPrice,
        quantityToClose,
        preferredAccountId: Number(body.accountId) || null,
        notes: typeof body.notes === 'string' ? body.notes : null,
      });
    });

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    const [freshPosition] = await db.select().from(positions).where(eq(positions.id, positionId));
    return NextResponse.json({
      success: true,
      order: freshPosition ? formatPosition(freshPosition, priceMap, tickerMap) : null
    });
  } catch (error) {
    console.error('Error closing position:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Assign existing unlinked open lots to a brokerage account without changing cash. */
export async function handlePositionsAssignAccountPost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const accountId = Number(body.accountId);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'A brokerage account is required' }, { status: 400 });
    }

    const [account] = await db.select()
      .from(userBankAccounts)
      .where(and(
        eq(userBankAccounts.id, accountId),
        eq(userBankAccounts.userId, user.id),
        eq(userBankAccounts.isArchived, false),
      ));
    if (!account || !['BROKERAGE', 'BROKER_CASH'].includes(account.accountType)) {
      return NextResponse.json({ error: 'Brokerage account not found' }, { status: 404 });
    }

    const assigned = await db.update(positions)
      .set({ accountId, updatedAt: new Date() })
      .where(and(
        eq(positions.userId, user.id),
        eq(positions.status, 'OPEN'),
        sql`${positions.accountId} IS NULL`,
      ))
      .returning({ id: positions.id });

    return NextResponse.json({ assignedCount: assigned.length, accountId });
  } catch (error) {
    console.error('Error assigning positions to brokerage:', error);
    return NextResponse.json({ error: 'Could not assign existing positions' }, { status: 500 });
  }
}

export async function handlePositionsPatch(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'A valid position id is required' }, { status: 400 });
    }

    const [existingPosition] = await db.select()
      .from(positions)
      .where(and(eq(positions.id, id), eq(positions.userId, user.id)));
      
    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const status = typeof body.status === 'string' ? body.status.toUpperCase() : undefined;
    const exitPrice = toNullableNumber(body.exitPrice);
    const exitDate = typeof body.exitDate === 'string' && body.exitDate ? body.exitDate.split('T')[0] : null;
    const quantityToClose = toNullableNumber(body.quantityToClose);

    if (status === 'CLOSED') {
      const currentQty = Number(existingPosition.quantity);
      const effectiveCloseQty = quantityToClose !== null && quantityToClose > 0 ? Math.min(quantityToClose, currentQty) : currentQty;
      const effectiveExitPrice = exitPrice !== null && exitPrice > 0 ? exitPrice : (toNullableNumber(existingPosition.entryPrice) ?? 0);
      const effectiveExitDate = exitDate ?? new Date().toISOString().split('T')[0];

      await db.transaction(async (tx) => {
        await executeClosePosition({
          tx,
          userId: user.id,
          positionId: id,
          existingPosition,
          exitDate: effectiveExitDate,
          exitPrice: effectiveExitPrice,
          quantityToClose: effectiveCloseQty,
          preferredAccountId: Number(body.accountId) || null,
          notes: typeof body.notes === 'string' ? body.notes : null,
        });
      });

      const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
      const [freshPosition] = await db.select().from(positions).where(eq(positions.id, id));
      return NextResponse.json({ order: freshPosition ? formatPosition(freshPosition, priceMap, tickerMap) : null });
    }

    const setValues: Partial<typeof positions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status === 'OPEN') setValues.status = status;
    if (typeof body.notes === 'string') setValues.notes = body.notes;
    
    if (typeof body.entryDate === 'string' && body.entryDate) {
      setValues.entryDate = body.entryDate.split('T')[0];
    }
    const editEntryPrice = toNullableNumber(body.entryPrice);
    if (editEntryPrice !== null) setValues.entryPrice = editEntryPrice.toString();
    const editQuantity = toNullableNumber(body.quantity);
    if (editQuantity !== null) setValues.quantity = editQuantity.toString();

    const [updatedPosition] = await db
      .update(positions)
      .set(setValues)
      .where(and(eq(positions.id, id), eq(positions.userId, user.id)))
      .returning();

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    return NextResponse.json({ order: formatPosition(updatedPosition, priceMap, tickerMap) });
  } catch (error) {
    console.error('Error updating position:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handlePositionsDelete(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'A valid position id is required' }, { status: 400 });
  }

  try {
    const [deletedPosition] = await db.delete(positions)
      .where(and(eq(positions.id, id), eq(positions.userId, user.id)))
      .returning();
      
    if (!deletedPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting position:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ----------------------------------------------------
// AVATAR HANDLER
// ----------------------------------------------------
export async function handleAvatarPost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `users/${user.id}/avatars/${fileName}`;

    const adminSupabase = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'QuantEGX Public';
    const { error: uploadError } = await adminSupabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: uploadError.message,
        details: 'If RLS policy error, please add an INSERT policy on storage.objects or configure SUPABASE_SERVICE_ROLE_KEY.' 
      }, { status: 500 });
    }

    const { data: urlData } = adminSupabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });

    if (updateError) {
      console.error('User metadata update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ avatarUrl: publicUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------
// SYSTEM LOGS HANDLER
// ----------------------------------------------------
let systemLogsMemCache: { data: any[]; timestamp: number } | null = null;
const SYSTEM_LOGS_TTL = 30 * 1000;

export async function handleSystemLogsGet() {
  const now = Date.now();
  if (systemLogsMemCache && now - systemLogsMemCache.timestamp < SYSTEM_LOGS_TTL) {
    return NextResponse.json({ logs: systemLogsMemCache.data });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(100);

    systemLogsMemCache = { data: logs, timestamp: Date.now() };
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ----------------------------------------------------
// PROFILE HANDLERS (reads/writes public.profiles)
// ----------------------------------------------------

/**
 * GET /api/profile
 * Returns the current user's profile row from public.profiles.
 * Falls back to auth metadata if the row doesn't exist yet.
 */
export async function handleProfileGet() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const metadata = user.user_metadata ?? {};
  const defaultFullName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    user.email?.split('@')[0] ||
    'Trader';
  const defaultAvatarUrl =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    null;

  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

    if (row) {
      return NextResponse.json({
        id: row.id,
        email: row.email ?? user.email,
        fullName: row.fullName || defaultFullName,
        avatarUrl: row.avatarUrl || defaultAvatarUrl,
        role: row.role || 'user',
        createdAt: row.createdAt || user.created_at,
        updatedAt: row.updatedAt,
        provider: user.app_metadata?.provider ?? 'email',
        emailConfirmed: Boolean(user.email_confirmed_at),
        lastSignInAt: user.last_sign_in_at,
      });
    }

    // Row missing — try to upsert from auth metadata then return
    try {
      await db.insert(profiles).values({ id: user.id, email: user.email, fullName: defaultFullName, avatarUrl: defaultAvatarUrl })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { email: user.email, fullName: defaultFullName, avatarUrl: defaultAvatarUrl, updatedAt: new Date() },
        });
    } catch (insertErr) {
      console.warn('Could not insert profile into db:', insertErr);
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: defaultFullName,
      avatarUrl: defaultAvatarUrl,
      role: 'user',
      provider: user.app_metadata?.provider ?? 'email',
      emailConfirmed: Boolean(user.email_confirmed_at),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    });
  } catch (error) {
    console.warn('Error fetching profile from db, falling back to auth user metadata:', error);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: defaultFullName,
      avatarUrl: defaultAvatarUrl,
      role: 'user',
      provider: user.app_metadata?.provider ?? 'email',
      emailConfirmed: Boolean(user.email_confirmed_at),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    });
  }
}

/**
 * PATCH /api/profile
 * Allows users to update their full_name in public.profiles.
 * Avatar updates continue to go through /api/user/avatar (storage upload).
 */
export async function handleProfilePatch(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 100) : undefined;

    if (!fullName) {
      return NextResponse.json({ error: 'fullName is required' }, { status: 400 });
    }

    await db
      .update(profiles)
      .set({ fullName, updatedAt: new Date() })
      .where(eq(profiles.id, user.id));

    return NextResponse.json({ success: true, fullName });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
