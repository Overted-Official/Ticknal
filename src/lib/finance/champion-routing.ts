import type { PriceBar } from '@/strategies/PSI/psiStrategy';
import { runPsiStrategy } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { runPsiV2Strategy } from '@/strategies/PSI_V2/psiV2Strategy';
import { runHydraStrategy } from '@/strategies/Hydra/hydraStrategy';
import type {
  StrategyModelComparisonMetrics,
  WinningUniverseComparisonMetrics,
  TickerChampionInfo,
} from '@/lib/finance/sectors-math';

export interface PrecomputedModelCache {
  barsByTicker: Map<string, PriceBar[]>;
  tickerMap: Map<string, { companyName: string; sector: string; logoUrl: string | null }>;
  psiCache: Map<string, any>;
  psiV2Cache: Map<string, any>;
  hydraCache: Map<string, any>;
  timestamp: number;
}

export interface ModelTickerResult {
  sysRoi: number;
  buyHoldRoi: number;
  alphaVsBh: number;
  winRate: number;
  tradesCount: number;
  avgBars: number;
  adverse: number;
}

export interface MultiModelEvaluationResult {
  tickerChampions: Record<string, TickerChampionInfo>;
  modelsComparison: Record<string, StrategyModelComparisonMetrics>;
  winningUniverseComparison: Record<string, WinningUniverseComparisonMetrics>;
}

const STRATEGY_NAMES: Record<string, string> = {
  psi: 'Typhon',
  psi_v2: 'Cerberus',
  hydra: 'Hydra',
};

/**
 * Calculates quantitative summary metrics for an arbitrary subset of ticker results.
 */
