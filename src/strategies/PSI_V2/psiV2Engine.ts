/**
 * PSI V2 Core Engine — 1-to-1 GPT 3-PSI Mathematical Architecture
 * 
 * Implements:
 * 1. Consolidated PSI_ZONE (Extremum Oscillator with 63-bar causal rolling percentile)
 * 2. Stateful PSI_UP (Bullish Swing Progress Gauge, G_UP = 0.8137152479)
 * 3. Stateful PSI_DOWN (Bearish Swing Progress Gauge, G_DOWN = 0.8363547334)
 */

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PsiV2BarMetrics {
  date: string;
  close: number;
  psiZone: number;
  psiUp: number;
  psiDown: number;
  regimeDirection: 'up' | 'down';
  rawZone: number;
  aym?: number;
  atrPct?: number;
  atrVal?: number;
}

// -----------------------------------------------------------------------------
// Frozen Configuration & Weights (1-to-1 from GPT_PSI_Analysis.md)
// -----------------------------------------------------------------------------

export const PSI_ZONE_CONFIG = {
  causal_percentile_window: 63,
  weights_points: {
    bollinger_14_2: 57,
    normalized_price_14: 33,
    directional_swing_location: 3,
    directional_existing_psi: 2,
    smc_fvg_exhaustion_zone: 2,
    rsi_14: 1,
    adx_dmi_14: 1,
    smc_liquidity_sweep_balance: 1,
  } as Record<string, number>,
};

export const PSI_UP_CONFIG = {
  gain: 0.8137152478654857,
  weights_points: {
    temporal_progress: 43,
    favorable_close_excursion: 12,
    liquidity_sweep_depth: 8,
    slope_14: 7,
    banker_50: 5,
    ma_50_200: 5,
    momentum: 5,
    inverse_bars_since_choch: 4,
    intra_swing_location: 3,
    adx_dmi_14: 2,
    inverse_cumulative_volume_ratio: 2,
    rejection_wick: 2,
    volume_ratio: 1,
    volume_climax: 1,
  } as Record<string, number>,
  component_terminal_scales: {
    banker_50: 0.07396203279495239,
    adx_dmi_14: 0.02089022658765316,
    ma_50_200: 1.000000013351432e-10,
    slope_14: 0.00487322686240077,
    favorable_close_excursion: 0.013090942986309528,
    intra_swing_location: 1.000000013351432e-10,
    temporal_progress: 0.125,
    momentum: 1.000000013351432e-10,
    liquidity_sweep_depth: 1.000000013351432e-10,
    inverse_bars_since_choch: 1.000000013351432e-10,
    volume_ratio: 1.000000013351432e-10,
    inverse_cumulative_volume_ratio: 1.000000013351432e-10,
    rejection_wick: 1.000000013351432e-10,
    volume_climax: 1.000000013351432e-10,
  } as Record<string, number>,
};

export const PSI_DOWN_CONFIG = {
  gain: 0.836354733352116,
  weights_points: {
    temporal_progress: 41,
    favorable_close_excursion: 9,
    cumulative_volume_ratio: 8,
    slope_14: 6,
    rsi_14: 5,
    momentum: 5,
    liquidity_sweep_depth: 5,
    ma_50_200: 4,
    intra_swing_location: 4,
    directional_existing_psi: 4,
    inverse_bars_since_choch: 3,
    banker_50: 2,
    adx_dmi_14: 1,
    delta_velocity: 1,
    rejection_wick: 1,
    volume_climax: 1,
  } as Record<string, number>,
  component_terminal_scales: {
    rsi_14: 0.018843485042452812,
    banker_50: 0.06568728387355804,
    adx_dmi_14: 0.012652217410504818,
    ma_50_200: 1.000000013351432e-10,
    slope_14: 0.003297958057373762,
    favorable_close_excursion: 0.011458257213234901,
    intra_swing_location: 1.000000013351432e-10,
    temporal_progress: 0.125,
    directional_existing_psi: 1.000000013351432e-10,
    momentum: 1.000000013351432e-10,
    delta_velocity: 0.23074202239513397,
    liquidity_sweep_depth: 1.000000013351432e-10,
    inverse_bars_since_choch: 1.000000013351432e-10,
    cumulative_volume_ratio: 1.000000013351432e-10,
    rejection_wick: 1.000000013351432e-10,
    volume_climax: 1.000000013351432e-10,
  } as Record<string, number>,
};

