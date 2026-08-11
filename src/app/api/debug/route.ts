import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, dailyPrices } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  const openRows = await db.select().from(orders).where(eq(orders.status, 'OPEN')).orderBy(desc(orders.createdAt));
  
  const latestPrices: Record<string, number> = {};
  const priceRows = await db.execute(sql`
    WITH ranked_prices AS (
      SELECT ticker_symbol, date, close,
             ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
      FROM ${dailyPrices}
      WHERE volume > 0
    )
    SELECT ticker_symbol, close FROM ranked_prices WHERE rn = 1
  `);
  for (const row of priceRows) {
    latestPrices[row.ticker_symbol as string] = Number(row.close);
  }

  const openOrdersMap = new Map();
  const logs = [];

  for (const order of openRows) {
    const symbol = order.tickerSymbol.trim().toUpperCase();
    const entryPrice = Number(order.entryPrice);
    const quantity = Number(order.quantity);
    const currentPrice = latestPrices[symbol] ?? entryPrice;
    const profitLoss = (currentPrice - entryPrice) * quantity;

    if (openOrdersMap.has(symbol)) {
      const existing = openOrdersMap.get(symbol);
      const totalCost = (existing.entryPrice * existing.quantity) + (entryPrice * quantity);
      const newQuantity = existing.quantity + quantity;
      const avgEntryPrice = totalCost / newQuantity;
      
      existing.quantity = newQuantity;
      existing.entryPrice = avgEntryPrice;
      existing.profitLoss += profitLoss;
      existing.profitLossPct = avgEntryPrice > 0 ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100 : 0;
      
      logs.push(`Combined ${symbol}: new qty ${newQuantity}, avg entry ${avgEntryPrice}, added PL ${profitLoss}, total PL ${existing.profitLoss}`);
    } else {
      openOrdersMap.set(symbol, {
        tickerSymbol: symbol,
        entryPrice,
        quantity,
        currentPrice,
        profitLoss,
        profitLossPct: entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0,
      });
      logs.push(`Added ${symbol}: qty ${quantity}, entry ${entryPrice}, PL ${profitLoss}`);
    }
  }

  const openOrders = Array.from(openOrdersMap.values());
  return NextResponse.json({ openOrders, logs, latestPrices });
}
