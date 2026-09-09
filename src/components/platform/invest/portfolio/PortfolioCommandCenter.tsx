'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Filter,
  Layers3,
  LineChart,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from '@/components/ui/icon-library';
import type { HoldingConsensus, StrategyOpinion } from '@/lib/multi-strategy-consensus';
import type { OpportunitySignal } from '@/lib/opportunities';
import type { StrategyId, StrategyMetrics } from '@/lib/strategy-analysis';
import PageHeader from '@/components/platform/ui/PageHeader';

type Regime = 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
type Grouping = 'sector' | 'industryGroup' | 'industry';
type StrategyFilter = 'all' | StrategyId;
type SortKey = 'alpha' | 'return' | 'bars' | 'drawdown' | 'mae' | 'date';

type InitialPosition = {
  id: number | string;
  tickerSymbol: string;
  entryPrice: number;
  quantity: number;
  entryDate?: string;
  createdAt?: string | Date;
  accountId?: number | null;
  entryStrategyId?: string | null;
};

type TickerMeta = {
  companyName: string;
  sector: string;
  industryGroup: string;
  industry?: string;
  logoUrl: string | null;
};

type RotationMeta = {
  industryGroup: string;
  rotationRegime?: Regime;
};

type Account = {
  id: number;
  accountName: string;
  customBankName?: string | null;
  bankName?: string | null;
  accountType: string;
  currency: string;
  balance: string | number;
  isArchived?: boolean;
};

type HoldingRow = {
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

type PortfolioCommandCenterProps = {
  initialPositions: InitialPosition[];
  latestPriceMap: Record<string, number>;
  tickerMap: Record<string, TickerMeta>;
  rotationMap: Record<string, RotationMeta>;
  initialConsensusMap: Record<string, HoldingConsensus>;
  initialOpportunities: OpportunitySignal[];
  accounts: Account[];
  dataAsOf?: string;
};

const STRATEGIES: Array<{ id: StrategyFilter; label: string }> = [
  { id: 'all', label: 'All strategies' },
  { id: 'psi', label: 'PSI' },
  { id: 'psi_v2', label: 'PSI V2' },
  { id: 'thoth_egx_macro', label: 'THOTH' },
];

const REGIMES: Array<'All' | Regime> = ['All', 'Leading', 'Improving', 'Weakening', 'Lagging'];

function cleanSymbol(value: string): string {
  return value.replace('.CA', '').replace('!', '').trim().toUpperCase();
}

function accountLabel(account: Account): string {
  return account.accountName || account.customBankName || account.bankName || `Account ${account.id}`;
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} EGP`;
}

function number(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${number(value, digits)}%`;
}

function regimeTone(regime?: Regime): string {
  if (regime === 'Leading') return 'text-plt-profit bg-plt-profit-soft';
  if (regime === 'Improving') return 'text-plt-info bg-plt-info-soft';
  if (regime === 'Weakening') return 'text-plt-warning bg-plt-warning-soft';
  if (regime === 'Lagging') return 'text-plt-risk bg-plt-risk-soft';
  return 'text-plt-muted bg-plt-hover';
}

function signalTone(signal?: 'BUY' | 'SELL' | 'HOLD' | 'NONE'): string {
  if (signal === 'BUY') return 'text-plt-profit bg-plt-profit-soft';
  if (signal === 'SELL') return 'text-plt-risk bg-plt-risk-soft';
  if (signal === 'HOLD') return 'text-plt-info bg-plt-info-soft';
  return 'text-plt-muted bg-plt-hover';
}

function opinionFor(consensus: HoldingConsensus | undefined, strategy: StrategyFilter, maxAgeBars = Number.POSITIVE_INFINITY): StrategyOpinion | null {
  if (!consensus || strategy === 'all') return null;
  const opinion = strategy === 'psi' ? consensus.opinions.psi : strategy === 'psi_v2' ? consensus.opinions.psiV2 : consensus.opinions.thoth;
  if (!opinion.signalDate || (opinion.barsAgo !== undefined && opinion.barsAgo >= maxAgeBars)) return null;
  return opinion;
}

function latestFreshOpinion(consensus: HoldingConsensus | undefined, maxAgeBars: number): StrategyOpinion | null {
  if (!consensus) return null;
  return [consensus.opinions.psi, consensus.opinions.psiV2, consensus.opinions.thoth]
    .filter((opinion) => opinion.signalDate && (opinion.barsAgo ?? Number.POSITIVE_INFINITY) < maxAgeBars)
    .sort((a, b) => String(b.signalDate).localeCompare(String(a.signalDate)))[0] || null;
}

function strategyMetricsFor(consensus: HoldingConsensus | undefined, strategy: StrategyFilter): StrategyMetrics | null {
  if (!consensus || strategy === 'all') return null;
  if (strategy === 'psi') return consensus.strategyMetrics.psi;
  if (strategy === 'psi_v2') return consensus.strategyMetrics.psiV2;
  return consensus.strategyMetrics.thoth;
}

function metricForOpportunity(row: OpportunitySignal, key: keyof StrategyMetrics): number | null {
  return row.metrics?.[key] ?? null;
}

function buyOpportunityForHolding(
  holding: HoldingRow,
  consensus: HoldingConsensus | undefined,
  selectedStrategy: StrategyFilter,
  freshness: number,
  dataAsOf: string,
): OpportunitySignal | null {
  if (!consensus) return null;

  const candidates: Array<{
    strategyId: StrategyId;
    strategyLabel: string;
    opinion: StrategyOpinion;
    metrics: StrategyMetrics;
  }> = [
    { strategyId: 'psi', strategyLabel: 'PSI', opinion: consensus.opinions.psi, metrics: consensus.strategyMetrics.psi },
    { strategyId: 'psi_v2', strategyLabel: 'PSI V2', opinion: consensus.opinions.psiV2, metrics: consensus.strategyMetrics.psiV2 },
    { strategyId: 'thoth_egx_macro', strategyLabel: 'THOTH', opinion: consensus.opinions.thoth, metrics: consensus.strategyMetrics.thoth },
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

function TickerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-plt-hover text-[10px] font-semibold text-plt-muted">
      {logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="ticker-logo-image ticker-logo-fill" onError={() => setFailed(true)} />
      ) : symbol.slice(0, 2)}
    </span>
  );
}