function aggregateMetricsFromTickerResults(
  results: ModelTickerResult[],
  totalScanned: number,
  egx30Return: number,
  tradingDays: number,
  isWinningSubset = false
): StrategyModelComparisonMetrics {
  const count = results.length;
  if (count === 0) {
    return {
      simulatedRoi: 0,
      buyHoldRoi: 0,
      alphaVsBh: 0,
      alphaVsEgx: 0,
      cagr: 0,
      profitFactor: 1.0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      volatility: 0,
      winRate: 0,
      winLossRatio: 1.0,
      avgHoldingPeriod: '0 bars',
      breadthBeatRate: 0,
      totalTrades: 0,
    };
  }

  const years = Math.max(0.05, tradingDays / 252);
  let sumRoi = 0;
  let sumBh = 0;
  let totalTrades = 0;
  let sumWinRate = 0;
  let stocksWithTrades = 0;
  let sumBarsHeld = 0;
  let maxDd = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let beatingCount = 0;
  const roiList: number[] = [];

  for (const r of results) {
    sumRoi += r.sysRoi;
    sumBh += r.buyHoldRoi;
    totalTrades += r.tradesCount;
    roiList.push(r.sysRoi);

    if (r.sysRoi > 0) {
      grossProfit += r.sysRoi;
    } else if (r.sysRoi < 0) {
      grossLoss += Math.abs(r.sysRoi);
    }

    if (r.sysRoi > r.buyHoldRoi) {
      beatingCount++;
    }

    if (r.tradesCount > 0) {
      sumWinRate += r.winRate;
      stocksWithTrades++;
      sumBarsHeld += r.avgBars;
      if (Math.abs(r.adverse) > maxDd) {
        maxDd = Math.abs(r.adverse);
      }
    }
  }

  const simulatedRoi = sumRoi / count;
  const buyHoldRoi = sumBh / count;
  const alphaVsBh = simulatedRoi - buyHoldRoi;
  const alphaVsEgx = simulatedRoi - egx30Return;
  const winRate = stocksWithTrades > 0 ? sumWinRate / stocksWithTrades : 0;
  const avgHoldingBars = stocksWithTrades > 0 ? Math.round(sumBarsHeld / stocksWithTrades) : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 3.5 : 1.0;
  const breadthBeatRate = isWinningSubset ? 100 : totalScanned > 0 ? (beatingCount / totalScanned) * 100 : 0;

  // CAGR
  let cagr = 0;
  if (simulatedRoi > -100 && years > 0) {
    if (years >= 1) {
      cagr = (Math.pow(1 + simulatedRoi / 100, 1 / years) - 1) * 100;
    } else {
      cagr = simulatedRoi / years;
    }
  }

  // Volatility
  let volatility = 10.0;
  if (roiList.length > 1) {
    const mean = roiList.reduce((a, b) => a + b, 0) / roiList.length;
    const variance = roiList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / roiList.length;
    volatility = Math.sqrt(variance);
  }

  // Sharpe, Sortino, Calmar
  const sharpeRatio = volatility > 0 ? Math.max(0, (simulatedRoi - 5.0) / volatility) : 1.5;
  const downsideVar = roiList.length > 0
    ? roiList.reduce((a, b) => a + (b < 0 ? Math.pow(b, 2) : 0), 0) / roiList.length
    : 0;
  const downsideDev = Math.sqrt(downsideVar);
  const sortinoRatio = downsideDev > 0 ? Math.max(0, simulatedRoi / downsideDev) : sharpeRatio * 1.3;
  const calmarRatio = maxDd > 0 ? Math.abs(simulatedRoi / maxDd) : 2.0;

  // Win/Loss Ratio
  const winRoiList = roiList.filter((r) => r > 0);
  const lossRoiList = roiList.filter((r) => r < 0);
  const avgWin = winRoiList.length > 0 ? winRoiList.reduce((a, b) => a + b, 0) / winRoiList.length : 1;
  const avgLoss = lossRoiList.length > 0 ? Math.abs(lossRoiList.reduce((a, b) => a + b, 0) / lossRoiList.length) : 1;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1.5;

  let avgHoldingPeriod = `${avgHoldingBars} bars`;
  if (avgHoldingBars >= 20) {
    const mo = (avgHoldingBars / 21).toFixed(1);
    avgHoldingPeriod = `${mo} ${mo === '1.0' ? 'Mo' : 'Mos'} (${avgHoldingBars}b)`;
  }

  return {
    simulatedRoi,
    buyHoldRoi,
    alphaVsBh,
    alphaVsEgx,
    cagr,
    profitFactor,
    maxDrawdown: -maxDd,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    volatility,
    winRate,
    winLossRatio,
    avgHoldingPeriod,
    breadthBeatRate,
    totalTrades,
  };
}

/**
 * Unified multi-model evaluation that computes:
 * 1. Champion Model assignment for every ticker
 * 2. Full-universe metrics for Typhon, Cerberus, and Hydra
 * 3. Winning-universe metrics for Typhon, Cerberus, and Hydra (Option A)
 */
