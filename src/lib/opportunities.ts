import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore, fetchAndCachePsiCombinations } from '@/strategies/PSI/psiParameterStore';
import { runThothV37PStrategy } from '@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy';
import { STRATEGIES, getStrategyBadge } from '@/strategies/registry';
import { unstable_cache } from 'next/cache';

const HISTORY_BARS = 450;

export type OpportunitySignal = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl: string | null;
  strategyId: string;
  strategyLabel: string;
  strategyShortName: string;
  strategyBadgeClassName: string;
  signal: {
    signal: string;
    level?: string;
    date: string;
    price: number;
    reasoning?: string;
    exitReason?: string;
    entryReason?: string;
  };
};

// In-memory module-level cache for instantaneous (<1ms) response across routes
const memCache = new Map<string, { data: OpportunitySignal[]; timestamp: number }>();
const inFlightPromises = new Map<string, Promise<OpportunitySignal[]>>();
const MEM_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function _getRecentOpportunities(
  limitBars: number = 5,
  strategyScope: string = 'all'
): Promise<OpportunitySignal[]> {
  const cacheKey = `${limitBars}-${strategyScope}`;
  const now = Date.now();
  const cached = memCache.get(cacheKey);

  if (cached && now - cached.timestamp < MEM_CACHE_TTL) {
    return cached.data;
  }

  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
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
        fetchAndCachePsiCombinations(),
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
      const includePsi = strategyScope === 'all' || strategyScope === 'psi';
      const includeThoth = strategyScope === 'all' || strategyScope === 'thoth_egx_macro';

      for (const [symbol, bars] of barsByTicker.entries()) {
        if (bars.length < 130) continue;
        const recentDates = new Set(bars.slice(-limitBars).map((bar) => bar.date));
        const recentStartDate = bars.slice(-limitBars)[0]?.date || bars[0].date;
        const ticker = tickerMap.get(symbol);
        const meta = {
          companyName: ticker?.companyName ?? symbol,
          sector: ticker?.sector ?? 'Unclassified',
          logoUrl: ticker?.logoUrl ?? null,
        };

        // 1. Evaluate PSI Strategy
        if (includePsi && bars.length >= 130) {
          try {
            const psiResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate: bars[0].date }));
            const signal = [...psiResult.signals].reverse().find((candidate) => recentDates.has(candidate.date));
            if (signal) {
              const badge = getStrategyBadge('psi');
              opportunities.push({
                symbol,
                ...meta,
                strategyId: 'psi',
                strategyLabel: STRATEGIES.psi?.label ?? 'PSI Strategy',
                strategyShortName: badge.label,
                strategyBadgeClassName: badge.className,
                signal,
              });
            }
          } catch (e) {
            // Ignore individual ticker calculation failures
          }
        }

        // 2. Evaluate the frozen THOTH EGX V3.7P production strategy
        if (includeThoth && bars.length >= 130) {
          try {
            const thothResult = await runThothV37PStrategy(bars, {
              ticker: symbol,
              startDate: recentStartDate,
            });
            const signal = [...thothResult.signals].reverse().find((candidate) => recentDates.has(candidate.date));
            if (signal) {
              const badge = getStrategyBadge('thoth_egx_macro');
              opportunities.push({
                symbol,
                ...meta,
                strategyId: 'thoth_egx_macro',
                strategyLabel: STRATEGIES.thoth_egx_macro?.label ?? 'THOTH EGX V3.7P',
                strategyShortName: badge.label,
                strategyBadgeClassName: badge.className,
                signal,
              });
            }
          } catch (e) {
            // Ignore individual ticker calculation failures
          }
        }
      }

      const sorted = opportunities.sort((a, b) => Date.parse(b.signal.date) - Date.parse(a.signal.date));
      memCache.set(cacheKey, { data: sorted, timestamp: Date.now() });
      return sorted;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  return promise;
}

export const getRecentOpportunities = (limitBars: number = 5, strategyScope: string = 'all') => {
  return unstable_cache(
    async () => _getRecentOpportunities(limitBars, strategyScope),
    [`recent-opportunities-${limitBars}-${strategyScope}`],
    { tags: ['opportunities'], revalidate: 3600 }
  )();
};
