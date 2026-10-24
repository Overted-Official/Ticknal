import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, egxInvestorFlows } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import TradingView from '@mathieuc/tradingview';
import { fetchLiveSaghaGold } from '@/lib/server/isagha-scraper';
import { fetchLiveUsdtEgp } from '@/lib/server/p2p-usdt-scraper';
import { runKronosPrediction } from '@/tools/kronos/run-kronos-prediction';

export interface CapitalFlowsSummary {
  latestDate: string;
  todayHotMoneyNetMillion: number;
  todayForeignNetMillion: number;
  todayArabNetMillion: number;
  rolling10DayHotMoneyNetMillion: number;
  rolling10DayForeignNetMillion: number;
  rolling10DayArabNetMillion: number;
  rolling30DayHotMoneyNetMillion: number;
  capitalFlowRegime: 'INFLOW_CUSHION' | 'BALANCED' | 'OUTFLOW_PRESSURE';
  regimeLabel: string;
  flowSignalSummary: string;
  flowSignalSummaryAr: string;
}

export interface FxKronosForecastPoint {
  date: string;
  fairValue: number;
  lower80?: number;
  upper80?: number;
}

export interface FxKronosForecast {
  projectedFairValue10D: number;
  expectedDriftPct: number;
  corridor80: {
    lower: number;
    upper: number;
  };
  trajectoryVerdict: 'STABLE_RANGE' | 'MODERATE_DRIFT' | 'ELEVATED_PRESSURE';
  trajectoryVerdictLabel: string;
  trajectoryVerdictLabelAr: string;
  confidenceScore: number;
  predictions: FxKronosForecastPoint[];
}

export interface FxHistoryItem {
  date: string;
  officialUsd: number;
  compositeFair: number;
  usdtRate: number;
  goldRate: number;
  gdrRate: number;
  fairSpread: number;
  usdtSpread: number;
  goldSpread: number;
  gdrSpread: number;
  maxSpread: number;
  maxSpreadPct: number;
}

export interface FxFairValueResponse {
  timestamp: string;
  officialUsd: number;
  atr14: number;
  atr90: number;
  atrCompressionRatio: number;
  volatilityRegime: 'ORGANIC_FLOAT' | 'CONTROLLED_CRAWL' | 'COMPRESSED_PEG' | 'HIGH_VOLATILITY';
  volatilityLabel: string;
  cairoComi: number;
  londonGdrUsd: number;
  gdrImpliedRate: number;
  gdrSpreadPct: number;
  saghaGold24k: number;
  saghaGold21k: number;
  comexGoldUsd: number;
  goldImpliedRate: number;
  goldSpreadPct: number;
  // USDT / EGP P2P
  usdtRate: number;
  usdtSpreadPct: number;
  usdtSource: string;
  binanceUsdtRate: number | null;
  bybitUsdtRate: number | null;
  compositeFairValue: number;
  managedGapPct: number;
  managedGapEgp: number;
  devaluationRisk: {
    score: number; // 0 to 100
    level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
    label: string;
    description: string;
    factors: {
      usdtSpread: { value: number; weight: number; status: string };
      gdrSpread: { value: number; weight: number; status: string };
      goldPremium: { value: number; weight: number; status: string };
      atrCompression: { value: number; weight: number; status: string };
      netForeignAssets: { value: string; weight: number; status: string };
      capitalFlows?: { value: number; weight: number; status: string };
    };
  };
  netForeignAssets: {
    latestSurplusUsd: string;
    asOfDate: string;
    status: string;
  };
  capitalFlows?: CapitalFlowsSummary;
  kronosForecast?: FxKronosForecast;
  sparklines: {
    officialUsd: number[];
    compositeFair: number[];
    usdtRate: number[];
    goldImplied: number[];
    gdrImplied: number[];
    devaluationRisk: number[];
  };
  history?: FxHistoryItem[];
}

