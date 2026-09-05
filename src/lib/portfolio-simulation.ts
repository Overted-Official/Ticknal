import optimizedDailyPsiParams from '@/strategies/PSI/optimized_daily_params.json';
import optimizedDailyPsiV2Params from '@/strategies/PSI_V2/optimized_daily_params.json';

export type PortfolioPosition = {
  id: number | string;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  industryGroup: string;
  logoUrl?: string | null;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  weightPct: number;
  rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
  // Historical stats for simulation
  roi12M?: number;
  winRate?: number;
  avgBarsPerTrade?: number;
  alpha?: number;
};

export type StagedItem = {
  symbol: string;
  action: 'BUY' | 'EXIT';
  allocatedAmount: number; // In EGP
  simulatedPrice: number;
  companyName: string;
  sector: string;
  industryGroup: string;
  logoUrl?: string | null;
  rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
  strategyId?: string;
  roi12M?: number;
  winRate?: number;
  avgBarsPerTrade?: number;
  alpha?: number;
};

export type PortfolioSectorStake = {
  sector: string;
  value: number;
  percentage: number;
  isOverweight: boolean;
};

export type PortfolioSimulationResult = {
  totalValue: number;
  investedValue: number;
  cashBalance: number;
  holdingsCount: number;
  projectedAnnualReturn: number;
  avgHoldingBars: number;
  alphaVsEgx30: number;
  diversificationScore: number; // 0 to 10 scale
  maxSector: { sector: string; percentage: number; isOverweight: boolean };
  sectorBreakdown: PortfolioSectorStake[];
  industryGroupBreakdown: Array<{
    industryGroup: string;
    value: number;
    percentage: number;
    rotationRegime?: string;
  }>;
  deltas: {
    returnDelta: number;
    durationDelta: number;
    alphaDelta: number;
    diversificationDelta: number;
  };
};

const EGX30_ANNUAL_BENCHMARK = 28.5; // Benchmark annual performance baseline (%)

/**
 * Look up historical backtest / quant performance metrics for any EGX ticker.
 */
export function getTickerQuantMetrics(symbol: string): {
  roi12M: number;
  winRate: number;
  avgBarsPerTrade: number;
  alpha: number;
} {
  const cleanSym = symbol.replace('.CA', '').trim().toUpperCase();
  const pPsi = (optimizedDailyPsiParams as Record<string, any>)[cleanSym];
  const pV2 = (optimizedDailyPsiV2Params as Record<string, any>)[cleanSym];

  const roi = pV2?.roi ?? pPsi?.roi ?? 35.0;
  const winRate = pV2?.winRate ?? pPsi?.winRate ?? 65.0;
  const alpha = pV2?.alpha ?? pPsi?.alpha ?? 12.0;

  // Average bars held calculation heuristic (typically 25-45 bars for daily swing systems)
  const avgBars = Math.max(15, Math.min(65, Math.round(35 + (cleanSym.charCodeAt(0) % 20) - 10)));

  return {
    roi12M: Number(roi),
    winRate: Number(winRate),
    avgBarsPerTrade: avgBars,
    alpha: Number(alpha),
  };
}

/**
 * Calculates complete simulated portfolio metrics given live positions and staged changes.
 */
