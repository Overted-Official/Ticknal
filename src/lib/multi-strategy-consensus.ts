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
    strategyName: 'PSI',
    verdict: 'HOLD',
    reason: 'In consolidation or standard trend following',
  };

  let psiV2Opinion: StrategyOpinion = {
    strategyId: 'psi_v2',
    strategyName: 'PSI V2',
    verdict: 'HOLD',
    reason: 'Multi-timeframe indices inside healthy range',
  };

  let thothOpinion: StrategyOpinion = {
    strategyId: 'thoth_egx_macro',
    strategyName: 'THOTH',
    verdict: 'HOLD',
    reason: THOTH_FOCUS_TICKERS.has(cleanSym) ? 'Macro regime neutral' : 'Non-focus macro stock (Neutral)',
  };
  let psiMetrics = unavailableMetrics();
  let psiV2Metrics = unavailableMetrics();
  let thothMetrics = unavailableMetrics();

  if (bars && bars.length >= 80) {
    const analyses = await Promise.allSettled([
      analyzeStrategy(cleanSym, bars, 'psi', { lookbackBars }),
      analyzeStrategy(cleanSym, bars, 'psi_v2', { lookbackBars }),
      analyzeStrategy(cleanSym, bars, 'thoth_egx_macro', { lookbackBars }),
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
      psiOpinion = toOpinion(analyses[0].value, 'PSI');
      psiMetrics = analyses[0].value.metrics;
    }
    else psiOpinion.reason = 'PSI signal unavailable for this ticker';
    if (analyses[1].status === 'fulfilled') {
      psiV2Opinion = toOpinion(analyses[1].value, 'PSI V2');
      psiV2Metrics = analyses[1].value.metrics;
    }
    else psiV2Opinion.reason = 'PSI V2 signal unavailable for this ticker';
    if (analyses[2].status === 'fulfilled') {
      thothOpinion = toOpinion(analyses[2].value, 'THOTH');
      thothMetrics = analyses[2].value.metrics;
    }
    else thothOpinion.reason = THOTH_FOCUS_TICKERS.has(cleanSym)
      ? 'THOTH signal unavailable for this ticker'
      : 'THOTH coverage not available for this ticker';
  }

  // Calculate consensus aggregation
  const opinions = [psiOpinion, psiV2Opinion, thothOpinion];
  const buyCount = opinions.filter((o) => o.verdict === 'BUY').length;
  const sellCount = opinions.filter((o) => o.verdict === 'SELL').length;
  const holdCount = opinions.filter((o) => o.verdict === 'HOLD').length;

  let overallVerdict: HoldingConsensus['overallVerdict'] = 'HOLD';
  let verdictLabel = 'Hold / Ride Position';
  let verdictBadgeClass = 'bg-plt-info-soft text-plt-info border-plt-info-border';
  let verdictIcon = '🛡️';

  if (sellCount >= 2) {
    overallVerdict = 'CRITICAL_EXIT';
    verdictLabel = `Exit Alert (${sellCount} of 3 strategies)`;
    verdictBadgeClass = 'bg-plt-risk-soft text-plt-risk border-plt-risk-border';
    verdictIcon = '🚨';
  } else if (sellCount === 1) {
    overallVerdict = 'DIVERGENCE';
    verdictLabel = 'Divergence (1 Sell Alert)';
    verdictBadgeClass = 'bg-plt-warning-soft text-plt-warning border-plt-warning-border';
    verdictIcon = '⚠️';
  } else if (buyCount >= 2) {
    overallVerdict = 'STRONG_BUY';
    verdictLabel = `Strong Accumulate (${buyCount} of 3 strategies)`;
    verdictBadgeClass = 'bg-plt-profit-soft text-plt-profit border-plt-profit-border';
    verdictIcon = '🟢';
  }

  return {
    symbol: cleanSym,
    opinions: {
      psi: psiOpinion,
      psiV2: psiV2Opinion,
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
      thoth: thothMetrics,
    },
  };
}
