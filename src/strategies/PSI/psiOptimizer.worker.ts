import { computePsiSeries, type PriceBar, type PsiStrategyParams } from "./psiStrategy";

export type WalkForwardOptimizationConfig = {
  bars: PriceBar[];
  model?: "psi8" | "psi40";
  trainStartDate?: string;
  trainEndDate: string; // Cutoff, e.g. "2024-12-31" or "2020-12-31"
  testStartDate: string;  // e.g. "2025-01-01" or "2021-01-01"
  testEndDate?: string;
  topK?: number; // default 10
  initialCapital?: number;
};

export type CandidateOptimizationResult = {
  id: number;
  label: string;
  params: PsiStrategyParams;
  model: "psi8" | "psi40";
  trainMetrics: {
    sysRoi: number;
    buyHoldRoi: number;
    roiMargin: number;
    winRate: number;
    trades: number;
    maxDrawdown: number;
    avgBarsPerTrade: number;
  };
  testMetrics: {
    sysRoi: number;
    buyHoldRoi: number;
    roiMargin: number;
    winRate: number;
    trades: number;
    maxDrawdown: number;
    avgBarsPerTrade: number;
  };
  selectionTier: string;
};

const PSI_LEVELS = [14.6, 23.6, 38.2, 50.0, 61.8];
const ENTRY_PRIORITY = [23.6, 14.6, 38.2, 50.0, 61.8];

// Generate 31 entry level subsets (2^5 - 1)
const ENTRY_LEVEL_COMBOS: number[][] = [];
for (let mask = 1; mask < 32; mask++) {
  const subset: number[] = [];
  for (let bit = 0; bit < 5; bit++) {
    if ((mask & (1 << bit)) !== 0) {
      subset.push(PSI_LEVELS[bit]);
    }
  }
  ENTRY_LEVEL_COMBOS.push(subset);
}

const AYM_MULTIPLIERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const AYM_LIMITS = [50.0, 61.8, 78.6, 88.6];
const AYM_PAIRS: Array<{ aymMultiplier: number | null; aymLimit: number | null }> = [];
for (const mult of AYM_MULTIPLIERS) {
  for (const lim of AYM_LIMITS) {
    AYM_PAIRS.push({ aymMultiplier: mult, aymLimit: lim });
  }
}
AYM_PAIRS.push({ aymMultiplier: null, aymLimit: null }); // disabled

const ATR_DISTANCES: Array<number | null> = [2, 3, 4, 5, 6, null];
const STOPLOSS_LEVELS: Array<number | null> = [4, 5, 6, 8, 10, null];

type SimSlice = {
  close: Float64Array;
  high: Float64Array;
  low: Float64Array;
  masterIndex: Float64Array;
  masterIndexAdjusted: Float64Array;
  atr14: Float64Array;
  medianDailyMove: Float64Array;
  years: number;
  length: number;
};

function buildSimSlice(
  computed: ReturnType<typeof computePsiSeries>,
  model: "psi8" | "psi40",
  startDateStr?: string,
  endDateStr?: string,
): SimSlice | null {
  const startTime = startDateStr ? Date.parse(startDateStr) : 0;
  const endTime = endDateStr ? Date.parse(endDateStr) : Number.POSITIVE_INFINITY;

  const filtered = computed.filter((b) => {
    const t = Date.parse(b.date);
    return t >= startTime && t <= endTime;
  });

  const n = filtered.length;
  if (n < 2) return null;

  const close = new Float64Array(n);
  const high = new Float64Array(n);
  const low = new Float64Array(n);
  const masterIndex = new Float64Array(n);
  const masterIndexAdjusted = new Float64Array(n);
  const atr14 = new Float64Array(n);
  const medianDailyMove = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const b = filtered[i];
    close[i] = b.close;
    high[i] = b.high;
    low[i] = b.low;
    masterIndex[i] = (model === "psi40" ? b.masterIndex40 : b.masterIndex) ?? 50;
    masterIndexAdjusted[i] = (model === "psi40" ? b.masterIndexAdjusted40 : b.masterIndexAdjusted) ?? 50;
    atr14[i] = b.atr14 ?? (b.high - b.low);
    medianDailyMove[i] = b.medianDailyMove ?? 2.0;
  }

  const startMs = Date.parse(filtered[0].date);
  const endMs = Date.parse(filtered[n - 1].date);
  const years = Math.max((endMs - startMs) / (1000 * 60 * 60 * 24 * 365.25), 0.1);

  return {
    close,
    high,
    low,
    masterIndex,
    masterIndexAdjusted,
    atr14,
    medianDailyMove,
    years,
    length: n,
  };
}

