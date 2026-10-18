import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getCachedTickers, invalidateTickersMemCache } from '@/lib/data-cache';
import { normalizeTickerSymbol, runPsiStrategy, computePsiSeries, type PriceBar } from '@/strategies/Typhon/typhonStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/Typhon/typhonParameterStore';
import { runPsiV2Strategy } from '@/strategies/Cerberus/cerberusStrategy';
import { computePsiV2Indices } from '@/strategies/Cerberus/psiV2Engine';
import { runHydraStrategy } from '@/strategies/Hydra/hydraStrategy';
import { computeHydraIndex } from '@/indicators/hydra-index';
import type { ChartData } from '@/components/platform/ChartWidget';

import {
  type StockPerformanceItem,
  type SectorPerformanceItem,
  type SectorsPerformanceResponse,
  type MoneySupplyData,
  type TickerStrategySignalState,
  type SectorStrategySignalsResponse,
  type StrategyModelComparisonMetrics,
  type WinningUniverseComparisonMetrics,
  type TickerChampionInfo,
  aggregateSectorsFromStocks,
} from '@/lib/finance/sectors-math';
import {
  evaluateModelsAndChampions,
  type PrecomputedModelCache,
} from '@/lib/finance/champion-routing';
import { isSignalEligibleEquity } from '@/lib/finance/signal-universe';
import { normalizeStrategyId } from '@/strategies/registry';
import { requireProprietaryAccess } from '@/lib/server/proprietary-strategy-access';

export type {
  StockPerformanceItem,
  SectorPerformanceItem,
  SectorsPerformanceResponse,
  MoneySupplyData,
  TickerStrategySignalState,
  SectorStrategySignalsResponse,
  StrategyModelComparisonMetrics,
  WinningUniverseComparisonMetrics,
  TickerChampionInfo,
  PrecomputedModelCache,
};
export { aggregateSectorsFromStocks };

const memPerformanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const memSignalsCacheMap = new Map<string, { data: any; timestamp: number }>();
const inFlightSignalsMap = new Map<string, Promise<any>>();
const SIGNALS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const EDGE_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
};