// -----------------------------------------------------------------------------
// Math & Indicator Helpers
// -----------------------------------------------------------------------------

function clamp(val: number, min: number, max: number): number {
  if (isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

function rma(values: number[], length: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  const alpha = 1.0 / length;
  let prev = values[0] || 0;
  result[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = alpha * values[i] + (1.0 - alpha) * prev;
    result[i] = prev;
  }
  return result;
}

function sma(values: number[], length: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= length) {
      sum -= values[i - length];
    }
    const count = Math.min(i + 1, length);
    result[i] = sum / count;
  }
  return result;
}

function rollingMin(values: number[], length: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    let min = values[i];
    const start = Math.max(0, i - length + 1);
    for (let j = start; j <= i; j++) {
      if (values[j] < min) min = values[j];
    }
    result[i] = min;
  }
  return result;
}

function rollingMax(values: number[], length: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    let max = values[i];
    const start = Math.max(0, i - length + 1);
    for (let j = start; j <= i; j++) {
      if (values[j] > max) max = values[j];
    }
    result[i] = max;
  }
  return result;
}

// -----------------------------------------------------------------------------
// Base Technical Indicators
// -----------------------------------------------------------------------------

function computeBollingerScore(close: number[], length = 14, mult = 2.0): number[] {
  const ma = sma(close, length);
  const result: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    const start = Math.max(0, i - length + 1);
    const count = i - start + 1;
    let sumSq = 0;
    for (let j = start; j <= i; j++) {
      sumSq += (close[j] - ma[i]) ** 2;
    }
    const std = Math.sqrt(sumSq / count);
    const upper = ma[i] + std * mult;
    const lower = ma[i] - std * mult;
    const rng = upper - lower;
    result[i] = rng > 1e-8 ? clamp(((close[i] - lower) / rng) * 100, 0, 100) : 50;
  }
  return result;
}

function computeNormalizedPrice(close: number[], high: number[], low: number[], length = 14): number[] {
  const rMin = rollingMin(low, length);
  const rMax = rollingMax(high, length);
  const result: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    const rng = rMax[i] - rMin[i];
    result[i] = rng > 1e-8 ? clamp(((close[i] - rMin[i]) / rng) * 100, 0, 100) : 50;
  }
  return result;
}

function computeRsi(close: number[], length = 14): number[] {
  const gains: number[] = new Array(close.length).fill(0);
  const losses: number[] = new Array(close.length).fill(0);
  for (let i = 1; i < close.length; i++) {
    const diff = close[i] - close[i - 1];
    if (diff > 0) gains[i] = diff;
    else losses[i] = -diff;
  }
  const avgGains = rma(gains, length);
  const avgLosses = rma(losses, length);
  const result: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    if (avgLosses[i] === 0 && avgGains[i] === 0) result[i] = 50;
    else if (avgLosses[i] === 0) result[i] = 100;
    else {
      const rs = avgGains[i] / avgLosses[i];
      result[i] = clamp(100 - 100 / (1 + rs), 0, 100);
    }
  }
  return result;
}

function computeDmiScore(high: number[], low: number[], close: number[], length = 14): { dmiScore: number[]; atr: number[] } {
  const tr: number[] = new Array(close.length).fill(0);
  const plusDm: number[] = new Array(close.length).fill(0);
  const minusDm: number[] = new Array(close.length).fill(0);

  tr[0] = high[0] - low[0];
  for (let i = 1; i < close.length; i++) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(hl, hc, lc);

    const upMove = high[i] - high[i - 1];
    const dnMove = low[i - 1] - low[i];
    if (upMove > dnMove && upMove > 0) plusDm[i] = upMove;
    if (dnMove > upMove && dnMove > 0) minusDm[i] = dnMove;
  }

  const trRma = rma(tr, length);
  const plusRma = rma(plusDm, length);
  const minusRma = rma(minusDm, length);

  const dmiScore: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    const trVal = trRma[i];
    if (trVal > 1e-8) {
      const diPlus = (100 * plusRma[i]) / trVal;
      const diMinus = (100 * minusRma[i]) / trVal;
      const sum = diPlus + diMinus;
      dmiScore[i] = sum > 1e-8 ? clamp(50 + ((diPlus - diMinus) / sum) * 50, 0, 100) : 50;
    }
  }
  return { dmiScore, atr: trRma };
}