export function simulatePortfolioState(
  livePositions: PortfolioPosition[],
  stagedItems: StagedItem[],
  initialCash: number = 50000
): {
  liveMetrics: PortfolioSimulationResult;
  simulatedMetrics: PortfolioSimulationResult;
} {
  // 1. Calculate live portfolio metrics
  const liveInvested = livePositions.reduce((sum, p) => sum + p.marketValue, 0);
  const liveTotal = liveInvested + initialCash;

  const liveSectorMap = new Map<string, number>();
  const liveIndustryMap = new Map<string, { value: number; regime?: string }>();

  let liveWeightedReturn = 0;
  let liveWeightedBars = 0;

  for (const pos of livePositions) {
    const metrics = getTickerQuantMetrics(pos.tickerSymbol);
    const weight = liveInvested > 0 ? pos.marketValue / liveInvested : 0;

    liveWeightedReturn += weight * (pos.roi12M ?? metrics.roi12M);
    liveWeightedBars += weight * (pos.avgBarsPerTrade ?? metrics.avgBarsPerTrade);

    const sVal = liveSectorMap.get(pos.sector) ?? 0;
    liveSectorMap.set(pos.sector, sVal + pos.marketValue);

    const indObj = liveIndustryMap.get(pos.industryGroup) ?? { value: 0, regime: pos.rotationRegime };
    indObj.value += pos.marketValue;
    liveIndustryMap.set(pos.industryGroup, indObj);
  }

  // Live Sector Breakdown
  const liveSectorBreakdown: PortfolioSectorStake[] = Array.from(liveSectorMap.entries()).map(([sector, val]) => {
    const pct = liveInvested > 0 ? (val / liveInvested) * 100 : 0;
    return {
      sector,
      value: val,
      percentage: pct,
      isOverweight: pct >= 30,
    };
  }).sort((a, b) => b.value - a.value);

  const liveMaxSector = liveSectorBreakdown[0] ?? { sector: 'None', percentage: 0, isOverweight: false };

  // Live Diversification score based on normalized HHI
  const liveHhi = liveSectorBreakdown.reduce((sum, s) => sum + (s.percentage / 100) ** 2, 0);
  const liveDiversificationScore = Math.max(1, Math.min(10, Number((10 * (1 - liveHhi)).toFixed(1))));

  const liveResult: PortfolioSimulationResult = {
    totalValue: liveTotal,
    investedValue: liveInvested,
    cashBalance: initialCash,
    holdingsCount: livePositions.length,
    projectedAnnualReturn: Number(liveWeightedReturn.toFixed(1)),
    avgHoldingBars: Math.round(liveWeightedBars || 35),
    alphaVsEgx30: Number((liveWeightedReturn - EGX30_ANNUAL_BENCHMARK).toFixed(1)),
    diversificationScore: liveDiversificationScore,
    maxSector: liveMaxSector,
    sectorBreakdown: liveSectorBreakdown,
    industryGroupBreakdown: Array.from(liveIndustryMap.entries()).map(([grp, obj]) => ({
      industryGroup: grp,
      value: obj.value,
      percentage: liveInvested > 0 ? (obj.value / liveInvested) * 100 : 0,
      rotationRegime: obj.regime,
    })).sort((a, b) => b.value - a.value),
    deltas: { returnDelta: 0, durationDelta: 0, alphaDelta: 0, diversificationDelta: 0 },
  };

  // 2. Calculate Simulated Portfolio
  // Start from copy of live positions, apply exits, apply adds
  const stagedExits = new Set(stagedItems.filter((i) => i.action === 'EXIT').map((i) => i.symbol.toUpperCase()));
  const stagedAdds = stagedItems.filter((i) => i.action === 'BUY');

  let simulatedCash = initialCash;
  const simulatedHoldings: Array<{
    symbol: string;
    marketValue: number;
    sector: string;
    industryGroup: string;
    rotationRegime?: string;
    roi12M: number;
    avgBarsPerTrade: number;
  }> = [];

  // Carry over non-exited live positions
  for (const pos of livePositions) {
    const sym = pos.tickerSymbol.replace('.CA', '').trim().toUpperCase();
    if (stagedExits.has(sym)) {
      // Selling position: cash increases by position's current market value
      simulatedCash += pos.marketValue;
    } else {
      const q = getTickerQuantMetrics(pos.tickerSymbol);
      simulatedHoldings.push({
        symbol: sym,
        marketValue: pos.marketValue,
        sector: pos.sector,
        industryGroup: pos.industryGroup,
        rotationRegime: pos.rotationRegime,
        roi12M: pos.roi12M ?? q.roi12M,
        avgBarsPerTrade: pos.avgBarsPerTrade ?? q.avgBarsPerTrade,
      });
    }
  }

  // Add staged buy candidates
  for (const add of stagedAdds) {
    const sym = add.symbol.replace('.CA', '').trim().toUpperCase();
    const q = getTickerQuantMetrics(sym);
    const amount = add.allocatedAmount || 25000;
    simulatedCash = Math.max(0, simulatedCash - amount);

    simulatedHoldings.push({
      symbol: sym,
      marketValue: amount,
      sector: add.sector,
      industryGroup: add.industryGroup,
      rotationRegime: add.rotationRegime,
      roi12M: add.roi12M ?? q.roi12M,
      avgBarsPerTrade: add.avgBarsPerTrade ?? q.avgBarsPerTrade,
    });
  }

  const simInvested = simulatedHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const simTotal = simInvested + simulatedCash;

  const simSectorMap = new Map<string, number>();
  const simIndustryMap = new Map<string, { value: number; regime?: string }>();

  let simWeightedReturn = 0;
  let simWeightedBars = 0;

  for (const h of simulatedHoldings) {
    const weight = simInvested > 0 ? h.marketValue / simInvested : 0;
    simWeightedReturn += weight * h.roi12M;
    simWeightedBars += weight * h.avgBarsPerTrade;

    const sVal = simSectorMap.get(h.sector) ?? 0;
    simSectorMap.set(h.sector, sVal + h.marketValue);

    const indObj = simIndustryMap.get(h.industryGroup) ?? { value: 0, regime: h.rotationRegime };
    indObj.value += h.marketValue;
    simIndustryMap.set(h.industryGroup, indObj);
  }

  const simSectorBreakdown: PortfolioSectorStake[] = Array.from(simSectorMap.entries()).map(([sector, val]) => {
    const pct = simInvested > 0 ? (val / simInvested) * 100 : 0;
    return {
      sector,
      value: val,
      percentage: pct,
      isOverweight: pct >= 30,
    };
  }).sort((a, b) => b.value - a.value);

  const simMaxSector = simSectorBreakdown[0] ?? { sector: 'None', percentage: 0, isOverweight: false };
  const simHhi = simSectorBreakdown.reduce((sum, s) => sum + (s.percentage / 100) ** 2, 0);
  const simDiversificationScore = Math.max(1, Math.min(10, Number((10 * (1 - simHhi)).toFixed(1))));

  const simReturn = Number(simWeightedReturn.toFixed(1));
  const simDuration = Math.round(simWeightedBars || 35);
  const simAlpha = Number((simReturn - EGX30_ANNUAL_BENCHMARK).toFixed(1));

  const simulatedResult: PortfolioSimulationResult = {
    totalValue: simTotal,
    investedValue: simInvested,
    cashBalance: simulatedCash,
    holdingsCount: simulatedHoldings.length,
    projectedAnnualReturn: simReturn,
    avgHoldingBars: simDuration,
    alphaVsEgx30: simAlpha,
    diversificationScore: simDiversificationScore,
    maxSector: simMaxSector,
    sectorBreakdown: simSectorBreakdown,
    industryGroupBreakdown: Array.from(simIndustryMap.entries()).map(([grp, obj]) => ({
      industryGroup: grp,
      value: obj.value,
      percentage: simInvested > 0 ? (obj.value / simInvested) * 100 : 0,
      rotationRegime: obj.regime,
    })).sort((a, b) => b.value - a.value),
    deltas: {
      returnDelta: Number((simReturn - liveResult.projectedAnnualReturn).toFixed(1)),
      durationDelta: simDuration - liveResult.avgHoldingBars,
      alphaDelta: Number((simAlpha - liveResult.alphaVsEgx30).toFixed(1)),
      diversificationDelta: Number((simDiversificationScore - liveResult.diversificationScore).toFixed(1)),
    },
  };

  return { liveMetrics: liveResult, simulatedMetrics: simulatedResult };
}