export async function handlePerformanceGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframeParam = searchParams.get('timeframe') || '';
    let startDate = searchParams.get('start') || `${new Date().getFullYear()}-01-01`;
    let endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const strategy = normalizeStrategyId(searchParams.get('strategy'));
    const strategyModel = searchParams.get('model') || 'psi8';
    const granularity = (searchParams.get('granularity') || 'sector') as 'sector' | 'industryGroup' | 'industry' | 'ticker';

    const is1D = timeframeParam === '1D' || startDate === endDate;

    if (is1D) {
      // Check if endDate has at least 10 active equity records
      const countCheck = await db.execute(sql`
        SELECT COUNT(DISTINCT dp.ticker_symbol) as count
        FROM daily_prices dp
        WHERE dp.date = ${endDate}
          AND dp.ticker_symbol NOT IN ('EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SI1!')
          AND dp.volume::numeric > 0
      `);
      const rowCount = Number((Array.isArray(countCheck) ? countCheck[0] : (countCheck as any)?.rows?.[0])?.count || 0);

      if (rowCount < 10) {
        // Resolve to the latest active trading session with active equities
        const latestSessionRes = await db.execute(sql`
          SELECT dp.date
          FROM daily_prices dp
          WHERE dp.ticker_symbol NOT IN ('EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SI1!')
            AND dp.volume::numeric > 0
          ORDER BY dp.date DESC
          LIMIT 1
        `);
        const latestDateRow = (Array.isArray(latestSessionRes) ? latestSessionRes[0] : (latestSessionRes as any)?.rows?.[0]);
        if (latestDateRow?.date) {
          const rawDate = latestDateRow.date;
          const resolvedDateStr = typeof rawDate === 'string' ? rawDate : new Date(rawDate).toISOString().split('T')[0];
          startDate = resolvedDateStr;
          endDate = resolvedDateStr;
        }
      } else {
        startDate = endDate;
      }
    }

    const cacheKey = `${timeframeParam}_${startDate}_${endDate}_${strategy}_${strategyModel}`;
    const cached = memPerformanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const { sectors, marketSummary } = aggregateSectorsFromStocks(
        cached.data.rawStockItems,
        granularity,
        cached.data.egx30Return
      );
      return NextResponse.json({
        ...cached.data,
        sectors,
        marketSummary,
        granularity,
      }, {
        headers: EDGE_CACHE_HEADERS,
      });
    }

    const allTickers = await getCachedTickers();
    const tickerMap = new Map<string, any>();
    for (const t of allTickers) {
      tickerMap.set(t.symbol, t);
    }

    // High-performance single-pass GROUP BY query with CTE for prior session close
    const aggregationQuery = sql`
      WITH window_prices AS (
        SELECT 
          ticker_symbol,
          date,
          open::numeric as open,
          close::numeric as close,
          volume::numeric as volume,
          LAG(close::numeric) OVER (PARTITION BY ticker_symbol ORDER BY date ASC) as prior_close
        FROM daily_prices
        WHERE date <= ${endDate}
          AND date >= (${startDate}::date - INTERVAL '14 days')
      )
      SELECT 
        ticker_symbol,
        COUNT(DISTINCT date) as days_count,
        (array_agg(date ORDER BY date ASC))[1] as start_date,
        (array_agg(date ORDER BY date DESC))[1] as end_date,
        (array_agg(close ORDER BY date DESC))[1] as end_price,
        CASE 
          WHEN COUNT(DISTINCT date) > 1 THEN (array_agg(close ORDER BY date ASC))[1]
          ELSE COALESCE((array_agg(prior_close ORDER BY date ASC))[1], (array_agg(open ORDER BY date ASC))[1])
        END as start_price,
        SUM(volume) as total_volume,
        SUM(close * volume) as total_turnover
      FROM window_prices
      WHERE date >= ${startDate}
      GROUP BY ticker_symbol
      HAVING (array_agg(close ORDER BY date DESC))[1] > 0
         AND (
           CASE 
             WHEN COUNT(DISTINCT date) > 1 THEN (array_agg(close ORDER BY date ASC))[1]
             ELSE COALESCE((array_agg(prior_close ORDER BY date ASC))[1], (array_agg(open ORDER BY date ASC))[1])
           END
         ) > 0;
    `;

    const majorIndicesQuery = sql`
      SELECT 
        ticker_symbol,
        date,
        open::numeric as open,
        high::numeric as high,
        low::numeric as low,
        close::numeric as close,
        volume::numeric as volume
      FROM daily_prices
      WHERE ticker_symbol IN ('EGX30', 'EGX70', 'EGX100')
        AND date <= ${endDate}
        AND date >= (${startDate}::date - INTERVAL '14 days')
      ORDER BY date ASC;
    `;

    const dailyBreadthQuery = sql`
      WITH window_breadth AS (
        SELECT 
          ticker_symbol,
          date,
          close::numeric as close,
          open::numeric as open,
          LAG(close::numeric) OVER (PARTITION BY ticker_symbol ORDER BY date ASC) as prior_close
        FROM daily_prices
        WHERE date <= ${endDate}
          AND date >= (${startDate}::date - INTERVAL '14 days')
          AND ticker_symbol NOT IN ('EGX30', 'EGX70', 'EGX100', 'USDEGP')
      )
      SELECT 
        date,
        COUNT(*) FILTER (WHERE close > COALESCE(prior_close, open))::int as gainers,
        COUNT(*) FILTER (WHERE close < COALESCE(prior_close, open))::int as losers
      FROM window_breadth
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY date
      ORDER BY date ASC;
    `;

    const moneySupplyQuery = sql`
      SELECT 
        date,
        indicator,
        value::numeric as value,
        change::numeric as change,
        change_percent::numeric as change_percent
      FROM macro_money_supply
      ORDER BY date ASC;
    `;

    const [rawResult, majorIndicesResult, dailyBreadthResult, moneySupplyResult] = await Promise.all([
      db.execute(aggregationQuery),
      db.execute(majorIndicesQuery),
      db.execute(dailyBreadthQuery),
      db.execute(moneySupplyQuery),
    ]);

    const rawRows = (Array.isArray(rawResult) ? rawResult : (rawResult as any)?.rows ?? []) as any[];
    const indexRows = (Array.isArray(majorIndicesResult) ? majorIndicesResult : (majorIndicesResult as any)?.rows ?? []) as any[];
    const breadthRows = (Array.isArray(dailyBreadthResult) ? dailyBreadthResult : (dailyBreadthResult as any)?.rows ?? []) as any[];
    const moneySupplyRows = (Array.isArray(moneySupplyResult) ? moneySupplyResult : (moneySupplyResult as any)?.rows ?? []) as any[];

    const moneySupply: Record<'M2' | 'M1' | 'M0', MoneySupplyData> = {
      M2: {
        symbol: 'M2',
        name: 'Money Supply M2',
        badge: 'M2',
        value: 0,
        change: 0,
        changePercent: 0,
        history: [],
      },
      M1: {
        symbol: 'M1',
        name: 'Money Supply M1',
        badge: 'M1',
        value: 0,
        change: 0,
        changePercent: 0,
        history: [],
      },
      M0: {
        symbol: 'M0',
        name: 'Reserve Money M0',
        badge: 'M0',
        value: 0,
        change: 0,
        changePercent: 0,
        history: [],
      },
    };

    for (const r of moneySupplyRows) {
      const ind = r.indicator as 'M2' | 'M1' | 'M0';
      if (moneySupply[ind]) {
        const dateStr = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0];
        moneySupply[ind].history.push({
          date: dateStr,
          value: Number(r.value),
          change: Number(r.change || 0),
          changePercent: Number(r.change_percent || 0),
        });
      }
    }

    (['M2', 'M1', 'M0'] as const).forEach((ind) => {
      const hist = moneySupply[ind].history;
      if (hist.length > 0) {
        const latest = hist[hist.length - 1];
        moneySupply[ind].value = latest.value;
        moneySupply[ind].change = latest.change;
        moneySupply[ind].changePercent = latest.changePercent;
      }
    });

    const indicesMap: Record<'EGX30' | 'EGX70' | 'EGX100', {
      name: string;
      badge: string;
      allHistory: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
    }> = {
      EGX30: { name: 'EGX 30 Capped Index', badge: '30', allHistory: [] },
      EGX70: { name: 'EGX 70 EWI Index', badge: '70', allHistory: [] },
      EGX100: { name: 'EGX 100 EWI Index', badge: '100', allHistory: [] },
    };

    for (const r of indexRows) {
      const sym = r.ticker_symbol as 'EGX30' | 'EGX70' | 'EGX100';
      if (indicesMap[sym]) {
        indicesMap[sym].allHistory.push({
          date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
          open: Number(r.open),
          high: Number(r.high),
          low: Number(r.low),
          close: Number(r.close),
          volume: Number(r.volume || 0),
        });
      }
    }

    const majorIndices: Record<'EGX30' | 'EGX70' | 'EGX100', import('@/lib/finance/sectors-math').MajorIndexData> = {
      EGX30: {
        symbol: 'EGX30',
        name: 'EGX 30 Capped Index',
        badge: '30',
        points: 0,
        change: 0,
        changePercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        history: [],
      },
      EGX70: {
        symbol: 'EGX70',
        name: 'EGX 70 EWI Index',
        badge: '70',
        points: 0,
        change: 0,
        changePercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        history: [],
      },
      EGX100: {
        symbol: 'EGX100',
        name: 'EGX 100 EWI Index',
        badge: '100',
        points: 0,
        change: 0,
        changePercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        history: [],
      },
    };

    (['EGX30', 'EGX70', 'EGX100'] as const).forEach((sym) => {
      const allHist = indicesMap[sym].allHistory;
      // Chart history is filtered precisely within the requested [startDate, endDate] window
      const chartHist = allHist.filter((h) => h.date >= startDate && h.date <= endDate);
      majorIndices[sym].history = chartHist;

      if (allHist.length > 0) {
        const last = chartHist.length > 0 ? chartHist[chartHist.length - 1] : allHist[allHist.length - 1];
        const priorInAll = allHist.filter((h) => h.date < last.date);
        const prevClose = priorInAll.length > 0 ? priorInAll[priorInAll.length - 1].close : last.open;
        const first = chartHist.length > 0 ? chartHist[0] : last;

        const points = last.close;
        const baselinePrice = chartHist.length <= 1 ? prevClose : first.open;
        const periodChange = points - baselinePrice;
        const periodChangePercent = baselinePrice > 0 ? (periodChange / baselinePrice) * 100 : 0;

        const dailyChange = points - prevClose;
        const dailyChangePercent = prevClose > 0 ? (dailyChange / prevClose) * 100 : 0;

        majorIndices[sym].points = points;
        majorIndices[sym].change = Number(periodChange.toFixed(2));
        majorIndices[sym].changePercent = Number(periodChangePercent.toFixed(2));
        majorIndices[sym].dailyChange = Number(dailyChange.toFixed(2));
        majorIndices[sym].dailyChangePercent = Number(dailyChangePercent.toFixed(2));
      }
    });

    const egx30History = majorIndices.EGX30.history.map((h) => ({
      date: h.date,
      close: h.close,
      volume: h.volume,
    }));

    let runningNetBreadth = 0;
    const dailyBreadth = breadthRows.map((r) => {
      const g = Number(r.gainers || 0);
      const l = Number(r.losers || 0);
      runningNetBreadth += (g - l);
      return {
        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
        gainers: g,
        losers: l,
        netAdvancers: g - l,
        adLine: runningNetBreadth,
      };
    });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({
        timeframe: { startDate, endDate, tradingDaysCount: 0 },
        marketSummary: {
          totalTurnover: 0,
          marketWeightedReturn: 0,
          marketEqualReturn: 0,
          totalStocks: 0,
          totalGainers: 0,
          totalLosers: 0,
          topSector: 'N/A',
          topSectorReturn: 0,
          laggardSector: 'N/A',
          laggardSectorReturn: 0,
        },
        sectors: [],
        rawStockItems: [],
      });
    }

    let egx30Return: number | null = null;
    const stockItems: StockPerformanceItem[] = [];

    for (const row of rawRows) {
      const sym = row.ticker_symbol as string;
      const meta = tickerMap.get(sym);
      const startPrice = Number(row.start_price);
      const endPrice = Number(row.end_price);
      const volume = Number(row.total_volume || 0);
      const turnover = Number(row.total_turnover || endPrice * volume);
      const returnPct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

      if (sym.toUpperCase() === 'EGX30') {
        egx30Return = returnPct;
        continue;
      }

      const isIndexOrMacro =
        meta?.sector === 'Indices' ||
        meta?.sector === 'Macro' ||
        ['EGX70', 'EGX100', 'EGX30', 'USDEGP'].includes(sym.toUpperCase());

      const isFund =
        ['CI_QUANT', 'OSOUL', 'COF'].includes(sym.toUpperCase()) ||
        meta?.sector === 'Funds' ||
        meta?.sector?.toLowerCase().includes('fund');

      if (isIndexOrMacro || isFund) {
        continue;
      }

      const sector = meta?.sector || 'Other';
      const isAdvancing = returnPct > 0;

      stockItems.push({
        symbol: sym,
        companyName: meta?.companyName || sym,
        sector,
        industryGroup: meta?.industryGroup || null,
        industry: meta?.industry || null,
        subIndustry: meta?.subIndustry || null,
        logoUrl: meta?.logoUrl || null,
        startPrice,
        endPrice,
        returnPct,
        volume,
        turnover,
        turnoverShare: 0,
        isAdvancing,
      });
    }

    const { sectors, marketSummary } = aggregateSectorsFromStocks(
      stockItems,
      granularity,
      egx30Return
    );

    const payload: SectorsPerformanceResponse = {
      timeframe: {
        startDate,
        endDate,
        tradingDaysCount: breadthRows.length > 0 ? breadthRows.length : rawRows.length,
      },
      marketSummary,
      sectors,
      rawStockItems: stockItems,
      egx30Return,
      egx30History,
      dailyBreadth,
      majorIndices,
      moneySupply,
      granularity,
    };

    memPerformanceCache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return NextResponse.json(payload, { headers: EDGE_CACHE_HEADERS });
  } catch (error) {
    console.error('Error computing sector performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

let precomputedCache: PrecomputedModelCache | null = null;
const PRECOMPUTED_TTL = 10 * 60 * 1000; // 10 minutes
let precomputePromise: Promise<PrecomputedModelCache> | null = null;

export function invalidatePrecomputedMarketCache(): void {
  precomputedCache = null;
  precomputePromise = null;
  memPerformanceCache.clear();
  memSignalsCacheMap.clear();
  inFlightSignalsMap.clear();
  invalidateTickersMemCache();
}

export async function getOrInitPrecomputedCache(): Promise<PrecomputedModelCache> {
  const now = Date.now();
  if (precomputedCache && now - precomputedCache.timestamp < PRECOMPUTED_TTL) {
    return precomputedCache;
  }
  if (precomputePromise) {
    return precomputePromise;
  }

  precomputePromise = (async () => {
    const [tickerRows, priceRows] = await Promise.all([
      db.select().from(tickers),
      db.execute(sql`
        WITH ranked_prices AS (
          SELECT ticker_symbol, date, open, high, low, close, volume,
                 ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
          FROM ${dailyPrices}
          WHERE close > 0 AND date >= '2023-01-01'
        )
        SELECT ticker_symbol, date, open, high, low, close, volume
        FROM ranked_prices
        WHERE rn <= 1200
        ORDER BY ticker_symbol, date ASC
      `),
    ]);

    const tickerMap = new Map<string, any>();
    for (const t of tickerRows) {
      if (t.status === 'DELISTED') continue;
      tickerMap.set(normalizeTickerSymbol(t.symbol), {
        companyName: t.companyName ?? t.symbol,
        sector: t.sector ?? 'Unclassified',
        logoUrl: t.logoUrl ?? null,
      });
    }

    const barsByTicker = new Map<string, PriceBar[]>();
    for (const row of priceRows as any[]) {
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

    const psiCache = new Map<string, any>();
    const psiV2Cache = new Map<string, any>();
    const hydraCache = new Map<string, any>();

    for (const [symbol, bars] of barsByTicker.entries()) {
      const meta = tickerMap.get(symbol);
      if (meta && !isSignalEligibleEquity(symbol, meta)) continue;
      if (bars.length < 130) continue;
      try {
        psiCache.set(symbol, computePsiSeries(bars));
      } catch (e) {}
      try {
        psiV2Cache.set(symbol, computePsiV2Indices(bars));
      } catch (e) {}
      try {
        const chartBars: ChartData[] = bars.map((b) => ({
          time: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume ?? 0,
        }));
        hydraCache.set(symbol, computeHydraIndex(chartBars, { binaryMode: true, showMarkers: false }).points);
      } catch (e) {}
    }

    const newCache: PrecomputedModelCache = {
      barsByTicker,
      tickerMap,
      psiCache,
      psiV2Cache,
      hydraCache,
      timestamp: Date.now(),
    };
    precomputedCache = newCache;
    return newCache;
  })();

  const currentPromise = precomputePromise;
  try {
    return await currentPromise;
  } finally {
    if (precomputePromise === currentPromise) precomputePromise = null;
  }
}



export async function handleSignalsGet(request?: Request) {
  try {
    if (request) {
      const denied = await requireProprietaryAccess();
      if (denied) return denied;
    }
    const url = request ? new URL(request.url) : null;
    const strategy = normalizeStrategyId(url?.searchParams.get('strategy'));
    const timeframeParam = url?.searchParams.get('timeframe') || '';
    let startDate = url?.searchParams.get('start') || '2025-01-01';
    let endDate = url?.searchParams.get('end') || new Date().toISOString().split('T')[0];
    const refresh = url?.searchParams.get('refresh') === 'true';

    const is1D = timeframeParam === '1D' || startDate === endDate;
    if (is1D) {
      // Check if endDate has at least 10 active equity records
      const countCheck = await db.execute(sql`
        SELECT COUNT(DISTINCT dp.ticker_symbol) as count
        FROM daily_prices dp
        WHERE dp.date = ${endDate}
          AND dp.ticker_symbol NOT IN ('EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SI1!')
          AND dp.volume::numeric > 0
      `);
      const rowCount = Number((Array.isArray(countCheck) ? countCheck[0] : (countCheck as any)?.rows?.[0])?.count || 0);

      if (rowCount < 10) {
        // Resolve to the latest active trading session with active equities
        const latestSessionRes = await db.execute(sql`
          SELECT dp.date
          FROM daily_prices dp
          WHERE dp.ticker_symbol NOT IN ('EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SI1!')
            AND dp.volume::numeric > 0
          ORDER BY dp.date DESC
          LIMIT 1
        `);
        const latestDateRow = (Array.isArray(latestSessionRes) ? latestSessionRes[0] : (latestSessionRes as any)?.rows?.[0]);
        if (latestDateRow?.date) {
          const rawDate = latestDateRow.date;
          const resolvedDateStr = typeof rawDate === 'string' ? rawDate : new Date(rawDate).toISOString().split('T')[0];
          startDate = resolvedDateStr;
          endDate = resolvedDateStr;
        }
      } else {
        startDate = endDate;
      }
    }

    const cacheKey = `signals_${strategy}_${timeframeParam}_${startDate}_${endDate}`;
    const now = Date.now();

    if (!refresh) {
      const cached = memSignalsCacheMap.get(cacheKey);
      if (cached && now - cached.timestamp < SIGNALS_CACHE_TTL) {
        return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'private, no-store' } });
      }

      const existingPromise = inFlightSignalsMap.get(cacheKey);
      if (existingPromise) {
        const data = await existingPromise;
        return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
      }
    }

    const promise = (async () => {
      const cache = await getOrInitPrecomputedCache();
      const { barsByTicker, tickerMap, psiCache, psiV2Cache, hydraCache } = cache;

      // 1. Calculate EGX30 benchmark return for [startDate, endDate]
      let egx30Return = 0;
      let tradingDaysCount = 0;
      const egxBars = barsByTicker.get('EGX30');
      if (egxBars && egxBars.length > 0) {
        const chartHist = egxBars.filter((b) => b.date >= startDate && b.date <= endDate);
        tradingDaysCount = chartHist.length;
        if (chartHist.length > 1) {
          const first = chartHist[0];
          const last = chartHist[chartHist.length - 1];
          egx30Return = first.close > 0 ? ((last.close - first.close) / first.close) * 100 : 0;
        } else if (chartHist.length === 1) {
          const last = chartHist[0];
          const priorInAll = egxBars.filter((b) => b.date < last.date);
          const prevClose = priorInAll.length > 0 ? priorInAll[priorInAll.length - 1].close : last.open;
          egx30Return = prevClose > 0 ? ((last.close - prevClose) / prevClose) * 100 : 0;
        }
      }

      if (tradingDaysCount === 0) {
        const d1 = new Date(startDate).getTime();
        const d2 = new Date(endDate).getTime();
        const diffDays = Math.max(1, Math.round((d2 - d1) / (24 * 3600 * 1000)));
        tradingDaysCount = Math.max(1, Math.round(diffDays * (5 / 7)));
      }

      // 2. Precompute models comparison, winning universe metrics, and ticker champions
      const {
        tickerChampions,
        modelsComparison,
        winningUniverseComparison,
      } = evaluateModelsAndChampions(cache, startDate, endDate, egx30Return, tradingDaysCount);

      // 3. Compute detailed ticker-level signals for the requested strategy
      const strategyNormalized = strategy;

      const signalsByTicker: Record<string, any> = {};
      const sectorSummary: Record<string, any> = {};

      let totalFreshBuys = 0;
      let totalActiveLongs = 0;
      let activeLongsWinning = 0;
      let activeLongsLosing = 0;
      let totalRecentExits = 0;
      let totalScanned = 0;
      let sumRoi = 0;
      let sumBuyHoldRoi = 0;
      let sumWinRate = 0;
      let sumBarsPerTrade = 0;
      let totalStrategyTrades = 0;
      let stocksWithTradesCount = 0;
      let sumMae = 0;

      for (const [symbol, bars] of barsByTicker.entries()) {
        const meta = tickerMap.get(symbol);
        const isIndexOrMacro = meta?.sector === 'Indices' || meta?.sector === 'Macro' || ['EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SI1!'].includes(symbol);
        const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol) || meta?.sector === 'Funds';
        if (isIndexOrMacro || isFund) continue;
        if (!bars || bars.length === 0) continue;

        const sectorName = meta?.sector || 'Other';
        if (!sectorSummary[sectorName]) {
          sectorSummary[sectorName] = {
            freshBuysCount: 0,
            activeLongsCount: 0,
            activeWinningCount: 0,
            activeLosingCount: 0,
            recentExitsCount: 0,
            totalStocks: 0,
            sumTradeReturn: 0,
            sumSysRoi: 0,
            sumBuyHoldRoi: 0,
          };
        }
        sectorSummary[sectorName].totalStocks++;
        totalScanned++;

        const lastBar = endDate
          ? ([...bars].reverse().find((b) => b.date <= endDate) || bars[bars.length - 1])
          : bars[bars.length - 1];

        // Tickers with fewer than 130 trading bars don't have enough history for 120-day moving average quantitative models
        if (bars.length < 130) {
          const firstBarInPeriod = bars.find((b) => b.date >= startDate) || bars[0];
          let buyHoldRoi = 0;
          if (firstBarInPeriod && firstBarInPeriod.close > 0) {
            if (firstBarInPeriod.date === lastBar.date) {
              const priorInAll = bars.filter((b) => b.date < lastBar.date);
              const prevClose = priorInAll.length > 0 ? priorInAll[priorInAll.length - 1].close : lastBar.open;
              buyHoldRoi = prevClose > 0 ? ((lastBar.close - prevClose) / prevClose) * 100 : 0;
            } else {
              buyHoldRoi = ((lastBar.close - firstBarInPeriod.close) / firstBarInPeriod.close) * 100;
            }
          }

          sectorSummary[sectorName].sumBuyHoldRoi += buyHoldRoi;
          sumBuyHoldRoi += buyHoldRoi;

          signalsByTicker[symbol] = {
            status: 'FLAT',
            tradeReturnPct: 0,
            entryPrice: 0,
            currentPrice: lastBar.close,
            barsHeld: 0,
            sysRoi: 0,
            buyHoldRoi,
            roiMargin: -buyHoldRoi,
            winRate: 0,
            tradesCount: 0,
            maxAdverseExcursion: 0,
            avgAdverseExcursion: 0,
            positionMae: 0,
          };
          continue;
        }

        let signals: any[] = [];
        let sysRoi = 0;
        let buyHoldRoi = 0;
        let roiMargin = 0;
        let winRate = 0;
        let tradesCount = 0;
        let avgBars = 0;
        let maxAdverseExcursion = 0;
        let avgAdverseExcursion = 0;

        if (strategyNormalized === 'hydra') {
          try {
            const points = hydraCache.get(symbol);
            const hydraResult = runHydraStrategy(bars, { ticker: symbol, startDate, endDate }, points);
            signals = hydraResult.signals.filter((s) => s.signal === 'BUY' || s.signal === 'SELL');
            sysRoi = hydraResult.metrics?.sysRoi || 0;
            buyHoldRoi = hydraResult.metrics?.buyHoldRoi || 0;
            roiMargin = hydraResult.metrics?.roiMargin ?? (sysRoi - buyHoldRoi);
            winRate = hydraResult.metrics?.winRate || 0;
            tradesCount = hydraResult.metrics?.trades || 0;
            avgBars = hydraResult.metrics?.avgBarsPerTrade || 0;
            maxAdverseExcursion = hydraResult.metrics?.maxAdverseExcursion || 0;
            avgAdverseExcursion = hydraResult.metrics?.avgAdverseExcursion || 0;
          } catch (e) {
            signals = [];
          }
        } else if (strategyNormalized === 'cerberus') {
          try {
            const indices = psiV2Cache.get(symbol);
            const psiV2Result = runPsiV2Strategy(bars, { ticker: symbol, startDate, endDate }, indices);
            signals = psiV2Result.signals.filter((s) => s.signal === 'BUY' || s.signal === 'SELL');
            sysRoi = psiV2Result.metrics?.sysRoi || 0;
            buyHoldRoi = psiV2Result.metrics?.buyHoldRoi || 0;
            roiMargin = psiV2Result.metrics?.roiMargin ?? (sysRoi - buyHoldRoi);
            winRate = psiV2Result.metrics?.winRate || 0;
            tradesCount = psiV2Result.metrics?.trades || 0;
            avgBars = psiV2Result.metrics?.avgBarsPerTrade || 0;
            maxAdverseExcursion = psiV2Result.metrics?.maxAdverseExcursion || 0;
            avgAdverseExcursion = psiV2Result.metrics?.avgAdverseExcursion || 0;
          } catch (e) {
            signals = [];
          }
        } else {
          const computed = psiCache.get(symbol);
          const strategyResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate, endDate }), computed);
          signals = strategyResult.signals;
          sysRoi = strategyResult.metrics?.sysRoi || 0;
          buyHoldRoi = strategyResult.metrics?.buyHoldRoi || 0;
          roiMargin = strategyResult.metrics?.roiMargin ?? (sysRoi - buyHoldRoi);
          winRate = strategyResult.metrics?.winRate || 0;
          tradesCount = strategyResult.metrics?.trades || 0;
          avgBars = strategyResult.metrics?.avgBarsPerTrade || 0;
          maxAdverseExcursion = strategyResult.metrics?.maxAdverseExcursion || 0;
          avgAdverseExcursion = strategyResult.metrics?.avgAdverseExcursion || 0;
        }

        // Fallback for buy & hold return if 0
        if (buyHoldRoi === 0 && bars.length > 1) {
          const firstBarInPeriod = bars.find((b) => b.date >= startDate) || bars[0];
          if (firstBarInPeriod && firstBarInPeriod.close > 0) {
            if (firstBarInPeriod.date === lastBar.date) {
              const priorInAll = bars.filter((b) => b.date < lastBar.date);
              const prevClose = priorInAll.length > 0 ? priorInAll[priorInAll.length - 1].close : lastBar.open;
              buyHoldRoi = prevClose > 0 ? ((lastBar.close - prevClose) / prevClose) * 100 : 0;
            } else {
              buyHoldRoi = ((lastBar.close - firstBarInPeriod.close) / firstBarInPeriod.close) * 100;
            }
            roiMargin = sysRoi - buyHoldRoi;
          }
        }

        sectorSummary[sectorName].sumSysRoi += sysRoi;
        sectorSummary[sectorName].sumBuyHoldRoi = (sectorSummary[sectorName].sumBuyHoldRoi || 0) + buyHoldRoi;
        sumRoi += sysRoi;
        sumBuyHoldRoi = (sumBuyHoldRoi || 0) + buyHoldRoi;

        if (tradesCount > 0) {
          sumWinRate += winRate;
          totalStrategyTrades += tradesCount;
          sumBarsPerTrade += avgBars;
          sumMae += avgAdverseExcursion || maxAdverseExcursion;
          stocksWithTradesCount++;
        }

        const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;

        let status = 'FLAT';
        let tradeReturnPct = 0;
        let entryPrice = 0;
        let barsHeld = 0;
        let positionMae = 0;

        if (lastSignal) {
          const isRecent = (new Date(lastBar.date).getTime() - new Date(lastSignal.date).getTime()) <= (5 * 24 * 3600 * 1000);

          let entryIdx = -1;
          if (lastSignal.date) {
            entryIdx = bars.findIndex((b) => b.date >= lastSignal.date);
            if (entryIdx !== -1) {
              const lastBarIdx = bars.findIndex((b) => b.date === lastBar.date);
              barsHeld = lastBarIdx !== -1 ? Math.max(0, lastBarIdx - entryIdx) : Math.max(0, bars.length - 1 - entryIdx);
            }
          }

          if (lastSignal.signal === 'BUY') {
            entryPrice = lastSignal.price;
            tradeReturnPct = lastSignal.price > 0 ? ((lastBar.close - lastSignal.price) / lastSignal.price) * 100 : 0;
            
            // Calculate real adverse excursion for this active position:
            if (entryPrice > 0 && entryIdx !== -1) {
              const lastBarIdx = bars.findIndex((b) => b.date === lastBar.date);
              const endIdx = lastBarIdx !== -1 ? lastBarIdx + 1 : bars.length;
              const activeBarsSlice = bars.slice(entryIdx, endIdx);
              if (activeBarsSlice.length > 0) {
                const minLow = Math.min(...activeBarsSlice.map((b) => b.low));
                if (minLow < entryPrice) {
                  positionMae = ((entryPrice - minLow) / entryPrice) * 100;
                } else {
                  positionMae = 0;
                }
              }
            }

            sectorSummary[sectorName].sumTradeReturn += tradeReturnPct;
            if (tradeReturnPct > 0) {
              activeLongsWinning++;
              sectorSummary[sectorName].activeWinningCount++;
            } else if (tradeReturnPct < 0) {
              activeLongsLosing++;
              sectorSummary[sectorName].activeLosingCount++;
            }

            if (lastSignal.date === lastBar.date) {
              status = 'BUY_FRESH';
              totalFreshBuys++;
              sectorSummary[sectorName].freshBuysCount++;
            } else {
              status = 'LONG_ACTIVE';
              totalActiveLongs++;
              sectorSummary[sectorName].activeLongsCount++;
            }
          } else {
            if (isRecent) {
              status = 'EXIT_RECENT';
              totalRecentExits++;
              sectorSummary[sectorName].recentExitsCount++;
            }
            positionMae = Math.abs(maxAdverseExcursion);
          }
        } else {
          positionMae = Math.abs(maxAdverseExcursion);
        }

        signalsByTicker[symbol] = {
          status,
          lastSignalDate: lastSignal?.date,
          lastSignalType: lastSignal?.signal,
          tradeReturnPct,
          entryPrice,
          currentPrice: lastBar.close,
          barsHeld,
          sysRoi,
          buyHoldRoi,
          roiMargin,
          winRate,
          tradesCount,
          maxAdverseExcursion,
          avgAdverseExcursion,
          positionMae,
        };
      }

      for (const sName in sectorSummary) {
        const s = sectorSummary[sName];
        s.avgTradeReturn = s.activeLongsCount > 0 ? s.sumTradeReturn / s.activeLongsCount : 0;
        s.cumulativeStrategyRoi = s.totalStocks > 0 ? s.sumSysRoi / s.totalStocks : 0;
        s.cumulativeBuyHoldRoi = s.totalStocks > 0 ? (s.sumBuyHoldRoi || 0) / s.totalStocks : 0;
        s.alphaSpread = s.cumulativeStrategyRoi - s.cumulativeBuyHoldRoi;
      }

      // Summary from the selected model in modelsComparison
      const selModel = modelsComparison[strategyNormalized];
      const cumulativeRoi = selModel ? selModel.simulatedRoi : (totalScanned > 0 ? sumRoi / totalScanned : 0);
      const cumulativeBuyHoldRoi = selModel ? selModel.buyHoldRoi : (totalScanned > 0 ? sumBuyHoldRoi / totalScanned : 0);
      const strategyAlphaVsBuyHold = selModel ? selModel.alphaVsBh : (cumulativeRoi - cumulativeBuyHoldRoi);
      const avgWinRate = selModel ? selModel.winRate : (stocksWithTradesCount > 0 ? sumWinRate / stocksWithTradesCount : 0);
      const avgBarsPerTrade = stocksWithTradesCount > 0 ? sumBarsPerTrade / stocksWithTradesCount : 0;
      const avgMae = selModel ? selModel.maxDrawdown : (stocksWithTradesCount > 0 ? sumMae / stocksWithTradesCount : 0);

      const payload: SectorStrategySignalsResponse = {
        summary: {
          cumulativeRoi,
          cumulativeBuyHoldRoi,
          strategyAlphaVsBuyHold,
          winRate: avgWinRate,
          totalTrades: selModel ? selModel.totalTrades : totalStrategyTrades,
          avgBarsPerTrade,
          avgMae,
          totalFreshBuys,
          totalActiveLongs,
          activeLongsWinning,
          activeLongsLosing,
          totalRecentExits,
          totalScanned,
          lastScanTime: new Date().toISOString(),
        },
        signalsByTicker,
        sectorSummary,
        modelsComparison,
        winningUniverseComparison,
        tickerChampions,
      };

      memSignalsCacheMap.set(cacheKey, { data: payload, timestamp: Date.now() });
      return payload;
    })();

    inFlightSignalsMap.set(cacheKey, promise);
    try {
      const result = await promise;
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    } finally {
      if (inFlightSignalsMap.get(cacheKey) === promise) inFlightSignalsMap.delete(cacheKey);
    }
  } catch (error) {
    console.error('Error computing sector strategy signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