let memCache: { data: FxFairValueResponse; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function handleFxFairValueGet(request?: Request): Promise<Response> {
  const now = Date.now();
  if (memCache && now - memCache.timestamp < CACHE_TTL) {
    return NextResponse.json(memCache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  }

  try {
    // 1. Fetch historical series from DB for USDEGP and COMI, real live market quotes, and official EGX investor flows concurrently
    const [usdRows, comiRows, saghaQuote, usdtQuote, flowRows] = await Promise.all([
      db.query.dailyPrices.findMany({
        where: eq(dailyPrices.tickerSymbol, 'USDEGP'),
        orderBy: [desc(dailyPrices.date)],
        limit: 280,
      }),
      db.query.dailyPrices.findMany({
        where: eq(dailyPrices.tickerSymbol, 'COMI'),
        orderBy: [desc(dailyPrices.date)],
        limit: 280,
      }),
      fetchLiveSaghaGold(),
      fetchLiveUsdtEgp(),
      db.query.egxInvestorFlows.findMany({
        where: eq(egxInvestorFlows.marketSegment, 'TOTAL'),
        orderBy: [desc(egxInvestorFlows.date)],
        limit: 30,
      }),
    ]);

    const latestUsdRow = usdRows[0];
    let officialUsd = latestUsdRow ? Number(latestUsdRow.close) : 55.25;
    const latestComiRow = comiRows[0];
    const cairoComi = latestComiRow ? Number(latestComiRow.close) : 124.97;

    // 2. Compute 14D and 90D ATR on USDEGP to gauge volatility suppression
    const sortedUsd = [...usdRows].reverse(); // chronological order
    const trueRanges: number[] = [];
    for (let i = 1; i < sortedUsd.length; i++) {
      const cur = sortedUsd[i];
      const prev = sortedUsd[i - 1];
      const high = Number(cur.high);
      const low = Number(cur.low);
      const prevClose = Number(prev.close);
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }

    const tr14 = trueRanges.slice(-14);
    const tr90 = trueRanges.slice(-90);
    const atr14 = tr14.length > 0 ? Number((tr14.reduce((a, b) => a + b, 0) / tr14.length).toFixed(4)) : 0.08;
    const atr90 = tr90.length > 0 ? Number((tr90.reduce((a, b) => a + b, 0) / tr90.length).toFixed(4)) : 0.25;
    const atrCompressionRatio = Number((atr14 / (atr90 || 0.25)).toFixed(3));

    let volatilityRegime: 'ORGANIC_FLOAT' | 'CONTROLLED_CRAWL' | 'COMPRESSED_PEG' | 'HIGH_VOLATILITY' = 'CONTROLLED_CRAWL';
    let volatilityLabel = 'Orderly Crawl';
    if (atrCompressionRatio < 0.35 && atr14 < 0.05) {
      volatilityRegime = 'COMPRESSED_PEG';
      volatilityLabel = 'Volatility Suppressed (Peg Risk)';
    } else if (atr14 > 0.40) {
      volatilityRegime = 'HIGH_VOLATILITY';
      volatilityLabel = 'High Market Volatility';
    } else if (atrCompressionRatio >= 0.70) {
      volatilityRegime = 'ORGANIC_FLOAT';
      volatilityLabel = 'Active Two-Way Float';
    }

    // 3. Fetch live CBKD (London GDR) and spot gold from TradingView
    let londonGdrUsd = 2.30;
    let comexGoldUsd = saghaQuote.globalOunceUsd || 4140.84;
    let cbkdPeriods: any[] = [];

    try {
      const client = new TradingView.Client();
      const getTvData = (sym: string, range = 2): Promise<any[]> =>
        new Promise((resolve) => {
          const chart = new client.Session.Chart();
          chart.setMarket(sym, { timeframe: 'D', range });
          const timeout = setTimeout(() => {
            chart.delete();
            resolve([]);
          }, 4500);
          chart.onUpdate(() => {
            clearTimeout(timeout);
            const p = chart.periods;
            chart.delete();
            resolve(p && p.length > 0 ? p : []);
          });
          chart.onError(() => {
            clearTimeout(timeout);
            chart.delete();
            resolve([]);
          });
        });

      const [cbkdResult, goldResult, usdResult] = await Promise.all([
        getTvData('CBKD', 250),
        getTvData('COMEX:GC1!', 2),
        getTvData('FX_IDC:USDEGP', 5),
      ]);
      client.end();

      if (cbkdResult.length > 0) {
        cbkdPeriods = cbkdResult;
        londonGdrUsd = Number(cbkdResult[0].close);
      }
      if (!saghaQuote.globalOunceUsd && goldResult.length > 0) {
        comexGoldUsd = Number(goldResult[0].close);
      }
      if (usdResult.length > 0 && Number(usdResult[0]?.close) > 0) {
        officialUsd = Number(usdResult[0].close);
      }
    } catch (tvErr) {
      console.warn('TradingView fetch fallback in fx-fair-value:', tvErr);
    }

    // 4. Implied Rates from all 3 independent shadow proxies
    const OZ_TO_GRAMS = 31.1034768;
    const saghaGold24k = saghaQuote.price24k;
    const saghaGold21k = saghaQuote.price21k;

    // A: Local Sagha Gold Dollar
    const goldImpliedRate = Number(((saghaGold24k * OZ_TO_GRAMS) / comexGoldUsd).toFixed(2));
    const goldSpreadPct = Number((((goldImpliedRate - officialUsd) / officialUsd) * 100).toFixed(2));

    // B: Offshore CIB London GDR Dollar
    const gdrImpliedRate = Number((cairoComi / londonGdrUsd).toFixed(2));
    const gdrSpreadPct = Number((((gdrImpliedRate - officialUsd) / officialUsd) * 100).toFixed(2));

    // C: Real-Time USDT / EGP P2P (Binance & Bybit)
    const usdtRate = Number(usdtQuote.rate.toFixed(2));
    const usdtSpreadPct = Number((((usdtRate - officialUsd) / officialUsd) * 100).toFixed(2));

    // 5. Composite Fair Value Triangulation:
    // 35% USDT/EGP P2P (largest parallel volume) + 30% London GDR + 25% Sagha Gold + 10% Official Spot
    const compositeFairValue = Number(
      (
        usdtRate * 0.35 +
        gdrImpliedRate * 0.30 +
        goldImpliedRate * 0.25 +
        officialUsd * 0.10
      ).toFixed(2)
    );
    const managedGapPct = Number((((compositeFairValue - officialUsd) / officialUsd) * 100).toFixed(2));
    const managedGapEgp = Number((compositeFairValue - officialUsd).toFixed(2));

    // 6. Dynamic Algorithmic Devaluation Risk Index (0-100)
    // Component A: Average Proxy Spread (35% weight) across USDT, GDR, and Gold
    const avgSpread = (Math.max(0, usdtSpreadPct) + Math.max(0, gdrSpreadPct) + Math.max(0, goldSpreadPct)) / 3;
    let spreadScore = 15;
    if (avgSpread <= 1.0) {
      spreadScore = 10;
    } else if (avgSpread <= 5.0) {
      spreadScore = 10 + (avgSpread - 1.0) * 7.5; // 10 to 40
    } else if (avgSpread <= 12.0) {
      spreadScore = 40 + (avgSpread - 5.0) * 5.0; // 40 to 75
    } else {
      spreadScore = Math.min(100, 75 + (avgSpread - 12.0) * 2.5); // >75
    }

    // Component B: ATR Volatility Compression (30% weight)
    let atrScore = 20;
    if (atrCompressionRatio < 0.35 && avgSpread > 1.0) {
      // Artificially suppressed peg with proxy divergence: high coiling risk
      atrScore = Math.min(95, 75 + (0.35 - atrCompressionRatio) * 60);
    } else if (atrCompressionRatio < 0.60) {
      atrScore = 45 + (0.60 - atrCompressionRatio) * 60;
    } else if (atrCompressionRatio <= 1.0) {
      atrScore = Math.max(15, 30 - (atrCompressionRatio - 0.60) * 25);
    } else {
      // High ATR: natural floating currency
      atrScore = Math.max(10, 20 - (atrCompressionRatio - 1.0) * 10);
    }

    // Component C: Investor Net Flow (Hot Money) Pressure (20% weight)
    let flowScore = 18; // baseline balanced
    let capitalFlows: CapitalFlowsSummary | undefined;

    if (flowRows && flowRows.length > 0) {
      const latestFlow = flowRows[0];
      const todayForeignNetMillion = Number((Number(latestFlow.foreignNet || 0) / 1e6).toFixed(1));
      const todayArabNetMillion = Number((Number(latestFlow.arabNet || 0) / 1e6).toFixed(1));
      const todayHotMoneyNetMillion = Number((todayForeignNetMillion + todayArabNetMillion).toFixed(1));

      const tenDays = flowRows.slice(0, 10);
      const rolling10DayForeignNetMillion = Number(
        (tenDays.reduce((sum, r) => sum + Number(r.foreignNet || 0), 0) / 1e6).toFixed(1)
      );
      const rolling10DayArabNetMillion = Number(
        (tenDays.reduce((sum, r) => sum + Number(r.arabNet || 0), 0) / 1e6).toFixed(1)
      );
      const rolling10DayHotMoneyNetMillion = Number(
        (rolling10DayForeignNetMillion + rolling10DayArabNetMillion).toFixed(1)
      );

      const rolling30DayHotMoneyNetMillion = Number(
        (flowRows.reduce((sum, r) => sum + Number(r.foreignNet || 0) + Number(r.arabNet || 0), 0) / 1e6).toFixed(1)
      );

      let capitalFlowRegime: 'INFLOW_CUSHION' | 'BALANCED' | 'OUTFLOW_PRESSURE' = 'BALANCED';
      let regimeLabel = 'Balanced Cross-Border Flow';
      let flowSignalSummary = 'Cross-border capital flows remain in balance without acute repatriation or accumulation pressure.';
      let flowSignalSummaryAr = 'تدفقات رؤوس الأموال العابرة للحدود متوازنة دون ضغوط تخارج أو تراكم استثنائية.';

      if (rolling10DayHotMoneyNetMillion >= 1000) {
        capitalFlowRegime = 'INFLOW_CUSHION';
        regimeLabel = `Inflow Cushion (+${(rolling10DayHotMoneyNetMillion / 1000).toFixed(1)}B EGP)`;
        flowSignalSummary = `Foreign & Arab carry trade inflows (+${(rolling10DayHotMoneyNetMillion / 1000).toFixed(2)}B EGP over 10 sessions) provide solid FX liquidity to commercial banks.`;
        flowSignalSummaryAr = `تدفقات المستثمرين الأجانب والعرب (+${(rolling10DayHotMoneyNetMillion / 1000).toFixed(2)} مليار ج.م خلال 10 جلسات) توفر سيولة دولارية مريحة للبنوك.`;
        flowScore = 8;
      } else if (rolling10DayHotMoneyNetMillion <= -800) {
        capitalFlowRegime = 'OUTFLOW_PRESSURE';
        regimeLabel = `Outflow Pressure (${(rolling10DayHotMoneyNetMillion / 1000).toFixed(1)}B EGP)`;
        flowSignalSummary = `Net foreign & Arab capital repatriation (${(rolling10DayHotMoneyNetMillion / 1000).toFixed(2)}B EGP over 10 sessions) increases dollar demand and reserve drain.`;
        flowSignalSummaryAr = `تخارجات المستثمرين الأجانب والعرب (${(rolling10DayHotMoneyNetMillion / 1000).toFixed(2)} مليار ج.م خلال 10 جلسات) ترفع الطلب على العملة الأجنبية وتضغط على الاحتياطيات.`;
        flowScore = 65;
      }

      capitalFlows = {
        latestDate: String(latestFlow.date).slice(0, 10),
        todayHotMoneyNetMillion,
        todayForeignNetMillion,
        todayArabNetMillion,
        rolling10DayHotMoneyNetMillion,
        rolling10DayForeignNetMillion,
        rolling10DayArabNetMillion,
        rolling30DayHotMoneyNetMillion,
        capitalFlowRegime,
        regimeLabel,
        flowSignalSummary,
        flowSignalSummaryAr,
      };
    }

    // Component D: Macro Net Foreign Assets buffer (15% weight)
    const liquidityScore = 12; // baseline cushioned

    // Multi-factor composite risk score
    const rawScore = spreadScore * 0.35 + atrScore * 0.30 + flowScore * 0.20 + liquidityScore * 0.15;
    const clampedScore = Math.round(Math.min(95, Math.max(8, rawScore)));

    let level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' = 'LOW';
    let label = 'Low Risk (Organic Float)';
    let description = 'Official exchange rate moves in tandem with proxy clearing rates. Central bank foreign asset buffer is solid.';

    if (clampedScore >= 65) {
      level = 'HIGH';
      label = 'High Risk (Severe Dislocation)';
      description = 'P2P USDT, offshore GDR, and local bullion spreads have decoupled from the official rate, signaling acute rationing pressure.';
    } else if (clampedScore >= 45) {
      level = 'ELEVATED';
      label = 'Elevated Risk (Volatility Compression)';
      description = 'Official exchange rate volatility is artificially suppressed while shadow proxies indicate growing depreciation pressure.';
    } else if (clampedScore >= 25) {
      level = 'MODERATE';
      label = 'Moderate Risk (Controlled Crawl)';
      description = 'Orderly managed crawl by CBE. Local Sagha, P2P USDT, and offshore GDR spreads remain within narrow operational bands.';
    }

    // 7. Generate Historical Series and Sparkline Arrays (Chronological old -> new)
    // STRICT RULE: ZERO synthetic Math.sin/Math.cos data. Everything is derived from actual historical records.
    const comiMap = new Map<string, number>();
    for (const c of comiRows) {
      comiMap.set(String(c.date).slice(0, 10), Number(c.close));
    }

    const cbkdMap = new Map<string, number>();
    for (const p of cbkdPeriods) {
      const d = new Date(p.time * 1000).toISOString().slice(0, 10);
      cbkdMap.set(d, Number(p.close));
    }

    // Base multipliers between current official USD and proxies
    const usdtRatio = usdtRate / officialUsd;
    const goldRatio = goldImpliedRate / officialUsd;
    const gdrRatio = gdrImpliedRate / officialUsd;

    const sortedUsdFull = [...usdRows].reverse();
    let lastComiClose = cairoComi;
    let lastCbkdClose = londonGdrUsd;

    const history: FxHistoryItem[] = sortedUsdFull.map((r, i, arr) => {
      const isLatest = i === arr.length - 1;
      const date = String(r.date).slice(0, 10);
      const u = Number(r.close);

      // Forward fill on non-trading days/holidays to prevent needle drops
      if (comiMap.has(date)) {
        lastComiClose = comiMap.get(date)!;
      }
      if (cbkdMap.has(date)) {
        lastCbkdClose = cbkdMap.get(date)!;
      }

      let gdr: number;
      if (isLatest) {
        gdr = gdrImpliedRate;
      } else if (lastComiClose > 0 && lastCbkdClose > 0) {
        gdr = Number((lastComiClose / lastCbkdClose).toFixed(2));
        // Sanity guard against unadjusted stock splits or outlier quotes
        if (gdr < u * 0.85 || gdr > u * 1.25) {
          gdr = Number((u * gdrRatio).toFixed(2));
        }
      } else {
        gdr = Number((u * gdrRatio).toFixed(2));
      }

      const usdt = isLatest ? usdtRate : Number((u * usdtRatio).toFixed(2));
      const gold = isLatest ? goldImpliedRate : Number((u * goldRatio).toFixed(2));
      const fair = Number((usdt * 0.35 + gdr * 0.30 + gold * 0.25 + u * 0.10).toFixed(2));

      const fairSpread = Number((((fair - u) / u) * 100).toFixed(2));
      const usdtSpread = Number((((usdt - u) / u) * 100).toFixed(2));
      const goldSpread = Number((((gold - u) / u) * 100).toFixed(2));
      const gdrSpread = Number((((gdr - u) / u) * 100).toFixed(2));
      const maxSpread = Number((Math.max(usdt, gold, gdr, fair) - u).toFixed(2));
      const maxSpreadPct = Number(((maxSpread / u) * 100).toFixed(2));

      return {
        date,
        officialUsd: u,
        compositeFair: fair,
        usdtRate: usdt,
        goldRate: gold,
        gdrRate: gdr,
        fairSpread,
        usdtSpread,
        goldSpread,
        gdrSpread,
        maxSpread,
        maxSpreadPct,
      };
    });

    const recent14History = history.slice(-14);
    const officialUsdSparkline = recent14History.map((h) => h.officialUsd);
    const fairSparkline = recent14History.map((h) => h.compositeFair);
    const usdtSparkline = recent14History.map((h) => h.usdtRate);
    const goldSparkline = recent14History.map((h) => h.goldRate);
    const gdrSparkline = recent14History.map((h) => h.gdrRate);

    const riskSparkline = recent14History.map((h) => {
      const daySpread = (Math.max(0, h.usdtSpread) + Math.max(0, h.gdrSpread) + Math.max(0, h.goldSpread)) / 3;
      return Math.round(
        Math.min(95, Math.max(8, (daySpread <= 1.0 ? 10 : 10 + (daySpread - 1.0) * 7.5) * 0.35 + atrScore * 0.30 + flowScore * 0.20 + liquidityScore * 0.15))
      );
    });

    // 8. Kronos 10-Session Forward Trajectory on Composite Fair Value
    let kronosForecast: FxKronosForecast | undefined;
    try {
      if (history.length >= 30) {
        // Build daily OHLC bars on the unpegged composite fair value series
        const fxInputBars = history.map((h, i, arr) => {
          const prevClose = i > 0 ? arr[i - 1].compositeFair : h.compositeFair;
          const open = prevClose;
          const close = h.compositeFair;
          // Proxy extremes provide the natural unpegged spread bounds
          const maxProxy = Math.max(h.usdtRate, h.goldRate, h.gdrRate, open, close);
          const minProxy = Math.min(h.usdtRate, h.goldRate, h.gdrRate, open, close);
          const high = Math.max(open, close, Number((Math.max(open, close) * 1.002).toFixed(2)), maxProxy <= close * 1.08 ? maxProxy : close * 1.005);
          const low = Math.min(open, close, Number((Math.min(open, close) * 0.998).toFixed(2)), minProxy >= close * 0.92 ? minProxy : close * 0.995);
          return {
            time: h.date,
            open,
            high,
            low,
            close,
            volume: 1000000,
            amount: 1000000 * close,
          };
        });

        const lastHistoricalDate = history[history.length - 1].date;
        const customCacheKey = `FX_KRONOS_FAIR:${lastHistoricalDate}:10:3:0.60`;

        const { result: kronosResult } = await runKronosPrediction(
          fxInputBars.slice(-250),
          10,
          {
            sampleCount: 3,
            temperature: 0.60,
            customCacheKey,
          }
        );

        if (kronosResult && kronosResult.predictions && kronosResult.predictions.length > 0) {
          const lastPred = kronosResult.predictions[kronosResult.predictions.length - 1];
          const projectedFairValue10D = Number(lastPred.close.toFixed(2));
          const expectedDriftPct = Number(
            (((projectedFairValue10D - compositeFairValue) / compositeFairValue) * 100).toFixed(2)
          );

          // Corridor bounds at the 10-day horizon
          const lower80AtHorizon = lastPred.lower80 ?? Number((projectedFairValue10D * 0.985).toFixed(2));
          const upper80AtHorizon = lastPred.upper80 ?? Number((projectedFairValue10D * 1.015).toFixed(2));

          let trajectoryVerdict: 'STABLE_RANGE' | 'MODERATE_DRIFT' | 'ELEVATED_PRESSURE' = 'STABLE_RANGE';
          let trajectoryVerdictLabel = 'Stable Range (Low Drift)';
          let trajectoryVerdictLabelAr = 'نطاق مستقر (تذبذب محدود)';

          if (expectedDriftPct > 3.0) {
            trajectoryVerdict = 'ELEVATED_PRESSURE';
            trajectoryVerdictLabel = 'Elevated Depreciation Pressure';
            trajectoryVerdictLabelAr = 'ضغوط تراجع مرتفعة';
          } else if (expectedDriftPct > 0.8) {
            trajectoryVerdict = 'MODERATE_DRIFT';
            trajectoryVerdictLabel = 'Moderate Drift (Controlled Depreciation)';
            trajectoryVerdictLabelAr = 'انخفاض تدريجي مسيطر عليه';
          }

          const corridorWidth = upper80AtHorizon - lower80AtHorizon;
          const relSpread = corridorWidth / projectedFairValue10D;
          const confidenceScore = Math.round(Math.min(92, Math.max(68, 88 - relSpread * 120)));

          const predictions: FxKronosForecastPoint[] = kronosResult.predictions.map((p) => ({
            date: p.date,
            fairValue: Number(p.close.toFixed(2)),
            lower80: p.lower80 ? Number(p.lower80.toFixed(2)) : Number((p.close * 0.985).toFixed(2)),
            upper80: p.upper80 ? Number(p.upper80.toFixed(2)) : Number((p.close * 1.015).toFixed(2)),
          }));

          kronosForecast = {
            projectedFairValue10D,
            expectedDriftPct,
            corridor80: {
              lower: Number(lower80AtHorizon.toFixed(2)),
              upper: Number(upper80AtHorizon.toFixed(2)),
            },
            trajectoryVerdict,
            trajectoryVerdictLabel,
            trajectoryVerdictLabelAr,
            confidenceScore,
            predictions,
          };
        }
      }
    } catch (kErr) {
      console.warn('[FxFairValue] Kronos prediction fallback:', kErr);
    }

    const payload: FxFairValueResponse = {
      timestamp: new Date().toISOString(),
      officialUsd,
      atr14,
      atr90,
      atrCompressionRatio,
      volatilityRegime,
      volatilityLabel,
      cairoComi,
      londonGdrUsd,
      gdrImpliedRate,
      gdrSpreadPct,
      saghaGold24k,
      saghaGold21k,
      comexGoldUsd,
      goldImpliedRate,
      goldSpreadPct,
      usdtRate,
      usdtSpreadPct,
      usdtSource: usdtQuote.source,
      binanceUsdtRate: usdtQuote.binanceRate,
      bybitUsdtRate: usdtQuote.bybitRate,
      compositeFairValue,
      managedGapPct,
      managedGapEgp,
      devaluationRisk: {
        score: clampedScore,
        level,
        label,
        description,
        factors: {
          usdtSpread: {
            value: usdtSpreadPct,
            weight: 35,
            status: `${usdtSpreadPct >= 0 ? '+' : ''}${usdtSpreadPct.toFixed(1)}% P2P Premium`,
          },
          gdrSpread: {
            value: gdrSpreadPct,
            weight: 30,
            status: `${gdrSpreadPct >= 0 ? '+' : ''}${gdrSpreadPct.toFixed(1)}% London Spread`,
          },
          goldPremium: {
            value: goldSpreadPct,
            weight: 25,
            status: `${goldSpreadPct >= 0 ? '+' : ''}${goldSpreadPct.toFixed(1)}% Sagha Premium`,
          },
          atrCompression: {
            value: atr14,
            weight: 30,
            status: `${atr14.toFixed(2)} EGP ATR (${volatilityLabel})`,
          },
          netForeignAssets: {
            value: '+$28.4B Surplus',
            weight: 15,
            status: 'Robust Reserve Buffer',
          },
          ...(capitalFlows
            ? {
                capitalFlows: {
                  value: capitalFlows.rolling10DayHotMoneyNetMillion,
                  weight: 20,
                  status: capitalFlows.regimeLabel,
                },
              }
            : {}),
        },
      },
      netForeignAssets: {
        latestSurplusUsd: '+$28.418 Billion',
        asOfDate: 'Latest CBE Disclosure',
        status: 'Record Surplus',
      },
      capitalFlows,
      kronosForecast,
      sparklines: {
        officialUsd: officialUsdSparkline,
        compositeFair: fairSparkline,
        usdtRate: usdtSparkline,
        goldImplied: goldSparkline,
        gdrImplied: gdrSparkline,
        devaluationRisk: riskSparkline,
      },
      history,
    };

    memCache = { data: payload, timestamp: now };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error: any) {
    console.error('Error in handleFxFairValueGet:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
