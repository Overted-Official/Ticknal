import { NextResponse } from 'next/server';
import { db } from '@/db';
import { egxInvestorFlows, dailyPrices, tickers } from '@/db/schema';
import { desc, asc, gte, notInArray, sql, and, eq } from 'drizzle-orm';
import { syncDailyInvestorFlows } from '@/lib/investor-flows/sync-investor-flows';

export interface InvestorFlowDailyItem {
  date: string;
  marketSegment: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
  retailSharePct: number | null;
  instSharePct: number | null;
  egyptianBuy: number;
  egyptianSell: number;
  egyptianNet: number;
  arabBuy: number;
  arabSell: number;
  arabNet: number;
  foreignBuy: number;
  foreignSell: number;
  foreignNet: number;
  hotMoneyNet: number;
  hotMoneyBuy: number;
  hotMoneySell: number;
  hotMoneySharePct: number;
  totalTurnover: number;
  egyptianSharePct: number;
  arabSharePct: number;
  foreignSharePct: number;
  cumulativeForeignNet: number;
  cumulativeHotMoneyNet: number;
  retailLegs?: {
    egyptianNet: number | null;
    arabNet: number | null;
    foreignNet: number | null;
  };
  instLegs?: {
    egyptianNet: number | null;
    arabNet: number | null;
    foreignNet: number | null;
  };
}

export interface InvestorFlowsResponse {
  summary: {
    latestDate: string;
    marketSegment: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
    activeCategory: 'TOTAL' | 'INSTITUTIONS' | 'RETAIL';
    foreignNetToday: number;
    egyptianNetToday: number;
    arabNetToday: number;
    hotMoneyNetToday: number;
    foreignShareToday: number;
    egyptianShareToday: number;
    arabShareToday: number;
    hotMoneyShareToday: number;
    totalTurnoverToday: number;
    retailShareToday: number | null;
    instShareToday: number | null;
    cumulativeForeignNet: number;
    cumulativeHotMoneyNet: number;
    foreignTrend: 'BUYING' | 'SELLING' | 'NEUTRAL';
  };
  history: InvestorFlowDailyItem[];
}

