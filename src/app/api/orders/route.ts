import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyPrices, orders, tickers } from '@/db/schema';
import { derivePositionLevels, getDailyPriceBars } from '@/lib/strategyOrders';
import { normalizeTickerSymbol } from '@/lib/psiStrategy';

type OrderRow = typeof orders.$inferSelect;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const status = searchParams.get('status')?.toUpperCase();

  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const filteredOrders = allOrders.filter((order) => {
      if (symbol && order.tickerSymbol !== normalizeTickerSymbol(symbol)) return false;
      if (status && order.status !== status) return false;
      return true;
    });

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    return NextResponse.json({
      orders: filteredOrders.map((order) => formatOrder(order, priceMap, tickerMap)),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const [createdOrder] = await db
      .insert(orders)
      .values({
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
    return NextResponse.json({ order: formatOrder(createdOrder, priceMap, tickerMap) }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'A valid order id is required' }, { status: 400 });
    }

    const status = typeof body.status === 'string' ? body.status.toUpperCase() : undefined;
    const exitPrice = toNullableNumber(body.exitPrice);
    const exitDate = typeof body.exitDate === 'string' && body.exitDate ? body.exitDate.split('T')[0] : null;

    const setValues: Partial<typeof orders.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status === 'OPEN' || status === 'CLOSED') setValues.status = status;
    if (status === 'CLOSED') {
      setValues.exitDate = exitDate ?? new Date().toISOString().split('T')[0];
      if (exitPrice !== null) setValues.exitPrice = exitPrice.toString();
    }
    if (typeof body.notes === 'string') setValues.notes = body.notes;

    const [updatedOrder] = await db
      .update(orders)
      .set(setValues)
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [priceMap, tickerMap] = await Promise.all([getLatestPriceMap(), getTickerMap()]);
    return NextResponse.json({ order: formatOrder(updatedOrder, priceMap, tickerMap) });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'A valid order id is required' }, { status: 400 });
  }

  try {
    const [deletedOrder] = await db.delete(orders).where(eq(orders.id, id)).returning();
    if (!deletedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function getLatestPriceMap(): Promise<Record<string, number>> {
  const rows = await db.execute(sql`
    WITH ranked_prices AS (
      SELECT ticker_symbol, close, ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
      FROM ${dailyPrices}
    )
    SELECT ticker_symbol, close
    FROM ranked_prices
    WHERE rn = 1
  `);

  const priceMap: Record<string, number> = {};
  for (const row of rows) {
    priceMap[String(row.ticker_symbol)] = Number(row.close);
  }
  return priceMap;
}

async function getTickerMap(): Promise<Record<string, { companyName: string; sector: string }>> {
  const rows = await db.select().from(tickers);
  const tickerMap: Record<string, { companyName: string; sector: string }> = {};
  for (const ticker of rows) {
    tickerMap[ticker.symbol] = {
      companyName: ticker.companyName ?? ticker.symbol,
      sector: ticker.sector ?? 'Unclassified',
    };
  }
  return tickerMap;
}

function formatOrder(
  order: OrderRow,
  priceMap: Record<string, number>,
  tickerMap: Record<string, { companyName: string; sector: string }>,
) {
  const entryPrice = Number(order.entryPrice);
  const quantity = Number(order.quantity);
  const currentPrice = order.status === 'CLOSED' && order.exitPrice ? Number(order.exitPrice) : priceMap[order.tickerSymbol] ?? entryPrice;
  const profitLoss = (currentPrice - entryPrice) * quantity;
  const profitLossPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

  return {
    id: order.id,
    tickerSymbol: order.tickerSymbol,
    companyName: tickerMap[order.tickerSymbol]?.companyName ?? order.tickerSymbol,
    sector: tickerMap[order.tickerSymbol]?.sector ?? 'Unclassified',
    status: order.status,
    side: order.side,
    entryDate: order.entryDate,
    entryPrice,
    quantity,
    targetPrice: toNullableNumber(order.targetPrice),
    stopPrice: toNullableNumber(order.stopPrice),
    exitDate: order.exitDate,
    exitPrice: toNullableNumber(order.exitPrice),
    currentPrice,
    profitLoss,
    profitLossPct,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
