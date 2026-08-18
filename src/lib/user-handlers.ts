import { NextResponse } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { positions, systemLogs } from '@/db/schema';
import { derivePositionLevels, getDailyPriceBars } from '@/lib/strategyOrders';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type PositionRow = typeof positions.$inferSelect;

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getLatestPriceMap(): Promise<Record<string, number>> {
  const { getCachedRecentPrices } = await import('@/lib/data-cache');
  const rows = await getCachedRecentPrices();

  const priceMap: Record<string, number> = {};
  for (const row of rows) {
    if (Number(row.rn) === 1) {
      priceMap[String(row.ticker_symbol)] = Number(row.close);
    }
  }
  return priceMap;
}

async function getTickerMap(): Promise<Record<string, { companyName: string; sector: string; logoUrl: string | null }>> {
  const { getCachedTickers } = await import('@/lib/data-cache');
  const rows = await getCachedTickers();
  
  const tickerMap: Record<string, { companyName: string; sector: string; logoUrl: string | null }> = {};
  for (const ticker of rows) {
    tickerMap[ticker.symbol] = {
      companyName: ticker.companyName ?? ticker.symbol,
      sector: ticker.sector ?? 'Unclassified',
      logoUrl: ticker.logoUrl ?? null,
    };
  }
  return tickerMap;
}

function formatPosition(
  position: PositionRow,
  priceMap: Record<string, number>,
  tickerMap: Record<string, { companyName: string; sector: string; logoUrl: string | null }>,
) {
  const entryPrice = Number(position.entryPrice);
  const quantity = Number(position.quantity);
  const currentPrice = position.status === 'CLOSED' && position.exitPrice ? Number(position.exitPrice) : priceMap[position.tickerSymbol] ?? entryPrice;
  const profitLoss = (currentPrice - entryPrice) * quantity;
  const profitLossPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

  return {
    id: position.id,
    tickerSymbol: position.tickerSymbol,
    companyName: tickerMap[position.tickerSymbol]?.companyName ?? position.tickerSymbol,
    sector: tickerMap[position.tickerSymbol]?.sector ?? 'Unclassified',
    logoUrl: tickerMap[position.tickerSymbol]?.logoUrl ?? null,
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

    const [createdPosition] = await db
      .insert(positions)
      .values({
        userId: user.id,
        tickerSymbol: ticker,
        status: 'OPEN',
        side: 'LONG',
        entryDate,
        entryPrice: entryPrice.toString(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity.toString() : '1',
        targetPrice: levels.targetPrice === null ? null : levels.targetPrice.toString(),
        stopPrice: levels.stopPrice === null ? null : levels.stopPrice.toString(),
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        updatedAt: new Date(),
      })
      .returning();

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    return NextResponse.json({ order: formatPosition(createdPosition, priceMap, tickerMap) }, { status: 201 });
  } catch (error) {
    console.error('Error creating position:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    if (status === 'CLOSED' && quantityToClose !== null && quantityToClose > 0 && quantityToClose < Number(existingPosition.quantity)) {
      const remainingQty = Number(existingPosition.quantity) - quantityToClose;

      const [updatedPosition] = await db
        .update(positions)
        .set({ quantity: remainingQty.toString(), updatedAt: new Date() })
        .where(and(eq(positions.id, id), eq(positions.userId, user.id)))
        .returning();

      await db.insert(positions).values({
        userId: user.id,
        tickerSymbol: existingPosition.tickerSymbol,
        status: 'CLOSED',
        side: existingPosition.side,
        entryDate: existingPosition.entryDate,
        entryPrice: existingPosition.entryPrice,
        quantity: quantityToClose.toString(),
        targetPrice: existingPosition.targetPrice,
        stopPrice: existingPosition.stopPrice,
        exitDate: exitDate ?? new Date().toISOString().split('T')[0],
        exitPrice: exitPrice !== null ? exitPrice.toString() : null,
        notes: typeof body.notes === 'string' ? body.notes : existingPosition.notes,
        createdAt: existingPosition.createdAt,
      });

      const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
      return NextResponse.json({ order: formatPosition(updatedPosition, priceMap, tickerMap) });
    }

    const setValues: Partial<typeof positions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status === 'OPEN' || status === 'CLOSED') setValues.status = status;
    if (status === 'CLOSED') {
      setValues.exitDate = exitDate ?? new Date().toISOString().split('T')[0];
      if (exitPrice !== null) setValues.exitPrice = exitPrice.toString();
    }
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

    const { error: uploadError } = await adminSupabase.storage
      .from('QuantEGX Public')
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
      .from('QuantEGX Public')
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
export async function handleSystemLogsGet() {
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

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