export async function handleInvestorFlowsGet(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const horizon = searchParams.get('horizon') || '1M'; // 1M, 3M, 6M, YTD, 1Y, ALL
    const rawSegment = (searchParams.get('segment') || 'TOTAL').toUpperCase();
    const segment = (['TOTAL', 'STOCKS', 'BONDS', 'BILLS'].includes(rawSegment) ? rawSegment : 'TOTAL') as
      | 'TOTAL'
      | 'STOCKS'
      | 'BONDS'
      | 'BILLS';
    const rawCategory = (searchParams.get('category') || 'TOTAL').toUpperCase();
    const category = (['TOTAL', 'INSTITUTIONS', 'RETAIL'].includes(rawCategory) ? rawCategory : 'TOTAL') as
      | 'TOTAL'
      | 'INSTITUTIONS'
      | 'RETAIL';

    let limit = 22;
    if (horizon === '3M') limit = 66;
    else if (horizon === '6M') limit = 132;
    else if (horizon === 'YTD') limit = 190;
    else if (horizon === '1Y') limit = 250;
    else if (horizon === 'ALL') limit = 1000;

    const turnoverThreshold = segment === 'BONDS' ? 0 : 10000000;
    const validFlowFilter = and(
      sql`total_turnover::numeric >= ${turnoverThreshold} AND EXTRACT(DOW FROM date::date) NOT IN (5, 6)`,
      eq(egxInvestorFlows.marketSegment, segment)
    );

    let rows = await db
      .select()
      .from(egxInvestorFlows)
      .where(validFlowFilter)
      .orderBy(desc(egxInvestorFlows.date))
      .limit(limit);

    // Self-healing: Check if daily_prices has a newer trading session than egxInvestorFlows
    try {
      const latestDailyPrice = await db
        .select({ date: dailyPrices.date })
        .from(dailyPrices)
        .innerJoin(tickers, eq(dailyPrices.tickerSymbol, tickers.symbol))
        .where(
          and(
            notInArray(tickers.sector, ['Funds', 'Macro', 'Indices']),
            sql`${dailyPrices.volume}::numeric > 0`
          )
        )
        .orderBy(desc(dailyPrices.date))
        .limit(1);

      const latestPriceDate = latestDailyPrice[0]?.date ? String(latestDailyPrice[0].date) : null;
      const latestFlowDate = rows[0]?.date ? String(rows[0].date) : null;

      if (latestPriceDate && (!latestFlowDate || latestPriceDate > latestFlowDate)) {
        const syncRes = await syncDailyInvestorFlows({ targetDate: latestPriceDate });
        if (syncRes.success) {
          rows = await db
            .select()
            .from(egxInvestorFlows)
            .where(validFlowFilter)
            .orderBy(desc(egxInvestorFlows.date))
            .limit(limit);
        }
      }
    } catch (selfHealErr) {
      console.warn('On-demand investor flows self-healing sync warning:', selfHealErr);
    }

    if (rows.length === 0) {
      return NextResponse.json({
        summary: {
          latestDate: new Date().toISOString().split('T')[0],
          marketSegment: segment,
          activeCategory: category,
          foreignNetToday: 0,
          egyptianNetToday: 0,
          arabNetToday: 0,
          hotMoneyNetToday: 0,
          foreignShareToday: 0,
          egyptianShareToday: 0,
          arabShareToday: 0,
          hotMoneyShareToday: 0,
          totalTurnoverToday: 0,
          retailShareToday: null,
          instShareToday: null,
          cumulativeForeignNet: 0,
          cumulativeHotMoneyNet: 0,
          foreignTrend: 'NEUTRAL',
        },
        history: [],
      });
    }

    // Sort ascending for time series progression
    rows.sort((a, b) => (a.date < b.date ? -1 : 1));

    let runningForeignNet = 0;
    let runningHotMoneyNet = 0;
    const history: InvestorFlowDailyItem[] = [];

    for (const r of rows) {
      // Pick values according to requested category (TOTAL, INSTITUTIONS, or RETAIL)
      let eNet = Number(r.egyptianNet);
      let aNet = Number(r.arabNet);
      let fNet = Number(r.foreignNet);

      let eBuy = Number(r.egyptianBuy);
      let eSell = Number(r.egyptianSell);
      let aBuy = Number(r.arabBuy);
      let aSell = Number(r.arabSell);
      let fBuy = Number(r.foreignBuy);
      let fSell = Number(r.foreignSell);

      if (category === 'INSTITUTIONS') {
        if (r.egyptianInstNet !== null && r.egyptianInstNet !== undefined) {
          eNet = Number(r.egyptianInstNet);
          aNet = Number(r.arabInstNet ?? 0);
          fNet = Number(r.foreignInstNet ?? 0);
          eBuy = Number(r.egyptianInstBuy ?? Math.max(0, -eNet));
          eSell = Number(r.egyptianInstSell ?? Math.max(0, eNet));
          aBuy = Number(r.arabInstBuy ?? Math.max(0, aNet));
          aSell = Number(r.arabInstSell ?? Math.max(0, -aNet));
          fBuy = Number(r.foreignInstBuy ?? Math.max(0, fNet));
          fSell = Number(r.foreignInstSell ?? Math.max(0, -fNet));
        }
      } else if (category === 'RETAIL') {
        if (r.egyptianRetailNet !== null && r.egyptianRetailNet !== undefined) {
          eNet = Number(r.egyptianRetailNet);
          aNet = Number(r.arabRetailNet ?? 0);
          fNet = Number(r.foreignRetailNet ?? 0);
          eBuy = Number(r.egyptianRetailBuy ?? Math.max(0, -eNet));
          eSell = Number(r.egyptianRetailSell ?? Math.max(0, eNet));
          aBuy = Number(r.arabRetailBuy ?? Math.max(0, aNet));
          aSell = Number(r.arabRetailSell ?? Math.max(0, -aNet));
          fBuy = Number(r.foreignRetailBuy ?? Math.max(0, fNet));
          fSell = Number(r.foreignRetailSell ?? Math.max(0, -fNet));
        }
      }

      const hmNet = fNet + aNet;
      const hmBuy = fBuy + aBuy;
      const hmSell = fSell + aSell;

      const turnover = Number(r.totalTurnover || (eBuy + aBuy + fBuy));
      runningForeignNet += fNet;
      runningHotMoneyNet += hmNet;

      // Participation volume shares (strictly non-negative and normalized to 100%)
      const safeE = Math.max(0, eBuy) + Math.max(0, eSell);
      const safeA = Math.max(0, aBuy) + Math.max(0, aSell);
      const safeF = Math.max(0, fBuy) + Math.max(0, fSell);
      const grandTotal = safeE + safeA + safeF || 1;

      const eShare = Math.min(100, Math.max(0, Math.round((safeE / grandTotal) * 1000) / 10));
      const aShare = Math.min(100 - eShare, Math.max(0, Math.round((safeA / grandTotal) * 1000) / 10));
      const fShare = Math.min(100, Math.max(0, Math.round((100 - eShare - aShare) * 10) / 10));
      const hmShare = Math.min(100, Math.max(0, Math.round((fShare + aShare) * 10) / 10));

      const dateStr = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0];

      history.push({
        date: dateStr,
        marketSegment: r.marketSegment as any,
        retailSharePct: r.retailSharePct ? Number(r.retailSharePct) : null,
        instSharePct: r.instSharePct ? Number(r.instSharePct) : null,
        egyptianBuy: eBuy,
        egyptianSell: eSell,
        egyptianNet: eNet,
        arabBuy: aBuy,
        arabSell: aSell,
        arabNet: aNet,
        foreignBuy: fBuy,
        foreignSell: fSell,
        foreignNet: fNet,
        hotMoneyNet: hmNet,
        hotMoneyBuy: hmBuy,
        hotMoneySell: hmSell,
        hotMoneySharePct: hmShare,
        totalTurnover: turnover,
        egyptianSharePct: eShare,
        arabSharePct: aShare,
        foreignSharePct: fShare,
        cumulativeForeignNet: runningForeignNet,
        cumulativeHotMoneyNet: runningHotMoneyNet,
        retailLegs: {
          egyptianNet: r.egyptianRetailNet ? Number(r.egyptianRetailNet) : null,
          arabNet: r.arabRetailNet ? Number(r.arabRetailNet) : null,
          foreignNet: r.foreignRetailNet ? Number(r.foreignRetailNet) : null,
        },
        instLegs: {
          egyptianNet: r.egyptianInstNet ? Number(r.egyptianInstNet) : null,
          arabNet: r.arabInstNet ? Number(r.arabInstNet) : null,
          foreignNet: r.foreignInstNet ? Number(r.foreignInstNet) : null,
        },
      });
    }

    const latest = history[history.length - 1];
    const recentForeignSum = history.slice(-5).reduce((acc, h) => acc + h.foreignNet, 0);

    const payload: InvestorFlowsResponse = {
      summary: {
        latestDate: latest.date,
        marketSegment: segment,
        activeCategory: category,
        foreignNetToday: latest.foreignNet,
        egyptianNetToday: latest.egyptianNet,
        arabNetToday: latest.arabNet,
        hotMoneyNetToday: latest.hotMoneyNet,
        foreignShareToday: latest.foreignSharePct,
        egyptianShareToday: latest.egyptianSharePct,
        arabShareToday: latest.arabSharePct,
        hotMoneyShareToday: latest.hotMoneySharePct,
        totalTurnoverToday: latest.totalTurnover,
        retailShareToday: latest.retailSharePct,
        instShareToday: latest.instSharePct,
        cumulativeForeignNet: runningForeignNet,
        cumulativeHotMoneyNet: runningHotMoneyNet,
        foreignTrend: recentForeignSum > 50_000_000 ? 'BUYING' : recentForeignSum < -50_000_000 ? 'SELLING' : 'NEUTRAL',
      },
      history,
    };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error: any) {
    console.error('Error in handleInvestorFlowsGet:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
