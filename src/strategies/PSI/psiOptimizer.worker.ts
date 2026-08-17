import { computePsiSeries, type PriceBar, type PsiStrategyParams, type PsiSignalType } from "./psiStrategy";

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

  const is40 = model === "psi40";

  for (let i = 0; i < n; i++) {
    const b = filtered[i];
    close[i] = b.close;
    high[i] = b.high;
    low[i] = b.low;
    masterIndex[i] = (is40 ? b.masterIndex40 : b.masterIndex) ?? Number.NaN;
    masterIndexAdjusted[i] = (is40 ? b.masterIndexAdjusted40 : b.masterIndexAdjusted) ?? Number.NaN;
    atr14[i] = b.atr14 ?? Number.NaN;
    medianDailyMove[i] = b.medianDailyMove ?? Number.NaN;
  }

  const dStart = Date.parse(filtered[0].date);
  const dEnd = Date.parse(filtered[n - 1].date);
  const years = Math.max((dEnd - dStart) / (1000 * 60 * 60 * 24 * 365.25), 0.001);

  return { close, high, low, masterIndex, masterIndexAdjusted, atr14, medianDailyMove, years, length: n };
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
  initialCapital: number = 3000,
): FastBacktestMetrics {
  const n = slice.length;
  const close = slice.close;
  const high = slice.high;
  const low = slice.low;
  const master = slice.masterIndex;
  const masterAdj = slice.masterIndexAdjusted;
  const atr = slice.atr14;
  const mdm = slice.medianDailyMove;

  const useAym = aymMultiplier !== null && aymLimit !== null;
  const useAtr = atrDistance !== null;
  const useStop = stoplossLevel !== null;

  let balance = initialCapital;
  let active = false;
  let entryPrice = 0;
  let targetPrice = Number.NaN;
  let highestPrice = 0;
  let lowestPrice = 0;
  let tradeCount = 0;
  let winCount = 0;
  let closedTrades = 0;
  let activeBars = 0;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let finalEquity = initialCapital;

  for (let i = 1; i < n; i++) {
    const curMaster = master[i];
    const prevMaster = master[i - 1];

    if (!active && !Number.isNaN(curMaster) && !Number.isNaN(prevMaster)) {
      let crossed = false;
      for (let p = 0; p < ENTRY_PRIORITY.length; p++) {
        const lvl = ENTRY_PRIORITY[p];
        if (entryLevels.includes(lvl) && curMaster > lvl && prevMaster <= lvl) {
          crossed = true;
          break;
        }
      }

      if (crossed) {
        const shares = Math.floor(balance / close[i]);
        if (shares > 0) {
          active = true;
          entryPrice = close[i];
          highestPrice = high[i];
          lowestPrice = low[i];
          tradeCount++;
          targetPrice = Number.NaN;
          if (useAym && !Number.isNaN(mdm[i])) {
            targetPrice = close[i] * (1.0 + (mdm[i] * aymMultiplier) / 100.0);
          }
        }
      }
    }

    if (active) {
      activeBars++;
      if (high[i] > highestPrice) highestPrice = high[i];
      if (low[i] < lowestPrice) lowestPrice = low[i];

      let exit = false;
      // 1. Stoploss
      if (useStop && !Number.isNaN(mdm[i])) {
        const slPrice = entryPrice * (1.0 - (mdm[i] * stoplossLevel) / 100.0);
        if (close[i] <= slPrice) exit = true;
      }
      // 2. Trailing ATR Stop
      if (!exit && useAtr && !Number.isNaN(atr[i])) {
        const trailPrice = highestPrice - atr[i] * atrDistance;
        if (close[i] <= trailPrice && close[i] > entryPrice) exit = true;
      }
      // 3. AYM Take Profit
      if (!exit && useAym && !Number.isNaN(targetPrice) && !Number.isNaN(masterAdj[i])) {
        if (close[i] >= targetPrice && masterAdj[i] < aymLimit) exit = true;
      }

      if (exit) {
        const shares = Math.floor(balance / entryPrice);
        const diff = close[i] - entryPrice;
        balance += shares * diff;
        closedTrades++;
        if (diff > 0) winCount++;

        active = false;
        entryPrice = 0;
        highestPrice = 0;
        lowestPrice = 0;
        targetPrice = Number.NaN;
      }
    }

    finalEquity = active ? balance + Math.floor(balance / entryPrice) * (close[i] - entryPrice) : balance;
    if (finalEquity > peakEquity) peakEquity = finalEquity;
    if (peakEquity > 0) {
      const dd = ((peakEquity - finalEquity) / peakEquity) * 100.0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  const buyHoldRoi = close[0] > 0 ? ((close[n - 1] / close[0]) - 1.0) * 100.0 : 0;
  const sysRoi = ((finalEquity - initialCapital) / initialCapital) * 100.0;
  const roiMargin = sysRoi - buyHoldRoi;
  const winRate = closedTrades > 0 ? (winCount / closedTrades) * 100.0 : 0;
  const avgBars = tradeCount > 0 ? activeBars / tradeCount : 0;

  // Multi-objective composite score
  const compositeScore = (roiMargin * 0.50) + (winRate * 0.30) - (avgBars * 0.15) - (maxDrawdown * 0.05);

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

self.onmessage = (e: MessageEvent<WalkForwardOptimizationConfig>) => {
  const config = e.data;
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
    self.postMessage({ type: "error", message: "Insufficient historical data in training window." });
    return;
  }

  const totalCombinations = ENTRY_LEVEL_COMBOS.length * AYM_PAIRS.length * ATR_DISTANCES.length * STOPLOSS_LEVELS.length; // 50,220
  let completed = 0;

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

          completed++;
          if (completed % 2500 === 0) {
            self.postMessage({ type: "progress", progress: (completed / totalCombinations) * 90 });
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

  self.postMessage({
    type: "done",
    model,
    candidates: finalCandidates,
    trainPeriod: `${trainStartDate ?? "Inception"} to ${trainEndDate}`,
    testPeriod: `${testStartDate} to ${testEndDate ?? "Present"}`,
    totalEvaluated: totalCombinations,
  });
};
