import { ChartData } from '@/components/platform/ChartWidget';
import { SeriesMarker, Time } from 'lightweight-charts';
import { HYDRA_MODEL } from './modelWeights';

/**
 * HYDRA INDEX VERSION: 1.2
 * Architecture: Approach 3A Causal Smart Fast-EWMA Trailing Stop with Momentum Re-entry and Anti-Exhaustion Regime Filter.
 * Internal versioning for algorithm tracking.
 */
export const HYDRA_INDEX_VERSION = '1.2';

export interface HydraPoint {
  time: Time;
  value: number; // Binary 0 or 1 by default (or 0 to 100 in continuous mode)
  state: number; // 0: Cash / Bottom Search, 1: Invested / Bull wave
  rawProb: number;
  continuousVal: number;
}

export interface HydraCalculationResult {
  points: HydraPoint[];
  markers: SeriesMarker<Time>[];
}

export interface HydraCalculationOptions {
  showMarkers?: boolean;
  binaryMode?: boolean;
}

// -------------------------------------------------------------
// Helper Math Functions
// -------------------------------------------------------------
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * HYDRA 1.2 (Approach 3A): Strictly causal Fast-EWMA True Range (Period = 5)
 * Dynamically reacts to expanding volatility and contracts during consolidations.
 * Zero lookahead bias.
 */
function calcEwmaAtr(bars: ChartData[], period: number = 5): number[] {
  const n = bars.length;
  const atr = new Array(n).fill(0.03);
  const k = 2 / (period + 1);
  for (let i = 1; i < n; i++) {
    const prevC = bars[i - 1].close;
    if (prevC <= 0) continue;
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prevC),
      Math.abs(bars[i].low - prevC)
    ) / prevC;
    atr[i] = i === 1 ? tr : tr * k + atr[i - 1] * (1 - k);
  }
  return atr;
}

function rma(values: number[], length: number): number[] {
  const res: number[] = new Array(values.length).fill(NaN);
  const alpha = 1.0 / length;
  let sum = 0;
  for (let i = 0; i < length && i < values.length; i++) {
    sum += values[i];
  }
  if (values.length >= length) {
    res[length - 1] = sum / length;
    for (let i = length; i < values.length; i++) {
      res[i] = alpha * values[i] + (1 - alpha) * res[i - 1];
    }
  }
  return res;
}

function rollingMin(values: number[], length: number): number[] {
  const res: number[] = new Array(values.length).fill(NaN);
  for (let i = length - 1; i < values.length; i++) {
    let m = Infinity;
    for (let j = i - length + 1; j <= i; j++) {
      if (values[j] < m) m = values[j];
    }
    res[i] = m;
  }
  return res;
}

function rollingMax(values: number[], length: number): number[] {
  const res: number[] = new Array(values.length).fill(NaN);
  for (let i = length - 1; i < values.length; i++) {
    let m = -Infinity;
    for (let j = i - length + 1; j <= i; j++) {
      if (values[j] > m) m = values[j];
    }
    res[i] = m;
  }
  return res;
}