function computeBankerScore(close: number[], high: number[], low: number[]): number[] {
  const rMin = rollingMin(low, 27);
  const rMax = rollingMax(high, 27);
  const stochK: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    const rng = rMax[i] - rMin[i];
    stochK[i] = rng > 1e-8 ? ((close[i] - rMin[i]) / rng) * 100 : 50;
  }
  const out1 = sma(stochK, 5);
  const out2 = sma(out1, 3);
  const result: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    result[i] = clamp((3 * out1[i] - 2 * out2[i] - 50) * 1.032 + 50, 0, 100);
  }
  return result;
}

function computeMaScore(close: number[]): number[] {
  const fast = sma(close, 50);
  const slow = sma(close, 200);
  const diff: number[] = new Array(close.length).fill(0);
  for (let i = 0; i < close.length; i++) {
    diff[i] = fast[i] - slow[i];
  }
  const diffMin = rollingMin(diff, 14);
  const diffMax = rollingMax(diff, 14);
  const result: number[] = new Array(close.length).fill(50);
  for (let i = 0; i < close.length; i++) {
    const rng = diffMax[i] - diffMin[i];
    result[i] = rng > 1e-8 ? clamp(((diff[i] - diffMin[i]) / rng) * 100, 0, 100) : 50;
  }
  return result;
}

function computeSlopeScore(close: number[], atr: number[]): number[] {
  const result: number[] = new Array(close.length).fill(50);
  for (let i = 14; i < close.length; i++) {
    const atrVal = atr[i] || 1.0;
    const rawSlope = (close[i] - close[i - 14]) / (atrVal * 14.0);
    const angle = (Math.atan(rawSlope) * 180) / Math.PI;
    result[i] = clamp(((angle + 90) / 180) * 100, 0, 100);
  }
  return result;
}

// -----------------------------------------------------------------------------
// SMC & State Machine Structures (Causal One-Pass)
// -----------------------------------------------------------------------------

interface CausalRegimeState {
  direction: 'up' | 'down';
  regimeCode: number;
  startIndex: number;
  startClose: number;
  startHigh: number;
  startLow: number;
  peakPrice: number;
  troughPrice: number;
  barsSinceChoch: number;
}

// -----------------------------------------------------------------------------
// Sliding Causal Percentile Rank
// -----------------------------------------------------------------------------

export function causalRollingPercentile(values: number[], window = 63): number[] {
  const output: number[] = new Array(values.length).fill(50);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice: number[] = [];
    for (let j = start; j <= i; j++) {
      slice.push(values[j]);
    }
    const current = values[i];
    let countBelow = 0;
    let countEqual = 0;
    for (let k = 0; k < slice.length; k++) {
      if (slice[k] < current) countBelow++;
      else if (slice[k] === current) countEqual++;
    }
    // Standard causal ranking with midpoint tie-breaker
    const rank = countBelow + 0.5 * countEqual;
    output[i] = clamp((rank / slice.length) * 100, 0, 100);
  }
  return output;
}

// -----------------------------------------------------------------------------
// PSI V2 Core Calculation Engine
// -----------------------------------------------------------------------------

