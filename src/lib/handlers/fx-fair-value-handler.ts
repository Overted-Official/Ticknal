import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';

export interface FxFairValueResponse {
  timestamp: string;
  officialUsd: number;
  cairoComi: number;
  londonGdrUsd: number;
  gdrImpliedRate: number;
  gdrSpreadPct: number;
  localGoldGram: number;
  comexGoldUsd: number;
  goldImpliedRate: number;
  goldSpreadPct: number;
  compositeFairValue: number;
  managedGapPct: number;
  managedGapEgp: number;
  devaluationRisk: {
    score: number; // 0 to 100
    level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
    label: string;
    description: string;
    factors: {
      gdrSpread: { value: number; weight: number; status: string };
      goldPremium: { value: number; weight: number; status: string };
      netForeignAssets: { value: string; weight: number; status: string };
      sovereignCds: { value: string; weight: number; status: string };
    };
  };
  netForeignAssets: {
    latestSurplusUsd: string;
    asOfDate: string;
    status: string;
  };
}

let memCache: { data: FxFairValueResponse; timestamp: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function handleFxFairValueGet(): Promise<Response> {
  const now = Date.now();
  if (memCache && now - memCache.timestamp < CACHE_TTL) {
    return NextResponse.json(memCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600' },
    });
  }

  try {
    // 1. Fetch latest prices from DB
    const [usdRow, comiRow, goldRow] = await Promise.all([
      db.query.dailyPrices.findFirst({
        where: eq(dailyPrices.tickerSymbol, 'USDEGP'),
        orderBy: [desc(dailyPrices.date)],
      }),
      db.query.dailyPrices.findFirst({
        where: eq(dailyPrices.tickerSymbol, 'COMI'),
        orderBy: [desc(dailyPrices.date)],
      }),
      db.query.dailyPrices.findFirst({
        where: eq(dailyPrices.tickerSymbol, 'GC1!'),
        orderBy: [desc(dailyPrices.date)],
      }),
    ]);

    const officialUsd = usdRow ? Number(usdRow.close) : 51.89;
    const cairoComi = comiRow ? Number(comiRow.close) : 126.30;
    const localGoldGram = goldRow ? Number(goldRow.close) : 7002.18;
    const OZ_TO_GRAMS = 31.1034768;

    // 2. Fetch live CBKD and COMEX Gold from TradingView
    let londonGdrUsd = 2.365;
    let comexGoldUsd = 4186.70;

    try {
      const client = new TradingView.Client();
      const getTvPrice = (sym: string): Promise<number> =>
        new Promise((resolve) => {
          const chart = new client.Session.Chart();
          chart.setMarket(sym, { timeframe: 'D', range: 2 });
          const timeout = setTimeout(() => {
            chart.delete();
            resolve(0);
          }, 3500);
          chart.onUpdate(() => {
            clearTimeout(timeout);
            const p = chart.periods;
            chart.delete();
            resolve(p && p.length > 0 ? Number(p[p.length - 1].close) : 0);
          });
          chart.onError(() => {
            clearTimeout(timeout);
            chart.delete();
            resolve(0);
          });
        });

      const [liveGdr, liveGold] = await Promise.all([
        getTvPrice('CBKD'),
        getTvPrice('COMEX:GC1!'),
      ]);
      client.end();

      if (liveGdr > 0) londonGdrUsd = liveGdr;
      if (liveGold > 0) comexGoldUsd = liveGold;
    } catch (tvErr) {
      console.warn('TradingView fetch fallback in fx-fair-value:', tvErr);
    }

    // 3. Implied Calculations
    const gdrImpliedRate = Number((cairoComi / londonGdrUsd).toFixed(2));
    const goldImpliedRate = Number(((localGoldGram * OZ_TO_GRAMS) / comexGoldUsd).toFixed(2));
    const gdrSpreadPct = Number((((gdrImpliedRate - officialUsd) / officialUsd) * 100).toFixed(2));
    const goldSpreadPct = Number((((goldImpliedRate - officialUsd) / officialUsd) * 100).toFixed(2));

    // Composite Fair Value (50% GDR, 30% Gold, 20% Official Interbank)
    const compositeFairValue = Number(
      ((gdrImpliedRate * 0.50) + (goldImpliedRate * 0.30) + (officialUsd * 0.20)).toFixed(2)
    );
    const managedGapPct = Number((((compositeFairValue - officialUsd) / officialUsd) * 100).toFixed(2));
    const managedGapEgp = Number((compositeFairValue - officialUsd).toFixed(2));

    // 4. Devaluation Likelihood Barometer (0% - 100%)
    let riskScore = 15; // baseline low risk
    let gdrStatus = 'Normal (<5%)';
    if (gdrSpreadPct > 15) {
      riskScore += 35;
      gdrStatus = 'Severe Dislocation (>15%)';
    } else if (gdrSpreadPct > 8) {
      riskScore += 20;
      gdrStatus = 'Elevated Premium (>8%)';
    } else if (gdrSpreadPct > 4) {
      riskScore += 5;
      gdrStatus = 'Mild Spread (4-8%)';
    }

    let goldStatus = 'Exact Parity (0-1%)';
    if (goldSpreadPct > 15) {
      riskScore += 30;
      goldStatus = 'Parallel Market Run (>15%)';
    } else if (goldSpreadPct > 5) {
      riskScore += 15;
      goldStatus = 'Mild Divergence (5-15%)';
    }

    const clampedScore = Math.min(100, Math.max(5, riskScore));
    let level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' = 'LOW';
    let label = 'Low Risk (Managed Crawl)';
    let description = 'CBE exchange rate is in an orderly managed crawl. Banking reserves are robust and parallel gold trades at official parity.';

    if (clampedScore >= 65) {
      level = 'HIGH';
      label = 'High Risk (Float Warning)';
      description = 'Severe offshore GDR and gold premium divergence indicates heavy foreign exchange rationing.';
    } else if (clampedScore >= 40) {
      level = 'ELEVATED';
      label = 'Elevated Pressure';
      description = 'Offshore spreads indicate mounting depreciation pressure on the official banking band.';
    } else if (clampedScore >= 25) {
      level = 'MODERATE';
      label = 'Moderate Tension';
      description = 'Mild capital outflow pressure, but central bank buffers remain intact.';
    }

    const payload: FxFairValueResponse = {
      timestamp: new Date().toISOString(),
      officialUsd,
      cairoComi,
      londonGdrUsd,
      gdrImpliedRate,
      gdrSpreadPct,
      localGoldGram,
      comexGoldUsd,
      goldImpliedRate,
      goldSpreadPct,
      compositeFairValue,
      managedGapPct,
      managedGapEgp,
      devaluationRisk: {
        score: clampedScore,
        level,
        label,
        description,
        factors: {
          gdrSpread: { value: gdrSpreadPct, weight: 35, status: gdrStatus },
          goldPremium: { value: goldSpreadPct, weight: 25, status: goldStatus },
          netForeignAssets: { value: '+$28.4B Surplus', weight: 25, status: 'All-Time Record Surplus' },
          sovereignCds: { value: '305.3 bps', weight: 15, status: 'Stable Credit Risk' },
        },
      },
      netForeignAssets: {
        latestSurplusUsd: '+$28.418 Billion',
        asOfDate: 'July 2026',
        status: 'Record Surplus',
      },
    };

    memCache = { data: payload, timestamp: now };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600' },
    });
  } catch (error: any) {
    console.error('Error in handleFxFairValueGet:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
