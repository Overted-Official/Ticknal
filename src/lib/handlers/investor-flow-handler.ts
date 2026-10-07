import { NextResponse } from 'next/server';
import { db } from '@/db';
import { egxInvestorFlows, dailyPrices } from '@/db/schema';
import { desc, asc, gte, notInArray } from 'drizzle-orm';
import { syncDailyInvestorFlows } from '@/lib/investor-flows/sync-investor-flows';

export interface InvestorFlowDailyItem {
  date: string;
  egyptianBuy: number;
  egyptianSell: number;
  egyptianNet: number;
  arabBuy: number;
  arabSell: number;
  arabNet: number;
  foreignBuy: number;
  foreignSell: number;
  foreignNet: number;
  totalTurnover: number;
  egyptianSharePct: number;
  arabSharePct: number;
  foreignSharePct: number;
  cumulativeForeignNet: number;
}

export interface InvestorFlowsResponse {
  summary: {
    latestDate: string;
    foreignNetToday: number;
    egyptianNetToday: number;
    arabNetToday: number;
    foreignShareToday: number;
    egyptianShareToday: number;
    arabShareToday: number;
    totalTurnoverToday: number;
    cumulativeForeignNet: number;
    foreignTrend: 'BUYING' | 'SELLING' | 'NEUTRAL';
  };
  history: InvestorFlowDailyItem[];
}

export async function handleInvestorFlowsGet(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const horizon = searchParams.get('horizon') || '1M'; // 1M, 3M, 6M, YTD, 1Y, ALL

    let limit = 22;
    if (horizon === '3M') limit = 66;
    else if (horizon === '6M') limit = 132;
    else if (horizon === 'YTD') limit = 190;
    else if (horizon === '1Y') limit = 250;
    else if (horizon === 'ALL') limit = 1000;

    let rows = await db
      .select()
      .from(egxInvestorFlows)
      .orderBy(desc(egxInvestorFlows.date))
      .limit(limit);

    // Self-healing: Check if daily_prices has a newer trading session than egxInvestorFlows
    try {
      const latestDailyPrice = await db
        .select({ date: dailyPrices.date })
        .from(dailyPrices)
        .where(notInArray(dailyPrices.tickerSymbol, ['EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SILVER']))
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
          foreignNetToday: 0,
          egyptianNetToday: 0,
          arabNetToday: 0,
          foreignShareToday: 0,
          egyptianShareToday: 0,
          arabShareToday: 0,
          totalTurnoverToday: 0,
          cumulativeForeignNet: 0,
          foreignTrend: 'NEUTRAL',
        },
        history: [],
      });
    }

    // Sort ascending for time series progression
    rows.sort((a, b) => (a.date < b.date ? -1 : 1));

    let runningForeignNet = 0;
    const history: InvestorFlowDailyItem[] = [];

    for (const r of rows) {
      const eBuy = Number(r.egyptianBuy);
      const eSell = Number(r.egyptianSell);
      const eNet = Number(r.egyptianNet);

      const aBuy = Number(r.arabBuy);
      const aSell = Number(r.arabSell);
      const aNet = Number(r.arabNet);

      const fBuy = Number(r.foreignBuy);
      const fSell = Number(r.foreignSell);
      const fNet = Number(r.foreignNet);

      const turnover = Number(r.totalTurnover || (eBuy + aBuy + fBuy));
      runningForeignNet += fNet;

      // 100% Volume shares (Buy + Sell volume for each group divided by 2 * Turnover)
      const eTotal = eBuy + eSell;
      const aTotal = aBuy + aSell;
      const fTotal = fBuy + fSell;
      const grandTotal = eTotal + aTotal + fTotal || 1;

      const eShare = Math.round((eTotal / grandTotal) * 1000) / 10;
      const aShare = Math.round((aTotal / grandTotal) * 1000) / 10;
      const fShare = Math.max(0, Math.round((100 - eShare - aShare) * 10) / 10);

      const dateStr = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0];

      history.push({
        date: dateStr,
        egyptianBuy: eBuy,
        egyptianSell: eSell,
        egyptianNet: eNet,
        arabBuy: aBuy,
        arabSell: aSell,
        arabNet: aNet,
        foreignBuy: fBuy,
        foreignSell: fSell,
        foreignNet: fNet,
        totalTurnover: turnover,
        egyptianSharePct: eShare,
        arabSharePct: aShare,
        foreignSharePct: fShare,
        cumulativeForeignNet: runningForeignNet,
      });
    }

    const latest = history[history.length - 1];
    const recentForeignSum = history.slice(-5).reduce((acc, h) => acc + h.foreignNet, 0);

    const payload: InvestorFlowsResponse = {
      summary: {
        latestDate: latest.date,
        foreignNetToday: latest.foreignNet,
        egyptianNetToday: latest.egyptianNet,
        arabNetToday: latest.arabNet,
        foreignShareToday: latest.foreignSharePct,
        egyptianShareToday: latest.egyptianSharePct,
        arabShareToday: latest.arabSharePct,
        totalTurnoverToday: latest.totalTurnover,
        cumulativeForeignNet: runningForeignNet,
        foreignTrend: recentForeignSum > 50_000_000 ? 'BUYING' : recentForeignSum < -50_000_000 ? 'SELLING' : 'NEUTRAL',
      },
      history,
    };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    console.error('Error in handleInvestorFlowsGet:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
