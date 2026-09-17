'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircleAlert,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from '@/components/ui/icon-library';
import type { HoldingConsensus } from '@/lib/multi-strategy-consensus';
import type { OpportunitySignal } from '@/lib/opportunities';
import type { StrategyId } from '@/lib/strategy-analysis';
import PageHeader from '@/components/platform/ui/PageHeader';

import {
  cleanSymbol,
  accountLabel,
  metricForOpportunity,
  buyOpportunityForHolding,
  opinionFor,
  STRATEGIES,
  REGIMES,
  type Regime,
  type Grouping,
  type StrategyFilter,
  type SortKey,
  type InitialPosition,
  type TickerMeta,
  type RotationMeta,
  type Account,
  type HoldingRow,
} from './portfolio/portfolioTypes';
import { Field } from './portfolio/portfolioComponents';

import PortfolioSummaryHeaderWidget from './portfolio/PortfolioSummaryHeaderWidget';
import PortfolioAllocationsCardWidget from './portfolio/PortfolioAllocationsCardWidget';
import PortfolioPositionsLedgerWidget from './portfolio/PortfolioPositionsLedgerWidget';
import PortfolioOpportunityScannerWidget from './portfolio/PortfolioOpportunityScannerWidget';
import { BuyDrawer, SellDrawer } from './portfolio/PortfolioTradeDrawersWidget';

export type { InitialPosition, TickerMeta, RotationMeta, Account };

interface InvestPortfolioPageViewProps {
  initialPositions: InitialPosition[];
  latestPriceMap: Record<string, number>;
  tickerMap: Record<string, TickerMeta>;
  rotationMap: Record<string, RotationMeta>;
  initialConsensusMap: Record<string, HoldingConsensus>;
  initialOpportunities: OpportunitySignal[];
  accounts: Account[];
  dataAsOf?: string;
}

