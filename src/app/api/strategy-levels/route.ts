import { NextResponse } from 'next/server';
import { derivePositionLevels, getDailyPriceBars } from '@/lib/strategyOrders';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');
  const entryPrice = Number(searchParams.get('entryPrice'));

  if (!symbol || !date || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    return NextResponse.json({ error: 'symbol, date, and entryPrice are required' }, { status: 400 });
  }

  try {
    const ticker = normalizeTickerSymbol(symbol);
    const bars = await getDailyPriceBars(ticker);
    if (bars.length === 0) {
      return NextResponse.json({ error: 'No price history found' }, { status: 404 });
    }

    const levels = derivePositionLevels(ticker, bars, date, entryPrice);
    return NextResponse.json({
      symbol: ticker,
      entryDate: date,
      entryPrice,
      ...formatLevels(levels),
    });
  } catch (error) {
    console.error('Error deriving strategy levels:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function formatLevels<T extends { targetPrice: number | null; stopPrice: number | null }>(levels: T): T {
  return {
    ...levels,
    targetPrice: levels.targetPrice === null ? null : Number(levels.targetPrice.toFixed(4)),
    stopPrice: levels.stopPrice === null ? null : Number(levels.stopPrice.toFixed(4)),
  };
}
