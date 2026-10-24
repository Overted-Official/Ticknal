import { NextResponse } from 'next/server';
import { db } from '@/db';
import { egxInvestorFlows, dailyPrices, tickers } from '@/db/schema';
import { desc, asc, gte, notInArray, sql, and, eq } from 'drizzle-orm';
import { syncDailyInvestorFlows } from '@/lib/investor-flows/sync-investor-flows';

let lastSelfHealAttemptMs = 0;
const SELF_HEAL_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

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
  usdEgpRate?: number;
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

    let limit = 25;
    if (horizon === '1D') limit = 1;
    else if (horizon === '3M') limit = 70;
    else if (horizon === '6M') limit = 135;
    else if (horizon === 'YTD') limit = 250;
    else if (horizon === '1Y') limit = 260;
    else if (horizon === 'ALL') limit = 1000;

    // Anchor calendar horizon cutoffs to the latest trading date in daily_prices (or current UTC date)
    const anchorDateStr = new Date().toISOString().split('T')[0];
    const [ay, am, ad] = anchorDateStr.split('-').map(Number);
    const anchorUtc = new Date(Date.UTC(ay, am - 1, ad));
    let cutoffDateStr = '2024-01-01';
    if (horizon === '1M') {
      const d = new Date(anchorUtc);
      d.setUTCDate(d.getUTCDate() - 32);
      cutoffDateStr = d.toISOString().split('T')[0];
    } else if (horizon === '3M') {
      const d = new Date(anchorUtc);
      d.setUTCDate(d.getUTCDate() - 93);
      cutoffDateStr = d.toISOString().split('T')[0];
    } else if (horizon === '6M') {
      const d = new Date(anchorUtc);
      d.setUTCDate(d.getUTCDate() - 186);
      cutoffDateStr = d.toISOString().split('T')[0];
    } else if (horizon === 'YTD') {
      cutoffDateStr = `${ay}-01-01`;
    } else if (horizon === '1Y') {
      const d = new Date(anchorUtc);
      d.setUTCDate(d.getUTCDate() - 366);
      cutoffDateStr = d.toISOString().split('T')[0];
    }

    const turnoverThreshold = segment === 'BONDS' ? 0 : 10000000;
    const validFlowFilter = and(
      sql`total_turnover::numeric >= ${turnoverThreshold} AND EXTRACT(DOW FROM date::date) NOT IN (5, 6)`,
      eq(egxInvestorFlows.marketSegment, segment),
      segment === 'TOTAL'
        ? sql`EXISTS (SELECT 1 FROM egx_investor_flows s WHERE s.date = ${egxInvestorFlows.date} AND s.market_segment = 'STOCKS')
          AND EXISTS (SELECT 1 FROM egx_investor_flows bl WHERE bl.date = ${egxInvestorFlows.date} AND bl.market_segment = 'BILLS')
          AND EXISTS (SELECT 1 FROM egx_investor_flows bo WHERE bo.date = ${egxInvestorFlows.date} AND bo.market_segment = 'BONDS')`
        : sql`1=1`,
      horizon === '1D' ? sql`1=1` : gte(egxInvestorFlows.date, cutoffDateStr)
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
      const isMissingMultiSegmentBreakdown =
        rows[0] &&
        String(rows[0].date) === latestPriceDate &&
        rows[0].egyptianInstBuy === null;

      if (
        latestPriceDate &&
        Date.now() - lastSelfHealAttemptMs > SELF_HEAL_COOLDOWN_MS &&
        (!latestFlowDate || latestPriceDate > latestFlowDate || isMissingMultiSegmentBreakdown)
      ) {
        lastSelfHealAttemptMs = Date.now();
        // Trigger background sync without blocking the UI response when historical rows are present
        if (rows.length > 0) {
          void syncDailyInvestorFlows({ targetDate: latestPriceDate }).catch((err) =>
            console.warn('Background investor flows self-healing sync warning:', err)
          );
        } else {
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

    // Fetch historical USDEGP exchange rates so each day can be converted at that day's exact rate
    const minRowDate = String(rows[0].date);
    const fxBufferDate = new Date(`${minRowDate}T00:00:00Z`);
    fxBufferDate.setUTCDate(fxBufferDate.getUTCDate() - 14);
    const fxBufferDateStr = fxBufferDate.toISOString().split('T')[0];

    const fxRows = await db
      .select({ date: dailyPrices.date, close: dailyPrices.close })
      .from(dailyPrices)
      .where(and(eq(dailyPrices.tickerSymbol, 'USDEGP'), gte(dailyPrices.date, fxBufferDateStr)))
      .orderBy(asc(dailyPrices.date));

    const fxExactMap = new Map<string, number>();
    const fxSorted: { date: string; rate: number }[] = [];
    for (const f of fxRows) {
      const dStr = typeof f.date === 'string' ? f.date : new Date(f.date).toISOString().split('T')[0];
      const rate = Number(f.close || 0);
      if (rate > 0) {
        fxExactMap.set(dStr, rate);
        fxSorted.push({ date: dStr, rate });
      }
    }

    const getUsdEgpForDate = (dateStr: string): number => {
      const exact = fxExactMap.get(dateStr);
      if (exact) return exact;
      for (let i = fxSorted.length - 1; i >= 0; i--) {
        if (fxSorted[i].date <= dateStr) return fxSorted[i].rate;
      }
      return fxSorted[0]?.rate || 55.25;
    };

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
          eBuy = Number(r.egyptianInstBuy ?? Math.max(0, eNet));
          eSell = Number(r.egyptianInstSell ?? Math.max(0, -eNet));
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
          eBuy = Number(r.egyptianRetailBuy ?? Math.max(0, eNet));
          eSell = Number(r.egyptianRetailSell ?? Math.max(0, -eNet));
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
        usdEgpRate: getUsdEgpForDate(dateStr),
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

    // Aggregate net flows, turnover, and volume shares across the selected horizon
    let periodForeignNet = 0;
    let periodEgyptianNet = 0;
    let periodArabNet = 0;
    let periodHotMoneyNet = 0;
    let periodTotalTurnover = 0;
    let periodSafeE = 0;
    let periodSafeA = 0;
    let periodSafeF = 0;

    for (const h of history) {
      periodForeignNet += h.foreignNet;
      periodEgyptianNet += h.egyptianNet;
      periodArabNet += h.arabNet;
      periodHotMoneyNet += h.hotMoneyNet;
      periodTotalTurnover += h.totalTurnover;
      periodSafeE += Math.max(0, h.egyptianBuy) + Math.max(0, h.egyptianSell);
      periodSafeA += Math.max(0, h.arabBuy) + Math.max(0, h.arabSell);
      periodSafeF += Math.max(0, h.foreignBuy) + Math.max(0, h.foreignSell);
    }

    const periodGrandVol = periodSafeE + periodSafeA + periodSafeF || 1;
    const periodEShare = Math.min(100, Math.max(0, Math.round((periodSafeE / periodGrandVol) * 1000) / 10));
    const periodAShare = Math.min(100 - periodEShare, Math.max(0, Math.round((periodSafeA / periodGrandVol) * 1000) / 10));
    const periodFShare = Math.min(100, Math.max(0, Math.round((100 - periodEShare - periodAShare) * 10) / 10));
    const periodHMShare = Math.min(100, Math.max(0, Math.round((periodFShare + periodAShare) * 10) / 10));

    const payload: InvestorFlowsResponse = {
      summary: {
        latestDate: latest.date,
        marketSegment: segment,
        activeCategory: category,
        foreignNetToday: periodForeignNet,
        egyptianNetToday: periodEgyptianNet,
        arabNetToday: periodArabNet,
        hotMoneyNetToday: periodHotMoneyNet,
        foreignShareToday: periodFShare,
        egyptianShareToday: periodEShare,
        arabShareToday: periodAShare,
        hotMoneyShareToday: periodHMShare,
        totalTurnoverToday: periodTotalTurnover,
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