export default function InvestPortfolioPageView({
  initialPositions,
  latestPriceMap,
  tickerMap,
  rotationMap,
  initialConsensusMap,
  initialOpportunities,
  accounts,
  dataAsOf,
}: InvestPortfolioPageViewProps) {
  const router = useRouter();

  const [strategy, setStrategy] = useState<StrategyFilter>('all');
  const [freshness, setFreshness] = useState(5);
  const [grouping, setGrouping] = useState<Grouping>('sector');
  const [regimeFilter, setRegimeFilter] = useState<'All' | Regime>('All');
  const [includeHeld, setIncludeHeld] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('alpha');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileFiltersDrawerOpen, setIsMobileFiltersDrawerOpen] = useState(false);
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
  const [isLoadingConsensus, setIsLoadingConsensus] = useState(
    initialPositions.length > 0 && Object.keys(initialConsensusMap).length === 0
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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
        setOpportunities(
          Array.isArray(payload?.opportunities)
            ? payload.opportunities.filter((item: OpportunitySignal) => item.signal?.signal === 'BUY')
            : []
        );
      })
      .catch(() => {
        if (mounted) setOpportunities([]);
      })
      .finally(() => {
        if (mounted) setIsLoadingOpportunities(false);
      });
    return () => {
      mounted = false;
    };
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
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingConsensus(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialConsensusMap, initialPositions]);

  const brokerageAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(account.accountType)),
    [accounts]
  );

  const egpBrokerageAccounts = useMemo(
    () => brokerageAccounts.filter((account) => (account.currency || 'EGP').toUpperCase() === 'EGP'),
    [brokerageAccounts]
  );

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  const holdings = useMemo<HoldingRow[]>(() => {
    const rows = new Map<string, HoldingRow>();
    for (const position of initialPositions) {
      const symbol = cleanSymbol(position.tickerSymbol);
      const meta = tickerMap[symbol] || { companyName: symbol, sector: 'Unclassified', industryGroup: 'Unclassified', industry: 'Unclassified', logoUrl: null };
      const currentPrice = latestPriceMap[symbol] ?? position.entryPrice;
      const account = position.accountId ? accountById.get(position.accountId) : undefined;
      const accountLabelText = account ? accountLabel(account) : '';
      const existing = rows.get(symbol);

      if (existing) {
        const totalQuantity = existing.quantity + position.quantity;
        const totalCost = existing.entryPrice * existing.quantity + position.entryPrice * position.quantity;
        existing.entryPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        existing.quantity = totalQuantity;
        existing.currentPrice = currentPrice;
        existing.marketValue = totalQuantity * currentPrice;
        existing.unrealizedPnl = existing.marketValue - totalCost;
        existing.unrealizedPnlPct = totalCost > 0 ? (existing.unrealizedPnl / totalCost) * 100 : 0;
        existing.lotCount += 1;
        if (position.accountId && !existing.accountIds.includes(position.accountId)) {
          existing.accountIds.push(position.accountId);
        }
        if (accountLabelText && !existing.accountNames.includes(accountLabelText)) {
          existing.accountNames.push(accountLabelText);
        }
      } else {
        const marketValue = position.quantity * currentPrice;
        const costBasis = position.quantity * position.entryPrice;
        const unrealizedPnl = marketValue - costBasis;
        rows.set(symbol, {
          symbol,
          companyName: meta.companyName || symbol,
          sector: meta.sector || 'Unclassified',
          industryGroup: meta.industryGroup || 'Unclassified',
          industry: meta.industry || meta.industryGroup || 'Unclassified',
          logoUrl: meta.logoUrl || null,
          quantity: position.quantity,
          entryPrice: position.entryPrice,
          currentPrice,
          marketValue,
          unrealizedPnl,
          unrealizedPnlPct: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0,
          weightPct: 0,
          regime: rotationMap[meta.industryGroup]?.rotationRegime || 'Leading',
          lotCount: 1,
          accountIds: position.accountId ? [position.accountId] : [],
          accountNames: accountLabelText ? [accountLabelText] : [],
        });
      }
    }
    const total = Array.from(rows.values()).reduce((sum, row) => sum + row.marketValue, 0);
    return Array.from(rows.values()).map((row) => ({ ...row, weightPct: total > 0 ? (row.marketValue / total) * 100 : 0 }));
  }, [accountById, initialPositions, latestPriceMap, rotationMap, tickerMap]);

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
      if (!current || (opportunity.metrics.alpha ?? Number.NEGATIVE_INFINITY) > (current.metrics.alpha ?? Number.NEGATIVE_INFINITY)) {
        bySymbol.set(key, opportunity);
      }
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
      const response = await fetch('/api/positions/assign-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: Number(assignmentAccountId) }),
        signal: controller.signal,
      });
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
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-plt-base text-plt-text select-none">
      <div className="app-page page-sections-stack page-content-wide mx-auto pb-24">
        {/* Top Control Bar & Filters */}
        <section className="section-container w-full min-w-0">
          <PageHeader
            title="Investment Command Center"
            description={`Make fast, chart-synced buy and sell decisions across your strategies. Fresh means the last ${freshness} trading sessions.`}
            actions={(
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-plt-profit-soft px-2.5 py-1.5 text-[11px] text-plt-profit">
                  <span className="h-1.5 w-1.5 rounded-full bg-plt-profit" /> Chart-synced
                </span>
                <span className="rounded-lg bg-plt-card px-2.5 py-1.5 text-[11px] text-plt-muted">
                  Data as of {latestData}
                </span>
                <button
                  type="button"
                  onClick={refreshPage}
                  className="rounded-lg p-2 text-plt-muted hover:bg-plt-hover hover:text-plt-text cursor-pointer"
                  title="Refresh analysis"
                >
                  <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </>
            )}
          />

          {/* ================================================================ */}
          {/* DESKTOP FILTER BAR (md and up) — preserved layout                */}
          {/* ================================================================ */}
          <div className="hidden md:grid grid-cols-1 gap-2.5 rounded-xl bg-plt-card/35 p-3 sm:grid-cols-2 xl:grid-cols-6 w-full min-w-0">
            <label className="flex items-center gap-2 text-xs text-plt-muted xl:col-span-1 min-w-0">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider">Strategy</span>
              <select
                value={strategy}
                onChange={(event) => setStrategy(event.target.value as StrategyFilter)}
                className="min-w-0 flex-1 rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"
              >
                {STRATEGIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-plt-muted min-w-0">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider">Freshness</span>
              <select
                value={freshness}
                onChange={(event) => setFreshness(Number(event.target.value))}
                className="min-w-0 flex-1 rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"
              >
                <option value={5}>5 trading sessions</option>
                <option value={10}>10 trading sessions</option>
                <option value={20}>20 trading sessions</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-plt-muted min-w-0">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider">Group by</span>
              <select
                value={grouping}
                onChange={(event) => setGrouping(event.target.value as Grouping)}
                className="min-w-0 flex-1 rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"
              >
                <option value="sector">Sector</option>
                <option value="industryGroup">Industry group</option>
                <option value="industry">Industry</option>
              </select>
            </label>

            <label className="relative flex items-center sm:col-span-2 xl:col-span-2 min-w-0">
              <Search size={14} className="absolute left-3 text-plt-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ticker or company"
                className="w-full rounded-lg bg-plt-base py-2 pl-9 pr-3 text-xs text-plt-text outline-none placeholder:text-plt-muted"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 text-plt-muted hover:text-plt-text"
                >
                  <X size={13} />
                </button>
              )}
            </label>

            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer ${
                showFilters ? 'bg-plt-accent-soft text-plt-accent' : 'bg-plt-base text-plt-muted hover:text-plt-text'
              }`}
            >
              <SlidersHorizontal size={14} /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="hidden md:grid grid-cols-2 gap-3 rounded-xl bg-plt-card/35 p-3 sm:grid-cols-4 lg:grid-cols-8 w-full min-w-0">
              <Field label="Regime">
                <select
                  value={regimeFilter}
                  onChange={(event) => setRegimeFilter(event.target.value as 'All' | Regime)}
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"
                >
                  {REGIMES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sort">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"
                >
                  <option value="alpha">Alpha ↓</option>
                  <option value="return">Total return ↓</option>
                  <option value="bars">Avg bars ↑</option>
                  <option value="drawdown">Max DD ↑</option>
                  <option value="mae">Max MAE ↑</option>
                  <option value="date">Signal date ↓</option>
                </select>
              </Field>
              <Field label="Min avg bars">
                <input
                  value={minBars}
                  onChange={(event) => setMinBars(event.target.value)}
                  inputMode="numeric"
                  placeholder="Any"
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted"
                />
              </Field>
              <Field label="Max avg bars">
                <input
                  value={maxBars}
                  onChange={(event) => setMaxBars(event.target.value)}
                  inputMode="numeric"
                  placeholder="Any"
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted"
                />
              </Field>
              <Field label="Min alpha %">
                <input
                  value={minAlpha}
                  onChange={(event) => setMinAlpha(event.target.value)}
                  inputMode="decimal"
                  placeholder="Any"
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted"
                />
              </Field>
              <Field label="Max DD %">
                <input
                  value={maxDrawdown}
                  onChange={(event) => setMaxDrawdown(event.target.value)}
                  inputMode="decimal"
                  placeholder="Any"
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted"
                />
              </Field>
              <Field label="Max MAE %">
                <input
                  value={maxMae}
                  onChange={(event) => setMaxMae(event.target.value)}
                  inputMode="decimal"
                  placeholder="Any"
                  className="w-full rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none placeholder:text-plt-muted"
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-xs text-plt-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHeld}
                  onChange={(event) => setIncludeHeld(event.target.checked)}
                  className="accent-[var(--plt-accent)]"
                />{' '}
                Include held
              </label>
            </div>
          )}

          {/* ================================================================ */}
          {/* MOBILE FILTER BAR (below md) — clean split pill + pill-switch     */}
          {/* ================================================================ */}
          <div className="flex md:hidden flex-col gap-2 w-full min-w-0">
            {/* Row 1: Search + Filters split pill */}
            <div className="flex items-stretch h-9 rounded-xl overflow-hidden border border-plt-border bg-plt-raised">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-0 pl-3 flex items-center pointer-events-none text-plt-muted">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Search ticker or company..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-full w-full bg-transparent pl-9 pr-3 text-[12px] text-plt-text placeholder:text-plt-muted focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-0 pr-3 flex items-center text-plt-muted hover:text-plt-text"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="w-px bg-plt-border shrink-0" />

              <button
                type="button"
                onClick={() => setIsMobileFiltersDrawerOpen(true)}
                className="relative flex items-center gap-1.5 px-3.5 text-[12px] font-medium text-plt-muted hover:text-plt-text transition-colors shrink-0"
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {(strategy !== 'all' || freshness !== 5 || regimeFilter !== 'All' || sort !== 'alpha' || minBars !== '' || maxBars !== '' || minAlpha !== '' || maxDrawdown !== '' || maxMae !== '' || includeHeld !== false) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-plt-profit" />
                )}
              </button>
            </div>

            {/* Row 2: Grouping quick pill switch */}
            <div className="pill-switch w-full">
              {[
                { id: 'sector', label: 'Sector' },
                { id: 'industryGroup', label: 'Group' },
                { id: 'industry', label: 'Industry' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGrouping(item.id as Grouping)}
                  className={`pill-switch-btn flex-1 text-center ${grouping === item.id ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ================================================================ */}
          {/* MOBILE FILTERS BOTTOM DRAWER                                      */}
          {/* ================================================================ */}
          {isMobileFiltersDrawerOpen && (
            <div
              className="fixed inset-0 z-50 flex flex-col justify-end md:hidden animate-in fade-in duration-200"
              style={{ backgroundColor: 'var(--plt-overlay, rgba(0,0,0,0.7))' }}
              onClick={() => setIsMobileFiltersDrawerOpen(false)}
            >
              <div
                className="flex flex-col rounded-t-2xl border-t border-plt-border-strong bg-plt-surface shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-plt-border-strong" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-plt-border/40 shrink-0">
                  <span className="text-sm font-bold text-plt-text">Portfolio Filters</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersDrawerOpen(false)}
                    className="p-1.5 rounded-full text-plt-muted hover:text-plt-text hover:bg-white/[0.08] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-4 px-5 py-4">
                  {/* Strategy */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-1.5 block">Strategy</label>
                    <select
                      value={strategy}
                      onChange={(event) => setStrategy(event.target.value as StrategyFilter)}
                      className="w-full h-10 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none"
                    >
                      {STRATEGIES.map((item) => (
                        <option key={item.id} value={item.id} className="bg-plt-base text-plt-text">
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Freshness & Regime in 2-col grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-1.5 block">Freshness</label>
                      <select
                        value={freshness}
                        onChange={(event) => setFreshness(Number(event.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none"
                      >
                        <option value={5} className="bg-plt-base text-plt-text">5 sessions</option>
                        <option value={10} className="bg-plt-base text-plt-text">10 sessions</option>
                        <option value={20} className="bg-plt-base text-plt-text">20 sessions</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-1.5 block">Regime</label>
                      <select
                        value={regimeFilter}
                        onChange={(event) => setRegimeFilter(event.target.value as 'All' | Regime)}
                        className="w-full h-10 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none"
                      >
                        {REGIMES.map((item) => (
                          <option key={item} className="bg-plt-base text-plt-text">{item}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-1.5 block">Sort Order</label>
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortKey)}
                      className="w-full h-10 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none"
                    >
                      <option value="alpha" className="bg-plt-base text-plt-text">Alpha ↓</option>
                      <option value="return" className="bg-plt-base text-plt-text">Total return ↓</option>
                      <option value="bars" className="bg-plt-base text-plt-text">Avg bars ↑</option>
                      <option value="drawdown" className="bg-plt-base text-plt-text">Max DD ↑</option>
                      <option value="mae" className="bg-plt-base text-plt-text">Max MAE ↑</option>
                      <option value="date" className="bg-plt-base text-plt-text">Signal date ↓</option>
                    </select>
                  </div>

                  {/* Quantitative Criteria Inputs */}
                  <div className="pt-2 border-t border-plt-border/40">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2">
                      Quantitative Criteria
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10px] text-plt-muted block mb-1">Min avg bars</span>
                        <input
                          value={minBars}
                          onChange={(event) => setMinBars(event.target.value)}
                          inputMode="numeric"
                          placeholder="Any"
                          className="w-full h-9 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none placeholder:text-plt-muted"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-plt-muted block mb-1">Max avg bars</span>
                        <input
                          value={maxBars}
                          onChange={(event) => setMaxBars(event.target.value)}
                          inputMode="numeric"
                          placeholder="Any"
                          className="w-full h-9 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none placeholder:text-plt-muted"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-plt-muted block mb-1">Min alpha %</span>
                        <input
                          value={minAlpha}
                          onChange={(event) => setMinAlpha(event.target.value)}
                          inputMode="decimal"
                          placeholder="Any"
                          className="w-full h-9 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none placeholder:text-plt-muted"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-plt-muted block mb-1">Max DD %</span>
                        <input
                          value={maxDrawdown}
                          onChange={(event) => setMaxDrawdown(event.target.value)}
                          inputMode="decimal"
                          placeholder="Any"
                          className="w-full h-9 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none placeholder:text-plt-muted"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-plt-muted block mb-1">Max MAE %</span>
                        <input
                          value={maxMae}
                          onChange={(event) => setMaxMae(event.target.value)}
                          inputMode="decimal"
                          placeholder="Any"
                          className="w-full h-9 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none placeholder:text-plt-muted"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Include Held Checkbox */}
                  <label className="flex items-center gap-2.5 py-1 text-xs text-plt-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHeld}
                      onChange={(event) => setIncludeHeld(event.target.checked)}
                      className="accent-[var(--plt-accent)] w-4 h-4 rounded"
                    />
                    <span>Include currently held positions</span>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 pb-6 pt-2 flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setStrategy('all');
                      setFreshness(5);
                      setRegimeFilter('All');
                      setSort('alpha');
                      setMinBars('');
                      setMaxBars('');
                      setMinAlpha('');
                      setMaxDrawdown('');
                      setMaxMae('');
                      setIncludeHeld(false);
                    }}
                    className="flex-1 h-11 rounded-xl bg-plt-card border border-plt-border text-xs font-semibold text-plt-muted hover:text-plt-text transition-colors"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersDrawerOpen(false)}
                    className="flex-1 h-11 rounded-xl bg-plt-raised border border-plt-border-strong text-xs font-semibold text-plt-text hover:bg-plt-hover transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {unlinkedCount > 0 && (
            <div className="flex flex-col gap-3 rounded-xl bg-plt-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
              <div className="flex items-start gap-3">
                <CircleAlert size={17} className="mt-0.5 shrink-0 text-plt-warning" />
                <div>
                  <p className="text-xs font-semibold text-plt-text">
                    {unlinkedCount} open {unlinkedCount === 1 ? 'lot is' : 'lots are'} not linked to a brokerage account.
                  </p>
                  <p className="mt-0.5 text-[11px] text-plt-muted">
                    Assigning them is bookkeeping only; it will not debit cash.
                  </p>
                </div>
              </div>
              {brokerageAccounts.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    value={assignmentAccountId}
                    onChange={(event) => setAssignmentAccountId(event.target.value)}
                    className="rounded-lg bg-plt-base px-2.5 py-2 text-xs text-plt-text outline-none"
                  >
                    <option value="">Choose account</option>
                    {brokerageAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountLabel(account)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={assignExisting}
                    disabled={!assignmentAccountId || isAssigning}
                    className="rounded-lg bg-plt-warning px-3 py-2 text-xs font-semibold text-plt-base disabled:opacity-50 cursor-pointer"
                  >
                    {isAssigning ? 'Assigning…' : 'Assign existing lots'}
                  </button>
                </div>
              ) : (
                <a href="/wallet?tab=banks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-plt-warning hover:text-plt-text">
                  Create brokerage account <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}

          {tradeError && (
            <div className="flex items-center justify-between rounded-lg bg-plt-risk-soft px-3 py-2 text-xs text-plt-risk w-full min-w-0">
              <span>{tradeError}</span>
              <button type="button" onClick={() => setTradeError('')} className="cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}
        </section>

        {/* SECTION 1: Summary KPIs & Allocations */}
        <section className="section-container w-full min-w-0 space-y-3">
          <PortfolioSummaryHeaderWidget
            investedValue={investedValue}
            brokerageCash={brokerageCash}
            hasBrokerage={hasBrokerage}
            totalPortfolioValue={totalPortfolioValue}
            freshSellDisplay={freshSellDisplay}
            freshSellCount={freshSellCount}
            freshOpportunityDisplay={freshOpportunityDisplay}
            freshness={freshness}
            strategy={strategy}
            isLoadingConsensus={isLoadingConsensus}
            linkedEgpBrokerageCount={egpBrokerageAccounts.length}
          />

          <PortfolioAllocationsCardWidget
            grouping={grouping}
            allocation={allocation}
            investedValue={investedValue}
            leadingRegimes={leadingRegimes}
          />
        </section>

        {/* SECTION 2: Open Holdings Ledger */}
        <section className="section-container w-full min-w-0">
          <PortfolioPositionsLedgerWidget
            holdings={holdings}
            totalLotsCount={initialPositions.length}
            strategy={strategy}
            freshness={freshness}
            grouping={grouping}
            consensusMap={consensusMap}
            isLoadingConsensus={isLoadingConsensus}
            onOpenChart={openChart}
            onBuyMore={(item) => {
              const opportunity = buyOpportunityForHolding(item, consensusMap[item.symbol], strategy, freshness, latestData);
              if (opportunity) setBuyOpportunity(opportunity);
              else setTradeError(`No fresh BUY signal for ${item.symbol} in the selected strategy window.`);
            }}
            onSell={setSellHolding}
          />
        </section>

        {/* SECTION 3: Opportunity Candidates Scanner */}
        <section className="section-container w-full min-w-0">
          <PortfolioOpportunityScannerWidget
            freshness={freshness}
            sort={sort}
            strategyOpportunities={strategyOpportunities}
            groupedOpportunities={groupedOpportunities}
            isLoadingOpportunities={isLoadingOpportunities}
            holdings={holdings}
            investedValue={investedValue}
            grouping={grouping}
            strategy={strategy}
            opportunities={opportunities}
            latestPriceMap={latestPriceMap}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            onBuy={setBuyOpportunity}
          />
        </section>

        {/* Metric Disclaimer & Footer */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-plt-card/35 px-4 py-3 text-[11px] text-plt-muted w-full min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-plt-profit shrink-0" />
            <span>
              Metric definitions: alpha is strategy return minus benchmark over {opportunities[0]?.analysisStart || '2025-01-01'} → {latestData}; “Unavailable” means the engine did not return a value.
            </span>
          </div>
          <a href="/wallet?tab=banks" className="inline-flex items-center gap-1.5 font-semibold text-plt-accent hover:text-plt-text">
            Manage Accounts <ExternalLink size={13} />
          </a>
        </section>
      </div>

      {buyOpportunity && (
        <BuyDrawer
          opportunity={buyOpportunity}
          accounts={egpBrokerageAccounts}
          onClose={() => setBuyOpportunity(null)}
          onError={setTradeError}
        />
      )}

      {sellHolding && (
        <SellDrawer
          holding={sellHolding}
          accounts={egpBrokerageAccounts}
          consensus={consensusMap[sellHolding.symbol]}
          strategy={strategy}
          onClose={() => setSellHolding(null)}
          onError={setTradeError}
        />
      )}
    </div>
  );
}
