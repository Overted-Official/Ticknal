import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { inArray, sql } from 'drizzle-orm';
import { normalizeTickerSymbol, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { STRATEGIES, getStrategyBadge } from '@/strategies/registry';
import { analyzeStrategy, strategyLabel, type StrategyId, type StrategyMetrics } from '@/lib/strategy-analysis';
import { unstable_cache } from 'next/cache';

const SIGNAL_PIPELINE_VERSION = 'canonical-analysis-2026-09-08';
const DEFAULT_START_DATE = '2025-01-01';

type OpportunityPriceRow = {
  ticker_symbol: unknown;
  date: unknown;
  open: unknown;
  high: unknown;
  low: unknown;
  close: unknown;
  volume: unknown;
};

function toSignalDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

export type OpportunitySignal = {
  symbol: string;
  companyName: string;
  sector: string;
  industryGroup?: string;
  industry?: string;
  rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
  logoUrl: string | null;
  strategyId: StrategyId;
  strategyLabel: string;
  strategyShortName: string;
  strategyBadgeClassName: string;
  analysisStart: string;
  analysisEnd: string;
  dataAsOf: string;
  signalAgeBars: number | null;
  metrics: StrategyMetrics;
  signal: {
    signal: 'BUY' | 'SELL';
    date: string;
    price: number;
    barsAgo?: number;
    reasoning?: string;
    exitReason?: string;
    entryReason?: string;
  };
};

const memCache = new Map<string, { data: OpportunitySignal[]; timestamp: number }>();
const inFlightPromises = new Map<string, Promise<OpportunitySignal[]>>();
const MEM_CACHE_TTL = 30 * 60 * 1000;

function strategyScopeToIds(strategyScope: string): StrategyId[] {
  if (strategyScope === 'psi') return ['psi'];
  if (strategyScope === 'psi_v2') return ['psi_v2'];
  if (strategyScope === 'thoth' || strategyScope === 'thoth_egx_macro') return ['thoth_egx_macro'];
  return ['psi', 'psi_v2', 'thoth_egx_macro'];
}

export async function _getRecentOpportunities(
  limitBars: number = 5,
  strategyScope: string = 'all',
): Promise<OpportunitySignal[]> {
  const cacheKey = `${SIGNAL_PIPELINE_VERSION}-${limitBars}-${strategyScope}`;
  const cached = memCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEM_CACHE_TTL) return cached.data;
  if (inFlightPromises.has(cacheKey)) return inFlightPromises.get(cacheKey)!;

  const promise = (async () => {
    try {
      const [tickerRows, priceRows] = await Promise.all([
        db.select().from(tickers),
        db.execute(sql`
          SELECT ticker_symbol, date, open, high, low, close, volume
          FROM ${dailyPrices}
          WHERE date >= DATE '2025-01-01' AND (close > 0 OR volume > 0)
          ORDER BY ticker_symbol, date ASC
        `),
      ]);

      const { getCachedIndustryRotationMap } = await import('@/lib/industry-rotation');
      const { tickerMap: rotationMap } = await getCachedIndustryRotationMap().catch(() => ({ tickerMap: new Map() }));
      const metadata = new Map(tickerRows.map((ticker) => {
        const symbol = normalizeTickerSymbol(ticker.symbol);
        const rotation = rotationMap.get(symbol);
        return [symbol, {
          companyName: ticker.companyName ?? ticker.symbol,
          sector: ticker.sector ?? 'Unclassified',
          industryGroup: rotation?.industryGroup ?? ticker.industryGroup ?? ticker.sector ?? 'Unclassified',
          industry: ticker.industry ?? ticker.industryGroup ?? ticker.sector ?? 'Unclassified',
          rotationRegime: rotation?.rotationRegime ?? 'Leading',
          logoUrl: ticker.logoUrl ?? null,
        }];
      }));

      const rows = priceRows as unknown as OpportunityPriceRow[];
      const marketDates = Array.from(new Set(rows.map((row) => toSignalDate(row.date)))).sort();
      const recentMarketDates = new Set(marketDates.slice(-limitBars));
      const barsByTicker = new Map<string, PriceBar[]>();
      for (const row of rows) {
        const symbol = normalizeTickerSymbol(String(row.ticker_symbol));
        const bars = barsByTicker.get(symbol) ?? [];
        bars.push({
          date: toSignalDate(row.date),
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume ?? 0),
        });
        barsByTicker.set(symbol, bars);
      }

      const opportunities: OpportunitySignal[] = [];
      const strategyIds = strategyScopeToIds(strategyScope);
      let index = 0;
      for (const [symbol, bars] of barsByTicker.entries()) {
        index += 1;
        if (index % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
        if (bars.length < 80) continue;
        const meta = metadata.get(symbol);
        const tickerAnalyses = await Promise.allSettled(
          strategyIds.map((strategyId) => analyzeStrategy(symbol, bars, strategyId, {
            startDate: DEFAULT_START_DATE,
            lookbackBars: limitBars,
          })),
        );
        for (let strategyIndex = 0; strategyIndex < tickerAnalyses.length; strategyIndex += 1) {
          const result = tickerAnalyses[strategyIndex];
          if (result.status !== 'fulfilled') continue;
          const strategyId = strategyIds[strategyIndex];
          const analysis = result.value;
          const latest = analysis.latestActionableSignal;
          if (!latest || latest.signal !== 'BUY' || !recentMarketDates.has(latest.date)) continue;
          const badge = getStrategyBadge(strategyId);
          opportunities.push({
            symbol,
            companyName: meta?.companyName ?? symbol,
            sector: meta?.sector ?? 'Unclassified',
            industryGroup: meta?.industryGroup,
            industry: meta?.industry,
            rotationRegime: meta?.rotationRegime,
            logoUrl: meta?.logoUrl ?? null,
            strategyId,
            strategyLabel: STRATEGIES[strategyId]?.label ?? strategyLabel(strategyId),
            strategyShortName: badge.label,
            strategyBadgeClassName: badge.className,
            analysisStart: analysis.analysisStart,
            analysisEnd: analysis.analysisEnd,
            dataAsOf: analysis.dataAsOf,
            signalAgeBars: analysis.signalAgeBars,
            metrics: analysis.metrics,
            signal: {
              signal: 'BUY',
              date: latest.date,
              price: latest.price,
              barsAgo: latest.barsAgo,
              reasoning: latest.reason,
            },
          });
        }
      }

      opportunities.sort((a, b) => {
        const alphaDelta = (b.metrics.alpha ?? Number.NEGATIVE_INFINITY) - (a.metrics.alpha ?? Number.NEGATIVE_INFINITY);
        return alphaDelta || Date.parse(b.signal.date) - Date.parse(a.signal.date);
      });
      memCache.set(cacheKey, { data: opportunities, timestamp: Date.now() });
      return opportunities;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  return promise;
}

export const getRecentOpportunities = async (
  limitBars: number = 5,
  strategyScope: string = 'all',
): Promise<OpportunitySignal[]> => {
  try {
    const cachedFn = unstable_cache(
      async () => _getRecentOpportunities(limitBars, strategyScope),
      [`recent-opportunities-${SIGNAL_PIPELINE_VERSION}-${limitBars}-${strategyScope}`],
      { tags: ['opportunities'], revalidate: 3600 },
    );
    return await cachedFn();
  } catch {
    return _getRecentOpportunities(limitBars, strategyScope);
  }
};

export function getCachedOpportunitiesSync(limitBars = 5, strategyScope = 'all'): OpportunitySignal[] | null {
  const cached = memCache.get(`${SIGNAL_PIPELINE_VERSION}-${limitBars}-${strategyScope}`);
  return cached && Date.now() - cached.timestamp < MEM_CACHE_TTL ? cached.data : null;
}

/** Shared sell scan for dashboard surfaces. It uses the exact same analyzer as the chart and command center. */
export async function getExitSignalsForHoldings(symbols: string[], limitBars = 5): Promise<OpportunitySignal[]> {
  const cleanSymbols = Array.from(new Set(symbols.map(normalizeTickerSymbol).filter(Boolean)));
  if (cleanSymbols.length === 0) return [];
  const [tickerRows, priceRows] = await Promise.all([
    db.select().from(tickers).where(inArray(tickers.symbol, cleanSymbols)),
    db.select().from(dailyPrices).where(inArray(dailyPrices.tickerSymbol, cleanSymbols)).orderBy(dailyPrices.tickerSymbol, dailyPrices.date),
  ]);
  const metadata = new Map(tickerRows.map((ticker) => [normalizeTickerSymbol(ticker.symbol), ticker]));
  const barsByTicker = new Map<string, PriceBar[]>();
  for (const row of priceRows) {
    const symbol = normalizeTickerSymbol(row.tickerSymbol);
    const bars = barsByTicker.get(symbol) ?? [];
    bars.push({ date: toSignalDate(row.date), open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume ?? 0) });
    barsByTicker.set(symbol, bars);
  }
  const exits: OpportunitySignal[] = [];
  for (const symbol of cleanSymbols) {
    const bars = barsByTicker.get(symbol) ?? [];
    if (bars.length < 80) continue;
    for (const strategyId of strategyScopeToIds('all')) {
      const analysis = await analyzeStrategy(symbol, bars, strategyId, { startDate: DEFAULT_START_DATE, lookbackBars: limitBars });
      const latest = analysis.latestActionableSignal;
      if (!latest || latest.signal !== 'SELL') continue;
      const ticker = metadata.get(symbol);
      const badge = getStrategyBadge(strategyId);
      exits.push({
        symbol,
        companyName: ticker?.companyName ?? symbol,
        sector: ticker?.sector ?? 'Unclassified',
        industryGroup: ticker?.industryGroup ?? ticker?.sector ?? 'Unclassified',
        industry: ticker?.industry ?? ticker?.industryGroup ?? ticker?.sector ?? 'Unclassified',
        logoUrl: ticker?.logoUrl ?? null,
        strategyId,
        strategyLabel: STRATEGIES[strategyId]?.label ?? strategyLabel(strategyId),
        strategyShortName: badge.label,
        strategyBadgeClassName: badge.className,
        analysisStart: analysis.analysisStart,
        analysisEnd: analysis.analysisEnd,
        dataAsOf: analysis.dataAsOf,
        signalAgeBars: analysis.signalAgeBars,
        metrics: analysis.metrics,
        signal: { signal: 'SELL', date: latest.date, price: latest.price, barsAgo: latest.barsAgo, reasoning: latest.reason },
      });
    }
  }
  return exits.sort((a, b) => Date.parse(b.signal.date) - Date.parse(a.signal.date));
}
