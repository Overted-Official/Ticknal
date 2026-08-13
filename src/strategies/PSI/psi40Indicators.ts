import { RSI, MACD, Stochastic, CCI, MFI, ROC, WilliamsR, SMA, EMA, ADX, BollingerBands, ATR, OBV, ForceIndex, TRIX } from 'technicalindicators';
import type { PriceBar } from './psiStrategy';

// Helper to pad results so they align with the original array
function pad<T>(arr: T[], length: number, fillValue: any = null): any[] {
  const padLen = length - arr.length;
  if (padLen <= 0) return arr;
  return [...Array(padLen).fill(fillValue), ...arr];
}

export function computePsi40(bars: PriceBar[]): number[] {
  const close = bars.map(b => b.close);
  const high = bars.map(b => b.high);
  const low = bars.map(b => b.low);
  const volume = bars.map(b => b.volume ?? 0);
  const len = bars.length;

  const rsi14 = pad(RSI.calculate({ values: close, period: 14 }), len);
  const rsi7 = pad(RSI.calculate({ values: close, period: 7 }), len);
  const rsi21 = pad(RSI.calculate({ values: close, period: 21 }), len);

  const macd = pad(MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }), len);
  const stoch = pad(Stochastic.calculate({ high, low, close, period: 14, signalPeriod: 3 }), len);
  
  const cci20 = pad(CCI.calculate({ high, low, close, period: 20 }), len);
  const mfi14 = pad(MFI.calculate({ high, low, close, volume, period: 14 }), len);
  const roc10 = pad(ROC.calculate({ values: close, period: 10 }), len);
  const willr14 = pad(WilliamsR.calculate({ high, low, close, period: 14 }), len);

  const sma20 = pad(SMA.calculate({ values: close, period: 20 }), len);
  const sma50 = pad(SMA.calculate({ values: close, period: 50 }), len);
  const sma200 = pad(SMA.calculate({ values: close, period: 200 }), len);
  
  const ema20 = pad(EMA.calculate({ values: close, period: 20 }), len);
  const ema50 = pad(EMA.calculate({ values: close, period: 50 }), len);

  const adx14 = pad(ADX.calculate({ high, low, close, period: 14 }), len);
  
  const bb20 = pad(BollingerBands.calculate({ values: close, period: 20, stdDev: 2 }), len);
  const bb50 = pad(BollingerBands.calculate({ values: close, period: 50, stdDev: 2 }), len);
  
  const atr14 = pad(ATR.calculate({ high, low, close, period: 14 }), len);
  const obv = pad(OBV.calculate({ close, volume }), len);
  
  const fi13 = pad(ForceIndex.calculate({ close, volume, period: 13 }), len);
  const trix18 = pad(TRIX.calculate({ values: close, period: 18 }), len);

  const psi40Values: number[] = [];

  for (let i = 0; i < len; i++) {
    const c = close[i];
    let score = 0;

    // Momentum (12 conditions)
    if (rsi14[i] > 50) score++;
    if (rsi7[i] > rsi14[i]) score++;
    if (rsi14[i] > rsi21[i]) score++;
    if (macd[i]?.histogram > 0) score++;
    if (macd[i]?.MACD > 0) score++;
    if (stoch[i]?.k > stoch[i]?.d) score++;
    if (stoch[i]?.k > 50) score++;
    if (cci20[i] > 0) score++;
    if (mfi14[i] > 50) score++;
    if (roc10[i] > 0) score++;
    if (willr14[i] > -50) score++;
    if (trix18[i] > 0) score++;

    // Trend (12 conditions)
    if (c > sma20[i]) score++;
    if (c > sma50[i]) score++;
    if (c > sma200[i]) score++;
    if (sma20[i] > sma50[i]) score++;
    if (sma50[i] > sma200[i]) score++;
    if (c > ema20[i]) score++;
    if (c > ema50[i]) score++;
    if (ema20[i] > ema50[i]) score++;
    if (adx14[i]?.pdi > adx14[i]?.mdi) score++;
    if (adx14[i]?.adx > 25 && adx14[i]?.pdi > adx14[i]?.mdi) score++;
    if (i >= 1 && c > close[i-1]) score++; 
    if (i >= 5 && c > close[i-5]) score++; 

    // Volatility (8 conditions)
    if (bb20[i]?.upper && c > bb20[i].middle) score++;
    if (bb20[i]?.upper && c > bb20[i].upper) score++;
    if (bb50[i]?.upper && c > bb50[i].middle) score++;
    if (bb20[i]?.upper && c < bb20[i].lower === false) score++; 
    
    if (i >= 5 && atr14[i] > atr14[i-5]) score++; 
    if (i >= 20 && atr14[i] > atr14[i-20]) score++;
    if (i >= 1 && (high[i] - low[i]) > atr14[i]) score++;
    if (c > (high[i] + low[i]) / 2) score++; 

    // Volume & Statistical (8 conditions)
    if (i >= 1 && obv[i] > obv[i-1]) score++;
    if (i >= 5 && obv[i] > obv[i-5]) score++;
    if (fi13[i] > 0) score++;
    if (i >= 1 && fi13[i] > fi13[i-1]) score++;
    
    let hh20 = c;
    let ll20 = c;
    if (i >= 20) {
      hh20 = Math.max(...high.slice(i-20, i));
      ll20 = Math.min(...low.slice(i-20, i));
    }
    if (c > (hh20 + ll20) / 2) score++;
    if (c === hh20) score++;
    if (c > ll20 + (hh20 - ll20) * 0.75) score++;
    if (c > ll20 + (hh20 - ll20) * 0.25) score++;

    // Normalize to 0-100%
    const normalized = (score / 40) * 100;
    psi40Values.push(normalized);
  }

  return psi40Values;
}