function DecisionChip({ strategy, opinion, loading = false }: { strategy: string; opinion?: StrategyOpinion; loading?: boolean }) {
  const signal = opinion?.signalDate ? opinion.verdict : 'NONE';
  const label = loading ? 'Analyzing…' : signal === 'NONE' ? 'No fresh signal' : signal;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold ${signalTone(signal)}`} title={opinion?.reason}>
      <span className="text-plt-muted">{strategy}</span>
      <span>{label}</span>
      {opinion?.signalDate && <span className="font-normal opacity-80">· {opinion.barsAgo ?? 0} sessions</span>}
    </span>
  );
}

function StrategyDecisionCell({
  label,
  opinion,
  loading,
  active = false,
}: {
  label: string;
  opinion?: StrategyOpinion | null;
  loading?: boolean;
  active?: boolean;
}) {
  const hasSignal = Boolean(opinion?.signalDate);
  const signal = hasSignal ? opinion?.verdict : 'NONE';
  const value = loading ? 'Analyzing…' : hasSignal ? opinion?.verdict : 'No fresh signal';
  const meta = loading
    ? 'Loading canonical analysis'
    : hasSignal
      ? `${opinion?.signalDate} · ${opinion?.barsAgo ?? 0} sessions ago`
      : 'Outside selected window';

  return (
    <div className={`strategy-decision-cell ${active ? 'strategy-decision-cell-active' : ''}`} title={opinion?.reason}>
      <div className="strategy-decision-head">
        <span className="strategy-decision-tag">{label}</span>
        <span className={`strategy-decision-value ${signalTone(signal)}`}>{value}</span>
      </div>
      <span className="strategy-decision-meta">{meta}</span>
    </div>
  );
}

function DesktopHoldingRow({
  holding,
  strategy,
  freshness,
  grouping,
  consensus,
  isLoadingConsensus,
  onOpenChart,
  onBuyMore,
  onSell,
}: {
  holding: HoldingRow;
  strategy: StrategyFilter;
  freshness: number;
  grouping: Grouping;
  consensus?: HoldingConsensus;
  isLoadingConsensus: boolean;
  onOpenChart: (symbol: string, strategyId?: StrategyId) => void;
  onBuyMore: (holding: HoldingRow) => void;
  onSell: (holding: HoldingRow) => void;
}) {
  const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;

  return (
    <div className="table-layout-portfolio items-center border-b border-plt-border-soft px-3 py-3 last:border-b-0 hover:bg-plt-hover/40">
      <div className="flex min-w-0 items-center gap-2.5">
        <TickerLogo symbol={holding.symbol} logoUrl={holding.logoUrl} />
        <div className="min-w-0">
          <p className="portfolio-ticker-name">{holding.symbol}</p>
          <p className="truncate text-[11px] text-plt-muted">{holding.companyName}</p>
        </div>
      </div>
      <div className="min-w-0 text-[11px] text-plt-muted" title={holding.accountNames.join(', ')}>
        {holding.accountNames.length ? `${holding.accountNames.length} account${holding.accountNames.length === 1 ? '' : 's'}` : <span className="text-plt-warning">Not linked</span>}
      </div>
      <div className="holding-position-cell">
        <div className="holding-position-line"><span className="holding-position-label">Qty</span><span className="holding-position-value">{number(holding.quantity, 2)}</span></div>
        <div className="holding-position-line"><span className="holding-position-label">Value</span><span className="holding-position-value">{money(holding.marketValue)}</span></div>
        <div className="holding-position-line"><span className="holding-position-label">P/L</span><span className={`holding-position-value ${holding.unrealizedPnl >= 0 ? 'holding-position-value-profit' : 'holding-position-value-risk'}`}>{pct(holding.unrealizedPnlPct)} · {money(holding.unrealizedPnl)}</span></div>
      </div>
      <span className="text-xs text-plt-muted">{number(holding.weightPct)}%</span>
      <div className="text-[11px]"><span className="block truncate text-plt-text">{group}</span><span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(holding.regime)}`}>{holding.regime}</span></div>
      <StrategyDecisionCell label="PSI" opinion={opinionFor(consensus, 'psi', freshness)} loading={isLoadingConsensus} active={strategy === 'psi'} />
      <StrategyDecisionCell label="PSI V2" opinion={opinionFor(consensus, 'psi_v2', freshness)} loading={isLoadingConsensus} active={strategy === 'psi_v2'} />
      <StrategyDecisionCell label="THOTH" opinion={opinionFor(consensus, 'thoth_egx_macro', freshness)} loading={isLoadingConsensus} active={strategy === 'thoth_egx_macro'} />
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={() => onOpenChart(holding.symbol)} className="rounded-md p-1.5 text-plt-muted hover:bg-plt-hover hover:text-plt-text" title="Open chart"><LineChart size={14} /></button>
        <button type="button" onClick={() => onBuyMore(holding)} className="rounded-md p-1.5 text-plt-accent hover:bg-plt-accent-soft" title="Buy more"><ArrowUpRight size={14} /></button>
        <button type="button" onClick={() => onSell(holding)} className="rounded-md p-1.5 text-plt-risk hover:bg-plt-risk-soft" title="Sell"><ArrowDownRight size={14} /></button>
      </div>
    </div>
  );
}

function DrawerShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-plt-overlay" onMouseDown={onClose}>
      <aside className="h-full w-full trade-drawer-width overflow-y-auto bg-plt-base shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-plt-border-soft bg-plt-base px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-plt-text">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-plt-muted hover:bg-plt-hover hover:text-plt-text" aria-label="Close drawer"><X size={17} /></button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-plt-muted">{label}</span>{children}</label>;
}