// -------------------------------------------------------------
// Core HYDRA Indicator Calculator
// -------------------------------------------------------------
export function computeHydraIndex(
  bars: ChartData[],
  options?: HydraCalculationOptions
): HydraCalculationResult {
  const n = bars.length;
  if (!bars || n < 50) {
    return { points: [], markers: [] };
  }

  const showMarkers = options?.showMarkers ?? true;
  const binaryMode = options?.binaryMode ?? true;

  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);

  // 1. Normalized Price (14-period)
  const normHigh = rollingMax(closes, 14);
  const normLow = rollingMin(closes, 14);
  const c_normPrice = new Array(n).fill(50);
  for (let i = 13; i < n; i++) {
    const range = normHigh[i] - normLow[i];
    c_normPrice[i] = range > 0.0001 ? clamp(((closes[i] - normLow[i]) / range) * 100, 0, 100) : 50;
  }

  // 2. RSI (14)
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const avgGain = rma(gains, 14);
  const avgLoss = rma(losses, 14);
  const c_rsi = new Array(n).fill(50);
  for (let i = 13; i < n; i++) {
    if (avgLoss[i] === 0 && avgGain[i] === 0) c_rsi[i] = 50;
    else if (avgLoss[i] === 0) c_rsi[i] = 100;
    else {
      const rs = avgGain[i] / avgLoss[i];
      c_rsi[i] = clamp(100 - 100 / (1 + rs), 0, 100);
    }
  }

  // 3. Banker Score (27-period stochastic smoothed)
  const stochLow = rollingMin(lows, 27);
  const stochHigh = rollingMax(highs, 27);
  const stoch = new Array(n).fill(50);
  for (let i = 26; i < n; i++) {
    const r = stochHigh[i] - stochLow[i];
    stoch[i] = r > 0.0001 ? ((closes[i] - stochLow[i]) / r) * 100 : 50;
  }
  const out1 = rma(stoch, 5);
  const out2 = rma(out1, 3);
  const c_banker = new Array(n).fill(50);
  for (let i = 26; i < n; i++) {
    if (!isNaN(out1[i]) && !isNaN(out2[i])) {
      c_banker[i] = clamp((3 * out1[i] - 2 * out2[i] - 50) * 1.032 + 50, 0, 100);
    }
  }

  // True Range for ATR
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < n; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  const atr14 = rma(tr, 14);

  // 4. Supertrend Score
  const c_stScore = new Array(n).fill(50);
  let stFinalUpper = highs[0];
  let stFinalLower = lows[0];
  let stValue = highs[0];
  let stDirection = 1;

  for (let i = 1; i < n; i++) {
    const atr = atr14[i] || 1.0;
    const hl2 = (highs[i] + lows[i]) / 2;
    const basicUpper = hl2 + 3 * atr;
    const basicLower = hl2 - 3 * atr;

    stFinalUpper = basicUpper < stFinalUpper || closes[i - 1] > stFinalUpper ? basicUpper : stFinalUpper;
    stFinalLower = basicLower > stFinalLower || closes[i - 1] < stFinalLower ? basicLower : stFinalLower;

    if (stValue === stFinalUpper) {
      if (closes[i] <= stFinalUpper) {
        stValue = stFinalUpper;
        stDirection = 1;
      } else {
        stValue = stFinalLower;
        stDirection = -1;
      }
    } else if (closes[i] >= stFinalLower) {
      stValue = stFinalLower;
      stDirection = -1;
    } else {
      stValue = stFinalUpper;
      stDirection = 1;
    }

    c_stScore[i] = clamp(50 + ((closes[i] - stValue) / (atr * 3)) * 50, 0, 100);
  }

  // 5. ADX / DMI Score
  const plusDm: number[] = [0];
  const minusDm: number[] = [0];
  for (let i = 1; i < n; i++) {
    const up = highs[i] - highs[i - 1];
    const down = lows[i - 1] - lows[i];
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
  }
  const trRma = rma(tr, 14);
  const plusRma = rma(plusDm, 14);
  const minusRma = rma(minusDm, 14);
  const c_adxScore = new Array(n).fill(50);
  for (let i = 13; i < n; i++) {
    if (trRma[i] > 0.0001) {
      const diPlus = (100 * plusRma[i]) / trRma[i];
      const diMinus = (100 * minusRma[i]) / trRma[i];
      const sum = diPlus + diMinus;
      c_adxScore[i] = sum > 0.0001 ? clamp(50 + ((diPlus - diMinus) / sum) * 50, 0, 100) : 50;
    }
  }

  // 6. MA Score (EMA 20 vs EMA 50)
  const c_maScore = new Array(n).fill(50);
  const ema50 = new Array(n).fill(closes[0]);
  let emaFast = closes[0];
  let emaSlow = closes[0];
  const kFast = 2 / (20 + 1);
  const kSlow = 2 / (50 + 1);
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    emaFast = closes[i] * kFast + emaFast * (1 - kFast);
    emaSlow = closes[i] * kSlow + emaSlow * (1 - kSlow);
    ema50[i] = emaSlow;
    diffs.push(emaFast - emaSlow);
  }
  const diffHigh = rollingMax(diffs, 14);
  const diffLow = rollingMin(diffs, 14);
  for (let i = 13; i < n; i++) {
    const range = diffHigh[i] - diffLow[i];
    c_maScore[i] = range > 0.0001 ? clamp(((diffs[i] - diffLow[i]) / range) * 100, 0, 100) : 50;
  }

  // 7. Slope Score
  const c_slopeScore = new Array(n).fill(50);
  for (let i = 14; i < n; i++) {
    const atr = atr14[i] || 1.0;
    const rawSlope = (closes[i] - closes[i - 14]) / (atr * 14);
    const angle = (Math.atan(rawSlope) * 180) / Math.PI;
    c_slopeScore[i] = clamp(((angle + 90) / 180) * 100, 0, 100);
  }

  // 8. Even Better Sinewave (EBS)
  const hpPeriod = 40;
  const angleEBS = (0.707 * 2 * Math.PI) / hpPeriod;
  const alpha1 = (Math.cos(angleEBS) + Math.sin(angleEBS) - 1) / Math.cos(angleEBS);
  const c1HP = Math.pow(1 - alpha1 / 2, 2);
  const c2HP = 2 * (1 - alpha1);
  const c3HP = -Math.pow(1 - alpha1, 2);

  const lpPeriod = 10;
  const a1SS = Math.exp((-Math.SQRT2 * Math.PI) / lpPeriod);
  const b1SS = 2 * a1SS * Math.cos((Math.SQRT2 * Math.PI) / lpPeriod);
  const c2SS = b1SS;
  const c3SS = -a1SS * a1SS;
  const c1SS = 1 - c2SS - c3SS;

  const hp = new Array(n).fill(0);
  const filt = new Array(n).fill(0);
  const c_ebs = new Array(n).fill(50);

  for (let i = 2; i < n; i++) {
    const p0 = (highs[i] + lows[i]) / 2;
    const p1 = (highs[i - 1] + lows[i - 1]) / 2;
    const p2 = (highs[i - 2] + lows[i - 2]) / 2;
    hp[i] = c1HP * (p0 - 2 * p1 + p2) + c2HP * hp[i - 1] + c3HP * hp[i - 2];
    filt[i] = c1SS * ((hp[i] + hp[i - 1]) / 2) + c2SS * filt[i - 1] + c3SS * filt[i - 2];
  }

  for (let i = hpPeriod; i < n; i++) {
    let sumSq = 0;
    for (let k = 0; k < hpPeriod; k++) {
      sumSq += filt[i - k] * filt[i - k];
    }
    const rms = Math.sqrt(sumSq / hpPeriod);
    const normW = rms > 0.00001 ? filt[i] / rms : 0;
    const wave = clamp(normW, -1.0, 1.0);
    c_ebs[i] = clamp((wave + 1.0) * 50, 0, 100);
  }

  // 9. Permutation Entropy (PE)
  const W_PE = 20;
  const ln6 = Math.log(6);
  const c_pe = new Array(n).fill(50);
  const ema20 = new Array(n).fill(closes[0]);
  for (let i = 1; i < n; i++) {
    ema20[i] = 0.1 * closes[i] + 0.9 * ema20[i - 1];
  }

  const getPermutationIdx = (a: number, b: number, c: number): number => {
    if (a <= b && b <= c) return 0;
    if (a <= c && c < b) return 1;
    if (b < a && a <= c) return 2;
    if (c < a && a <= b) return 3;
    if (b <= c && c < a) return 4;
    return 5;
  };

  for (let i = W_PE; i < n; i++) {
    const counts = [0, 0, 0, 0, 0, 0];
    const totalPats = W_PE - 3 + 1;
    for (let j = i - totalPats + 1; j <= i; j++) {
      const idx = getPermutationIdx(closes[j - 2], closes[j - 1], closes[j]);
      counts[idx]++;
    }
    let entropy = 0;
    for (let c = 0; c < 6; c++) {
      if (counts[c] > 0) {
        const p = counts[c] / totalPats;
        entropy -= p * Math.log(p);
      }
    }
    const h = clamp(entropy / ln6, 0.0, 1.0);
    const orderIntensity = 1.0 - h;
    const atrVal = atr14[i] || 1.0;
    const dirNorm = Math.tanh((closes[i] - ema20[i]) / Math.max(0.5, atrVal));
    c_pe[i] = clamp(50 + dirNorm * (0.3 + 0.7 * orderIntensity) * 50, 0, 100);
  }

  // 10. FRAMA
  const N_FRAMA = 16;
  const halfN = N_FRAMA / 2;
  const ln2 = Math.log(2);
  const c_frama = new Array(n).fill(50);
  let prevFrama = closes[0];

  for (let i = N_FRAMA; i < n; i++) {
    let h1 = -Infinity, l1 = Infinity;
    for (let j = i - N_FRAMA + 1; j <= i - halfN; j++) {
      if (highs[j] > h1) h1 = highs[j];
      if (lows[j] < l1) l1 = lows[j];
    }
    const n1 = (h1 - l1) / halfN;

    let h2 = -Infinity, l2 = Infinity;
    for (let j = i - halfN + 1; j <= i; j++) {
      if (highs[j] > h2) h2 = highs[j];
      if (lows[j] < l2) l2 = lows[j];
    }
    const n2 = (h2 - l2) / halfN;

    let h3 = -Infinity, l3 = Infinity;
    for (let j = i - N_FRAMA + 1; j <= i; j++) {
      if (highs[j] > h3) h3 = highs[j];
      if (lows[j] < l3) l3 = lows[j];
    }
    const n3 = (h3 - l3) / N_FRAMA;

    let d = 1.0;
    if (n1 + n2 > 0 && n3 > 0) {
      d = (Math.log(n1 + n2) - Math.log(n3)) / ln2;
    }
    d = clamp(d, 1.0, 2.0);
    const alphaFrama = clamp(Math.exp(-4.6 * (d - 1.0)), 0.01, 1.0);
    const curFrama = alphaFrama * closes[i] + (1.0 - alphaFrama) * prevFrama;
    prevFrama = curFrama;

    const atrVal = atr14[i] || 1.0;
    const disp = (closes[i] - curFrama) / (2 * Math.max(0.5, atrVal));
    c_frama[i] = clamp(50 + disp * 50, 0, 100);
  }

  // -------------------------------------------------------------
  // RBF Geodesic SVM Probability & Stochastic Markov State Filter
  // -------------------------------------------------------------
  const { gamma, intercept, probA, probB, scalerMean, scalerScale, dualCoef, supportVectors } = HYDRA_MODEL;
  const numSV = supportVectors.length;

  const rawProbs: number[] = new Array(n).fill(50);

  for (let i = 40; i < n; i++) {
    const rawFeats = [
      c_normPrice[i],
      c_rsi[i],
      c_banker[i],
      c_stScore[i],
      c_adxScore[i],
      c_maScore[i],
      c_slopeScore[i],
      c_ebs[i],
      c_pe[i],
      c_frama[i],
    ];

    // Standardize
    const scaledFeats = rawFeats.map((v, idx) => (v - scalerMean[idx]) / scalerScale[idx]);

    // RBF Kernel sum
    let dec = intercept;
    for (let s = 0; s < numSV; s++) {
      const sv = supportVectors[s];
      let distSq = 0;
      for (let d = 0; d < 10; d++) {
        const diff = scaledFeats[d] - sv[d];
        distSq += diff * diff;
      }
      const kVal = Math.exp(-gamma * distSq);
      dec += dualCoef[s] * kVal;
    }

    // Platt Scaling probability of State 1 (Top)
    const prob = 100.0 / (1.0 + Math.exp(probA * dec + probB));
    rawProbs[i] = prob;
  }

  // Stochastic Markov State Filter (Recursive Bayesian Estimator)
  const pStay = 0.94;
  const pSwitch = 0.06;
  const hydraPoints: HydraPoint[] = [];
  const markers: SeriesMarker<Time>[] = [];

  // 1. Pre-populate warm-up bars (0 to 39) so hydraPoints aligns 1:1 with main chart bars
  const warmupEnd = Math.min(40, n);
  for (let i = 0; i < warmupEnd; i++) {
    const rawP = rawProbs[i] ?? 50.0;
    hydraPoints.push({
      time: bars[i].time as Time,
      value: 0,
      state: 0,
      rawProb: Number(rawP.toFixed(1)),
      continuousVal: Number(rawP.toFixed(1)),
    });
  }

  let stateProb = (rawProbs[warmupEnd - 1] ?? 50.0) / 100.0;

  // -------------------------------------------------------------
  // Approach 3A: Smart Fast-EWMA Trailing Stop & Anti-Exhaustion Regime
  // (Strict Zero-Lookahead Causal Synchronizer)
  // -------------------------------------------------------------
  const ewmaAtr = calcEwmaAtr(bars, 5);

  let binaryState = 0;
  let activePosition = false;
  let entryPrice = 0.0;
  let peakPrice = closes[warmupEnd - 1] || 1.0;

  for (let i = warmupEnd; i < n; i++) {
    const prior = stateProb * pStay + (1.0 - stateProb) * pSwitch;
    const measProb = clamp(rawProbs[i] / 100.0, 0.01, 0.99);
    const num = prior * measProb;
    const denom = num + (1.0 - prior) * (1.0 - measProb);
    stateProb = num / denom;

    const hydraVal = clamp(stateProb * 100.0, 0.0, 100.0);
    const price = closes[i];
    const curAtr = ewmaAtr[i];

    if (!activePosition) {
      // Entry logic:
      // 1. Extreme oversold bounce (hydraVal < 30) OR
      // 2. Trend continuation with momentum confirmation (hydraVal >= 45 && price > closes[i - 1])
      // 3. AND anti-exhaustion ceiling (hydraVal <= 90) to prevent buying overextended blow-off tops.
      const canEnter = (hydraVal < 30 || (hydraVal >= 45 && price > closes[i - 1])) && hydraVal <= 90;

      if (canEnter) {
        activePosition = true;
        binaryState = 1;
        entryPrice = price;
        peakPrice = price;

        if (showMarkers) {
          markers.push({
            time: bars[i].time as Time,
            position: 'belowBar',
            color: '#00E676', // Bright Neon Green
            shape: 'arrowUp',
            size: 2,
            text: `HYDRA BUY (${price.toFixed(2)})`,
          });
        }
      } else {
        binaryState = 0;
      }
    } else {
      // In Position / Bull Wave: track highest peak achieved
      if (price > peakPrice) {
        peakPrice = price;
      }

      // Dynamic Volatility Trailing Stop: 2.8 * Fast-EWMA ATR from highest peak
      const trailingStop = peakPrice * (1.0 - 2.8 * curAtr);

      if (price <= trailingStop) {
        activePosition = false;
        binaryState = 0;
        const retPct = entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100.0 : 0.0;
        peakPrice = price;

        if (showMarkers) {
          markers.push({
            time: bars[i].time as Time,
            position: 'aboveBar',
            color: '#FF5252', // Bright Coral Red
            shape: 'arrowDown',
            size: 2,
            text: `HYDRA EXIT (${price.toFixed(2)} | +${retPct.toFixed(1)}%)`,
          });
        }
      } else {
        binaryState = 1;
      }
    }

    hydraPoints.push({
      time: bars[i].time as Time,
      value: binaryMode ? binaryState : Number(hydraVal.toFixed(1)),
      state: binaryState,
      rawProb: Number(rawProbs[i].toFixed(1)),
      continuousVal: Number(hydraVal.toFixed(1)),
    });
  }

  return { points: hydraPoints, markers };
}
