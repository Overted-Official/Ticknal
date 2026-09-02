'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Compass,
  ArrowRight,
  ExternalLink,
  ChevronDown,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { type RotationRegime } from '@/lib/industry-rotation';

export type IndustryGroupStake = {
  industryGroup: string;
  value: number;
  percentage: number;
  positionsCount: number;
  tickers: string[];
  rotationRegime?: RotationRegime;
};

interface PortfolioConsultantCardProps {
  stakes: IndustryGroupStake[];
  totalPortfolioValue: number;
  buyOpportunities: Opportunity[];
  rotationMap?: Record<string, string>;
}

function getRegimeBadge(regime?: string) {
  switch (regime) {
    case 'Leading':
      return {
        label: 'Leading',
        icon: '🟢',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      };
    case 'Improving':
      return {
        label: 'Improving',
        icon: '🔵',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
      };
    case 'Weakening':
      return {
        label: 'Weakening',
        icon: '🟡',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      };
    case 'Lagging':
      return {
        label: 'Lagging',
        icon: '🔴',
        className: 'bg-red-500/10 text-red-400 border-red-500/25',
      };
    default:
      return {
        label: 'Neutral',
        icon: '⚪',
        className: 'bg-plt-card text-plt-muted border-plt-border-soft',
      };
  }
}

