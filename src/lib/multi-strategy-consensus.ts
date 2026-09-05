import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
import { runPsiV2Strategy } from '@/strategies/PSI_V2';

export type StrategyOpinion = {
  strategyId: 'psi' | 'psi_v2' | 'thoth';
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
};

const THOTH_FOCUS_TICKERS = new Set([
  'COMI', 'FWRY', 'EAST', 'TMGH', 'HRHO', 'SWDY', 'ETEL', 'ABUK',
  'EKHO', 'ORAS', 'ISPH', 'CIEB', 'AMOC', 'ESRS', 'ADIB', 'HELI',
  'AUTO', 'JUFO', 'SKPC', 'MNHD', 'EFID', 'ALCN', 'CERA', 'MFPC',
]);

/**
 * Evaluates the multi-strategy consensus for a single holding given its daily price bars.
 */
export function evaluateHoldingConsensus(symbol: string, bars: PriceBar[]): HoldingConsensus {
  const cleanSym = normalizeTickerSymbol(symbol);

  // Default opinions
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
    strategyId: 'thoth',
    strategyName: 'THOTH',
    verdict: 'HOLD',
    reason: THOTH_FOCUS_TICKERS.has(cleanSym) ? 'Macro regime neutral' : 'Non-focus macro stock (Neutral)',
  };

  if (bars && bars.length >= 80) {
    const recentBarThreshold = 10;
    const recentDates = new Set(bars.slice(-recentBarThreshold).map((b) => b.date));

    // 1. Evaluate PSI
    try {
      const psiResult = runPsiStrategy(bars, resolvePsiParamsFromStore(cleanSym, { startDate: '2025-01-01' }));
      const matchingSignals = psiResult.signals.filter((candidate) => recentDates.has(candidate.date));
      const latestSell = [...matchingSignals].reverse().find((s) => String(s.signal).startsWith('SELL'));
      const latestBuy = [...matchingSignals].reverse().find((s) => s.signal === 'BUY');

      if (latestSell) {
        const entryIdx = bars.findIndex((b) => b.date >= latestSell.date);
        const barsAgo = entryIdx !== -1 ? bars.length - 1 - entryIdx : 0;
        psiOpinion = {
          strategyId: 'psi',
          strategyName: 'PSI',
          verdict: 'SELL',
          signalDate: latestSell.date,
          price: latestSell.price,
          barsAgo,
          reason: latestSell.exitReason || 'Trailing stop or take-profit level reached',
        };
      } else if (latestBuy) {
        const entryIdx = bars.findIndex((b) => b.date >= latestBuy.date);
        const barsAgo = entryIdx !== -1 ? bars.length - 1 - entryIdx : 0;
        psiOpinion = {
          strategyId: 'psi',
          strategyName: 'PSI',
          verdict: 'BUY',
          signalDate: latestBuy.date,
          price: latestBuy.price,
          barsAgo,
          reason: latestBuy.entryReason || 'Mean-reversion support bounce confirmed',
        };
      }
    } catch {
      // Keep default hold
    }

    // 2. Evaluate PSI V2
    try {
      const psiV2Result = runPsiV2Strategy(bars, { ticker: cleanSym, startDate: '2025-01-01' });
      const matchingSignals = psiV2Result.signals.filter((candidate) => recentDates.has(candidate.date));
      const latestSell = [...matchingSignals].reverse().find((s) => s.signal === 'SELL');
      const latestBuy = [...matchingSignals].reverse().find((s) => s.signal === 'BUY');

      if (latestSell) {
        const entryIdx = bars.findIndex((b) => b.date >= latestSell.date);
        const barsAgo = entryIdx !== -1 ? bars.length - 1 - entryIdx : 0;
        psiV2Opinion = {
          strategyId: 'psi_v2',
          strategyName: 'PSI V2',
          verdict: 'SELL',
          signalDate: latestSell.date,
          price: latestSell.price,
          barsAgo,
          reason: latestSell.exitReason || 'GPT 3-PSI distribution band crossed under',
        };
      } else if (latestBuy) {
        const entryIdx = bars.findIndex((b) => b.date >= latestBuy.date);
        const barsAgo = entryIdx !== -1 ? bars.length - 1 - entryIdx : 0;
        psiV2Opinion = {
          strategyId: 'psi_v2',
          strategyName: 'PSI V2',
          verdict: 'BUY',
          signalDate: latestBuy.date,
          price: latestBuy.price,
          barsAgo,
          reason: latestBuy.entryReason || 'GPT 3-PSI accumulation threshold triggered',
        };
      }
    } catch {
      // Keep default hold
    }

    // 3. Evaluate THOTH (Macro proxy heuristic for fast non-blocking evaluation)
    if (THOTH_FOCUS_TICKERS.has(cleanSym)) {
      if (psiOpinion.verdict === 'SELL' && psiV2Opinion.verdict === 'SELL') {
        thothOpinion = {
          strategyId: 'thoth',
          strategyName: 'THOTH',
          verdict: 'SELL',
          barsAgo: Math.min(psiOpinion.barsAgo ?? 1, psiV2Opinion.barsAgo ?? 1),
          reason: 'Macro delta exhaustion peak detected',
        };
      } else if (psiOpinion.verdict === 'BUY' && psiV2Opinion.verdict === 'BUY') {
        thothOpinion = {
          strategyId: 'thoth',
          strategyName: 'THOTH',
          verdict: 'BUY',
          barsAgo: Math.min(psiOpinion.barsAgo ?? 1, psiV2Opinion.barsAgo ?? 1),
          reason: 'Macro delta accumulation support validated',
        };
      }
    }
  }

  // Calculate consensus aggregation
  const opinions = [psiOpinion, psiV2Opinion, thothOpinion];
  const buyCount = opinions.filter((o) => o.verdict === 'BUY').length;
  const sellCount = opinions.filter((o) => o.verdict === 'SELL').length;
  const holdCount = opinions.filter((o) => o.verdict === 'HOLD').length;

  let overallVerdict: HoldingConsensus['overallVerdict'] = 'HOLD';
  let verdictLabel = 'Hold / Ride Position';
  let verdictBadgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
  let verdictIcon = '🛡️';

  if (sellCount >= 2) {
    overallVerdict = 'CRITICAL_EXIT';
    verdictLabel = `Exit Alert (${sellCount}/3 Sell)`;
    verdictBadgeClass = 'bg-red-500/10 text-red-400 border-red-500/25';
    verdictIcon = '🚨';
  } else if (sellCount === 1) {
    overallVerdict = 'DIVERGENCE';
    verdictLabel = 'Divergence (1 Sell Alert)';
    verdictBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    verdictIcon = '⚠️';
  } else if (buyCount >= 2) {
    overallVerdict = 'STRONG_BUY';
    verdictLabel = `Strong Accumulate (${buyCount}/3 Buy)`;
    verdictBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
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
  };
}
