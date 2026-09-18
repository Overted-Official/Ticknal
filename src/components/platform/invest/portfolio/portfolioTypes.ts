import type { HoldingConsensus, StrategyOpinion } from '@/lib/multi-strategy-consensus';
import type { OpportunitySignal } from '@/lib/opportunities';
import type { StrategyId, StrategyMetrics } from '@/lib/strategy-analysis';

export type Regime = 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
export type Grouping = 'sector' | 'industryGroup' | 'industry';
export type StrategyFilter = 'all' | StrategyId;
export type SortKey = 'alpha' | 'return' | 'bars' | 'drawdown' | 'mae' | 'date';

export type InitialPosition = {
  id: number | string;
  tickerSymbol: string;
  entryPrice: number;
  quantity: number;
  entryDate?: string;
  createdAt?: string | Date;
  accountId?: number | null;
  entryStrategyId?: string | null;
};

export type TickerMeta = {
  companyName: string;
  sector: string;
  industryGroup: string;
  industry?: string;
  logoUrl: string | null;
};

export type RotationMeta = {
  industryGroup: string;
  rotationRegime?: Regime;
};

export type Account = {
  id: number;
  accountName: string;
  customBankName?: string | null;
  bankName?: string | null;
  accountType: string;
  currency: string;
  balance: string | number;
  isArchived?: boolean;
};

export type HoldingRow = {
  symbol: string;
  companyName: string;
  sector: string;
  industryGroup: string;
  industry: string;
  logoUrl: string | null;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  weightPct: number;
  regime: Regime;
  lotCount: number;
  accountIds: number[];
  accountNames: string[];
};

export const STRATEGIES: Array<{ id: StrategyFilter; label: string }> = [
  { id: 'all', label: 'All strategies' },
  { id: 'psi', label: 'Typhon' },
  { id: 'psi_v2', label: 'Cerberus' },
];

export const REGIMES: Array<'All' | Regime> = ['All', 'Leading', 'Improving', 'Weakening', 'Lagging'];

export function cleanSymbol(value: string): string {
  return value.replace('.CA', '').replace('!', '').trim().toUpperCase();
}

export function accountLabel(account: Account): string {
  return account.accountName || account.customBankName || account.bankName || `Account ${account.id}`;
}

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} EGP`;
}

export function number(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${number(value, digits)}%`;
}

export function regimeTone(regime?: Regime): string {
  if (regime === 'Leading') return 'text-plt-profit bg-plt-profit-soft';
  if (regime === 'Improving') return 'text-plt-info bg-plt-info-soft';
  if (regime === 'Weakening') return 'text-plt-warning bg-plt-warning-soft';
  if (regime === 'Lagging') return 'text-plt-risk bg-plt-risk-soft';
  return 'text-plt-muted bg-plt-hover';
}

export function signalTone(signal?: 'BUY' | 'SELL' | 'HOLD' | 'NONE'): string {
  if (signal === 'BUY') return 'text-plt-profit bg-plt-profit-soft';
  if (signal === 'SELL') return 'text-plt-risk bg-plt-risk-soft';
  if (signal === 'HOLD') return 'text-plt-info bg-plt-info-soft';
  return 'text-plt-muted bg-plt-hover';
}

export function opinionFor(
  consensus: HoldingConsensus | undefined,
  strategy: StrategyFilter,
  maxAgeBars = Number.POSITIVE_INFINITY
): StrategyOpinion | null {
  if (!consensus || strategy === 'all') return null;
  const opinion = strategy === 'psi' ? consensus.opinions.psi : strategy === 'psi_v2' ? consensus.opinions.psiV2 : consensus.opinions.thoth;
  if (!opinion.signalDate || (opinion.barsAgo !== undefined && opinion.barsAgo >= maxAgeBars)) return null;
  return opinion;
}

export function latestFreshOpinion(consensus: HoldingConsensus | undefined, maxAgeBars: number): StrategyOpinion | null {
  if (!consensus) return null;
  return (
    [consensus.opinions.psi, consensus.opinions.psiV2, consensus.opinions.thoth]
      .filter((opinion) => opinion.signalDate && (opinion.barsAgo ?? Number.POSITIVE_INFINITY) < maxAgeBars)
      .sort((a, b) => String(b.signalDate).localeCompare(String(a.signalDate)))[0] || null
  );
}

export function strategyMetricsFor(consensus: HoldingConsensus | undefined, strategy: StrategyFilter): StrategyMetrics | null {
  if (!consensus || strategy === 'all') return null;
  if (strategy === 'psi') return consensus.strategyMetrics.psi;
  if (strategy === 'psi_v2') return consensus.strategyMetrics.psiV2;
  return consensus.strategyMetrics.thoth;
}

export function metricForOpportunity(row: OpportunitySignal, key: keyof StrategyMetrics): number | null {
  return row.metrics?.[key] ?? null;
}

export function buyOpportunityForHolding(
  holding: HoldingRow,
  consensus: HoldingConsensus | undefined,
  selectedStrategy: StrategyFilter,
  freshness: number,
  dataAsOf: string
): OpportunitySignal | null {
  if (!consensus) return null;

  const candidates: Array<{
    strategyId: StrategyId;
    strategyLabel: string;
    opinion: StrategyOpinion;
    metrics: StrategyMetrics;
  }> = [
    { strategyId: 'psi', strategyLabel: 'Typhon', opinion: consensus.opinions.psi, metrics: consensus.strategyMetrics.psi },
    { strategyId: 'psi_v2', strategyLabel: 'Cerberus', opinion: consensus.opinions.psiV2, metrics: consensus.strategyMetrics.psiV2 },
  ];

  const eligible = candidates
    .filter((candidate) => selectedStrategy === 'all' || candidate.strategyId === selectedStrategy)
    .filter((candidate) => candidate.opinion.verdict === 'BUY' && candidate.opinion.signalDate && (candidate.opinion.barsAgo ?? Number.POSITIVE_INFINITY) < freshness)
    .sort((a, b) => String(b.opinion.signalDate).localeCompare(String(a.opinion.signalDate)));
  const candidate = eligible[0];
  if (!candidate || !candidate.opinion.signalDate) return null;

  return {
    symbol: holding.symbol,
    companyName: holding.companyName,
    sector: holding.sector,
    industryGroup: holding.industryGroup,
    industry: holding.industry,
    rotationRegime: holding.regime,
    logoUrl: holding.logoUrl,
    strategyId: candidate.strategyId,
    strategyLabel: candidate.strategyLabel,
    strategyShortName: candidate.strategyLabel,
    strategyBadgeClassName: 'bg-plt-accent-soft text-plt-accent',
    analysisStart: '2025-01-01',
    analysisEnd: dataAsOf,
    dataAsOf,
    signalAgeBars: candidate.opinion.barsAgo ?? null,
    metrics: candidate.metrics,
    signal: {
      signal: 'BUY',
      date: candidate.opinion.signalDate,
      price: candidate.opinion.price ?? holding.currentPrice,
      barsAgo: candidate.opinion.barsAgo,
      reasoning: candidate.opinion.reason,
    },
  };
}