export function evaluateModelsAndChampions(
  cache: PrecomputedModelCache,
  startDate: string,
  endDate: string,
  egx30Return: number,
  tradingDays: number
): MultiModelEvaluationResult {
  const modelTickerResults: Record<'psi' | 'psi_v2' | 'hydra', ModelTickerResult[]> = {
    psi: [],
    psi_v2: [],
    hydra: [],
  };

  const tickerChampions: Record<string, TickerChampionInfo> = {};
  let totalScanned = 0;

  for (const [symbol, bars] of cache.barsByTicker.entries()) {
    const meta = cache.tickerMap.get(symbol);
    const isIndexOrMacro =
      meta?.sector === 'Indices' ||
      meta?.sector === 'Macro' ||
      ['EGX30', 'EGX70', 'EGX100', 'USDEGP', 'GC1!', 'SI1!'].includes(symbol);
    const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol) || meta?.sector === 'Funds';
    if (isIndexOrMacro || isFund) continue;
    if (!bars || bars.length < 130) continue;
    totalScanned++;

    // Compute Buy & Hold reference for the exact timeframe
    let buyHoldRoi = 0;
    if (bars.length > 1) {
      const firstBar = bars.find((b) => b.date >= startDate) || bars[0];
      const lastBar = endDate
        ? [...bars].reverse().find((b) => b.date <= endDate) || bars[bars.length - 1]
        : bars[bars.length - 1];
      if (firstBar && firstBar.close > 0 && lastBar) {
        buyHoldRoi = ((lastBar.close - firstBar.close) / firstBar.close) * 100;
      }
    }

    // 1. Typhon (PSI)
    const psiSeries = cache.psiCache.get(symbol);
    const psiRes = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate, endDate }), psiSeries);
    const psiRoi = psiRes.metrics?.sysRoi || 0;
    const psiBhRoi = psiRes.metrics?.buyHoldRoi || buyHoldRoi;
    const psiAlpha = psiRoi - psiBhRoi;
    const psiResult: ModelTickerResult = {
      sysRoi: psiRoi,
      buyHoldRoi: psiBhRoi,
      alphaVsBh: psiAlpha,
      winRate: psiRes.metrics?.winRate || 0,
      tradesCount: psiRes.metrics?.trades || 0,
      avgBars: psiRes.metrics?.avgBarsPerTrade || 0,
      adverse: psiRes.metrics?.avgAdverseExcursion || psiRes.metrics?.maxAdverseExcursion || 0,
    };
    modelTickerResults.psi.push(psiResult);

    // 2. Cerberus (PSI V2)
    const psiV2Series = cache.psiV2Cache.get(symbol);
    const psiV2Res = runPsiV2Strategy(bars, { ticker: symbol, startDate, endDate }, psiV2Series);
    const psiV2Roi = psiV2Res.metrics?.sysRoi || 0;
    const psiV2BhRoi = psiV2Res.metrics?.buyHoldRoi || buyHoldRoi;
    const psiV2Alpha = psiV2Roi - psiV2BhRoi;
    const psiV2Result: ModelTickerResult = {
      sysRoi: psiV2Roi,
      buyHoldRoi: psiV2BhRoi,
      alphaVsBh: psiV2Alpha,
      winRate: psiV2Res.metrics?.winRate || 0,
      tradesCount: psiV2Res.metrics?.trades || 0,
      avgBars: psiV2Res.metrics?.avgBarsPerTrade || 0,
      adverse: psiV2Res.metrics?.avgAdverseExcursion || psiV2Res.metrics?.maxAdverseExcursion || 0,
    };
    modelTickerResults.psi_v2.push(psiV2Result);

    // 3. Hydra
    const hydraPoints = cache.hydraCache.get(symbol);
    const hydraRes = runHydraStrategy(bars, { ticker: symbol, startDate, endDate }, hydraPoints);
    const hydraRoi = hydraRes.metrics?.sysRoi || 0;
    const hydraBhRoi = hydraRes.metrics?.buyHoldRoi || buyHoldRoi;
    const hydraAlpha = hydraRoi - hydraBhRoi;
    const hydraResult: ModelTickerResult = {
      sysRoi: hydraRoi,
      buyHoldRoi: hydraBhRoi,
      alphaVsBh: hydraAlpha,
      winRate: hydraRes.metrics?.winRate || 0,
      tradesCount: hydraRes.metrics?.trades || 0,
      avgBars: hydraRes.metrics?.avgBarsPerTrade || 0,
      adverse: hydraRes.metrics?.avgAdverseExcursion || hydraRes.metrics?.maxAdverseExcursion || 0,
    };
    modelTickerResults.hydra.push(hydraResult);

    // Determine Champion Model for this ticker
    const candidates = [
      { id: 'psi' as const, name: 'Typhon', alpha: psiAlpha, roi: psiRoi, bhRoi: psiBhRoi },
      { id: 'psi_v2' as const, name: 'Cerberus', alpha: psiV2Alpha, roi: psiV2Roi, bhRoi: psiV2BhRoi },
      { id: 'hydra' as const, name: 'Hydra', alpha: hydraAlpha, roi: hydraRoi, bhRoi: hydraBhRoi },
    ];
    candidates.sort((a, b) => b.alpha - a.alpha);
    const top = candidates[0];

    tickerChampions[symbol] = {
      champion: top.id,
      championName: top.name,
      alpha: top.alpha,
      roi: top.roi,
      buyHoldRoi: top.bhRoi,
      hasPositiveAlpha: top.alpha > 0,
    };
  }

  // 1. Compute Full Universe Metrics for all 3 models
  const modelsComparison: Record<string, StrategyModelComparisonMetrics> = {
    psi: aggregateMetricsFromTickerResults(modelTickerResults.psi, totalScanned, egx30Return, tradingDays, false),
    psi_v2: aggregateMetricsFromTickerResults(modelTickerResults.psi_v2, totalScanned, egx30Return, tradingDays, false),
    hydra: aggregateMetricsFromTickerResults(modelTickerResults.hydra, totalScanned, egx30Return, tradingDays, false),
  };

  // 2. Compute Winning Universe Metrics for all 3 models (Option A)
  const winningPsi = modelTickerResults.psi.filter((r) => r.alphaVsBh > 0);
  const winningPsiV2 = modelTickerResults.psi_v2.filter((r) => r.alphaVsBh > 0);
  const winningHydra = modelTickerResults.hydra.filter((r) => r.alphaVsBh > 0);

  const winningUniverseComparison: Record<string, WinningUniverseComparisonMetrics> = {
    psi: {
      ...aggregateMetricsFromTickerResults(winningPsi, totalScanned, egx30Return, tradingDays, true),
      winningTickersCount: winningPsi.length,
      totalScanned,
      winningBreadthPct: totalScanned > 0 ? (winningPsi.length / totalScanned) * 100 : 0,
    },
    psi_v2: {
      ...aggregateMetricsFromTickerResults(winningPsiV2, totalScanned, egx30Return, tradingDays, true),
      winningTickersCount: winningPsiV2.length,
      totalScanned,
      winningBreadthPct: totalScanned > 0 ? (winningPsiV2.length / totalScanned) * 100 : 0,
    },
    hydra: {
      ...aggregateMetricsFromTickerResults(winningHydra, totalScanned, egx30Return, tradingDays, true),
      winningTickersCount: winningHydra.length,
      totalScanned,
      winningBreadthPct: totalScanned > 0 ? (winningHydra.length / totalScanned) * 100 : 0,
    },
  };

  return {
    tickerChampions,
    modelsComparison,
    winningUniverseComparison,
  };
}

