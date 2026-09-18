'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Compass,
  ArrowRight,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { type RotationRegime } from '@/lib/industry-rotation';
import { type DashboardOrder } from './investmentsTypes';

export type IndustryGroupStake = {
  industryGroup: string;
  value: number;
  percentage: number;
  positionsCount: number;
  tickers: string[];
  rotationRegime?: RotationRegime;
};

export type ConsultantViewMode = '3-columns' | 'all' | 'rebalance';
export type RegimeFilter = 'ALL' | 'LEADING' | 'IMPROVING' | 'LAGGING';

interface PortfolioConsultantCardProps {
  stakes: IndustryGroupStake[];
  totalPortfolioValue: number;
  buyOpportunities: Opportunity[];
  rotationMap?: Record<string, string>;
  openOrders?: DashboardOrder[];
}

export default function PortfolioConsultantCard({
  stakes = [],
  totalPortfolioValue = 0,
  buyOpportunities = [],
  rotationMap = {},
  openOrders = [],
}: PortfolioConsultantCardProps) {
  const { isPrivacy } = usePrivacyMode();
  const [viewMode, setViewMode] = useState<ConsultantViewMode>('3-columns');
  const [activeFilter, setActiveFilter] = useState<RegimeFilter>('ALL');

  // Format currency
  const formatMoney = (val: number): string => {
    if (isPrivacy) return '••••••';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  // 1. Health & Concentration Diagnostics
  const healthDiagnostics = useMemo(() => {
    if (!stakes.length || totalPortfolioValue === 0) {
      return {
        level: 'neutral' as const,
        score: 100,
        badgeText: 'Awaiting Positions',
        headline: 'No Active Holdings',
        description: 'Deploy capital across leading industry groups to begin tracking portfolio health and diversification metrics.',
        topStake: null,
      };
    }

    const topStake = stakes[0];
    const topPct = topStake.percentage;

    // Institutional Risk Guidelines: Single industry group > 25% is high concentration risk
    if (topPct >= 25) {
      return {
        level: 'high_risk' as const,
        score: Math.max(45, Math.round(100 - (topPct - 25) * 2.5)),
        badgeText: `Score: ${Math.max(45, Math.round(100 - (topPct - 25) * 2.5))}/100 · High Concentration Risk`,
        headline: `Overconcentrated in ${topStake.industryGroup} (${topPct.toFixed(1)}%)`,
        description: `${topStake.industryGroup} accounts for ${topPct.toFixed(1)}% of your active portfolio. Institutional risk models recommend capping any single industry group below 25% to protect against sector-specific cyclical drawdowns.`,
        topStake,
      };
    }

    if (topPct >= 20) {
      return {
        level: 'moderate' as const,
        score: Math.round(100 - (topPct - 20) * 1.5),
        badgeText: `Score: ${Math.round(100 - (topPct - 20) * 1.5)}/100 · Moderate Concentration`,
        headline: `Slightly Tilted to ${topStake.industryGroup} (${topPct.toFixed(1)}%)`,
        description: `Your portfolio is generally balanced, but ${topStake.industryGroup} has a moderate weight. Directing fresh inflows to underallocated leading sectors will optimize Sharpe ratio.`,
        topStake,
      };
    }

    return {
      level: 'healthy' as const,
      score: 95,
      badgeText: 'Score: 95/100 · Well Diversified',
      headline: `Balanced across ${stakes.length} Industry Groups`,
      description: `Optimal diversification achieved. No single industry group exceeds 20% of capital, providing resilient systemic protection across macroeconomic shifts.`,
      topStake,
    };
  }, [stakes, totalPortfolioValue]);

  // 2. Rotation Rebalancing Suggestions
  const rebalancingSuggestions = useMemo(() => {
    // Map buy opportunities by industryGroup
    const oppsByGroup = new Map<string, Opportunity[]>();
    for (const opp of buyOpportunities) {
      const group = opp.industryGroup || opp.sector || 'Unclassified';
      if (!oppsByGroup.has(group)) {
        oppsByGroup.set(group, []);
      }
      oppsByGroup.get(group)!.push(opp);
    }

    const suggestions: Array<{
      industryGroup: string;
      regime: RotationRegime;
      currentAllocation: number;
      opportunities: Opportunity[];
      priority: 'high' | 'medium';
    }> = [];

    // Check all groups with buy opportunities
    for (const [group, opps] of oppsByGroup.entries()) {
      const regime = (rotationMap[group] as RotationRegime) || opps[0]?.rotationRegime || 'Improving';
      const isLeading = regime === 'Leading';
      const isImproving = regime === 'Improving';

      if (!isLeading && !isImproving) continue;

      const currentStake = stakes.find((s) => s.industryGroup === group);
      const currentPct = currentStake ? currentStake.percentage : 0;

      // Only recommend if 0% or underweight (< 12%)
      if (currentPct < 12) {
        suggestions.push({
          industryGroup: group,
          regime,
          currentAllocation: currentPct,
          opportunities: opps.slice(0, 3),
          priority: isLeading ? 'high' : 'medium',
        });
      }
    }

    // Sort: High priority (Leading) first, then by number of buy signals
    return suggestions.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return b.opportunities.length - a.opportunities.length;
    });
  }, [stakes, buyOpportunities, rotationMap]);

  // Derive unrealized gain per industry group if openOrders is available
  const groupGainMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of openOrders) {
      const ig = order.industryGroup || order.sector || 'Unclassified';
      map.set(ig, (map.get(ig) || 0) + (order.profitLoss || 0));
    }
    return map;
  }, [openOrders]);

  // Filtered Stakes
  const filteredStakes = useMemo(() => {
    if (activeFilter === 'ALL') return stakes;
    if (activeFilter === 'LEADING') return stakes.filter((s) => s.rotationRegime === 'Leading');
    if (activeFilter === 'IMPROVING') return stakes.filter((s) => s.rotationRegime === 'Improving' || !s.rotationRegime);
    if (activeFilter === 'LAGGING') return stakes.filter((s) => s.rotationRegime === 'Lagging' || s.rotationRegime === 'Weakening' || s.percentage >= 25);
    return stakes;
  }, [stakes, activeFilter]);

  // 3 Columns Split:
  // Col 1: Leading Stakes
  const leadingStakes = useMemo(() => {
    return stakes.filter((s) => s.rotationRegime === 'Leading');
  }, [stakes]);

  // Col 2: Improving & Stable Stakes
  const improvingStakes = useMemo(() => {
    return stakes.filter((s) => s.rotationRegime === 'Improving' || !s.rotationRegime);
  }, [stakes]);

  // Col 3: Lagging or Overweight Stakes (exceeding 25% guideline)
  const laggingOrRiskStakes = useMemo(() => {
    return stakes.filter(
      (s) => s.rotationRegime === 'Lagging' || s.rotationRegime === 'Weakening' || s.percentage >= 25
    );
  }, [stakes]);

  const filterTabs: Array<{ key: RegimeFilter; label: string }> = [
    { key: 'ALL', label: `All Stakes (${stakes.length})` },
    { key: 'LEADING', label: `🟢 Leading (${leadingStakes.length})` },
    { key: 'IMPROVING', label: `🔵 Improving (${improvingStakes.length})` },
    { key: 'LAGGING', label: `🔴 Lagging / Risk (${laggingOrRiskStakes.length})` },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-start select-none space-y-4 bg-transparent">
      {/* 1. Top Control Bar: Category Filters on Left + View Mode Switch on Right (Matches PortfolioBreakdownTable) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setActiveFilter(f.key);
                if (viewMode === 'rebalance') setViewMode('3-columns');
              }}
              className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                activeFilter === f.key && viewMode !== 'rebalance'
                  ? 'bg-[#1e222d] text-white border border-[#2a2e39] font-semibold'
                  : 'text-[#868993] hover:text-white font-medium'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex p-0.5 rounded-lg bg-[#131722] border border-[#2a2e39]/50 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('3-columns')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === '3-columns'
                ? 'bg-[#2a2e39] text-white shadow-xs'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            3 Columns
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'all'
                ? 'bg-[#2a2e39] text-white shadow-xs'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            All Stakes
          </button>
          <button
            type="button"
            onClick={() => setViewMode('rebalance')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'rebalance'
                ? 'bg-[#2a2e39] text-white shadow-xs'
                : 'text-[#787b86] hover:text-white'
            }`}
          >
            Rebalance ({rebalancingSuggestions.length})
          </button>
        </div>
      </div>

      {/* 2. Institutional Diagnostics Banner */}
      <div className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
        healthDiagnostics.level === 'high_risk'
          ? 'bg-red-500/10 border-red-500/25 text-red-300'
          : healthDiagnostics.level === 'moderate'
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
      }`}>
        <div className="mt-0.5 shrink-0">
          {healthDiagnostics.level === 'high_risk' ? (
            <AlertTriangle size={16} className="text-red-400" />
          ) : healthDiagnostics.level === 'moderate' ? (
            <ShieldAlert size={16} className="text-amber-400" />
          ) : (
            <ShieldCheck size={16} className="text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white font-sans text-[13px]">
              {healthDiagnostics.headline}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
              healthDiagnostics.level === 'high_risk'
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : healthDiagnostics.level === 'moderate'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}>
              {healthDiagnostics.badgeText}
            </span>
          </div>
          <p className="text-[11px] text-[#868993] font-sans mt-1 leading-relaxed">
            {healthDiagnostics.description}
          </p>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {stakes.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-[#787b86] text-xs">
            <span>No active open positions to analyze</span>
          </div>
        ) : viewMode === '3-columns' ? (
          /* 3 COLUMNS: Leading (Col 1), Improving (Col 2), Lagging & Risk (Col 3) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* COLUMN 1: LEADING INDUSTRY STAKES */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Leading Industry Stakes</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {leadingStakes.length} groups
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {leadingStakes.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No active positions in leading rotation regimes.
                  </div>
                ) : (
                  leadingStakes.map((stake) => (
                    <StakeRowItem
                      key={stake.industryGroup}
                      stake={stake}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      unrealizedGain={groupGainMap.get(stake.industryGroup)}
                    />
                  ))
                )}
              </div>

              {leadingStakes.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('rebalance')}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    Explore live buy opportunities in leading sectors
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 2: IMPROVING & STABLE STAKES */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Improving & Stable Stakes</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {improvingStakes.length} groups
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {improvingStakes.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No positions in improving industry groups.
                  </div>
                ) : (
                  improvingStakes.map((stake) => (
                    <StakeRowItem
                      key={stake.industryGroup}
                      stake={stake}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      unrealizedGain={groupGainMap.get(stake.industryGroup)}
                    />
                  ))
                )}
              </div>

              {improvingStakes.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    View all sector allocation rankings
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 3: LAGGING & RISK STAKES */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Lagging & Overweight Risk</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {laggingOrRiskStakes.length} groups
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {laggingOrRiskStakes.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No lagging or overconcentrated stakes detected.
                  </div>
                ) : (
                  laggingOrRiskStakes.map((stake) => (
                    <StakeRowItem
                      key={stake.industryGroup}
                      stake={stake}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      unrealizedGain={groupGainMap.get(stake.industryGroup)}
                    />
                  ))
                )}
              </div>

              {laggingOrRiskStakes.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('rebalance')}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    Review rebalancing suggestions to trim risk
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'all' ? (
          /* SINGLE COMPLETE RANKED LIST */
          <div className="flex flex-col">
            <div className="divide-y divide-[#1e222d]">
              {filteredStakes.map((stake) => (
                <StakeRowItem
                  key={stake.industryGroup}
                  stake={stake}
                  formatMoney={formatMoney}
                  isPrivacy={isPrivacy}
                  unrealizedGain={groupGainMap.get(stake.industryGroup)}
                  showProgressBar
                />
              ))}
            </div>
            <div className="pt-3 mt-1 border-t border-[#1e222d]">
              <span className="text-xs text-[#787b86]">
                Showing {filteredStakes.length} industry groups ranked by portfolio allocation weight
              </span>
            </div>
          </div>
        ) : (
          /* VIEW 3: QUANT REBALANCING SUGGESTIONS */
          rebalancingSuggestions.length === 0 ? (
            <div className="py-12 text-center text-plt-muted text-xs font-sans px-4">
              <Compass size={24} className="mx-auto mb-2 opacity-40 text-plt-accent" />
              <p className="font-semibold text-white">No Underweight Leading Sectors</p>
              <p className="text-[11px] text-[#787b86] mt-1">
                Your portfolio already has exposure to the market's leading rotation industry groups or there are no active strategy buy triggers right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#787b86] pb-1 border-b border-[#1e222d]">
                <span>Underweight / Unheld Sectors in Alpha Rotation with Live Buy Alerts</span>
                <span className="font-mono text-white font-medium">{rebalancingSuggestions.length} Opportunities</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rebalancingSuggestions.map((sug) => {
                  const isLeading = sug.regime === 'Leading';

                  return (
                    <div
                      key={sug.industryGroup}
                      className="p-3.5 rounded-xl border border-[#1e222d] bg-[#131722] hover:border-[#2a2e39] transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-sans">
                              {sug.industryGroup}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-[5px] text-white ${
                                isLeading ? 'bg-[#089981]' : 'bg-[#2962ff]'
                              }`}
                            >
                              {isLeading ? '🟢 Leading' : '🔵 Improving'}
                            </span>
                          </div>
                          <div className="text-xs text-[#787b86] mt-1 font-sans">
                            Current Allocation: <span className="font-mono font-semibold text-white">{sug.currentAllocation.toFixed(1)}%</span>
                            {sug.currentAllocation === 0 ? ' (Zero Exposure)' : ' (Underweight)'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#2962ff]/15 text-[#2962ff] border border-[#2962ff]/30 font-semibold inline-flex items-center gap-1">
                            <TrendingUp size={11} />
                            <span>Alpha Wave</span>
                          </span>
                        </div>
                      </div>

                      {/* Live Strategy Buy Triggers in this sector */}
                      <div className="pt-2 border-t border-[#1e222d] space-y-1.5">
                        <span className="text-[10px] text-[#787b86] font-sans uppercase font-medium tracking-wider block">
                          Live Strategy Buy Signals ({sug.opportunities.length}):
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sug.opportunities.map((opp) => (
                            <Link
                              key={`${opp.symbol}-${opp.strategyId}`}
                              href={`/invest?ticker=${opp.symbol}&view=chart&timeframe=D`}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#1e222d]/60 hover:bg-[#1e222d] border border-[#2a2e39]/60 transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-xs text-white group-hover:text-[#2962ff] transition-colors">
                                  {opp.symbol.replace('.CA', '')}
                                </span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                  opp.strategyBadgeClassName || 'bg-[#2962ff]/15 text-[#2962ff]'
                                }`}>
                                  {opp.strategyShortName || 'PSI'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#089981] font-semibold">
                                <span>{opp.signal.price.toFixed(2)} £</span>
                                <ArrowRight size={11} className="text-[#787b86] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Sleek TradingView Row Item for Industry Stakes
 * Replicates the exact visual geometry from TradingView and PortfolioBreakdownTable:
 * - Circular avatar with initial letter
 * - Group name in white on top
 * - Tickers in dark capsule badge underneath + holdings count
 * - Market value in bold white font with currency code (e.g. 142,500.0 EGP)
 * - Weight % underneath
 * - Solid TradingView badge for regime / overweight risk
 */
function StakeRowItem({
  stake,
  formatMoney,
  isPrivacy,
  unrealizedGain,
  showProgressBar = false,
}: {
  stake: IndustryGroupStake;
  formatMoney: (val: number) => string;
  isPrivacy: boolean;
  unrealizedGain?: number;
  showProgressBar?: boolean;
}) {
  const isOverweight = stake.percentage >= 25;
  const isModerate = stake.percentage >= 20 && stake.percentage < 25;
  const regime = stake.rotationRegime || 'Neutral';
  const initial = stake.industryGroup.trim().charAt(0).toUpperCase();

  return (
    <div className={`py-2.5 px-1 flex flex-col hover:bg-[#1e222d]/30 transition-colors group cursor-pointer border-b border-[#1e222d] ${
      isOverweight ? 'bg-red-500/[0.03]' : ''
    }`}>
      <div className="flex items-center justify-between">
        {/* Left: Circular Avatar + Stacked Name & Tickers */}
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
            isOverweight
              ? 'bg-red-500/15 text-red-400 border-red-500/30'
              : regime === 'Leading'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-[#1e222d] text-white/90 border-white/5'
          }`}>
            <span>{initial}</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-white truncate max-w-[130px] sm:max-w-[160px] md:max-w-[190px] group-hover:text-[#2962ff] transition-colors">
                {stake.industryGroup}
              </span>
              {isOverweight && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-semibold shrink-0">
                  Overweight
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              {stake.tickers.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1e222d] text-[#868993] border border-white/5 uppercase tracking-wider truncate max-w-[110px]">
                  {stake.tickers.join(', ')}
                </span>
              )}
              <span className="text-[11px] text-[#787b86] font-normal truncate">
                · {stake.positionsCount} {stake.positionsCount === 1 ? 'position' : 'positions'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Value + Solid Return/Regime Pill */}
        <div className="flex items-center gap-3 shrink-0 pl-2">
          <div className="text-right">
            <div className="text-[13px] font-semibold text-white tabular-nums">
              {isPrivacy ? (
                '••••••'
              ) : (
                <>
                  {formatMoney(stake.value)}
                  <span className="text-[10px] text-[#787b86] font-medium uppercase ml-1">
                    EGP
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5 text-[10px] font-medium tabular-nums text-right mt-0.5">
              <span className={isOverweight ? 'text-red-400 font-bold' : isModerate ? 'text-amber-400 font-semibold' : 'text-[#787b86]'}>
                {stake.percentage.toFixed(1)}%
              </span>
              {unrealizedGain !== undefined && (
                <span className={unrealizedGain >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
                  ({unrealizedGain >= 0 ? '+' : ''}{unrealizedGain.toLocaleString('en-US', { maximumFractionDigits: 0 })} £)
                </span>
              )}
            </div>
          </div>

          {/* Solid TradingView Pill Badge */}
          <div className="w-[84px] shrink-0 flex justify-end">
            <div
              className={`w-[80px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white shadow-xs ${
                isOverweight
                  ? 'bg-[#f23645]'
                  : regime === 'Leading'
                  ? 'bg-[#089981]'
                  : regime === 'Improving'
                  ? 'bg-[#2962ff]'
                  : regime === 'Weakening'
                  ? 'bg-[#ff9800]'
                  : 'bg-[#1e222d] text-[#868993] border border-white/5'
              }`}
            >
              {isOverweight ? '⚠️ >25%' : regime}
            </div>
          </div>
        </div>
      </div>

      {/* Optional Allocation Progress Bar */}
      {showProgressBar && (
        <div className="w-full h-1 rounded-full bg-[#1e222d] overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverweight ? 'bg-[#f23645]' : isModerate ? 'bg-[#ff9800]' : 'bg-[#089981]'
            }`}
            style={{ width: `${Math.min(100, stake.percentage)}%` }}
          />
        </div>
      )}
    </div>
  );
}