export default function PortfolioConsultantCard({
  stakes = [],
  totalPortfolioValue = 0,
  buyOpportunities = [],
  rotationMap = {},
}: PortfolioConsultantCardProps) {
  const { isPrivacy } = usePrivacyMode();
  const [activeTab, setActiveTab] = useState<'stakes' | 'rebalance'>('stakes');
  const [isExpandedMobile, setIsExpandedMobile] = useState(true);

  const formatMoney = (val: number): string => {
    if (isPrivacy) return '****** £';
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M £`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K £`;
    return `${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} £`;
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

    // Institutional Risk Guidelines: Single industry group > 30% is high concentration risk
    if (topPct >= 30) {
      return {
        level: 'high_risk' as const,
        score: Math.max(45, Math.round(100 - (topPct - 25) * 2.5)),
        badgeText: 'High Concentration Risk',
        headline: `Overconcentrated in ${topStake.industryGroup} (${topPct.toFixed(1)}%)`,
        description: `${topStake.industryGroup} accounts for ${topPct.toFixed(1)}% of your active portfolio. Institutional risk models recommend capping any single industry group below 25% to protect against sector-specific cyclical drawdowns.`,
        topStake,
      };
    }

    if (topPct >= 20) {
      return {
        level: 'moderate' as const,
        score: Math.round(100 - (topPct - 20) * 1.5),
        badgeText: 'Moderate Concentration',
        headline: `Slightly Tilted to ${topStake.industryGroup} (${topPct.toFixed(1)}%)`,
        description: `Your portfolio is generally balanced, but ${topStake.industryGroup} has a moderate weight. Directing fresh inflows to underallocated leading sectors will optimize Sharpe ratio.`,
        topStake,
      };
    }

    return {
      level: 'healthy' as const,
      score: 95,
      badgeText: 'Well Diversified',
      headline: `Balanced across ${stakes.length} Industry Groups`,
      description: `Optimal diversification achieved. No single industry group exceeds 20% of capital, providing resilient systemic protection across macroeconomic shifts.`,
      topStake,
    };
  }, [stakes, totalPortfolioValue]);

  // 2. Rotation Rebalancing Suggestions
  // Cross-reference unheld / underweight industry groups in 'Leading' or 'Improving' with live strategy Buy signals
  const rebalancingSuggestions = useMemo(() => {
    const heldGroups = new Set(stakes.map((s) => s.industryGroup));

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

  return (
    <div className="card-widget select-none flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-3 border-b border-plt-border-soft cursor-pointer md:cursor-default"
        onClick={() => setIsExpandedMobile(!isExpandedMobile)}
      >
        <div>
          <h2 className="widget-title flex items-center gap-2">
            Portfolio Consultant
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
              healthDiagnostics.level === 'high_risk'
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : healthDiagnostics.level === 'moderate'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}>
              {healthDiagnostics.badgeText}
            </span>
          </h2>
          <p className="widget-subtitle mt-0.5">
            Concentration risk diagnostics & rotation rebalancing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tabs */}
          <div className="pill-switch" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveTab('stakes')}
              className={`pill-switch-btn text-[11px] cursor-pointer ${
                activeTab === 'stakes' ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              Stakes ({stakes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rebalance')}
              className={`pill-switch-btn text-[11px] gap-1.5 cursor-pointer ${
                activeTab === 'rebalance' ? 'pill-switch-btn-active font-semibold text-plt-accent' : ''
              }`}
            >
              <span>Rebalance ({rebalancingSuggestions.length})</span>
            </button>
          </div>

          <button
            type="button"
            className="md:hidden p-1 text-plt-muted hover:text-plt-text"
            aria-label="Toggle consultant"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpandedMobile ? 'rotate-180 text-plt-text' : ''}`} />
          </button>
        </div>
      </div>

      {/* Diagnostics Alert Banner */}
      <div className={`${isExpandedMobile ? 'block' : 'hidden'} md:block pt-2 shrink-0`}>
        <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-colors ${
          healthDiagnostics.level === 'high_risk'
            ? 'bg-red-500/10 border-red-500/25 text-red-300'
            : healthDiagnostics.level === 'moderate'
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
        }`}>
          <div className="mt-0.5 shrink-0">
            {healthDiagnostics.level === 'high_risk' ? (
              <AlertTriangle size={15} className="text-red-400" />
            ) : healthDiagnostics.level === 'moderate' ? (
              <ShieldAlert size={15} className="text-amber-400" />
            ) : (
              <ShieldCheck size={15} className="text-emerald-400" />
            )}
          </div>
          <div className="text-xs min-w-0">
            <div className="font-semibold text-plt-text font-sans leading-tight">
              {healthDiagnostics.headline}
            </div>
            <p className="text-[11px] text-plt-muted font-sans mt-0.5 leading-snug">
              {healthDiagnostics.description}
            </p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className={`${isExpandedMobile ? 'block' : 'hidden'} md:flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-2 space-y-2 pr-1`}>
        {activeTab === 'stakes' ? (
          /* VIEW 1: Active Stakes Breakdown */
          stakes.length === 0 ? (
            <div className="py-12 text-center text-plt-muted text-xs font-sans">
              No active open positions to analyze
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-plt-muted px-1">
                <span>Industry Group & Holdings</span>
                <div className="flex items-center gap-6">
                  <span>Regime</span>
                  <span className="w-20 text-right">Stake & Weight</span>
                </div>
              </div>

              {stakes.map((stake) => {
                const regimeBadge = getRegimeBadge(stake.rotationRegime);
                const isOverweight = stake.percentage >= 30;
                const isModerate = stake.percentage >= 20 && stake.percentage < 30;

                return (
                  <div
                    key={stake.industryGroup}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isOverweight
                        ? 'bg-red-500/5 border-red-500/25'
                        : 'bg-plt-card border-plt-border-soft hover:bg-plt-hover/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-plt-text truncate font-sans" title={stake.industryGroup}>
                            {stake.industryGroup}
                          </span>
                          {isOverweight && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
                              Exceeds 25% Limit
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-plt-muted mt-0.5 truncate font-sans">
                          <span>{stake.positionsCount} {stake.positionsCount === 1 ? 'Holding' : 'Holdings'}:</span>
                          <span className="font-mono text-plt-text font-medium">
                            {stake.tickers.join(', ')}
                          </span>
                        </div>
                      </div>

                      {/* Rotation Regime */}
                      <div className="shrink-0">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-medium inline-flex items-center gap-1 ${regimeBadge.className}`}>
                          <span>{regimeBadge.icon}</span>
                          <span>{regimeBadge.label}</span>
                        </span>
                      </div>

                      {/* Stake Value & Percentage */}
                      <div className="text-right shrink-0 w-24">
                        <div className="font-mono font-semibold text-xs text-plt-text">
                          {formatMoney(stake.value)}
                        </div>
                        <div className={`font-mono text-[10px] font-bold ${
                          isOverweight ? 'text-red-400' : isModerate ? 'text-amber-400' : 'text-plt-profit'
                        }`}>
                          {stake.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-plt-border-soft overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverweight ? 'bg-red-500' : isModerate ? 'bg-amber-400' : 'bg-plt-profit'
                        }`}
                        style={{ width: `${Math.min(100, stake.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* VIEW 2: Quant Rotation Rebalancing Suggestions */
          rebalancingSuggestions.length === 0 ? (
            <div className="py-12 text-center text-plt-muted text-xs font-sans px-4">
              <Compass size={24} className="mx-auto mb-2 opacity-40 text-plt-accent" />
              <p className="font-semibold text-plt-text">No Underweight Leading Sectors</p>
              <p className="text-[11px] text-plt-muted mt-1">
                Your portfolio already has exposure to the market's leading rotation industry groups or there are no active strategy buy triggers right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-plt-muted px-1">
                <span>Underweight / Unheld Sectors in Alpha Rotation with Live Buy Alerts</span>
                <span className="font-mono">{rebalancingSuggestions.length} Opportunities</span>
              </div>

              {rebalancingSuggestions.map((sug) => {
                const regimeBadge = getRegimeBadge(sug.regime);

                return (
                  <div
                    key={sug.industryGroup}
                    className="p-3 rounded-xl border border-plt-border-soft bg-plt-card hover:border-plt-border transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-plt-text font-sans">
                            {sug.industryGroup}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-medium inline-flex items-center gap-1 ${regimeBadge.className}`}>
                            <span>{regimeBadge.icon}</span>
                            <span>{regimeBadge.label}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-plt-muted mt-0.5 font-sans">
                          Current Allocation: <span className="font-mono font-semibold text-plt-text">{sug.currentAllocation.toFixed(1)}%</span>
                          {sug.currentAllocation === 0 ? ' (Zero Exposure)' : ' (Underweight)'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-plt-accent/15 text-plt-accent border border-plt-accent/30 font-semibold inline-flex items-center gap-1">
                          <TrendingUp size={11} />
                          <span>Alpha Wave</span>
                        </span>
                      </div>
                    </div>

                    {/* Live Strategy Buy Triggers in this sector */}
                    <div className="pt-2 border-t border-plt-border-soft/60 space-y-1.5">
                      <span className="text-[10px] text-plt-muted font-sans uppercase font-medium tracking-wider block">
                        Live Strategy Buy Signals ({sug.opportunities.length}):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {sug.opportunities.map((opp) => (
                          <Link
                            key={`${opp.symbol}-${opp.strategyId}`}
                            href={`/invest?ticker=${opp.symbol}&view=chart&timeframe=D`}
                            className="flex items-center justify-between p-2 rounded-lg bg-plt-hover/60 hover:bg-plt-hover border border-plt-border-soft transition-colors group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-xs text-plt-text font-sans group-hover:text-white">
                                {opp.symbol.replace('.CA', '')}
                              </span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                opp.strategyBadgeClassName || 'bg-plt-info/10 text-plt-info'
                              }`}>
                                {opp.strategyShortName || 'PSI'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-plt-profit font-semibold">
                              <span>{opp.signal.price.toFixed(2)} £</span>
                              <ArrowRight size={11} className="text-plt-muted group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