/**
 * Checks whether an incoming signal for a ticker originated from its assigned Champion model.
 * If requirePositiveAlpha is true (default), returns false if even the champion has negative alpha.
 */
export function isChampionSignal(
  symbol: string,
  strategyId: string,
  tickerChampions: Record<string, TickerChampionInfo>,
  requirePositiveAlpha = true
): { allowed: boolean; reason: string; championInfo?: TickerChampionInfo } {
  const normSym = symbol.replace('.CA', '').toUpperCase();
  const info = tickerChampions[normSym] || tickerChampions[symbol];

  if (!info) {
    // If not found in champions map, fallback to allow
    return { allowed: true, reason: 'No champion profile established' };
  }

  if (requirePositiveAlpha && !info.hasPositiveAlpha) {
    return {
      allowed: false,
      reason: `All algorithms have negative alpha vs B&H on ${symbol}`,
      championInfo: info,
    };
  }

  const normalizedStrategyId =
    strategyId === 'psiv2' || strategyId === 'cerberus' ? 'psi_v2' : strategyId;

  if (normalizedStrategyId !== info.champion) {
    return {
      allowed: false,
      reason: `Signal strategy (${normalizedStrategyId}) is not the champion model (${info.champion}) for ${symbol}`,
      championInfo: info,
    };
  }

  return {
    allowed: true,
    reason: `Champion model confirmed (${info.championName})`,
    championInfo: info,
  };
}
