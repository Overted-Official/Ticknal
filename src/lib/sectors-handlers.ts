import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getCachedTickers } from '@/lib/data-cache';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { runPsiV2Strategy } from '@/strategies/PSI_V2/psiV2Strategy';
import { runThothV37PStrategy } from '@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy';

import {
  type StockPerformanceItem,
  type SectorPerformanceItem,
  type SectorsPerformanceResponse,
  type TickerStrategySignalState,
  type SectorStrategySignalsResponse,
  aggregateSectorsFromStocks,
} from './sectors-math';

export type {
  StockPerformanceItem,
  SectorPerformanceItem,
  SectorsPerformanceResponse,
  TickerStrategySignalState,
  SectorStrategySignalsResponse,
};
export { aggregateSectorsFromStocks };

const memPerformanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const memSignalsCacheMap = new Map<string, { data: any; timestamp: number }>();
const inFlightSignalsMap = new Map<string, Promise<any>>();
const SIGNALS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function handlePerformanceGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const strategy = searchParams.get('strategy') || 'psi';
    const strategyModel = searchParams.get('model') || 'psi8';
    const granularity = (searchParams.get('granularity') || 'sector') as 'sector' | 'industryGroup' | 'industry' | 'ticker';

    const cacheKey = `${startDate}_${endDate}_${strategy}_${strategyModel}`;
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
      });
    }

    const allTickers = await getCachedTickers();
    const tickerMap = new Map<string, any>();
    for (const t of allTickers) {
      tickerMap.set(t.symbol, t);
    }

    // High-performance single-pass GROUP BY query with array_agg
    const aggregationQuery = sql`
      SELECT 
        ticker_symbol,
        (array_agg(close::numeric ORDER BY date ASC))[1] as start_price,
        (array_agg(date ORDER BY date ASC))[1] as start_date,
        (array_agg(close::numeric ORDER BY date DESC))[1] as end_price,
        (array_agg(date ORDER BY date DESC))[1] as end_date,
        SUM(volume::numeric) as total_volume,
        SUM((close::numeric) * (volume::numeric)) as total_turnover
      FROM daily_prices
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY ticker_symbol
      HAVING (array_agg(close::numeric ORDER BY date ASC))[1] > 0
         AND (array_agg(close::numeric ORDER BY date DESC))[1] > 0;
    `;

    const rawRows = (await db.execute(aggregationQuery)) as any[];

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
        tradingDaysCount: rawRows.length,
      },
      marketSummary,
      sectors,
      rawStockItems: stockItems,
      egx30Return,
      granularity,
    };

    memPerformanceCache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error computing sector performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleSignalsGet(request?: Request) {
  try {
    const url = request ? new URL(request.url) : null;
    const strategy = url?.searchParams.get('strategy') || 'psi';
    const startDate = url?.searchParams.get('start') || '2025-01-01';
    const endDate = url?.searchParams.get('end') || new Date().toISOString().split('T')[0];
    const cacheKey = `signals_${strategy}_${startDate}_${endDate}`;
    const now = Date.now();

    const cached = memSignalsCacheMap.get(cacheKey);
    if (cached && now - cached.timestamp < SIGNALS_CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const existingPromise = inFlightSignalsMap.get(cacheKey);
    if (existingPromise) {
      const data = await existingPromise;
      return NextResponse.json(data);
    }

    const promise = (async () => {
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
          WHERE rn <= 500
          ORDER BY ticker_symbol, date ASC
        `),
      ]);

      const tickerMap = new Map(
        tickerRows.map((t) => [
          normalizeTickerSymbol(t.symbol),
          {
            companyName: t.companyName ?? t.symbol,
            sector: t.sector ?? 'Unclassified',
            logoUrl: t.logoUrl ?? null,
          },
        ]),
      );

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

      const signalsByTicker: Record<string, any> = {};
      const sectorSummary: Record<string, any> = {};

      let totalFreshBuys = 0;
      let totalActiveLongs = 0;
      let activeLongsWinning = 0;
      let activeLongsLosing = 0;
      let totalRecentExits = 0;
      let totalScanned = 0;
      let sumRoi = 0;
      let sumWinRate = 0;
      let sumBarsPerTrade = 0;
      let totalStrategyTrades = 0;
      let stocksWithTradesCount = 0;
      let sumMae = 0;

      for (const [symbol, bars] of barsByTicker.entries()) {
        if (bars.length < 130) continue;

        const meta = tickerMap.get(symbol);
        const isIndexOrMacro = meta?.sector === 'Indices' || meta?.sector === 'Macro' || ['EGX30', 'EGX70', 'EGX100', 'USDEGP'].includes(symbol);
        const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol) || meta?.sector === 'Funds';
        if (isIndexOrMacro || isFund) continue;

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
          };
        }
        sectorSummary[sectorName].totalStocks++;
        totalScanned++;

        let signals: any[] = [];
        let sysRoi = 0;
        let winRate = 0;
        let tradesCount = 0;
        let avgBars = 0;
        let maxAdverseExcursion = 0;
        let avgAdverseExcursion = 0;

        if (strategy === 'thoth_egx_macro') {
          try {
            const thothRes = await runThothV37PStrategy(bars, { ticker: symbol, startDate });
            signals = thothRes.signals;
            sysRoi = thothRes.metrics?.sysRoi || 0;
            winRate = thothRes.metrics?.winRate || 0;
            tradesCount = thothRes.metrics?.trades || 0;
            avgBars = (thothRes as any)?.metrics?.avgBarsHeld || (thothRes as any)?.metrics?.avgBarsPerTrade || 0;
            maxAdverseExcursion = thothRes.metrics?.maxAdverseExcursion || 0;
            avgAdverseExcursion = thothRes.metrics?.avgAdverseExcursion || 0;
          } catch (e) {
            signals = [];
          }
        } else if (strategy === 'psi_v2' || strategy === 'psiv2') {
          try {
            const psiV2Result = runPsiV2Strategy(bars, { ticker: symbol, startDate });
            signals = psiV2Result.signals.filter((s) => s.signal === 'BUY' || s.signal === 'SELL');
            sysRoi = psiV2Result.metrics?.sysRoi || 0;
            winRate = psiV2Result.metrics?.winRate || 0;
            tradesCount = psiV2Result.metrics?.trades || 0;
            avgBars = psiV2Result.metrics?.avgBarsPerTrade || 0;
            maxAdverseExcursion = psiV2Result.metrics?.maxAdverseExcursion || 0;
            avgAdverseExcursion = psiV2Result.metrics?.avgAdverseExcursion || 0;
          } catch (e) {
            signals = [];
          }
        } else {
          const strategyResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate }));
          signals = strategyResult.signals;
          sysRoi = strategyResult.metrics?.sysRoi || 0;
          winRate = strategyResult.metrics?.winRate || 0;
          tradesCount = strategyResult.metrics?.trades || 0;
          avgBars = strategyResult.metrics?.avgBarsPerTrade || 0;
          maxAdverseExcursion = strategyResult.metrics?.maxAdverseExcursion || 0;
          avgAdverseExcursion = strategyResult.metrics?.avgAdverseExcursion || 0;
        }

        sectorSummary[sectorName].sumSysRoi += sysRoi;
        sumRoi += sysRoi;
        if (tradesCount > 0) {
          sumWinRate += winRate;
          totalStrategyTrades += tradesCount;
          sumBarsPerTrade += avgBars;
          sumMae += avgAdverseExcursion || maxAdverseExcursion;
          stocksWithTradesCount++;
        }

        const lastBar = bars[bars.length - 1];
        const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;

        let status = 'FLAT';
        let tradeReturnPct = 0;
        let entryPrice = 0;
        let barsHeld = 0;

        if (lastSignal) {
          const isRecent = (new Date(lastBar.date).getTime() - new Date(lastSignal.date).getTime()) <= (5 * 24 * 3600 * 1000);

          if (lastSignal.date) {
            const entryIdx = bars.findIndex((b) => b.date >= lastSignal.date);
            if (entryIdx !== -1) {
              barsHeld = bars.length - 1 - entryIdx;
            }
          }

          if (lastSignal.signal === 'BUY') {
            entryPrice = lastSignal.price;
            tradeReturnPct = lastSignal.price > 0 ? ((lastBar.close - lastSignal.price) / lastSignal.price) * 100 : 0;
            
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
          } else if (isRecent) {
            status = 'EXIT_RECENT';
            totalRecentExits++;
            sectorSummary[sectorName].recentExitsCount++;
          }
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
          winRate,
          tradesCount,
          maxAdverseExcursion,
          avgAdverseExcursion,
        };
      }

      for (const sName in sectorSummary) {
        const s = sectorSummary[sName];
        s.avgTradeReturn = s.activeLongsCount > 0 ? s.sumTradeReturn / s.activeLongsCount : 0;
        s.cumulativeStrategyRoi = s.totalStocks > 0 ? s.sumSysRoi / s.totalStocks : 0;
      }

      const cumulativeRoi = totalScanned > 0 ? sumRoi / totalScanned : 0;
      const avgWinRate = stocksWithTradesCount > 0 ? sumWinRate / stocksWithTradesCount : 0;
      const avgBarsPerTrade = stocksWithTradesCount > 0 ? sumBarsPerTrade / stocksWithTradesCount : 0;
      const avgMae = stocksWithTradesCount > 0 ? sumMae / stocksWithTradesCount : 0;

      const payload = {
        summary: {
          cumulativeRoi,
          winRate: avgWinRate,
          totalTrades: totalStrategyTrades,
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
      };

      memSignalsCacheMap.set(cacheKey, { data: payload, timestamp: Date.now() });
      inFlightSignalsMap.delete(cacheKey);
      return payload;
    })();

    inFlightSignalsMap.set(cacheKey, promise);
    const result = await promise;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error computing sector strategy signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
