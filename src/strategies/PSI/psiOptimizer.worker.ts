import { runPsiStrategy, PriceBar, PsiStrategyParams } from './psiStrategy';

export type OptimizationConfig = {
  bars: PriceBar[];
  entryLevelsGrid: number[][]; // e.g. [[14.6], [23.6], [38.2], [14.6, 23.6], etc.]
  aymMultipliers: number[];
  aymLimits: number[];
  atrDistances: number[];
  stoplossLevels: number[];
  initialCapital: number;
  startDate: string;
  endDate: string;
};

self.onmessage = (e: MessageEvent<OptimizationConfig>) => {
  const config = e.data;
  const { 
    bars, 
    entryLevelsGrid, 
    aymMultipliers, 
    aymLimits, 
    atrDistances, 
    stoplossLevels,
    initialCapital,
    startDate,
    endDate
  } = config;

  let bestScore = -Infinity;
  let bestParams: Partial<PsiStrategyParams> | null = null;
  let totalCombinations = 
    entryLevelsGrid.length * 
    aymMultipliers.length * 
    aymLimits.length * 
    atrDistances.length * 
    stoplossLevels.length;
    
  let completed = 0;

  for (const entryLevels of entryLevelsGrid) {
    for (const aymMultiplier of aymMultipliers) {
      for (const aymLimit of aymLimits) {
        for (const atrDistance of atrDistances) {
          for (const stoplossLevel of stoplossLevels) {
            
            const params: PsiStrategyParams = {
              entryLevels,
              useAym: true,
              aymMultiplier,
              aymLimit,
              useAtr: true,
              atrDistance,
              useStoploss: true,
              stoplossLevel,
              useStructStop: false,
              structLookback: 20,
              initialCapital,
              startDate,
              endDate
            };

            const result = runPsiStrategy(bars, params);
            
            // Score = ROI% * 2.0 + WinRate% * 1.0 - (AvgBars * 0.5)
            // (Weights can be adjusted, this favors high ROI, decent winrate, fast trades)
            const roi = result.metrics.roiMargin || 0; 
            const winRate = result.metrics.winRate || 0;
            const avgBars = result.metrics.avgBarsPerTrade || 0;
            const trades = result.metrics.trades || 0;

            let score = -Infinity;
            if (trades > 0) {
                score = (roi * 2.0) + (winRate * 1.0) - (avgBars * 0.5);
            }

            if (score > bestScore) {
              bestScore = score;
              bestParams = params;
            }

            completed++;
            if (completed % 100 === 0) {
              self.postMessage({ type: 'progress', progress: (completed / totalCombinations) * 100 });
            }
          }
        }
      }
    }
  }

  self.postMessage({ 
    type: 'done', 
    bestParams,
    bestScore 
  });
};