type FastBacktestMetrics = {
  sysRoi: number;
  buyHoldRoi: number;
  roiMargin: number;
  winRate: number;
  trades: number;
  maxDrawdown: number;
  avgBarsPerTrade: number;
  compositeScore: number;
};

function fastSimulate(
  slice: SimSlice,
  entryLevels: number[],
  aymMultiplier: number | null,
  aymLimit: number | null,
  atrDistance: number | null,
  stoplossLevel: number | null,
  initialCapital: number,
): FastBacktestMetrics {
  const { close, high, low, masterIndex, masterIndexAdjusted, atr14, medianDailyMove, years, length: n } = slice;

  let balance = initialCapital;
  let active = false;
  let entryPrice = 0;
  let targetPrice = Number.NaN;
  let highestPrice = 0;

  let tradeCount = 0;
  let closedTrades = 0;
  let winCount = 0;
  let activeBars = 0;

  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let finalEquity = initialCapital;

  const useAym = aymMultiplier !== null && aymLimit !== null;
  const useAtr = atrDistance !== null;
  const useStoploss = stoplossLevel !== null;

  for (let i = 0; i < n; i++) {
    const c = close[i];
    const h = high[i];
    const l = low[i];
    const currMaster = masterIndex[i];
    const currMasterAdjusted = masterIndexAdjusted[i];
    const prevMaster = i > 0 ? masterIndex[i - 1] : null;

    if (!active) {
      if (prevMaster !== null) {
        let crossedLevel: number | null = null;
        for (const level of ENTRY_PRIORITY) {
          if (entryLevels.includes(level) && currMaster > level && prevMaster <= level) {
            crossedLevel = level;
            break;
          }
        }

        if (crossedLevel !== null) {
          active = true;
          entryPrice = c;
          highestPrice = h;
          tradeCount += 1;

          if (useAym) {
            const range = (currMasterAdjusted / 100) * c;
            targetPrice = c + range * (aymMultiplier ?? 1);
          } else {
            targetPrice = Number.NaN;
          }
        }
      }
    }

    if (active) {
      activeBars += 1;
      if (h > highestPrice) highestPrice = h;

      const mdm = medianDailyMove[i];
      const atr = atr14[i];

      const hitTakeProfit =
        useAym &&
        !Number.isNaN(targetPrice) &&
        c >= targetPrice &&
        currMasterAdjusted < (aymLimit ?? 100);

      const hitStop =
        useStoploss &&
        c <= entryPrice * (1 - (mdm * (stoplossLevel ?? 0)) / 100);

      const hitTrail =
        useAtr &&
        c <= highestPrice - atr * (atrDistance ?? 0) &&
        c > entryPrice;

      if (hitStop || hitTrail || hitTakeProfit) {
        const shares = Math.floor(balance / entryPrice);
        const pnl = shares * (c - entryPrice);
        balance += pnl;
        closedTrades += 1;
        if (c > entryPrice) winCount += 1;

        active = false;
        entryPrice = 0;
        highestPrice = 0;
        targetPrice = Number.NaN;
      }
    }

    if (active) {
      const shares = Math.floor(balance / entryPrice);
      finalEquity = balance + shares * (c - entryPrice);
    } else {
      finalEquity = balance;
    }

    if (finalEquity > peakEquity) peakEquity = finalEquity;
    if (peakEquity > 0) {
      const dd = ((peakEquity - finalEquity) / peakEquity) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  const firstClose = close[0];
  const lastClose = close[n - 1];
  const buyHoldRoi = firstClose > 0 ? ((lastClose / firstClose) - 1) * 100 : 0;
  const sysRoi = ((finalEquity - initialCapital) / initialCapital) * 100;
  const roiMargin = sysRoi - buyHoldRoi;
  const winRate = closedTrades > 0 ? (winCount / closedTrades) * 100 : 0;
  const avgBars = tradeCount > 0 ? activeBars / tradeCount : 0;

  // Composite Multi-Objective Scoring
  const annualCagr = finalEquity > 0 ? ((finalEquity / initialCapital) ** (1 / years) - 1) * 100 : 0;
  const winRateFactor = winRate >= 80 ? winRate * 1.5 : winRate;
  const ddPenalty = maxDrawdown > 30 ? (maxDrawdown - 30) * 2 : 0;
  const tradeBonus = Math.min(tradeCount, 30) * 2;
  const compositeScore = roiMargin * 1.0 + winRateFactor * 2.0 + annualCagr * 1.0 + tradeBonus - ddPenalty;

  return {
    sysRoi,
    buyHoldRoi,
    roiMargin,
    winRate,
    trades: tradeCount,
    maxDrawdown,
    avgBarsPerTrade: avgBars,
    compositeScore,
  };
}

export function runWalkForwardOptimization(config: WalkForwardOptimizationConfig): {
  model: "psi8" | "psi40";
  candidates: CandidateOptimizationResult[];
  trainPeriod: string;
  testPeriod: string;
  totalEvaluated: number;
} {
  const {
    bars,
    model = "psi8",
    trainStartDate,
    trainEndDate,
    testStartDate,
    testEndDate,
    topK = 10,
    initialCapital = 3000,
  } = config;

  // 1. Compute Indicators
  const computed = computePsiSeries(bars);

  // 2. Build Slices
  const trainSlice = buildSimSlice(computed, model, trainStartDate, trainEndDate);
  const testSlice = buildSimSlice(computed, model, testStartDate, testEndDate);

  if (!trainSlice || trainSlice.length < 20) {
    throw new Error("Insufficient historical data in training window.");
  }

  const totalCombinations = ENTRY_LEVEL_COMBOS.length * AYM_PAIRS.length * ATR_DISTANCES.length * STOPLOSS_LEVELS.length; // 50,220

  type ComboEval = {
    entryLevels: number[];
    aymMultiplier: number | null;
    aymLimit: number | null;
    atrDistance: number | null;
    stoplossLevel: number | null;
    trainMetrics: FastBacktestMetrics;
  };

  const trainCandidates: ComboEval[] = [];

  for (const entryLevels of ENTRY_LEVEL_COMBOS) {
    for (const aym of AYM_PAIRS) {
      for (const atr of ATR_DISTANCES) {
        for (const sl of STOPLOSS_LEVELS) {
          const metrics = fastSimulate(
            trainSlice,
            entryLevels,
            aym.aymMultiplier,
            aym.aymLimit,
            atr,
            sl,
            initialCapital,
          );

          if (metrics.trades >= 3) {
            trainCandidates.push({
              entryLevels,
              aymMultiplier: aym.aymMultiplier,
              aymLimit: aym.aymLimit,
              atrDistance: atr,
              stoplossLevel: sl,
              trainMetrics: metrics,
            });
          }
        }
      }
    }
  }

  // 3. Rank Top Candidates by In-Sample Multi-Objective Score
  trainCandidates.sort((a, b) => b.trainMetrics.compositeScore - a.trainMetrics.compositeScore);
  const topCandidates = trainCandidates.slice(0, Math.max(topK, 25));

  // 4. Evaluate Top Candidates on Out-of-Sample Test Slice
  const evaluatedResults: Array<{
    combo: ComboEval;
    testMetrics: FastBacktestMetrics;
  }> = [];

  for (const cand of topCandidates) {
    const testMetrics = testSlice
      ? fastSimulate(
          testSlice,
          cand.entryLevels,
          cand.aymMultiplier,
          cand.aymLimit,
          cand.atrDistance,
          cand.stoplossLevel,
          initialCapital,
        )
      : { ...cand.trainMetrics };

    evaluatedResults.push({
      combo: cand,
      testMetrics,
    });
  }

  // 5. Tiered Ranking for OOS Winner & Display Order
  evaluatedResults.sort((a, b) => {
    const aWR = a.testMetrics.winRate;
    const bWR = b.testMetrics.winRate;
    const aMargin = a.testMetrics.roiMargin;
    const bMargin = b.testMetrics.roiMargin;

    // Tier 1: Win Rate >= 90%
    const aIsTier1 = a.testMetrics.trades > 0 && aWR >= 90.0;
    const bIsTier1 = b.testMetrics.trades > 0 && bWR >= 90.0;

    if (aIsTier1 && !bIsTier1) return -1;
    if (!aIsTier1 && bIsTier1) return 1;

    if (aIsTier1 && bIsTier1) {
      return bMargin - aMargin; // Highest Margin among Tier 1
    }

    // Tier 2: Highest Win Rate, then Highest Margin
    if (bWR !== aWR) return bWR - aWR;
    return bMargin - aMargin;
  });

  const finalCandidates: CandidateOptimizationResult[] = evaluatedResults.slice(0, topK).map((item, idx) => {
    const c = item.combo;
    const isTier1 = item.testMetrics.trades > 0 && item.testMetrics.winRate >= 90.0;
    const tierLabel = isTier1
      ? "Tier 1 (WR ≥ 90%)"
      : item.testMetrics.trades > 0
      ? `Tier 2 (WR ${item.testMetrics.winRate.toFixed(1)}%)`
      : "Tier 3 (Zero OOS Trades)";

    const params: PsiStrategyParams = {
      model,
      entryLevels: c.entryLevels,
      useAym: c.aymMultiplier !== null,
      aymMultiplier: c.aymMultiplier,
      aymLimit: c.aymLimit,
      useAtr: c.atrDistance !== null,
      atrDistance: c.atrDistance,
      useStoploss: c.stoplossLevel !== null,
      stoplossLevel: c.stoplossLevel,
      useStructStop: false,
      structLookback: 20,
      initialCapital,
      startDate: testStartDate,
      endDate: testEndDate,
    };

    return {
      id: idx + 1,
      label: idx === 0 ? "Combination #1 (Recommended)" : `Combination #${idx + 1}`,
      params,
      model,
      trainMetrics: {
        sysRoi: c.trainMetrics.sysRoi,
        buyHoldRoi: c.trainMetrics.buyHoldRoi,
        roiMargin: c.trainMetrics.roiMargin,
        winRate: c.trainMetrics.winRate,
        trades: c.trainMetrics.trades,
        maxDrawdown: c.trainMetrics.maxDrawdown,
        avgBarsPerTrade: c.trainMetrics.avgBarsPerTrade,
      },
      testMetrics: {
        sysRoi: item.testMetrics.sysRoi,
        buyHoldRoi: item.testMetrics.buyHoldRoi,
        roiMargin: item.testMetrics.roiMargin,
        winRate: item.testMetrics.winRate,
        trades: item.testMetrics.trades,
        maxDrawdown: item.testMetrics.maxDrawdown,
        avgBarsPerTrade: item.testMetrics.avgBarsPerTrade,
      },
      selectionTier: tierLabel,
    };
  });

  return {
    model,
    candidates: finalCandidates,
    trainPeriod: `${trainStartDate ?? "Inception"} to ${trainEndDate}`,
    testPeriod: `${testStartDate} to ${testEndDate ?? "Present"}`,
    totalEvaluated: totalCombinations,
  };
}

// Browser Web Worker Listener
if (typeof self !== "undefined" && typeof (self as any).postMessage === "function") {
  (self as any).onmessage = (e: MessageEvent<WalkForwardOptimizationConfig>) => {
    try {
      const result = runWalkForwardOptimization(e.data);
      (self as any).postMessage({
        type: "done",
        ...result,
      });
    } catch (err: any) {
      (self as any).postMessage({ type: "error", message: err.message });
    }
  };
}
