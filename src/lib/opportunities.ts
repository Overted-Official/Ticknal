import { db } from '@/db';
import { dailyPrices, signalNotifications, tickers } from '@/db/schema';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { normalizeTickerSymbol, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { STRATEGIES, getStrategyBadge } from '@/strategies/registry';
import { analyzeStrategy, strategyLabel, type StrategyId, type StrategyMetrics } from '@/lib/strategy-analysis';
import { unstable_cache } from 'next/cache';

const SIGNAL_PIPELINE_VERSION = 'canonical-analysis-indexed-2026-09-09';
const DEFAULT_START_DATE = '2025-01-01';
const MAX_INDEXED_CANDIDATES = 120;

type OpportunityPriceRow = {
  tickerSymbol: unknown;
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

type IndexedBuySignal = {
  symbol: string;
  strategyId: StrategyId;
  signalDate: string;
  snapshot: {
    signalPrice: number | null;
    signalBarsAgo: number | null;
    signalReason: string | null;
    analysisStart: string | null;
    analysisEnd: string | null;
    dataAsOf: string | null;
    metrics: StrategyMetrics | null;
  } | null;
};

function storedMetric(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStoredMetrics(value: unknown): StrategyMetrics | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    totalReturn: storedMetric(raw.totalReturn),
    alpha: storedMetric(raw.alpha),
    avgBarsPerTrade: storedMetric(raw.avgBarsPerTrade),
    maxDrawdown: storedMetric(raw.maxDrawdown),
    maxAdverseExcursion: storedMetric(raw.maxAdverseExcursion),
    avgAdverseExcursion: storedMetric(raw.avgAdverseExcursion),
    winRate: storedMetric(raw.winRate),
    trades: storedMetric(raw.trades),
    buyHoldReturn: storedMetric(raw.buyHoldReturn),
    annualCagr: storedMetric(raw.annualCagr),
  };
}

/**
 * The scheduled signal processor already evaluates the market and persists
 * recent BUY events in signal_notifications. Use that durable index to narrow
 * the request-time work to actual candidates. The canonical analyzer still
 * validates each candidate before it reaches the UI, so charts and tables
 * remain backed by the exact same signal event and metrics.
 */
async function getIndexedBuySignals(limitBars: number, strategyScope: string): Promise<{
  signals: IndexedBuySignal[];
  recentMarketDates: Set<string>;
}> {
  const recentDateRows = await db.execute(sql`
    SELECT DISTINCT date::text AS date
    FROM ${dailyPrices}
    WHERE (close > 0 OR volume > 0)
    ORDER BY date DESC
    LIMIT ${limitBars}
  `);
  const recentMarketDates = new Set(
    (recentDateRows as unknown as Array<{ date: unknown }>)
      .map((row) => toSignalDate(row.date))
      .filter(Boolean),
  );
  const oldestRecentDate = Array.from(recentMarketDates).sort()[0];
  if (!oldestRecentDate) return { signals: [], recentMarketDates };

  const allowedStrategies = new Set(strategyScopeToIds(strategyScope));
  let rows: Array<{
    tickerSymbol: unknown;
    strategy: unknown;
    signalDate: unknown;
    signal: unknown;
    signalPrice?: unknown;
    signalBarsAgo?: unknown;
    signalReason?: unknown;
    analysisStart?: unknown;
    analysisEnd?: unknown;
    dataAsOf?: unknown;
    metrics?: unknown;
  }>;

  try {
    rows = await db
      .select({
        tickerSymbol: signalNotifications.tickerSymbol,
        strategy: signalNotifications.strategy,
        signalDate: signalNotifications.signalDate,
        signal: signalNotifications.signal,
        signalPrice: signalNotifications.signalPrice,
        signalBarsAgo: signalNotifications.signalBarsAgo,
        signalReason: signalNotifications.signalReason,
        analysisStart: signalNotifications.analysisStart,
        analysisEnd: signalNotifications.analysisEnd,
        dataAsOf: signalNotifications.dataAsOf,
        metrics: signalNotifications.metrics,
      })
      .from(signalNotifications)
      .where(and(eq(signalNotifications.signal, 'BUY'), gte(signalNotifications.signalDate, oldestRecentDate)))
      .orderBy(desc(signalNotifications.signalDate))
      .limit(MAX_INDEXED_CANDIDATES * 4) as typeof rows;
  } catch {
    // The application remains deployable before migration 0007 is applied.
    rows = await db
      .select({
        tickerSymbol: signalNotifications.tickerSymbol,
        strategy: signalNotifications.strategy,
        signalDate: signalNotifications.signalDate,
        signal: signalNotifications.signal,
      })
      .from(signalNotifications)
      .where(and(eq(signalNotifications.signal, 'BUY'), gte(signalNotifications.signalDate, oldestRecentDate)))
      .orderBy(desc(signalNotifications.signalDate))
      .limit(MAX_INDEXED_CANDIDATES * 4) as typeof rows;
  }

  const latestByStrategy = new Map<string, IndexedBuySignal>();
  for (const row of rows) {
    const strategyId = String(row.strategy) as StrategyId;
    const signalDate = toSignalDate(row.signalDate);
    const symbol = normalizeTickerSymbol(String(row.tickerSymbol));
    if (!symbol || !allowedStrategies.has(strategyId) || !recentMarketDates.has(signalDate)) continue;
    const key = `${symbol}:${strategyId}`;
    const existing = latestByStrategy.get(key);
    if (!existing || signalDate > existing.signalDate) {
      latestByStrategy.set(key, {
        symbol,
        strategyId,
        signalDate,
        snapshot: row.metrics && row.signalPrice != null ? {
          signalPrice: Number(row.signalPrice),
          signalBarsAgo: row.signalBarsAgo == null ? null : Number(row.signalBarsAgo),
          signalReason: row.signalReason == null ? null : String(row.signalReason),
          analysisStart: row.analysisStart == null ? null : toSignalDate(row.analysisStart),
          analysisEnd: row.analysisEnd == null ? null : toSignalDate(row.analysisEnd),
          dataAsOf: row.dataAsOf == null ? null : toSignalDate(row.dataAsOf),
          metrics: normalizeStoredMetrics(row.metrics),
        } : null,
      });
    }
  }

  return {
    signals: Array.from(latestByStrategy.values())
      .sort((a, b) => b.signalDate.localeCompare(a.signalDate))
      .slice(0, MAX_INDEXED_CANDIDATES),
    recentMarketDates,
  };
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
      const { signals: indexedSignals, recentMarketDates } = await getIndexedBuySignals(limitBars, strategyScope);
      if (indexedSignals.length === 0) {
        memCache.set(cacheKey, { data: [], timestamp: Date.now() });
        return [];
      }

      const candidateSymbols = Array.from(new Set(indexedSignals.map((signal) => signal.symbol)));
      const tickerRows = await db.select().from(tickers).where(inArray(tickers.symbol, candidateSymbols));
      const needsRequestAnalysis = indexedSignals.some((signal) => !signal.snapshot?.metrics);
      const priceRows = needsRequestAnalysis
        ? await db.select()
          .from(dailyPrices)
          .where(and(inArray(dailyPrices.tickerSymbol, candidateSymbols), gte(dailyPrices.date, DEFAULT_START_DATE)))
          .orderBy(dailyPrices.tickerSymbol, dailyPrices.date)
        : [];

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
      const barsByTicker = new Map<string, PriceBar[]>();
      for (const row of rows) {
        const symbol = normalizeTickerSymbol(String(row.tickerSymbol));
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
      for (const indexedSignal of indexedSignals) {
        const symbol = indexedSignal.symbol;
        const meta = metadata.get(symbol);
        let analysis = null;
        let latest = null;
        const snapshot = indexedSignal.snapshot;
        if (!snapshot?.metrics) {
          const bars = barsByTicker.get(symbol) ?? [];
          if (bars.length < 80) continue;
          analysis = await analyzeStrategy(symbol, bars, indexedSignal.strategyId, {
            startDate: DEFAULT_START_DATE,
            lookbackBars: limitBars,
          }).catch(() => null);
          latest = analysis?.latestActionableSignal ?? null;
          if (!analysis || !latest || latest.signal !== 'BUY' || !recentMarketDates.has(latest.date)) continue;
        } else {
          if (!recentMarketDates.has(indexedSignal.signalDate)) continue;
          latest = {
            signal: 'BUY' as const,
            date: indexedSignal.signalDate,
            price: snapshot.signalPrice ?? 0,
            barsAgo: snapshot.signalBarsAgo ?? 0,
            reason: snapshot.signalReason ?? undefined,
          };
          analysis = {
            analysisStart: snapshot.analysisStart ?? DEFAULT_START_DATE,
            analysisEnd: snapshot.analysisEnd ?? snapshot.dataAsOf ?? indexedSignal.signalDate,
            dataAsOf: snapshot.dataAsOf ?? snapshot.analysisEnd ?? indexedSignal.signalDate,
            signalAgeBars: snapshot.signalBarsAgo,
            metrics: snapshot.metrics,
          };
        }
        const badge = getStrategyBadge(indexedSignal.strategyId);
        opportunities.push({
          symbol,
          companyName: meta?.companyName ?? symbol,
          sector: meta?.sector ?? 'Unclassified',
          industryGroup: meta?.industryGroup,
          industry: meta?.industry,
          rotationRegime: meta?.rotationRegime,
          logoUrl: meta?.logoUrl ?? null,
          strategyId: indexedSignal.strategyId,
          strategyLabel: STRATEGIES[indexedSignal.strategyId]?.label ?? strategyLabel(indexedSignal.strategyId),
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
