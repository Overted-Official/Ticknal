import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getCachedTickers } from '@/lib/data-cache';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';

export interface StockPerformanceItem {
  symbol: string;
  companyName: string;
  sector: string;
  industryGroup?: string | null;
  industry?: string | null;
  subIndustry?: string | null;
  logoUrl: string | null;
  startPrice: number;
  endPrice: number;
  returnPct: number;
  volume: number;
  turnover: number;
  turnoverShare: number;
  isAdvancing: boolean;
  psiSignal?: {
    signal: string;
    date: string;
    masterIndex: number | null;
    entryReason?: string;
    exitReason?: string;
  };
}

export interface SectorPerformanceItem {
  sector: string;
  stockCount: number;
  totalTurnover: number;
  turnoverShare: number;
  turnoverWeightedReturn: number;
  equalWeightedReturn: number;
  gainersCount: number;
  losersCount: number;
  unchangedCount: number;
  breadthRatio: number;
  relativeStrengthVsBenchmark: number;
  rotationRegime: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
  topDriver: {
    symbol: string;
    companyName: string;
    returnPct: number;
    contributionPct: number;
  } | null;
  topDrag: {
    symbol: string;
    companyName: string;
    returnPct: number;
  } | null;
  stocks: StockPerformanceItem[];
}

export interface SectorsPerformanceResponse {
  timeframe: {
    startDate: string;
    endDate: string;
    tradingDaysCount: number;
  };
  marketSummary: {
    totalTurnover: number;
    marketWeightedReturn: number;
    marketEqualReturn: number;
    totalStocks: number;
    totalGainers: number;
    totalLosers: number;
    topSector: string;
    topSectorReturn: number;
    laggardSector: string;
    laggardSectorReturn: number;
  };
  sectors: SectorPerformanceItem[];
  granularity?: 'sector' | 'industryGroup' | 'industry';
}

export interface TickerStrategySignalState {
  status: 'BUY_FRESH' | 'LONG_ACTIVE' | 'EXIT_RECENT' | 'FLAT';
  lastSignalDate?: string;
  lastSignalType?: string;
  tradeReturnPct?: number;
  entryPrice?: number;
  currentPrice?: number;
}

export interface SectorStrategySignalsResponse {
  summary: {
    totalFreshBuys: number;
    totalActiveLongs: number;
    totalRecentExits: number;
    totalScanned: number;
    lastScanTime: string;
  };
  signalsByTicker: Record<string, TickerStrategySignalState>;
  sectorSummary: Record<
    string,
    {
      freshBuysCount: number;
      activeLongsCount: number;
      recentExitsCount: number;
      totalStocks: number;
    }
  >;
}

const memPerformanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let memSignalsCache: { data: any; timestamp: number } | null = null;
let inFlightSignalsPromise: Promise<any> | null = null;
const SIGNALS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function handlePerformanceGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const strategy = searchParams.get('strategy') || 'psi';
    const strategyModel = searchParams.get('model') || 'psi8';
    const granularity = (searchParams.get('granularity') || 'sector') as 'sector' | 'industryGroup' | 'industry';

    const cacheKey = `${startDate}_${endDate}_${strategy}_${strategyModel}_${granularity}`;
    const cached = memPerformanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const allTickers = await getCachedTickers();
    const tickerMap = new Map<string, any>();
    for (const t of allTickers) {
      tickerMap.set(t.symbol, t);
    }

    const aggregationQuery = sql`
      WITH RankedPrices AS (
        SELECT 
          ticker_symbol,
          date,
          close::numeric as close,
          volume::numeric as volume,
          ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date ASC) as rn_first,
          ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) as rn_last,
          SUM(volume::numeric) OVER(PARTITION BY ticker_symbol) as total_volume,
          SUM((close::numeric) * (volume::numeric)) OVER(PARTITION BY ticker_symbol) as total_turnover
        FROM daily_prices
        WHERE date >= ${startDate} AND date <= ${endDate}
      )
      SELECT 
        wp.ticker_symbol,
        p_start.close as start_price,
        p_start.date as start_date,
        p_end.close as end_price,
        p_end.date as end_date,
        wp.total_volume,
        wp.total_turnover
      FROM (
        SELECT DISTINCT ticker_symbol, total_volume, total_turnover FROM RankedPrices
      ) wp
      JOIN (SELECT ticker_symbol, close, date FROM RankedPrices WHERE rn_first = 1) p_start 
        ON wp.ticker_symbol = p_start.ticker_symbol
      JOIN (SELECT ticker_symbol, close, date FROM RankedPrices WHERE rn_last = 1) p_end 
        ON wp.ticker_symbol = p_end.ticker_symbol
      WHERE p_start.close > 0 AND p_end.close > 0;
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
      });
    }

    let egx30Return: number | null = null;
    const stockItems: any[] = [];
    let totalMarketTurnover = 0;
    let totalMarketGainers = 0;
    let totalMarketLosers = 0;

    for (const row of rawRows) {
      const sym = row.ticker_symbol as string;
      const meta = tickerMap.get(sym);
      const startPrice = Number(row.start_price);
      const endPrice = Number(row.end_price);
      const volume = Number(row.total_volume || 0);
      const turnover = Number(row.total_turnover || (endPrice * volume));
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

      let sector = meta?.sector || 'Other';
      const isAdvancing = returnPct > 0;

      totalMarketTurnover += turnover;
      if (returnPct > 0) totalMarketGainers++;
      else if (returnPct < 0) totalMarketLosers++;

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

    const sectorGroups = new Map<string, any[]>();
    for (const stock of stockItems) {
      const groupKey =
        granularity === 'industryGroup' ? (stock.industryGroup || 'Other') :
        granularity === 'industry' ? (stock.industry || 'Other') :
        stock.sector;
      const list = sectorGroups.get(groupKey) || [];
      list.push(stock);
      sectorGroups.set(groupKey, list);
    }

    const marketWeightedReturn = totalMarketTurnover > 0
      ? stockItems.reduce((sum, s) => sum + s.returnPct * (s.turnover / totalMarketTurnover), 0)
      : 0;

    const marketEqualReturn = stockItems.length > 0
      ? stockItems.reduce((sum, s) => sum + s.returnPct, 0) / stockItems.length
      : 0;

    const benchmarkReturn = egx30Return !== null ? egx30Return : marketWeightedReturn;
    const sectors: any[] = [];

    for (const [sectorName, stocks] of sectorGroups.entries()) {
      const sectorTurnover = stocks.reduce((sum, s) => sum + s.turnover, 0);
      const gainers = stocks.filter((s) => s.returnPct > 0).length;
      const losers = stocks.filter((s) => s.returnPct < 0).length;
      const unchanged = stocks.length - gainers - losers;

      for (const s of stocks) {
        s.turnoverShare = sectorTurnover > 0 ? (s.turnover / sectorTurnover) * 100 : 0;
      }

      const turnoverWeightedReturn = sectorTurnover > 0
        ? stocks.reduce((sum, s) => sum + s.returnPct * (s.turnover / sectorTurnover), 0)
        : 0;

      const equalWeightedReturn = stocks.reduce((sum, s) => sum + s.returnPct, 0) / stocks.length;
      const relativeStrengthVsBenchmark = turnoverWeightedReturn - benchmarkReturn;

      let topDriver: any = null;
      let topDrag: any = null;

      const sortedByImpact = [...stocks].sort((a, b) => {
        const impactA = a.returnPct * (a.turnover / (sectorTurnover || 1));
        const impactB = b.returnPct * (b.turnover / (sectorTurnover || 1));
        return impactB - impactA;
      });

      if (sortedByImpact.length > 0) {
        const best = sortedByImpact[0];
        const bestImpact = best.returnPct * (best.turnover / (sectorTurnover || 1));
        const contributionPct = turnoverWeightedReturn !== 0 
          ? (bestImpact / turnoverWeightedReturn) * 100 
          : 0;

        topDriver = {
          symbol: best.symbol,
          companyName: best.companyName,
          returnPct: best.returnPct,
          contributionPct,
        };

        const worst = sortedByImpact[sortedByImpact.length - 1];
        if (worst.returnPct < 0) {
          topDrag = {
            symbol: worst.symbol,
            companyName: worst.companyName,
            returnPct: worst.returnPct,
          };
        }
      }

      const momentumSpread = turnoverWeightedReturn - equalWeightedReturn;
      let rotationRegime = 'Lagging';

      if (turnoverWeightedReturn >= benchmarkReturn) {
        rotationRegime = momentumSpread >= 0 ? 'Leading' : 'Weakening';
      } else {
        rotationRegime = momentumSpread >= 0 ? 'Improving' : 'Lagging';
      }

      stocks.sort((a, b) => b.turnover - a.turnover);

      sectors.push({
        sector: sectorName,
        stockCount: stocks.length,
        totalTurnover: sectorTurnover,
        turnoverShare: totalMarketTurnover > 0 ? (sectorTurnover / totalMarketTurnover) * 100 : 0,
        turnoverWeightedReturn,
        equalWeightedReturn,
        gainersCount: gainers,
        losersCount: losers,
        unchangedCount: unchanged,
        breadthRatio: stocks.length > 0 ? (gainers / stocks.length) * 100 : 0,
        relativeStrengthVsBenchmark,
        rotationRegime,
        topDriver,
        topDrag,
        stocks,
      });
    }

    sectors.sort((a, b) => b.totalTurnover - a.totalTurnover);

    const namedSectorsByReturn = sectors
      .filter((s) => s.sector !== 'Other' && s.sector !== 'Unclassified' && s.stockCount > 0)
      .sort((a, b) => b.turnoverWeightedReturn - a.turnoverWeightedReturn);

    const sectorsByReturn = [...sectors].sort((a, b) => b.turnoverWeightedReturn - a.turnoverWeightedReturn);

    const topItem = namedSectorsByReturn[0] || sectorsByReturn[0];
    const topSector = topItem?.sector || 'N/A';
    const topSectorReturn = topItem?.turnoverWeightedReturn || 0;

    const laggardItem = namedSectorsByReturn[namedSectorsByReturn.length - 1] || sectorsByReturn[sectorsByReturn.length - 1];
    const laggardSector = laggardItem?.sector || 'N/A';
    const laggardSectorReturn = laggardItem?.turnoverWeightedReturn || 0;

    const payload = {
      timeframe: {
        startDate,
        endDate,
        tradingDaysCount: rawRows.length,
      },
      marketSummary: {
        totalTurnover: totalMarketTurnover,
        marketWeightedReturn,
        marketEqualReturn,
        totalStocks: stockItems.length,
        totalGainers: totalMarketGainers,
        totalLosers: totalMarketLosers,
        topSector,
        topSectorReturn,
        laggardSector,
        laggardSectorReturn,
      },
      sectors,
      granularity,
    };

    memPerformanceCache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error computing sector performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleSignalsGet() {
  try {
    const now = Date.now();
    if (memSignalsCache && now - memSignalsCache.timestamp < SIGNALS_CACHE_TTL) {
      return NextResponse.json(memSignalsCache.data);
    }

    if (inFlightSignalsPromise) {
      const data = await inFlightSignalsPromise;
      return NextResponse.json(data);
    }

    inFlightSignalsPromise = (async () => {
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
          WHERE rn <= 300
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
      let totalRecentExits = 0;
      let totalScanned = 0;

      for (const [symbol, bars] of barsByTicker.entries()) {
        if (bars.length < 220) continue;

        const meta = tickerMap.get(symbol);
        const isIndexOrMacro = meta?.sector === 'Indices' || meta?.sector === 'Macro' || ['EGX30', 'EGX70', 'EGX100', 'USDEGP'].includes(symbol);
        const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol) || meta?.sector === 'Funds';
        if (isIndexOrMacro || isFund) continue;

        const sectorName = meta?.sector || 'Other';
        if (!sectorSummary[sectorName]) {
          sectorSummary[sectorName] = { freshBuysCount: 0, activeLongsCount: 0, recentExitsCount: 0, totalStocks: 0 };
        }
        sectorSummary[sectorName].totalStocks++;
        totalScanned++;

        const strategyResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate: bars[0].date }));
        const signals = strategyResult.signals;
        const lastBar = bars[bars.length - 1];
        const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;

        let status = 'FLAT';
        let tradeReturnPct = 0;
        let entryPrice = 0;

        if (lastSignal) {
          const isRecent = (new Date(lastBar.date).getTime() - new Date(lastSignal.date).getTime()) <= (5 * 24 * 3600 * 1000);

          if (lastSignal.signal === 'BUY') {
            entryPrice = lastSignal.price;
            tradeReturnPct = lastSignal.price > 0 ? ((lastBar.close - lastSignal.price) / lastSignal.price) * 100 : 0;
            
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
        };
      }

      const payload = {
        summary: {
          totalFreshBuys,
          totalActiveLongs,
          totalRecentExits,
          totalScanned,
          lastScanTime: new Date().toISOString(),
        },
        signalsByTicker,
        sectorSummary,
      };

      memSignalsCache = { data: payload, timestamp: Date.now() };
      return payload;
    })();

    const result = await inFlightSignalsPromise;
    inFlightSignalsPromise = null;
    return NextResponse.json(result);
  } catch (error) {
    inFlightSignalsPromise = null;
    console.error('Error computing sector strategy signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
