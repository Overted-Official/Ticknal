import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getCachedTickers } from '@/lib/data-cache';
import { resolvePsiParamsWithSource } from '@/strategies/PSI/psiParameterStore';
import { runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';

export const dynamic = 'force-dynamic';

// In-memory cache to guarantee zero Supabase egress on repeated requests
const memCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface StockPerformanceItem {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl: string | null;
  startPrice: number;
  endPrice: number;
  returnPct: number;
  volume: number;
  turnover: number;
  turnoverShare: number; // Share within sector
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
  turnoverShare: number; // Share of entire EGX market
  turnoverWeightedReturn: number;
  equalWeightedReturn: number;
  gainersCount: number;
  losersCount: number;
  unchangedCount: number;
  breadthRatio: number; // Gainers / Total (%)
  relativeStrengthVsBenchmark: number; // Sector return - Market Benchmark return
  rotationRegime: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
  topDriver: {
    symbol: string;
    companyName: string;
    returnPct: number;
    contributionPct: number; // % of sector's total gain/loss created by this stock
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
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];
    const strategy = searchParams.get('strategy') || 'psi';
    const strategyModel = searchParams.get('model') || 'psi8';

    const cacheKey = `${startDate}_${endDate}_${strategy}_${strategyModel}`;
    const cached = memCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // 1. Fetch all tickers from in-memory cache (0 DB egress)
    const allTickers = await getCachedTickers();
    const tickerMap = new Map<string, any>();
    for (const t of allTickers) {
      tickerMap.set(t.symbol, t);
    }

    // 2. High-Performance SQL Aggregation: Returns ONLY 1 aggregated summary row per ticker
    // Payload transfer from database is ~15KB total for all 250 tickers!
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

    // 3. Process Stock Metrics & Group by Sector
    const stockItems: StockPerformanceItem[] = [];
    let totalMarketTurnover = 0;
    let totalMarketGainers = 0;
    let totalMarketLosers = 0;

    for (const row of rawRows) {
      const sym = row.ticker_symbol as string;
      const meta = tickerMap.get(sym);
      const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(sym.toUpperCase());

      let sector = meta?.sector || 'Unclassified';
      if (isFund || sector.toLowerCase().includes('fund')) {
        sector = 'Funds';
      }

      const startPrice = Number(row.start_price);
      const endPrice = Number(row.end_price);
      const volume = Number(row.total_volume || 0);
      const turnover = Number(row.total_turnover || (endPrice * volume));
      const returnPct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
      const isAdvancing = returnPct > 0;

      totalMarketTurnover += turnover;
      if (returnPct > 0) totalMarketGainers++;
      else if (returnPct < 0) totalMarketLosers++;

      stockItems.push({
        symbol: sym,
        companyName: meta?.companyName || sym,
        sector,
        logoUrl: meta?.logoUrl || null,
        startPrice,
        endPrice,
        returnPct,
        volume,
        turnover,
        turnoverShare: 0, // Computed per sector
        isAdvancing,
      });
    }

    // 4. Sector Level Aggregations
    const sectorGroups = new Map<string, StockPerformanceItem[]>();
    for (const stock of stockItems) {
      const list = sectorGroups.get(stock.sector) || [];
      list.push(stock);
      sectorGroups.set(stock.sector, list);
    }

    // Compute Market-Wide Weighted Return Benchmark
    const marketWeightedReturn = totalMarketTurnover > 0
      ? stockItems.reduce((sum, s) => sum + s.returnPct * (s.turnover / totalMarketTurnover), 0)
      : 0;

    const marketEqualReturn = stockItems.length > 0
      ? stockItems.reduce((sum, s) => sum + s.returnPct, 0) / stockItems.length
      : 0;

    const sectors: SectorPerformanceItem[] = [];

    for (const [sectorName, stocks] of sectorGroups.entries()) {
      const sectorTurnover = stocks.reduce((sum, s) => sum + s.turnover, 0);
      const gainers = stocks.filter((s) => s.returnPct > 0).length;
      const losers = stocks.filter((s) => s.returnPct < 0).length;
      const unchanged = stocks.length - gainers - losers;

      // Assign turnover share inside sector
      for (const s of stocks) {
        s.turnoverShare = sectorTurnover > 0 ? (s.turnover / sectorTurnover) * 100 : 0;
      }

      // Turnover Weighted Sector Return
      const turnoverWeightedReturn = sectorTurnover > 0
        ? stocks.reduce((sum, s) => sum + s.returnPct * (s.turnover / sectorTurnover), 0)
        : 0;

      const equalWeightedReturn = stocks.reduce((sum, s) => sum + s.returnPct, 0) / stocks.length;
      const relativeStrengthVsBenchmark = turnoverWeightedReturn - marketWeightedReturn;

      // Identify Top Driver (Stock contributing most positively to sector points)
      let topDriver: SectorPerformanceItem['topDriver'] = null;
      let topDrag: SectorPerformanceItem['topDrag'] = null;

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

      // Determine Sector Rotation Regime (RRG)
      // Momentum is estimated by outperformance vs equal weighted base
      const momentumSpread = turnoverWeightedReturn - equalWeightedReturn;
      let rotationRegime: SectorPerformanceItem['rotationRegime'] = 'Lagging';

      if (turnoverWeightedReturn >= marketWeightedReturn) {
        rotationRegime = momentumSpread >= 0 ? 'Leading' : 'Weakening';
      } else {
        rotationRegime = momentumSpread >= 0 ? 'Improving' : 'Lagging';
      }

      // Sort constituent stocks descending by turnover
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

    // Sort sectors by turnover descending
    sectors.sort((a, b) => b.totalTurnover - a.totalTurnover);

    // Identify top and laggard sectors by return
    const sectorsByReturn = [...sectors].sort((a, b) => b.turnoverWeightedReturn - a.turnoverWeightedReturn);
    const topSector = sectorsByReturn[0]?.sector || 'N/A';
    const topSectorReturn = sectorsByReturn[0]?.turnoverWeightedReturn || 0;
    const laggardSector = sectorsByReturn[sectorsByReturn.length - 1]?.sector || 'N/A';
    const laggardSectorReturn = sectorsByReturn[sectorsByReturn.length - 1]?.turnoverWeightedReturn || 0;

    const payload: SectorsPerformanceResponse = {
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
    };

    // Store in in-memory cache
    memCache.set(cacheKey, { data: payload, timestamp: Date.now() });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error computing sector performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
