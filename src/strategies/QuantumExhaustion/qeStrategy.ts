import fs from 'fs';
import path from 'path';
import type { PriceBar, PsiSignal, PsiBacktestResult } from '../PSI/psiStrategy';

interface QEPrediction {
  date: string;
  direction: 'up' | 'down';
  prediction: number;
}

const QE_DATA_DIR = path.join(process.cwd(), 'src', '_data', 'qe_predictions');

export function runQeStrategy(
  ticker: string,
  bars: PriceBar[],
  startDate: string,
  endDate?: string,
  buyThreshold = 75,
  sellThreshold = 75
): { signals: PsiSignal[]; latestMasterIndex: number | null; latestMasterIndexAdjusted: number | null } {
  
  // Try to load the predictions JSON for this ticker
  const jsonPath = path.join(QE_DATA_DIR, `${ticker}.json`);
  
  let predictions: QEPrediction[] = [];
  try {
    if (fs.existsSync(jsonPath)) {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      predictions = JSON.parse(fileContent);
    } else {
      console.warn(`No QE predictions found for ticker ${ticker} at ${jsonPath}`);
    }
  } catch (err) {
    console.error(`Failed to read QE predictions for ${ticker}:`, err);
  }

  // Map dates to predictions for O(1) lookup
  const predMap = new Map<string, QEPrediction>();
  for (const p of predictions) {
    predMap.set(p.date, p);
  }

  const signals: PsiSignal[] = [];
  
  // Filter bars by date range
  const validBars = bars.filter((b) => {
    if (b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    return true;
  });

  for (const bar of validBars) {
    const pred = predMap.get(bar.date);
    if (!pred) continue;

    // Check if exhaustion exceeds threshold
    if (pred.direction === 'up' && pred.prediction >= sellThreshold) {
      // Up-swing exhausted -> SELL
      signals.push({
        date: bar.date,
        signal: 'SELL_STRUCT', // Using SELL_STRUCT as a generic SELL reason for UI styling
        price: bar.close,
        confidence: pred.prediction,
        masterIndex: pred.prediction, // Reuse masterIndex for prediction value in UI
        masterIndexAdjusted: pred.prediction,
        medianDailyMove: null,
        entryReason: 'QE',
        exitReason: `UP Exh (${pred.prediction}%)`,
        modelVersion: 'QE-v1.0'
      });
    } else if (pred.direction === 'down' && pred.prediction >= buyThreshold) {
      // Down-swing exhausted -> BUY
      signals.push({
        date: bar.date,
        signal: 'BUY',
        price: bar.close,
        confidence: pred.prediction,
        masterIndex: pred.prediction,
        masterIndexAdjusted: pred.prediction,
        medianDailyMove: null,
        entryReason: `DN Exh (${pred.prediction}%)`,
        modelVersion: 'QE-v1.0'
      });
    }
  }

  return { 
    signals, 
    latestMasterIndex: null, 
    latestMasterIndexAdjusted: null 
  };
}

export function simulateQePerformance(
  bars: PriceBar[], 
  signals: PsiSignal[], 
  startDate: string,
  endDate?: string,
  initialCapital = 100000
): PsiBacktestResult {
  let balance = initialCapital;
  let active = false;
  let entryPrice = 0;
  let highestPrice = 0;
  let lowestPrice = 0;
  let tradeCount = 0;
  let winCount = 0;
  let closedTrades = 0;
  let accumulatedReturnPct = 0;
  let maxDrawdown = 0;
  let peakEquity = initialCapital;
  let finalEquity = initialCapital;

  // Create a map of signals for O(1) lookup
  const signalMap = new Map<string, PsiSignal>();
  for (const s of signals) {
    // take the first signal of the day if multiple
    if (!signalMap.has(s.date)) signalMap.set(s.date, s);
  }

  const validBars = bars.filter((b) => {
    if (b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    return true;
  });

  for (const bar of validBars) {
    const sig = signalMap.get(bar.date);

    if (!active && sig?.signal === 'BUY') {
      const shares = Math.floor(balance / bar.close);
      if (shares > 0) {
        active = true;
        entryPrice = bar.close;
        highestPrice = bar.high;
        lowestPrice = bar.low;
        tradeCount += 1;
      }
    } else if (active) {
      highestPrice = Math.max(highestPrice, bar.high);
      lowestPrice = Math.min(lowestPrice, bar.low);

      if (sig && sig.signal.startsWith('SELL')) {
        const shares = Math.floor(balance / entryPrice);
        const tradeReturnPct = ((bar.close - entryPrice) / entryPrice) * 100;
        balance += shares * (bar.close - entryPrice);
        accumulatedReturnPct += tradeReturnPct;
        closedTrades += 1;
        
        if (tradeReturnPct > 0) winCount += 1;

        active = false;
        entryPrice = 0;
      }
    }

    finalEquity = active ? balance + (Math.floor(balance / entryPrice) * (bar.close - entryPrice)) : balance;
    peakEquity = Math.max(peakEquity, finalEquity);
    if (peakEquity > 0) {
      maxDrawdown = Math.max(maxDrawdown, ((peakEquity - finalEquity) / peakEquity) * 100);
    }
  }

  const durationYears = Math.max(validBars.length / 260, 0.001); // Approx 260 trading days/year
  const sysRoi = ((finalEquity - initialCapital) / initialCapital) * 100;
  const annualCagr = finalEquity > 0 ? ((finalEquity / initialCapital) ** (1 / durationYears) - 1) * 100 : 0;
  
  const firstClose = validBars.length > 0 ? validBars[0].close : 0;
  const lastClose = validBars.length > 0 ? validBars[validBars.length - 1].close : 0;
  const buyHoldRoi = firstClose > 0 ? ((lastClose / firstClose) - 1) * 100 : 0;

  return {
    metrics: {
      sysRoi: sysRoi,
      buyHoldRoi: buyHoldRoi,
      roiMargin: sysRoi - buyHoldRoi,
      trades: closedTrades,
      winRate: closedTrades > 0 ? (winCount / closedTrades) * 100 : 0,
      maxDrawdown: maxDrawdown,
      maxAdverseExcursion: 0,
      avgAdverseExcursion: 0,
      avgFavorableExcursion: 0,
      annualCagr: annualCagr,
      avgReturnPerTrade: closedTrades > 0 ? accumulatedReturnPct / closedTrades : 0,
      avgBarsPerTrade: 0,
      currentBalance: finalEquity,
    },
    signals,
    latestMasterIndex: null,
    latestMasterIndexAdjusted: null,
  };
}