export default function PortfolioCommandCenter({
  initialPositions,
  latestPriceMap,
  tickerMap,
  rotationMap,
  initialConsensusMap,
  initialOpportunities,
  accounts,
  dataAsOf,
}: PortfolioCommandCenterProps) {
  const [strategy, setStrategy] = useState<StrategyFilter>('all');
  const [freshness, setFreshness] = useState(5);
  const [grouping, setGrouping] = useState<Grouping>('sector');
  const [regimeFilter, setRegimeFilter] = useState<'All' | Regime>('All');
  const [includeHeld, setIncludeHeld] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('alpha');
  const [showFilters, setShowFilters] = useState(false);
  const [minBars, setMinBars] = useState('');
  const [maxBars, setMaxBars] = useState('');
  const [minAlpha, setMinAlpha] = useState('');
  const [maxDrawdown, setMaxDrawdown] = useState('');
  const [maxMae, setMaxMae] = useState('');
  const [buyOpportunity, setBuyOpportunity] = useState<OpportunitySignal | null>(null);
  const [sellHolding, setSellHolding] = useState<HoldingRow | null>(null);
  const [assignmentAccountId, setAssignmentAccountId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunitySignal[]>(initialOpportunities);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(initialOpportunities.length === 0);
  const [consensusMap, setConsensusMap] = useState<Record<string, HoldingConsensus>>(initialConsensusMap);
  const [isLoadingConsensus, setIsLoadingConsensus] = useState(initialPositions.length > 0 && Object.keys(initialConsensusMap).length === 0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const toggleGroup = (group: string) => {
    setCollapsedGroups((current) => ({ ...current, [group]: !current[group] }));
  };

  useEffect(() => {
    const canUseInitialOpportunities = initialOpportunities.length > 0 && strategy === 'all' && freshness === 5;
    if (canUseInitialOpportunities) {
      setOpportunities(initialOpportunities);
      setIsLoadingOpportunities(false);
      return;
    }
    let mounted = true;
    setIsLoadingOpportunities(true);
    fetch(`/api/opportunities?bars=${freshness}&strategy=${encodeURIComponent(strategy)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!mounted) return;
        setOpportunities(Array.isArray(payload?.opportunities) ? payload.opportunities.filter((item: OpportunitySignal) => item.signal?.signal === 'BUY') : []);
      })
      .catch(() => {
        if (mounted) setOpportunities([]);
      })
      .finally(() => {
        if (mounted) setIsLoadingOpportunities(false);
      });
    return () => { mounted = false; };
  }, [freshness, initialOpportunities, strategy]);

  useEffect(() => {
    const symbols = Array.from(new Set(initialPositions.map((position) => cleanSymbol(position.tickerSymbol))));
    if (symbols.length === 0) {
      setConsensusMap({});
      setIsLoadingConsensus(false);
      return;
    }

    let mounted = true;
    fetch(`/api/portfolio/analysis?symbols=${encodeURIComponent(symbols.join(','))}&lookback=20`)
      .then((response) => response.json())
      .then((payload) => {
        if (mounted && payload?.consensusMap && typeof payload.consensusMap === 'object') {
          setConsensusMap(payload.consensusMap as Record<string, HoldingConsensus>);
        }
      })
      .catch(() => {
        // Keep the server-provided map, if any, when analysis is unavailable.
      })
      .finally(() => {
        if (mounted) setIsLoadingConsensus(false);
      });
    return () => { mounted = false; };
  }, [initialConsensusMap, initialPositions]);

  const brokerageAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(account.accountType)),
    [accounts],
  );
  const egpBrokerageAccounts = brokerageAccounts.filter((account) => account.currency === 'EGP');

  const holdings = useMemo<HoldingRow[]>(() => {
    const rows = new Map<string, HoldingRow>();
    for (const position of initialPositions) {
      const symbol = cleanSymbol(position.tickerSymbol);
      const meta = tickerMap[symbol] || tickerMap[position.tickerSymbol] || { companyName: symbol, sector: 'Unclassified', industryGroup: 'Unclassified', industry: 'Unclassified', logoUrl: null };
      const rotation = rotationMap[symbol];
      const quantity = Number(position.quantity) || 0;
      const entryPrice = Number(position.entryPrice) || 0;
      const currentPrice = Number(latestPriceMap[symbol] ?? entryPrice);
      const marketValue = currentPrice * quantity;
      const cost = entryPrice * quantity;
      const existing = rows.get(symbol);
      if (!existing) {
        const account = position.accountId ? accounts.find((item) => item.id === position.accountId) : undefined;
        rows.set(symbol, {
          symbol,
          companyName: meta.companyName || symbol,
          sector: meta.sector || 'Unclassified',
          industryGroup: rotation?.industryGroup || meta.industryGroup || 'Unclassified',
          industry: meta.industry || meta.industryGroup || 'Unclassified',
          logoUrl: meta.logoUrl,
          quantity,
          entryPrice,
          currentPrice,
          marketValue,
          unrealizedPnl: (currentPrice - entryPrice) * quantity,
          unrealizedPnlPct: cost > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0,
          weightPct: 0,
          regime: rotation?.rotationRegime || 'Leading',
          lotCount: 1,
          accountIds: account ? [account.id] : [],
          accountNames: account ? [accountLabel(account)] : [],
        });
      } else {
        const totalQuantity = existing.quantity + quantity;
        const totalCost = existing.entryPrice * existing.quantity + cost;
        existing.quantity = totalQuantity;
        existing.entryPrice = totalQuantity > 0 ? totalCost / totalQuantity : existing.entryPrice;
        existing.marketValue += marketValue;
        existing.unrealizedPnl += (currentPrice - entryPrice) * quantity;
        existing.unrealizedPnlPct = totalCost > 0 ? (existing.unrealizedPnl / totalCost) * 100 : 0;
        existing.lotCount += 1;
        if (position.accountId && !existing.accountIds.includes(position.accountId)) {
          const account = accounts.find((item) => item.id === position.accountId);
          existing.accountIds.push(position.accountId);
          if (account) existing.accountNames.push(accountLabel(account));
        }
      }
    }
    const total = Array.from(rows.values()).reduce((sum, row) => sum + row.marketValue, 0);
    return Array.from(rows.values()).map((row) => ({ ...row, weightPct: total > 0 ? (row.marketValue / total) * 100 : 0 }));
  }, [accounts, initialPositions, latestPriceMap, rotationMap, tickerMap]);

  const heldSymbols = useMemo(() => new Set(holdings.map((row) => row.symbol)), [holdings]);
  const strategyOpportunities = useMemo(() => {
    const eligible = opportunities.filter((opportunity) => {
      if (strategy !== 'all' && opportunity.strategyId !== strategy) return false;
      if ((opportunity.signal.barsAgo ?? Number.POSITIVE_INFINITY) >= freshness) return false;
      if (regimeFilter !== 'All' && opportunity.rotationRegime !== regimeFilter) return false;
      const sym = cleanSymbol(opportunity.symbol);
      if (!includeHeld && heldSymbols.has(sym)) return false;
      if (search && !`${sym} ${opportunity.companyName}`.toLowerCase().includes(search.toLowerCase())) return false;
      const bars = metricForOpportunity(opportunity, 'avgBarsPerTrade');
      const alpha = metricForOpportunity(opportunity, 'alpha');
      const dd = metricForOpportunity(opportunity, 'maxDrawdown');
      const mae = metricForOpportunity(opportunity, 'maxAdverseExcursion');
      if (minBars && (bars === null || bars < Number(minBars))) return false;
      if (maxBars && (bars === null || bars > Number(maxBars))) return false;
      if (minAlpha && (alpha === null || alpha < Number(minAlpha))) return false;
      if (maxDrawdown && (dd === null || Math.abs(dd) > Number(maxDrawdown))) return false;
      if (maxMae && (mae === null || Math.abs(mae) > Number(maxMae))) return false;
      return true;
    });

    const bySymbol = new Map<string, OpportunitySignal>();
    for (const opportunity of eligible) {
      const key = cleanSymbol(opportunity.symbol);
      const current = bySymbol.get(key);
      if (!current || (opportunity.metrics.alpha ?? Number.NEGATIVE_INFINITY) > (current.metrics.alpha ?? Number.NEGATIVE_INFINITY)) bySymbol.set(key, opportunity);
    }
    return Array.from(bySymbol.values()).sort((a, b) => {
      if (sort === 'alpha') return (b.metrics.alpha ?? Number.NEGATIVE_INFINITY) - (a.metrics.alpha ?? Number.NEGATIVE_INFINITY);
      if (sort === 'return') return (b.metrics.totalReturn ?? Number.NEGATIVE_INFINITY) - (a.metrics.totalReturn ?? Number.NEGATIVE_INFINITY);
      if (sort === 'bars') return (a.metrics.avgBarsPerTrade ?? Number.POSITIVE_INFINITY) - (b.metrics.avgBarsPerTrade ?? Number.POSITIVE_INFINITY);
      if (sort === 'drawdown') return Math.abs(a.metrics.maxDrawdown ?? Number.POSITIVE_INFINITY) - Math.abs(b.metrics.maxDrawdown ?? Number.POSITIVE_INFINITY);
      if (sort === 'mae') return Math.abs(a.metrics.maxAdverseExcursion ?? Number.POSITIVE_INFINITY) - Math.abs(b.metrics.maxAdverseExcursion ?? Number.POSITIVE_INFINITY);
      return Date.parse(b.signal.date) - Date.parse(a.signal.date);
    });
  }, [freshness, heldSymbols, includeHeld, opportunities, maxBars, maxDrawdown, maxMae, minAlpha, minBars, regimeFilter, search, sort, strategy]);

  const groupedOpportunities = useMemo(() => {
    const groups = new Map<string, OpportunitySignal[]>();
    for (const opportunity of strategyOpportunities) {
      const key = grouping === 'sector' ? opportunity.sector : grouping === 'industryGroup' ? (opportunity.industryGroup || 'Unclassified') : (opportunity.industry || opportunity.industryGroup || 'Unclassified');
      groups.set(key, [...(groups.get(key) || []), opportunity]);
    }
    return Array.from(groups.entries()).sort(([, a], [, b]) => (b[0].metrics.alpha ?? -Infinity) - (a[0].metrics.alpha ?? -Infinity));
  }, [grouping, strategyOpportunities]);

  const investedValue = holdings.reduce((sum, row) => sum + row.marketValue, 0);
  const brokerageCash = egpBrokerageAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const hasBrokerage = egpBrokerageAccounts.length > 0;
  const totalPortfolioValue = investedValue + brokerageCash;
  const freshOpportunityCount = strategyOpportunities.length;
  const freshSellCount = holdings.filter((holding) => {
    const consensus = consensusMap[holding.symbol];
    if (strategy === 'all') return Boolean(consensus && [consensus.opinions.psi, consensus.opinions.psiV2, consensus.opinions.thoth].some((opinion) => opinion.verdict === 'SELL' && opinion.signalDate && (opinion.barsAgo ?? Number.POSITIVE_INFINITY) < freshness));
    const opinion = opinionFor(consensus, strategy, freshness);
    return opinion?.verdict === 'SELL' && Boolean(opinion.signalDate);
  }).length;
  const latestData = dataAsOf || opportunities.map((item) => item.dataAsOf).sort().at(-1) || 'Unavailable';
  const freshSellDisplay = isLoadingConsensus ? 'Analyzing…' : String(freshSellCount);
  const freshOpportunityDisplay = isLoadingOpportunities ? 'Updating…' : String(freshOpportunityCount);
  const allocation = useMemo(() => {
    const byGroup = new Map<string, number>();
    for (const holding of holdings) {
      const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;
      byGroup.set(group, (byGroup.get(group) || 0) + holding.marketValue);
    }
    return Array.from(byGroup.entries()).sort(([, a], [, b]) => b - a).slice(0, 6);
  }, [grouping, holdings]);
  const leadingRegimes = useMemo(() => {
    const counts = new Map<Regime, number>();
    holdings.forEach((holding) => counts.set(holding.regime, (counts.get(holding.regime) || 0) + 1));
    return Array.from(counts.entries());
  }, [holdings]);
  const unlinkedCount = initialPositions.filter((position) => !position.accountId).length;

  const openChart = (symbol: string, strategyId: StrategyId = strategy === 'all' ? 'psi' : strategy) => {
    router.push(`/invest?ticker=${encodeURIComponent(symbol)}&view=chart&timeframe=D&strategy=${encodeURIComponent(strategyId)}&strategyStart=2025-01-01`);
  };

  const assignExisting = async () => {
    if (!assignmentAccountId) return;
    setIsAssigning(true);
    setTradeError('');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/positions/assign-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: Number(assignmentAccountId) }), signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not assign positions');
      setIsAssigning(false);
      setAssignmentAccountId('');
      router.refresh();
    } catch (error) {
      setTradeError(error instanceof DOMException && error.name === 'AbortError' ? 'Assignment timed out. Please try again.' : error instanceof Error ? error.message : 'Could not assign positions');
    } finally {
      window.clearTimeout(timeoutId);
      setIsAssigning(false);
    }
  };

  const refreshPage = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-plt-base text-plt-text">
      <div className="app-page page-sections-stack page-content-wide mx-auto pb-24">
        <section className="section-container">
        <PageHeader
          title="Investment Command Center"
          description={`Make fast, chart-synced buy and sell decisions across your strategies. Fresh means the last ${freshness} trading sessions.`}
          actions={(
            <>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-plt-profit-soft px-2.5 py-1.5 text-[11px] text-plt-profit"><span className="h-1.5 w-1.5 rounded-full bg-plt-profit" /> Chart-synced</span>
              <span className="rounded-lg bg-plt-card px-2.5 py-1.5 text-[11px] text-plt-muted">Data as of {latestData}</span>
              <button type="button" onClick={refreshPage} className="rounded-lg p-2 text-plt-muted hover:bg-plt-hover hover:text-plt-text" title="Refresh analysis"><RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /></button>
            </>
          )}
        />

        <div className="grid grid-cols-1 gap-2.5 rounded-xl bg-plt-card/35 p-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="flex items-center gap-2 text-xs text-plt-muted xl:col-span-1"><span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider">Strategy</span><select value={strategy} onChange={(event) => setStrategy(event.target.value as StrategyFilter)} className="min-w-0 flex-1 rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none">{STRATEGIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs text-plt-muted"><span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider">Freshness</span><select value={freshness} onChange={(event) => setFreshness(Number(event.target.value))} className="min-w-0 flex-1 rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"><option value={5}>5 trading sessions</option><option value={10}>10 trading sessions</option><option value={20}>20 trading sessions</option></select></label>
          <label className="flex items-center gap-2 text-xs text-plt-muted"><span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider">Group by</span><select value={grouping} onChange={(event) => setGrouping(event.target.value as Grouping)} className="min-w-0 flex-1 rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"><option value="sector">Sector</option><option value="industryGroup">Industry group</option><option value="industry">Industry</option></select></label>
          <label className="relative flex items-center sm:col-span-2 xl:col-span-2"><Search size={14} className="absolute left-3 text-plt-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticker or company" className="w-full rounded-lg bg-plt-base py-2 pl-9 pr-3 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></label>
          <button type="button" onClick={() => setShowFilters((value) => !value)} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${showFilters ? 'bg-plt-accent-soft text-plt-accent' : 'bg-plt-base text-plt-muted hover:text-plt-text'}`}><SlidersHorizontal size={14} /> Filters</button>
        </div>

        {showFilters && <div className="grid grid-cols-2 gap-3 rounded-xl bg-plt-card/35 p-3 sm:grid-cols-4 lg:grid-cols-8">
          <Field label="Regime"><select value={regimeFilter} onChange={(event) => setRegimeFilter(event.target.value as 'All' | Regime)} className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none">{REGIMES.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Sort"><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"><option value="alpha">Alpha ↓</option><option value="return">Total return ↓</option><option value="bars">Avg bars ↑</option><option value="drawdown">Max DD ↑</option><option value="mae">Max MAE ↑</option><option value="date">Signal date ↓</option></select></Field>
          <Field label="Min avg bars"><input value={minBars} onChange={(event) => setMinBars(event.target.value)} inputMode="numeric" placeholder="Any" className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field>
          <Field label="Max avg bars"><input value={maxBars} onChange={(event) => setMaxBars(event.target.value)} inputMode="numeric" placeholder="Any" className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field>
          <Field label="Min alpha %"><input value={minAlpha} onChange={(event) => setMinAlpha(event.target.value)} inputMode="decimal" placeholder="Any" className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field>
          <Field label="Max DD %"><input value={maxDrawdown} onChange={(event) => setMaxDrawdown(event.target.value)} inputMode="decimal" placeholder="Any" className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field>
          <Field label="Max MAE %"><input value={maxMae} onChange={(event) => setMaxMae(event.target.value)} inputMode="decimal" placeholder="Any" className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field>
          <label className="flex items-end gap-2 pb-2 text-xs text-plt-muted"><input type="checkbox" checked={includeHeld} onChange={(event) => setIncludeHeld(event.target.checked)} className="accent-[var(--plt-accent)]" /> Include held</label>
        </div>}

        {unlinkedCount > 0 && <div className="flex flex-col gap-3 rounded-xl bg-plt-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><CircleAlert size={17} className="mt-0.5 shrink-0 text-plt-warning" /><div><p className="text-xs font-semibold text-plt-text">{unlinkedCount} open {unlinkedCount === 1 ? 'lot is' : 'lots are'} not linked to a brokerage account.</p><p className="mt-0.5 text-[11px] text-plt-muted">Assigning them is bookkeeping only; it will not debit cash.</p></div></div>
          {brokerageAccounts.length > 0 ? <div className="flex items-center gap-2"><select value={assignmentAccountId} onChange={(event) => setAssignmentAccountId(event.target.value)} className="rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"><option value="">Choose account</option>{brokerageAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select><button type="button" onClick={assignExisting} disabled={!assignmentAccountId || isAssigning} className="rounded-lg bg-plt-warning px-3 py-2 text-xs font-semibold text-plt-base disabled:opacity-50">{isAssigning ? 'Assigning…' : 'Assign existing lots'}</button></div> : <a href="/wallet?tab=banks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-plt-warning hover:text-plt-text">Create brokerage account <ExternalLink size={13} /></a>}
        </div>}

        {tradeError && <div className="flex items-center justify-between rounded-lg bg-plt-risk-soft px-3 py-2 text-xs text-plt-risk"><span>{tradeError}</span><button type="button" onClick={() => setTradeError('')}><X size={14} /></button></div>}
        </section>

        <section className="section-container">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">01 · High-level insights</p><h2 className="mt-1 text-base font-semibold text-plt-text">Capital, risk, and today’s decisions</h2></div><span className="text-[11px] text-plt-muted">{strategy === 'all' ? 'Competing strategy view' : `${STRATEGIES.find((item) => item.id === strategy)?.label} view`}</span></div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            {[
              { label: 'Invested value', value: money(investedValue), note: 'Open holdings at latest price', tone: 'text-plt-text', icon: LineChart },
              { label: 'Brokerage cash', value: hasBrokerage ? money(brokerageCash) : 'Not linked', note: hasBrokerage ? `${egpBrokerageAccounts.length} linked EGP account${egpBrokerageAccounts.length === 1 ? '' : 's'}` : 'Create an EGP brokerage account', tone: hasBrokerage ? 'text-plt-profit' : 'text-plt-warning', icon: WalletCards },
              { label: 'Total portfolio value', value: hasBrokerage ? money(totalPortfolioValue) : money(investedValue), note: hasBrokerage ? 'Invested value + brokerage cash' : 'Cash excluded until linked', tone: 'text-plt-text', icon: BarChart3 },
              { label: 'Fresh sell decisions', value: freshSellDisplay, note: `Within ${freshness} trading sessions`, tone: isLoadingConsensus ? 'text-plt-muted' : freshSellCount > 0 ? 'text-plt-risk' : 'text-plt-profit', icon: ArrowDownRight },
              { label: 'Fresh buy opportunities', value: freshOpportunityDisplay, note: `Unheld · ${freshness} trading sessions`, tone: 'text-plt-accent', icon: Zap },
            ].map((card) => { const Icon = card.icon; return <div key={card.label} className="rounded-xl bg-plt-card/55 px-3.5 py-3"><div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-plt-muted"><span>{card.label}</span><Icon size={14} className={card.tone} /></div><div className={`mt-2 text-lg font-semibold ${card.tone}`}>{card.value}</div><p className="mt-1 text-[10px] text-plt-muted">{card.note}</p></div>; })}
          </div>
          <div className="mt-3 grid insights-grid gap-3">
            <div className="rounded-xl bg-plt-card/35 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-plt-text">Allocation by {grouping === 'sector' ? 'sector' : grouping === 'industryGroup' ? 'industry group' : 'industry'}</p><p className="mt-0.5 text-[10px] text-plt-muted">Based on invested value, not brokerage cash.</p></div><Layers3 size={15} className="text-plt-muted" /></div>{allocation.length === 0 ? <p className="py-4 text-xs text-plt-muted">No open holdings.</p> : <div className="space-y-2.5">{allocation.map(([group, value]) => { const share = investedValue > 0 ? value / investedValue * 100 : 0; return <div key={group}><div className="mb-1 flex justify-between text-[11px]"><span className="text-plt-text">{group}</span><span className="text-plt-muted">{number(share)}% · {money(value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-plt-hover"><div className="allocation-bar-fill" data-concentration={share > 30 ? 'high' : 'standard'} style={{ width: `${Math.min(100, share)}%` }} /></div></div>; })}</div>}</div>
            <div className="rounded-xl bg-plt-card/35 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-plt-text">Position regimes</p><p className="mt-0.5 text-[10px] text-plt-muted">Rotation state for groups you own.</p></div><TrendingUp size={15} className="text-plt-muted" /></div><div className="flex flex-wrap gap-2">{leadingRegimes.length === 0 ? <span className="text-xs text-plt-muted">No open holdings.</span> : leadingRegimes.map(([item, count]) => <span key={item} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${regimeTone(item)}`}>{item} · {count}</span>)}</div><div className="mt-4 rounded-lg bg-plt-base/60 px-3 py-2 text-[11px] text-plt-muted">Largest allocation: <span className="font-semibold text-plt-text">{allocation[0]?.[0] || 'None'}</span>{allocation[0] && investedValue > 0 ? ` · ${number((allocation[0][1] / investedValue) * 100)}%` : ''}. {allocation[0] && allocation[0][1] / investedValue > 0.3 ? 'Concentration warning above 30%.' : 'Inside the 30% concentration guardrail.'}</div></div>
          </div>
        </section>

        <section className="section-container">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">02 · Current portfolio</p><h2 className="mt-1 text-base font-semibold text-plt-text">Open positions, one row per ticker</h2><p className="mt-1 text-xs text-plt-muted">Multiple lots and accounts are aggregated here; use the account detail before selling.</p></div><span className="text-[11px] text-plt-muted">{holdings.length} active ticker{holdings.length === 1 ? '' : 's'} · {initialPositions.length} lot{initialPositions.length === 1 ? '' : 's'}</span></div>
          <div className="hidden overflow-x-auto rounded-xl bg-plt-card/25 md:block">
            <div className="portfolio-table-min">
              <div className="table-layout-portfolio border-b border-plt-border-soft px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-plt-muted"><span>Ticker</span><span>Accounts</span><span>Position</span><span>Weight</span><span>Group / regime</span><span>PSI</span><span>PSI V2</span><span>THOTH</span><span>Actions</span></div>
              {holdings.length === 0 ? <div className="px-3 py-10 text-center text-xs text-plt-muted">No open positions yet.</div> : holdings.map((holding) => <DesktopHoldingRow key={holding.symbol} holding={holding} strategy={strategy} freshness={freshness} grouping={grouping} consensus={consensusMap[holding.symbol]} isLoadingConsensus={isLoadingConsensus} onOpenChart={openChart} onBuyMore={(item) => { const opportunity = buyOpportunityForHolding(item, consensusMap[item.symbol], strategy, freshness, latestData); if (opportunity) setBuyOpportunity(opportunity); else setTradeError(`No fresh BUY signal for ${item.symbol} in the selected strategy window.`); }} onSell={setSellHolding} />)}
            </div>
          </div>
          <div className="hidden legacy-portfolio-table">
            <div className="portfolio-table-min">
              <div className="table-layout-portfolio border-b border-plt-border-soft px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-plt-muted"><span>Ticker</span><span>Accounts</span><span>Qty</span><span>Last</span><span>Market value</span><span>Weight</span><span>Unrealized P/L</span><span>Group / regime</span><span>Signal date</span><span>Signal age</span><span>Strategy alpha</span><span>Decision</span><span>Actions</span></div>
              {holdings.length === 0 ? <div className="px-3 py-10 text-center text-xs text-plt-muted">No open positions yet.</div> : holdings.map((holding) => { const consensus = consensusMap[holding.symbol]; const selectedOpinion = opinionFor(consensus, strategy, freshness); const latestDecision = strategy === 'all' ? latestFreshOpinion(consensus, freshness) : selectedOpinion; const selectedMetrics = strategyMetricsFor(consensus, strategy); return <div key={holding.symbol} className="table-layout-portfolio items-center border-b border-plt-border-soft px-3 py-3 last:border-b-0 hover:bg-plt-hover/40"><div className="flex min-w-0 items-center gap-2.5"><TickerLogo symbol={holding.symbol} logoUrl={holding.logoUrl} /><div className="min-w-0"><p className="portfolio-ticker-name">{holding.symbol}</p><p className="truncate text-[11px] text-plt-muted">{holding.companyName}</p></div></div><div className="min-w-0 text-[11px] text-plt-muted" title={holding.accountNames.join(', ')}>{holding.accountNames.length ? <>{holding.accountNames.length} account{holding.accountNames.length === 1 ? '' : 's'}</> : <span className="text-plt-warning">Not linked</span>}</div><span className="text-xs text-plt-text">{number(holding.quantity, 2)}</span><span className="text-xs text-plt-text">{number(holding.currentPrice, 2)}</span><span className="text-xs font-semibold text-plt-text">{money(holding.marketValue)}</span><span className="text-xs text-plt-muted">{number(holding.weightPct)}%</span><span className={`text-xs font-semibold ${holding.unrealizedPnl >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{pct(holding.unrealizedPnlPct)}<span className="block text-[10px] font-normal">{money(holding.unrealizedPnl)}</span></span><div className="text-[11px]"><span className="block truncate text-plt-text">{grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry}</span><span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(holding.regime)}`}>{holding.regime}</span></div><span className="text-[11px] text-plt-muted">{isLoadingConsensus ? 'Analyzing…' : latestDecision?.signalDate || 'No fresh signal'}</span><span className="text-[11px] text-plt-muted">{isLoadingConsensus ? '—' : latestDecision ? `${latestDecision.barsAgo ?? 0} sessions` : '—'}</span><div className="text-[11px]">{isLoadingConsensus ? <span>Analyzing…</span> : strategy === 'all' ? <><span className="block">PSI {pct(consensus?.strategyMetrics.psi.alpha)}</span><span className="block">V2 {pct(consensus?.strategyMetrics.psiV2.alpha)}</span><span className="block">THOTH {pct(consensus?.strategyMetrics.thoth.alpha)}</span></> : <span>{pct(selectedMetrics?.alpha)}</span>}</div><div className="flex flex-wrap gap-1.5">{strategy === 'all' ? <><DecisionChip strategy="PSI" opinion={opinionFor(consensus, 'psi', freshness) || undefined} loading={isLoadingConsensus} /><DecisionChip strategy="V2" opinion={opinionFor(consensus, 'psi_v2', freshness) || undefined} loading={isLoadingConsensus} /><DecisionChip strategy="THOTH" opinion={opinionFor(consensus, 'thoth_egx_macro', freshness) || undefined} loading={isLoadingConsensus} /></> : <DecisionChip strategy={STRATEGIES.find((item) => item.id === strategy)?.label || 'Strategy'} opinion={selectedOpinion || undefined} loading={isLoadingConsensus} />}</div><div className="flex items-center gap-1"><button type="button" onClick={() => openChart(holding.symbol)} className="rounded-md p-1.5 text-plt-muted hover:bg-plt-hover hover:text-plt-text" title="Open chart"><LineChart size={14} /></button><button type="button" onClick={() => { const opportunity = buyOpportunityForHolding(holding, consensus, strategy, freshness, latestData); if (opportunity) setBuyOpportunity(opportunity); else setTradeError(`No fresh BUY signal for ${holding.symbol} in the selected strategy window.`); }} className="rounded-md p-1.5 text-plt-accent hover:bg-plt-accent-soft" title="Buy more"><ArrowUpRight size={14} /></button><button type="button" onClick={() => setSellHolding(holding)} className="rounded-md p-1.5 text-plt-risk hover:bg-plt-risk-soft" title="Sell"><ArrowDownRight size={14} /></button></div></div>; })}
            </div>
          </div>
          <div className="space-y-2 md:hidden">
            {holdings.length === 0 ? <div className="rounded-xl bg-plt-card/25 px-3 py-10 text-center text-xs text-plt-muted">No open positions yet.</div> : holdings.map((holding) => <MobileHoldingCard key={holding.symbol} holding={holding} strategy={strategy} freshness={freshness} grouping={grouping} consensus={consensusMap[holding.symbol]} isLoadingConsensus={isLoadingConsensus} onOpenChart={openChart} onBuyMore={(item) => { const opportunity = buyOpportunityForHolding(item, consensusMap[item.symbol], strategy, freshness, latestData); if (opportunity) setBuyOpportunity(opportunity); else setTradeError(`No fresh BUY signal for ${item.symbol} in the selected strategy window.`); }} onSell={setSellHolding} />)}
          </div>
        </section>

        </section>

        <section className="section-container">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">03 · Buy opportunities</p><h2 className="mt-1 text-base font-semibold text-plt-text">Find the best candidates to add</h2><p className="mt-1 text-xs text-plt-muted">Unheld tickers by default · BUY signals from the last {freshness} trading sessions · sorted {sort === 'alpha' ? 'by alpha' : 'by your selected sort'}.</p></div><span className="inline-flex items-center gap-1.5 rounded-md bg-plt-accent-soft px-2.5 py-1.5 text-[11px] font-semibold text-plt-accent"><Filter size={13} /> {strategyOpportunities.length} qualifying ticker{strategyOpportunities.length === 1 ? '' : 's'}</span></div>
          <div className="hidden overflow-x-auto rounded-xl bg-plt-card/25 md:block">
            <div className="opportunity-table-min">
              <div className="table-layout-opportunity border-b border-plt-border-soft px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-plt-muted"><span>Ticker</span><span>Triggering strategy</span><span>Last</span><span>Signal date</span><span>Signal age</span><span>Avg bars</span><span>Max DD</span><span>Max MAE</span><span>Total return</span><span>Alpha</span><span>Action</span></div>
              {isLoadingOpportunities ? <div className="flex items-center justify-center gap-2 px-3 py-10 text-xs text-plt-muted"><Loader2 size={14} className="animate-spin" /> Scanning the market with canonical strategy analysis…</div> : groupedOpportunities.length === 0 ? <div className="px-3 py-10 text-center text-xs text-plt-muted">No candidates match the current strategy, freshness, regime, and metric filters.</div> : groupedOpportunities.map(([group, rows]) => { const allocatedValue = holdings.filter((holding) => (grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry) === group).reduce((sum, holding) => sum + holding.marketValue, 0); const allocationPct = investedValue > 0 ? (allocatedValue / investedValue) * 100 : 0; const concentrationWarning = allocationPct > 30; const isCollapsed = collapsedGroups[group] === true; return <React.Fragment key={group}><button type="button" onClick={() => toggleGroup(group)} aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group} opportunities`} className="flex w-full items-center justify-between border-b border-plt-border-soft bg-plt-base/60 px-3 py-2.5 text-left hover:bg-plt-hover/40"><span className="flex min-w-0 items-center gap-2"><ChevronDown size={14} className={`shrink-0 text-plt-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} /><span className="text-xs font-semibold text-plt-text">{group}</span><span className={`rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(rows[0]?.rotationRegime)}`}>{rows[0]?.rotationRegime || 'Unclassified'}</span></span><span className="text-right text-[10px] text-plt-muted"><span>{rows.length} candidate{rows.length === 1 ? '' : 's'} · {allocatedValue > 0 ? `${number(allocationPct)}% allocated` : 'No current allocation'}</span>{concentrationWarning && <span className="ml-2 text-plt-warning">Concentration &gt;30%</span>}</span></button>{!isCollapsed && rows.map((opportunity) => { const symbol = cleanSymbol(opportunity.symbol); return <div key={symbol} className="table-layout-opportunity items-center border-b border-plt-border-soft px-3 py-3 last:border-b-0 hover:bg-plt-hover/40"><div className="flex min-w-0 items-center gap-2.5"><TickerLogo symbol={symbol} logoUrl={opportunity.logoUrl} /><div className="min-w-0"><p className="portfolio-ticker-name">{symbol}</p><p className="truncate text-[11px] text-plt-muted">{opportunity.companyName}</p></div></div><div className="flex flex-wrap gap-1.5"><span className="rounded-md bg-plt-accent-soft px-1.5 py-1 text-[10px] font-semibold text-plt-accent">{opportunity.strategyShortName}</span>{strategy === 'all' && opportunities.filter((item) => cleanSymbol(item.symbol) === symbol && item.signal.signal === 'BUY' && (item.signal.barsAgo ?? Number.POSITIVE_INFINITY) < freshness && item.strategyId !== opportunity.strategyId).filter((item, index, items) => items.findIndex((candidate) => candidate.strategyId === item.strategyId) === index).map((item) => <span key={item.strategyId} className="rounded-md bg-plt-hover px-1.5 py-1 text-[10px] text-plt-muted">{item.strategyShortName}</span>)}</div><span className="text-xs text-plt-text">{number(latestPriceMap[symbol] ?? opportunity.signal.price, 2)}</span><span className="text-[11px] text-plt-muted">{opportunity.signal.date}</span><span className="text-[11px] text-plt-muted">{opportunity.signal.barsAgo ?? 'Unavailable'} sessions</span><span className="text-[11px] text-plt-text">{number(metricForOpportunity(opportunity, 'avgBarsPerTrade'))}</span><span className="text-[11px] text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxDrawdown'))}</span><span className="text-[11px] text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxAdverseExcursion'))}</span><span className="text-[11px] text-plt-text">{pct(metricForOpportunity(opportunity, 'totalReturn'))}</span><span className="text-[11px] font-semibold text-plt-profit">{pct(metricForOpportunity(opportunity, 'alpha'))}</span><button type="button" onClick={() => setBuyOpportunity(opportunity)} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-plt-accent px-2.5 py-1.5 text-[11px] font-semibold text-plt-base hover:opacity-90"><Zap size={12} /> Buy</button></div>; })}</React.Fragment>; })}
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {isLoadingOpportunities ? <div className="flex items-center justify-center gap-2 rounded-xl bg-plt-card/25 px-3 py-10 text-xs text-plt-muted"><Loader2 size={14} className="animate-spin" /> Scanning the market…</div> : groupedOpportunities.length === 0 ? <div className="rounded-xl bg-plt-card/25 px-3 py-10 text-center text-xs text-plt-muted">No candidates match the current filters.</div> : groupedOpportunities.map(([group, rows]) => { const allocatedValue = holdings.filter((holding) => (grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry) === group).reduce((sum, holding) => sum + holding.marketValue, 0); const allocationPct = investedValue > 0 ? (allocatedValue / investedValue) * 100 : 0; const isCollapsed = collapsedGroups[group] === true; return <div key={group} className="space-y-2"><button type="button" onClick={() => toggleGroup(group)} aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group} opportunities`} className="flex w-full items-center justify-between border-b border-plt-border-soft px-1 py-2 text-left hover:bg-plt-hover/40"><span className="flex min-w-0 items-center gap-2"><ChevronDown size={14} className={`shrink-0 text-plt-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} /><span className="truncate text-xs font-semibold text-plt-text">{group}</span><span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(rows[0]?.rotationRegime)}`}>{rows[0]?.rotationRegime || 'Unclassified'}</span></span><span className="shrink-0 text-[10px] text-plt-muted">{rows.length} · {allocatedValue > 0 ? `${number(allocationPct)}%` : 'No allocation'}</span></button>{!isCollapsed && rows.map((opportunity) => <MobileOpportunityCard key={cleanSymbol(opportunity.symbol)} opportunity={opportunity} strategy={strategy} freshness={freshness} opportunities={opportunities} latestPriceMap={latestPriceMap} onBuy={setBuyOpportunity} />)}</div>; })}
          </div>
        </section>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-plt-card/35 px-4 py-3 text-[11px] text-plt-muted"><div className="flex items-center gap-2"><ShieldCheck size={15} className="text-plt-profit" /><span>Metric definitions: alpha is strategy return minus benchmark over {opportunities[0]?.analysisStart || '2025-01-01'} → {latestData}; “Unavailable” means the engine did not return a value.</span></div><a href="/wallet?tab=banks" className="inline-flex items-center gap-1.5 font-semibold text-plt-accent hover:text-plt-text">Manage Accounts <ExternalLink size={13} /></a></section>
      </div>

      {buyOpportunity && <BuyDrawer opportunity={buyOpportunity} accounts={egpBrokerageAccounts} onClose={() => setBuyOpportunity(null)} onError={setTradeError} />}
      {sellHolding && <SellDrawer holding={sellHolding} accounts={egpBrokerageAccounts} consensus={consensusMap[sellHolding.symbol]} strategy={strategy} onClose={() => setSellHolding(null)} onError={setTradeError} />}
    </div>
  );
}

function MobileHoldingCard({
  holding,
  strategy,
  freshness,
  grouping,
  consensus,
  isLoadingConsensus,
  onOpenChart,
  onBuyMore,
  onSell,
}: {
  holding: HoldingRow;
  strategy: StrategyFilter;
  freshness: number;
  grouping: Grouping;
  consensus?: HoldingConsensus;
  isLoadingConsensus: boolean;
  onOpenChart: (symbol: string, strategyId?: StrategyId) => void;
  onBuyMore: (holding: HoldingRow) => void;
  onSell: (holding: HoldingRow) => void;
}) {
  const selectedOpinion = opinionFor(consensus, strategy, freshness);
  const latestDecision = strategy === 'all' ? latestFreshOpinion(consensus, freshness) : selectedOpinion;
  const selectedMetrics = strategyMetricsFor(consensus, strategy);
  const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;

  return (
    <article className="rounded-xl bg-plt-card/25 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TickerLogo symbol={holding.symbol} logoUrl={holding.logoUrl} />
          <div className="min-w-0">
            <p className="portfolio-ticker-name">{holding.symbol}</p>
            <p className="truncate text-[11px] text-plt-muted">{holding.companyName}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-plt-text">{money(holding.marketValue)}</p>
          <p className={holding.unrealizedPnl >= 0 ? 'text-[11px] text-plt-profit' : 'text-[11px] text-plt-risk'}>{pct(holding.unrealizedPnlPct)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-b border-plt-border-soft pb-2.5">
        <span className="truncate text-[11px] text-plt-muted">{group}</span>
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(holding.regime)}`}>{holding.regime}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-plt-border-soft py-3">
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Quantity</p><p className="mt-1 text-xs text-plt-text">{number(holding.quantity, 2)}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Last price</p><p className="mt-1 text-xs text-plt-text">{number(holding.currentPrice, 2)} EGP</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Weight</p><p className="mt-1 text-xs text-plt-text">{number(holding.weightPct)}%</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Account</p><p className="mt-1 truncate text-xs text-plt-text">{holding.accountNames.length ? `${holding.accountNames.length} account${holding.accountNames.length === 1 ? '' : 's'}` : 'Not linked'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Signal date</p><p className="mt-1 text-xs text-plt-text">{isLoadingConsensus ? 'Analyzing…' : latestDecision?.signalDate || 'No fresh signal'}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Strategy alpha</p><p className="mt-1 text-xs text-plt-text">{isLoadingConsensus ? 'Analyzing…' : pct(selectedMetrics?.alpha)}</p></div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted">Decision</span>
          <span className="text-[10px] text-plt-muted">{isLoadingConsensus ? 'Loading canonical analysis' : latestDecision ? `${latestDecision.barsAgo ?? 0} sessions old` : 'Selected window'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {strategy === 'all' ? <><DecisionChip strategy="PSI" opinion={opinionFor(consensus, 'psi', freshness) || undefined} loading={isLoadingConsensus} /><DecisionChip strategy="V2" opinion={opinionFor(consensus, 'psi_v2', freshness) || undefined} loading={isLoadingConsensus} /><DecisionChip strategy="THOTH" opinion={opinionFor(consensus, 'thoth_egx_macro', freshness) || undefined} loading={isLoadingConsensus} /></> : <DecisionChip strategy={strategy === 'psi' ? 'PSI' : strategy === 'psi_v2' ? 'PSI V2' : 'THOTH'} opinion={selectedOpinion || undefined} loading={isLoadingConsensus} />}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-plt-border-soft pt-3">
        <button type="button" onClick={() => onOpenChart(holding.symbol)} className="inline-flex items-center justify-center gap-1 rounded-md bg-plt-hover px-2 py-2 text-[11px] font-semibold text-plt-text"><LineChart size={13} /> Chart</button>
        <button type="button" onClick={() => onBuyMore(holding)} className="inline-flex items-center justify-center gap-1 rounded-md bg-plt-accent-soft px-2 py-2 text-[11px] font-semibold text-plt-accent"><ArrowUpRight size={13} /> Buy</button>
        <button type="button" onClick={() => onSell(holding)} className="inline-flex items-center justify-center gap-1 rounded-md bg-plt-risk-soft px-2 py-2 text-[11px] font-semibold text-plt-risk"><ArrowDownRight size={13} /> Sell</button>
      </div>
    </article>
  );
}

function MobileOpportunityCard({
  opportunity,
  strategy,
  freshness,
  opportunities,
  latestPriceMap,
  onBuy,
}: {
  opportunity: OpportunitySignal;
  strategy: StrategyFilter;
  freshness: number;
  opportunities: OpportunitySignal[];
  latestPriceMap: Record<string, number>;
  onBuy: (opportunity: OpportunitySignal) => void;
}) {
  const symbol = cleanSymbol(opportunity.symbol);
  const triggerStrategies = opportunities
    .filter((item) => cleanSymbol(item.symbol) === symbol && item.signal.signal === 'BUY' && (item.signal.barsAgo ?? Number.POSITIVE_INFINITY) < freshness)
    .map((item) => ({ id: item.strategyId, label: item.strategyShortName }))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);

  return (
    <article className="rounded-xl bg-plt-card/25 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TickerLogo symbol={symbol} logoUrl={opportunity.logoUrl} />
          <div className="min-w-0"><p className="portfolio-ticker-name">{symbol}</p><p className="truncate text-[11px] text-plt-muted">{opportunity.companyName}</p></div>
        </div>
        <div className="shrink-0 text-right"><p className="text-xs font-semibold text-plt-text">{number(latestPriceMap[symbol] ?? opportunity.signal.price, 2)} EGP</p><p className="text-[11px] text-plt-muted">{opportunity.signal.date}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(strategy === 'all' ? triggerStrategies : [{ id: opportunity.strategyId, label: opportunity.strategyShortName }]).map((item) => <span key={item.id} className="rounded-md bg-plt-accent-soft px-1.5 py-1 text-[10px] font-semibold text-plt-accent">{item.label}</span>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-plt-border-soft py-3">
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Signal age</p><p className="mt-1 text-xs text-plt-text">{opportunity.signal.barsAgo ?? 'Unavailable'} sessions</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Avg bars / trade</p><p className="mt-1 text-xs text-plt-text">{number(metricForOpportunity(opportunity, 'avgBarsPerTrade'))}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Max drawdown</p><p className="mt-1 text-xs text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxDrawdown'))}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Max adverse excursion</p><p className="mt-1 text-xs text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxAdverseExcursion'))}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Total return</p><p className="mt-1 text-xs text-plt-text">{pct(metricForOpportunity(opportunity, 'totalReturn'))}</p></div>
        <div><p className="text-[10px] uppercase tracking-wider text-plt-muted">Alpha</p><p className="mt-1 text-xs font-semibold text-plt-profit">{pct(metricForOpportunity(opportunity, 'alpha'))}</p></div>
      </div>
      <button type="button" onClick={() => onBuy(opportunity)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-plt-accent px-3 py-2.5 text-xs font-semibold text-plt-base"><Zap size={13} /> Buy {symbol}</button>
    </article>
  );
}

function BuyDrawer({ opportunity, accounts, onClose, onError }: { opportunity: OpportunitySignal; accounts: Account[]; onClose: () => void; onError: (message: string) => void }) {
  const [accountId, setAccountId] = useState(accounts[0] ? String(accounts[0].id) : '');
  const [date, setDate] = useState(opportunity.signal.date);
  const [price, setPrice] = useState(String(opportunity.signal.price));
  const [quantity, setQuantity] = useState('1');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const amount = Number(price || 0) * Number(quantity || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    onError('');
    try {
      const response = await fetch('/api/portfolio/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'BUY', accountId: Number(accountId), symbol: opportunity.symbol, date, price: Number(price), quantity: Number(quantity), targetPrice: targetPrice ? Number(targetPrice) : null, stopPrice: stopPrice ? Number(stopPrice) : null, strategyId: opportunity.strategyId, signalDate: opportunity.signal.date, signalPrice: opportunity.signal.price, notes }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Buy could not be completed');
      window.location.reload();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Buy could not be completed');
      setIsSaving(false);
    }
  };

  return <DrawerShell title={`Buy ${opportunity.symbol}`} eyebrow="Live trade" onClose={onClose}>
    <div className="mb-4 rounded-lg bg-plt-warning-soft px-3 py-2.5 text-[11px] text-plt-muted"><span className="font-semibold text-plt-text">This creates a live open position and debits brokerage cash.</span><br />Signal: {opportunity.strategyShortName} BUY on {opportunity.signal.date} at {number(opportunity.signal.price, 2)}.</div>
    {accounts.length === 0 ? <div className="rounded-lg bg-plt-risk-soft p-3 text-xs text-plt-risk">An EGP brokerage account is required. <a href="/wallet?tab=banks" className="font-semibold underline">Open Accounts</a> to create one.</div> : <form onSubmit={submit} className="space-y-4"><Field label="Brokerage account"><select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none">{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)} · {money(Number(account.balance))}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Entry date"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none" /></Field><Field label="Entry price"><input required type="number" min="0.0001" step="0.0001" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none" /></Field></div><Field label="Quantity"><input required type="number" min="0.0001" step="0.0001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Target price"><input type="number" min="0" step="0.0001" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} placeholder="Optional" className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field><Field label="Stop price"><input type="number" min="0" step="0.0001" value={stopPrice} onChange={(event) => setStopPrice(event.target.value)} placeholder="Optional" className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field></div><Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optional trade note" className="w-full resize-none rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field><div className="flex items-center justify-between rounded-lg bg-plt-card px-3 py-3 text-xs"><span className="text-plt-muted">Trade amount</span><span className="font-semibold text-plt-text">{money(amount)}</span></div><button type="submit" disabled={isSaving || !accountId} className="flex w-full items-center justify-center gap-2 rounded-lg bg-plt-accent px-3 py-3 text-xs font-semibold text-plt-base disabled:opacity-60">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isSaving ? 'Executing…' : 'Execute live buy'}</button></form>}
  </DrawerShell>;
}

function SellDrawer({ holding, accounts, consensus, strategy, onClose, onError }: { holding: HoldingRow; accounts: Account[]; consensus?: HoldingConsensus; strategy: StrategyFilter; onClose: () => void; onError: (message: string) => void }) {
  const defaultAccount = holding.accountIds[0] || accounts[0]?.id;
  const [accountId, setAccountId] = useState(defaultAccount ? String(defaultAccount) : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState(String(holding.currentPrice));
  const [quantity, setQuantity] = useState(String(holding.quantity));
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const opinion = opinionFor(consensus, strategy) || consensus?.opinions.psiV2;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    onError('');
    try {
      const response = await fetch('/api/portfolio/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'SELL', accountId: Number(accountId), symbol: holding.symbol, date, price: Number(price), quantity: Number(quantity), strategyId: opinion?.strategyId, signalDate: opinion?.signalDate, signalPrice: opinion?.price, notes }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Sell could not be completed');
      window.location.reload();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Sell could not be completed');
      setIsSaving(false);
    }
  };

  return <DrawerShell title={`Sell ${holding.symbol}`} eyebrow="Live trade" onClose={onClose}><div className="mb-4 rounded-lg bg-plt-warning-soft px-3 py-2.5 text-[11px] text-plt-muted"><span className="font-semibold text-plt-text">This reduces live lots and credits brokerage cash.</span><br />FIFO is applied within the selected brokerage account. Aggregated holding quantity: {number(holding.quantity, 2)}.</div>{accounts.length === 0 ? <div className="rounded-lg bg-plt-risk-soft p-3 text-xs text-plt-risk">No EGP brokerage account is linked to this holding.</div> : <form onSubmit={submit} className="space-y-4"><Field label="Brokerage account"><select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none">{accounts.filter((account) => holding.accountIds.includes(account.id) || account.id === Number(accountId)).map((account) => <option key={account.id} value={account.id}>{accountLabel(account)} · {money(Number(account.balance))}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Exit date"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none" /></Field><Field label="Exit price"><input required type="number" min="0.0001" step="0.0001" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none" /></Field></div><Field label="Quantity to sell"><input required type="number" min="0.0001" max={holding.quantity} step="0.0001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none" /></Field><Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optional exit note" className="w-full resize-none rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted" /></Field><div className="flex items-center justify-between rounded-lg bg-plt-card px-3 py-3 text-xs"><span className="text-plt-muted">Expected proceeds</span><span className="font-semibold text-plt-text">{money(Number(price || 0) * Number(quantity || 0))}</span></div><button type="submit" disabled={isSaving || !accountId} className="flex w-full items-center justify-center gap-2 rounded-lg bg-plt-risk px-3 py-3 text-xs font-semibold text-plt-base disabled:opacity-60">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isSaving ? 'Executing…' : 'Execute live sell'}</button></form>}</DrawerShell>;
}
