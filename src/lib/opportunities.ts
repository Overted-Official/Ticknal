import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { normalizeTickerSymbol, runPsiStrategy } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { PriceBar } from '@/strategies/PSI/psiStrategy';

const HISTORY_BARS = 320;

export type OpportunitySignal = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl: string | null;
  signal: any;
};

export async function getRecentOpportunities(limitBars: number = 5): Promise<OpportunitySignal[]> {
  const [tickerRows, priceRows] = await Promise.all([
    db.select().from(tickers),
    db.execute(sql`
      WITH ranked_prices AS (
        SELECT ticker_symbol, date, open, high, low, close, volume,
               ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
        FROM ${dailyPrices}
        WHERE volume > 0
      )
      SELECT ticker_symbol, date, open, high, low, close, volume
      FROM ranked_prices
      WHERE rn <= ${HISTORY_BARS}
      ORDER BY ticker_symbol, date
    `),
  ]);

  const tickerMap = new Map(
    tickerRows.map((ticker) => [
      normalizeTickerSymbol(ticker.symbol),
      {
        companyName: ticker.companyName ?? ticker.symbol,
        sector: ticker.sector ?? 'Unclassified',
        logoUrl: ticker.logoUrl ?? null,
      },
    ]),
  );
  const barsByTicker = new Map<string, PriceBar[]>();

  for (const row of priceRows) {
    const symbol = normalizeTickerSymbol(String(row.ticker_symbol));
    const bars = barsByTicker.get(symbol) ?? [];
    bars.push({
      date: typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date as Date).toISOString().split('T')[0],
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    });
    barsByTicker.set(symbol, bars);
  }

  const opportunities: OpportunitySignal[] = [];
  for (const [symbol, bars] of barsByTicker.entries()) {
    if (bars.length < 220) continue;
    const recentDates = new Set(bars.slice(-limitBars).map((bar) => bar.date));
    
    // The dashboard scans only recent mature histories
    const strategyResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate: bars[0].date }));
    const signal = [...strategyResult.signals].reverse().find((candidate) => recentDates.has(candidate.date));
    if (!signal) continue;

    const ticker = tickerMap.get(symbol);
    opportunities.push({
      symbol,
      companyName: ticker?.companyName ?? symbol,
      sector: ticker?.sector ?? 'Unclassified',
      logoUrl: ticker?.logoUrl ?? null,
      signal,
    });
  }

  return opportunities.sort((a, b) => Date.parse(b.signal.date) - Date.parse(a.signal.date));
}
