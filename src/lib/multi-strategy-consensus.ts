import { normalizeTickerSymbol, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { DEFAULT_SIGNAL_LOOKBACK_BARS, signalWindowLabel } from '@/lib/strategy-signal-state';
import { analyzeStrategy, type StrategyId, type StrategyMetrics } from '@/lib/strategy-analysis';

export type StrategyOpinion = {
  strategyId: StrategyId;
  strategyName: string;
  verdict: 'BUY' | 'HOLD' | 'SELL';
  signalDate?: string;
  price?: number;
  barsAgo?: number;
  confidence?: number;
  reason?: string;
};

export type HoldingConsensus = {
  symbol: string;
  opinions: {
    psi: StrategyOpinion;
    psiV2: StrategyOpinion;
    hydra: StrategyOpinion;
    thoth: StrategyOpinion;
  };
  overallVerdict: 'STRONG_BUY' | 'HOLD' | 'DIVERGENCE' | 'CRITICAL_EXIT';
  verdictLabel: string;
  verdictBadgeClass: string;
  verdictIcon: string;
  buyCount: number;
  holdCount: number;
  sellCount: number;
  lookbackBars: number;
  strategyMetrics: {
    psi: StrategyMetrics;
    psiV2: StrategyMetrics;
    hydra: StrategyMetrics;
    thoth: StrategyMetrics;
  };
};

const THOTH_FOCUS_TICKERS = new Set([
  'COMI', 'FWRY', 'EAST', 'TMGH', 'HRHO', 'SWDY', 'ETEL', 'ABUK',
  'EKHO', 'ORAS', 'ISPH', 'CIEB', 'AMOC', 'ESRS', 'ADIB', 'HELI',
  'AUTO', 'JUFO', 'SKPC', 'MNHD', 'EFID', 'ALCN', 'CERA', 'MFPC',
]);

function unavailableMetrics(): StrategyMetrics {
  return {
    totalReturn: null,
    alpha: null,
    avgBarsPerTrade: null,
    maxDrawdown: null,
    maxAdverseExcursion: null,
    avgAdverseExcursion: null,
    winRate: null,
    trades: null,
    buyHoldReturn: null,
    annualCagr: null,
  };
}

/**
 * Evaluates the multi-strategy consensus for a single holding given its daily price bars.
 */
export async function evaluateHoldingConsensus(
  symbol: string,
  bars: PriceBar[],
  lookbackBars: number = DEFAULT_SIGNAL_LOOKBACK_BARS,
): Promise<HoldingConsensus> {
  const cleanSym = normalizeTickerSymbol(symbol);

  let psiOpinion: StrategyOpinion = {
    strategyId: 'psi',
    strategyName: 'Typhon',
    verdict: 'HOLD',
    reason: 'In consolidation or standard trend following',
  };

  let psiV2Opinion: StrategyOpinion = {
    strategyId: 'psi_v2',
    strategyName: 'Cerberus',
    verdict: 'HOLD',
    reason: 'Multi-timeframe indices inside healthy range',
  };

  let hydraOpinion: StrategyOpinion = {
    strategyId: 'hydra',
    strategyName: 'Hydra',
    verdict: 'HOLD',
    reason: 'Adaptive volatility index in equilibrium',
  };

  let thothOpinion: StrategyOpinion = {
    strategyId: 'thoth_egx_macro',
    strategyName: 'Archived',
    verdict: 'HOLD',
    reason: 'Archived model',
  };
  let psiMetrics = unavailableMetrics();
  let psiV2Metrics = unavailableMetrics();
  let hydraMetrics = unavailableMetrics();
  let thothMetrics = unavailableMetrics();

  if (bars && bars.length >= 80) {
    const analyses = await Promise.allSettled([
      analyzeStrategy(cleanSym, bars, 'psi', { lookbackBars }),
      analyzeStrategy(cleanSym, bars, 'psi_v2', { lookbackBars }),
      analyzeStrategy(cleanSym, bars, 'hydra', { lookbackBars }),
    ]);

    const toOpinion = (analysis: Awaited<ReturnType<typeof analyzeStrategy>>, strategyName: string): StrategyOpinion => {
      const signal = analysis.latestActionableSignal;
      if (!signal) {
        return {
          strategyId: analysis.strategyId,
          strategyName,
          verdict: 'HOLD',
          reason: `No fresh ${strategyName} signal in ${signalWindowLabel()}`,
        };
      }
      return {
        strategyId: analysis.strategyId,
        strategyName,
        verdict: signal.signal,
        signalDate: signal.date,
        price: signal.price,
        barsAgo: signal.barsAgo,
        reason: signal.reason || `${strategyName} ${signal.signal} signal`,
      };
    };

    if (analyses[0].status === 'fulfilled') {
      psiOpinion = toOpinion(analyses[0].value, 'Typhon');
      psiMetrics = analyses[0].value.metrics;
    }
    else psiOpinion.reason = 'Typhon signal unavailable for this ticker';

    if (analyses[1].status === 'fulfilled') {
      psiV2Opinion = toOpinion(analyses[1].value, 'Cerberus');
      psiV2Metrics = analyses[1].value.metrics;
    }
    else psiV2Opinion.reason = 'Cerberus signal unavailable for this ticker';

    if (analyses[2].status === 'fulfilled') {
      hydraOpinion = toOpinion(analyses[2].value, 'Hydra');
      hydraMetrics = analyses[2].value.metrics;
    }
    else hydraOpinion.reason = 'Hydra signal unavailable for this ticker';
  }

  // Calculate multi-strategy consensus aggregation (Typhon, Cerberus, Hydra)
  const opinions = [psiOpinion, psiV2Opinion, hydraOpinion];
  const buyCount = opinions.filter((o) => o.verdict === 'BUY').length;
  const sellCount = opinions.filter((o) => o.verdict === 'SELL').length;
  const holdCount = opinions.filter((o) => o.verdict === 'HOLD').length;

  let overallVerdict: HoldingConsensus['overallVerdict'] = 'HOLD';
  let verdictLabel = 'Hold / Ride Position';
  let verdictBadgeClass = 'bg-[#18181b] text-[#787b86] border-[#27272a]';
  let verdictIcon = '🛡️';

  if (sellCount >= 2) {
    overallVerdict = 'CRITICAL_EXIT';
    verdictLabel = `Exit Alert (${sellCount}/3 Engines)`;
    verdictBadgeClass = 'bg-[#f23645]/15 text-[#f23645] border-[#f23645]/30';
    verdictIcon = '🚨';
  } else if (sellCount === 1) {
    overallVerdict = 'DIVERGENCE';
    verdictLabel = 'Divergence (1 Exit Alert)';
    verdictBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    verdictIcon = '⚠️';
  } else if (buyCount >= 2) {
    overallVerdict = 'STRONG_BUY';
    verdictLabel = `Strong Accumulate (${buyCount}/3 Engines)`;
    verdictBadgeClass = 'bg-[#089981]/15 text-[#089981] border-[#089981]/30';
    verdictIcon = '🟢';
  } else if (buyCount === 1) {
    overallVerdict = 'STRONG_BUY';
    verdictLabel = 'Moderate Accumulate (1 Buy Alert)';
    verdictBadgeClass = 'bg-[#089981]/15 text-[#089981] border-[#089981]/30';
    verdictIcon = '🟢';
  }

  return {
    symbol: cleanSym,
    opinions: {
      psi: psiOpinion,
      psiV2: psiV2Opinion,
      hydra: hydraOpinion,
      thoth: thothOpinion,
    },
    overallVerdict,
    verdictLabel,
    verdictBadgeClass,
    verdictIcon,
    buyCount,
    holdCount,
    sellCount,
    lookbackBars,
    strategyMetrics: {
      psi: psiMetrics,
      psiV2: psiV2Metrics,
      hydra: hydraMetrics,
      thoth: thothMetrics,
    },
  };
}
