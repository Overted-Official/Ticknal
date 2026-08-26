import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { runThothV37PStrategy } from '@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy';
import { runPsiV2Strategy } from '@/strategies/PSI_V2';
import { STRATEGIES, getStrategyBadge } from '@/strategies/registry';
import { unstable_cache } from 'next/cache';

const HISTORY_BARS = 220;

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
const MEM_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const THOTH_FOCUS_TICKERS = new Set([
  'COMI', 'FWRY', 'EAST', 'TMGH', 'HRHO', 'SWDY', 'ETEL', 'ABUK',
  'EKHO', 'ORAS', 'ISPH', 'CIEB', 'AMOC', 'ESRS', 'ADIB', 'HELI',
  'AUTO', 'JUFO', 'SKPC', 'MNHD', 'EFID', 'ALCN', 'CERA', 'MFPC',
]);

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
          SELECT ticker_symbol, date, open, high, low, close, volume
          FROM ${dailyPrices}
          WHERE date >= CURRENT_DATE - INTERVAL '14 months' AND volume > 0
          ORDER BY ticker_symbol, date ASC
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
      const includePsi = strategyScope === 'all' || strategyScope === 'psi';
      const includeThoth = strategyScope === 'all' || strategyScope === 'thoth_egx_macro';
      const includePsiV2 = strategyScope === 'all' || strategyScope === 'psi_v2';

      for (const [symbol, bars] of barsByTicker.entries()) {
        if (bars.length < 80) continue;
        const recentDates = new Set(bars.slice(-limitBars).map((bar) => bar.date));
        const ticker = tickerMap.get(symbol);
        const meta = {
          companyName: ticker?.companyName ?? symbol,
          sector: ticker?.sector ?? 'Unclassified',
          logoUrl: ticker?.logoUrl ?? null,
        };

        // 1. Evaluate PSI Strategy
        if (includePsi && bars.length >= 80) {
          try {
            const psiResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate: '2025-01-01' }));
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

        // 2. Evaluate PSI V2 Strategy (GPT 3-PSI Architecture)
        if (includePsiV2 && bars.length >= 80) {
          try {
            const psiV2Result = runPsiV2Strategy(bars, {
              ticker: symbol,
              startDate: '2025-01-01',
            });
            const signal = [...psiV2Result.signals].reverse().find((candidate) => recentDates.has(candidate.date) && (candidate.signal === 'BUY' || candidate.signal === 'SELL'));
            if (signal) {
              const badge = getStrategyBadge('psi_v2');
              opportunities.push({
                symbol,
                ...meta,
                strategyId: 'psi_v2',
                strategyLabel: STRATEGIES.psi_v2?.label ?? 'PSI V2 Strategy',
                strategyShortName: badge.label,
                strategyBadgeClassName: badge.className,
                signal,
              });
            }
          } catch (e) {
            // Ignore individual ticker calculation failures
          }
        }

        // 3. Evaluate THOTH EGX V3.7P only when explicitly requested to preserve sub-second response
        if (strategyScope === 'thoth_egx_macro' && bars.length >= 130) {
          try {
            const thothResult = await runThothV37PStrategy(bars, {
              ticker: symbol,
              startDate: '2025-01-01',
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

export const getRecentOpportunities = async (limitBars: number = 5, strategyScope: string = 'all'): Promise<OpportunitySignal[]> => {
  try {
    const cachedFn = unstable_cache(
      async () => _getRecentOpportunities(limitBars, strategyScope),
      [`recent-opportunities-${limitBars}-${strategyScope}`],
      { tags: ['opportunities'], revalidate: 3600 }
    );
    return await cachedFn();
  } catch {
    return await _getRecentOpportunities(limitBars, strategyScope);
  }
};
