import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { dailyPrices } from '@/db/schema';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { computePsiSeries, normalizeTickerSymbol, type PriceBar } from '@/strategies/PSI/psiStrategy';

export type PositionLevels = {
  targetPrice: number | null;
  stopPrice: number | null;
  targetLabel: string | null;
  stopLabel: string | null;
  medianDailyMove: number | null;
  atr14: number | null;
};

export async function getDailyPriceBars(symbol: string): Promise<PriceBar[]> {
  const ticker = normalizeTickerSymbol(symbol);
  const { getCachedDailyPrices } = await import('@/lib/data-cache');
  const rows = await getCachedDailyPrices(ticker, 400);

  return rows.map((row) => ({
    date: normalizeDateString(row.date),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  }));
}

export function derivePositionLevels(
  symbol: string,
  bars: PriceBar[],
  entryDate: string,
  entryPrice: number,
): PositionLevels {
  const params = resolvePsiParamsFromStore(symbol);
  const computedBars = computePsiSeries(bars);
  const entryBar =
    [...computedBars]
      .reverse()
      .find((bar) => bar.date <= entryDate && Number.isFinite(bar.close)) ?? computedBars[computedBars.length - 1];
  const medianDailyMove = entryBar?.medianDailyMove ?? null;
  const atr14 = entryBar?.atr14 ?? null;

  const targetPrice =
    params.useAym &&
    isFiniteNumber(params.aymMultiplier) &&
    isFiniteNumber(medianDailyMove) &&
    Number(medianDailyMove) > 0
      ? entryPrice * (1 + (Number(medianDailyMove) * Number(params.aymMultiplier)) / 100)
      : null;

  const stopPrice =
    params.useStoploss &&
    isFiniteNumber(params.stoplossLevel) &&
    isFiniteNumber(medianDailyMove) &&
    Number(medianDailyMove) > 0
      ? entryPrice * (1 - (Number(medianDailyMove) * Number(params.stoplossLevel)) / 100)
      : params.useAtr && isFiniteNumber(params.atrDistance) && isFiniteNumber(atr14)
        ? entryPrice - Number(atr14) * Number(params.atrDistance)
        : null;

  return {
    targetPrice,
    stopPrice: stopPrice !== null && stopPrice > 0 ? stopPrice : null,
    targetLabel: targetPrice === null ? null : 'AYM target',
    stopLabel:
      params.useStoploss && stopPrice !== null
        ? 'strategy stop'
        : params.useAtr && stopPrice !== null
          ? 'ATR distance'
          : null,
    medianDailyMove,
    atr14,
  };
}

function normalizeDateString(value: string | Date): string {
  return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