export function computePsiV2Indices(bars: PriceBar[]): PsiV2BarMetrics[] {
  const n = bars.length;
  if (n === 0) return [];

  const close = bars.map((b) => b.close);
  const high = bars.map((b) => b.high);
  const low = bars.map((b) => b.low);
  const open = bars.map((b) => b.open);
  const volume = bars.map((b) => b.volume ?? 0);

  // 1. Calculate Base Feature Series
  const bollinger = computeBollingerScore(close, 14, 2.0);
  const normPrice = computeNormalizedPrice(close, high, low, 14);
  const rsi = computeRsi(close, 14);
  const { dmiScore, atr } = computeDmiScore(high, low, close, 14);
  const banker = computeBankerScore(close, high, low);
  const maScore = computeMaScore(close);
  const slope = computeSlopeScore(close, atr);

  // 2. Causal One-Pass Directional Regime State Machine
  const regimeStates: CausalRegimeState[] = [];
  let currentDirection: 'up' | 'down' = 'up';
  let regimeCode = 0;
  let startIdx = 0;
  let peakP = high[0];
  let troughP = low[0];
  let lastChochBar = 0;

  for (let i = 0; i < n; i++) {
    const c = close[i];
    const h = high[i];
    const l = low[i];
    const atrVal = atr[i] || (h - l) || 1.0;
    const threshold = Math.max(atrVal * 2.0, c * 0.03); // Adaptive true-range reversal threshold

    if (currentDirection === 'up') {
      if (h > peakP) peakP = h;
      if (peakP - l >= threshold && i > startIdx + 2) {
        // Confirmed reversal to DOWN
        currentDirection = 'down';
        regimeCode++;
        startIdx = i;
        peakP = h;
        troughP = l;
        lastChochBar = i;
      }
    } else {
      if (l < troughP) troughP = l;
      if (h - troughP >= threshold && i > startIdx + 2) {
        // Confirmed reversal to UP
        currentDirection = 'up';
        regimeCode++;
        startIdx = i;
        peakP = h;
        troughP = l;
        lastChochBar = i;
      }
    }

    regimeStates.push({
      direction: currentDirection,
      regimeCode,
      startIndex: startIdx,
      startClose: close[startIdx],
      startHigh: high[startIdx],
      startLow: low[startIdx],
      peakPrice: peakP,
      troughPrice: troughP,
      barsSinceChoch: i - lastChochBar,
    });
  }

  // 3. Compute Derived Features for PSI_ZONE & Directional PSIs
  const rawZone: number[] = new Array(n).fill(50);
  const volSma = sma(volume, 20);

  // Components store for directional progress
  const upProgress: Record<string, number[]> = {};
  const downProgress: Record<string, number[]> = {};
  for (const k of Object.keys(PSI_UP_CONFIG.weights_points)) upProgress[k] = new Array(n).fill(0);
  for (const k of Object.keys(PSI_DOWN_CONFIG.weights_points)) downProgress[k] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const state = regimeStates[i];
    const isUp = state.direction === 'up';

    // A. Intra-swing location (0 to 1)
    const swingRange = Math.max(state.peakPrice - state.troughPrice, 1e-8);
    const intraSwingLoc = isUp
      ? clamp((close[i] - state.troughPrice) / swingRange, 0, 1)
      : clamp((state.peakPrice - close[i]) / swingRange, 0, 1);

    const directionalSwingLoc = isUp ? intraSwingLoc * 100 : (1.0 - intraSwingLoc) * 100;

    // B. SMC Liquidity Sweep & FVG Exhaustion
    const bslSweep = isUp ? clamp((high[i] - state.peakPrice) / (atr[i] || 1), 0, 3) : 0;
    const sslSweep = !isUp ? clamp((state.troughPrice - low[i]) / (atr[i] || 1), 0, 3) : 0;
    const liquiditySweepBalance = clamp(50.0 + 25.0 * (bslSweep - sslSweep), 0, 100);
    const fvgExhaustion = isUp ? clamp((1.0 - intraSwingLoc) * 100, 0, 100) : clamp(intraSwingLoc * 100, 0, 100);

    // C. Existing directional baseline momentum
    const dirExistingPsi = isUp ? normPrice[i] : 100.0 - normPrice[i];

    // --- Compute Consolidated RAW_ZONE ---
    const wZone = PSI_ZONE_CONFIG.weights_points;
    const rawZ =
      (wZone.bollinger_14_2 * bollinger[i] +
        wZone.normalized_price_14 * normPrice[i] +
        wZone.directional_swing_location * directionalSwingLoc +
        wZone.directional_existing_psi * dirExistingPsi +
        wZone.smc_fvg_exhaustion_zone * fvgExhaustion +
        wZone.rsi_14 * rsi[i] +
        wZone.adx_dmi_14 * dmiScore[i] +
        wZone.smc_liquidity_sweep_balance * liquiditySweepBalance) /
      100.0;

    rawZone[i] = rawZ;

    // --- Prepare Directional Raw Variables for PSI_UP and PSI_DOWN ---
    const barsInSwing = i - state.startIndex;
    const logClose = Math.log(Math.max(close[i], 1e-8));
    const momentum = i >= 14 ? (close[i] - close[i - 14]) / close[i - 14] : 0;
    const volRatio = volSma[i] > 0 ? volume[i] / volSma[i] : 1.0;
    const wickHigh = high[i] - Math.max(open[i], close[i]);
    const wickLow = Math.min(open[i], close[i]) - low[i];
    const totalBarRange = Math.max(high[i] - low[i], 1e-8);
    const upperWickRatio = wickHigh / totalBarRange;
    const lowerWickRatio = wickLow / totalBarRange;

    // Raw directional features for UP
    upProgress.temporal_progress[i] = barsInSwing * 0.05;
    upProgress.favorable_close_excursion[i] = logClose;
    upProgress.liquidity_sweep_depth[i] = bslSweep;
    upProgress.slope_14[i] = slope[i] / 100.0;
    upProgress.banker_50[i] = banker[i] / 100.0;
    upProgress.ma_50_200[i] = maScore[i] / 100.0;
    upProgress.momentum[i] = momentum;
    upProgress.inverse_bars_since_choch[i] = -state.barsSinceChoch;
    upProgress.intra_swing_location[i] = intraSwingLoc;
    upProgress.adx_dmi_14[i] = dmiScore[i] / 100.0;
    upProgress.inverse_cumulative_volume_ratio[i] = -volRatio;
    upProgress.rejection_wick[i] = upperWickRatio;
    upProgress.volume_ratio[i] = volRatio;
    upProgress.volume_climax[i] = volRatio > 2.0 ? 1.0 : 0.0;

    // Raw directional features for DOWN
    downProgress.temporal_progress[i] = barsInSwing * 0.05;
    downProgress.favorable_close_excursion[i] = -logClose;
    downProgress.cumulative_volume_ratio[i] = volRatio;
    downProgress.slope_14[i] = (100.0 - slope[i]) / 100.0;
    downProgress.rsi_14[i] = (100.0 - rsi[i]) / 100.0;
    downProgress.momentum[i] = -momentum;
    downProgress.liquidity_sweep_depth[i] = sslSweep;
    downProgress.ma_50_200[i] = (100.0 - maScore[i]) / 100.0;
    downProgress.intra_swing_location[i] = intraSwingLoc;
    downProgress.directional_existing_psi[i] = (100.0 - normPrice[i]) / 100.0;
    downProgress.inverse_bars_since_choch[i] = -state.barsSinceChoch;
    downProgress.banker_50[i] = (100.0 - banker[i]) / 100.0;
    downProgress.adx_dmi_14[i] = (100.0 - dmiScore[i]) / 100.0;
    downProgress.delta_velocity[i] = i >= 8 ? -(close[i] - close[i - 8]) / (8 * (atr[i] || 1)) : 0;
    downProgress.rejection_wick[i] = lowerWickRatio;
    downProgress.volume_climax[i] = volRatio > 2.0 ? 1.0 : 0.0;
  }

  // 4. Compute Causal 63-Bar Rolling Percentile for PSI_ZONE
  const psiZone = causalRollingPercentile(rawZone, PSI_ZONE_CONFIG.causal_percentile_window);

  // 5. Compute Stateful Anchored Progress for PSI_UP and PSI_DOWN
  const psiUp: number[] = new Array(n).fill(0);
  const psiDown: number[] = new Array(n).fill(0);

  // Accumulate running maximums per regime block
  let currRegimeCode = -1;
  const startValuesUp: Record<string, number> = {};
  const runningMaxUp: Record<string, number> = {};
  const startValuesDown: Record<string, number> = {};
  const runningMaxDown: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    const state = regimeStates[i];
    if (state.regimeCode !== currRegimeCode) {
      currRegimeCode = state.regimeCode;
      // Reset start values and running maximums at regime boundary
      for (const k of Object.keys(PSI_UP_CONFIG.weights_points)) {
        startValuesUp[k] = upProgress[k][i];
        runningMaxUp[k] = upProgress[k][i];
      }
      for (const k of Object.keys(PSI_DOWN_CONFIG.weights_points)) {
        startValuesDown[k] = downProgress[k][i];
        runningMaxDown[k] = downProgress[k][i];
      }
    } else {
      // Update running max inside active swing
      for (const k of Object.keys(PSI_UP_CONFIG.weights_points)) {
        if (upProgress[k][i] > runningMaxUp[k]) runningMaxUp[k] = upProgress[k][i];
      }
      for (const k of Object.keys(PSI_DOWN_CONFIG.weights_points)) {
        if (downProgress[k][i] > runningMaxDown[k]) runningMaxDown[k] = downProgress[k][i];
      }
    }

    if (state.direction === 'up') {
      let scoreUp = 0;
      for (const [k, pts] of Object.entries(PSI_UP_CONFIG.weights_points)) {
        const scale = PSI_UP_CONFIG.component_terminal_scales[k] || 1.0;
        const delta = Math.max(0, runningMaxUp[k] - startValuesUp[k]);
        const prog = clamp(delta / scale, 0, 1);
        scoreUp += (pts / 100.0) * prog;
      }
      psiUp[i] = clamp(100.0 * clamp(PSI_UP_CONFIG.gain * scoreUp, 0, 1), 0, 100);
      psiDown[i] = 0; // Strictly 0 during UP regime
    } else {
      let scoreDown = 0;
      for (const [k, pts] of Object.entries(PSI_DOWN_CONFIG.weights_points)) {
        const scale = PSI_DOWN_CONFIG.component_terminal_scales[k] || 1.0;
        const delta = Math.max(0, runningMaxDown[k] - startValuesDown[k]);
        const prog = clamp(delta / scale, 0, 1);
        scoreDown += (pts / 100.0) * prog;
      }
      psiDown[i] = clamp(100.0 * clamp(PSI_DOWN_CONFIG.gain * scoreDown, 0, 1), 0, 100);
      psiUp[i] = 0; // Strictly 0 during DOWN regime
    }
  }

  // 6. Compute 252-day Rolling Median AYM and ATR %
  const dailyMovePct = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = close[i - 1];
    const curr = close[i];
    dailyMovePct[i] = prev > 0 ? Math.abs(curr - prev) / prev : 0;
  }

  const aym = new Array(n).fill(0.015);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - 252 + 1);
    const slice = dailyMovePct.slice(start, i + 1).sort((a, b) => a - b);
    const mid = Math.floor(slice.length / 2);
    aym[i] = slice.length % 2 !== 0 ? slice[mid] : (slice[mid - 1] + slice[mid]) / 2;
    if (aym[i] <= 0) aym[i] = 0.015;
  }

  const atrPct = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    atrPct[i] = close[i] > 0 ? (atr[i] || 1.0) / close[i] : 0.02;
  }

  // 7. Build Final Formatted Output Metrics
  const result: PsiV2BarMetrics[] = [];
  for (let i = 0; i < n; i++) {
    result.push({
      date: bars[i].date,
      close: bars[i].close,
      psiZone: Number(psiZone[i].toFixed(2)),
      psiUp: Number(psiUp[i].toFixed(2)),
      psiDown: Number(psiDown[i].toFixed(2)),
      regimeDirection: regimeStates[i].direction,
      rawZone: Number(rawZone[i].toFixed(2)),
      aym: aym[i],
      atrPct: atrPct[i],
      atrVal: atr[i] || 1.0,
    });
  }

  return result;
}
