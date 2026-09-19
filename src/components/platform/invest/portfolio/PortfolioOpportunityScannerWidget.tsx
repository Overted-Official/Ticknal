'use client';

import React from 'react';
import {
  Filter,
  Loader2,
  ChevronDown,
  Zap,
} from '@/components/ui/icon-library';
import type { OpportunitySignal } from '@/lib/opportunities';
import {
  cleanSymbol,
  number,
  pct,
  regimeTone,
  metricForOpportunity,
  type StrategyFilter,
  type HoldingRow,
  type Grouping,
} from './portfolioTypes';
import { TickerLogo } from './portfolioComponents';

interface PortfolioOpportunityScannerWidgetProps {
  freshness: number;
  sort: string;
  strategyOpportunities: OpportunitySignal[];
  groupedOpportunities: Array<[string, OpportunitySignal[]]>;
  isLoadingOpportunities: boolean;
  holdings: HoldingRow[];
  investedValue: number;
  grouping: Grouping;
  strategy: StrategyFilter;
  opportunities: OpportunitySignal[];
  latestPriceMap: Record<string, number>;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (group: string) => void;
  onBuy: (opportunity: OpportunitySignal) => void;
}

export default function PortfolioOpportunityScannerWidget({
  freshness,
  sort,
  strategyOpportunities,
  groupedOpportunities,
  isLoadingOpportunities,
  holdings,
  investedValue,
  grouping,
  strategy,
  opportunities,
  latestPriceMap,
  collapsedGroups,
  onToggleGroup,
  onBuy,
}: PortfolioOpportunityScannerWidgetProps) {
  return (
    <div className="w-full min-w-0 relative space-y-3 select-none font-sans">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-2 border-b border-[#1e222d]">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Market Opportunity Scanner</h3>
          <p className="text-xs text-[#787b86] mt-0.5">
            Qualifying candidates with fresh BUY signals in the last {freshness} sessions · sorted {sort === 'alpha' ? 'by alpha' : 'by your selected sort'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Filter size={13} /> {strategyOpportunities.length} qualifying ticker{strategyOpportunities.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block custom-scrollbar">
        <div className="opportunity-table-min">
          <div className="table-layout-opportunity border-b border-[#1e222d] px-3 py-2 text-[11px] font-medium text-[#787b86]">
            <span>Ticker</span>
            <span>Triggering Strategy</span>
            <span>Last Price</span>
            <span>Signal Date</span>
            <span>Signal Age</span>
            <span>Avg Bars</span>
            <span>Max DD</span>
            <span>Max MAE</span>
            <span>Total Return</span>
            <span>Alpha (α)</span>
            <span className="text-right">Action</span>
          </div>

          {isLoadingOpportunities ? (
            <div className="flex items-center justify-center gap-2 px-3 py-12 text-xs text-[#787b86]">
              <Loader2 size={14} className="animate-spin text-[#2962ff]" /> Scanning the market with canonical strategy analysis…
            </div>
          ) : groupedOpportunities.length === 0 ? (
            <div className="px-3 py-12 text-center text-xs text-[#787b86]">
              No candidates match the current strategy, freshness, regime, and metric filters.
            </div>
          ) : (
            groupedOpportunities.map(([group, rows]) => {
              const allocatedValue = holdings
                .filter((holding) => (grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry) === group)
                .reduce((sum, holding) => sum + holding.marketValue, 0);
              const allocationPct = investedValue > 0 ? (allocatedValue / investedValue) * 100 : 0;
              const concentrationWarning = allocationPct > 30;
              const isCollapsed = collapsedGroups[group] === true;

              return (
                <React.Fragment key={group}>
                  {/* Group Header Row */}
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center justify-between border-b border-[#1e222d] bg-[#14171f]/80 px-3 py-2.5 text-left hover:bg-[#1e222d]/50 transition-colors cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={14} className={`shrink-0 text-[#787b86] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="text-xs font-bold text-white">{group}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${regimeTone(rows[0]?.rotationRegime)}`}>
                        {rows[0]?.rotationRegime || 'Unclassified'}
                      </span>
                    </span>
                    <span className="text-right text-[11px] text-[#787b86]">
                      <span>{rows.length} candidate{rows.length === 1 ? '' : 's'} · {allocatedValue > 0 ? `${number(allocationPct)}% allocated` : 'No current allocation'}</span>
                      {concentrationWarning && <span className="ml-2 text-amber-400 font-semibold">Concentration &gt;30%</span>}
                    </span>
                  </button>

                  {/* Group Child Candidate Rows */}
                  {!isCollapsed &&
                    rows.map((opportunity) => {
                      const symbol = cleanSymbol(opportunity.symbol);
                      const avgBars = metricForOpportunity(opportunity, 'avgBarsPerTrade');
                      const maxDd = metricForOpportunity(opportunity, 'maxDrawdown');
                      const maxMae = metricForOpportunity(opportunity, 'maxAdverseExcursion');
                      const totalReturn = metricForOpportunity(opportunity, 'totalReturn');
                      const alpha = metricForOpportunity(opportunity, 'alpha');

                      return (
                        <div
                          key={symbol}
                          className="table-layout-opportunity items-center border-b border-[#1e222d]/40 px-3 py-2.5 hover:bg-[#1e222d]/30 transition-colors group cursor-pointer text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <TickerLogo symbol={symbol} logoUrl={opportunity.logoUrl} />
                            <div className="min-w-0">
                              <p className="font-semibold text-white group-hover:text-[#2962ff] transition-colors">{symbol}</p>
                              <p className="truncate text-[11px] text-[#787b86]">{opportunity.companyName}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-[#2962ff]/15 border border-[#2962ff]/30 px-2 py-0.5 text-[10px] font-semibold text-[#2962ff]">
                              {opportunity.strategyLabel}
                            </span>
                          </div>

                          <span className="tabular-nums font-mono font-medium text-white">{number(opportunity.signal.price, 2)}</span>
                          <span className="tabular-nums font-mono text-[#787b86] text-[11px]">{opportunity.signal.date}</span>
                          <span className="tabular-nums text-[#d1d4dc]">{opportunity.signal.barsAgo ?? 0} sessions</span>
                          <span className="tabular-nums text-[#787b86]">{avgBars !== null ? number(avgBars, 1) : '—'}</span>
                          <span className="tabular-nums text-[#787b86]">{maxDd !== null ? `${number(maxDd, 1)}%` : '—'}</span>
                          <span className="tabular-nums text-[#787b86]">{maxMae !== null ? `${number(maxMae, 1)}%` : '—'}</span>
                          <span className={`tabular-nums font-bold ${totalReturn !== null && totalReturn >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {totalReturn !== null ? pct(totalReturn, 1) : '—'}
                          </span>
                          <span className={`tabular-nums font-bold ${alpha !== null && alpha >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {alpha !== null ? pct(alpha, 1) : '—'}
                          </span>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => onBuy(opportunity)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#089981] px-3 py-1 text-xs font-semibold text-white hover:bg-[#07836f] transition-all shadow-xs cursor-pointer"
                            >
                              <Zap size={11} /> Buy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {isLoadingOpportunities ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1e222d] bg-[#14171f] p-8 text-xs text-[#787b86]">
            <Loader2 size={14} className="animate-spin text-[#2962ff]" /> Scanning market candidates…
          </div>
        ) : groupedOpportunities.length === 0 ? (
          <div className="rounded-xl border border-[#1e222d] bg-[#14171f] p-8 text-center text-xs text-[#787b86]">
            No matching candidates found.
          </div>
        ) : (
          groupedOpportunities.map(([group, rows]) => {
            const isCollapsed = collapsedGroups[group] === true;
            return (
              <div key={group} className="rounded-xl border border-[#1e222d] bg-[#14171f] overflow-hidden">
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => onToggleGroup(group)}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-[#1e222d]/40 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <ChevronDown size={14} className={`text-[#787b86] shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    <span className="text-xs font-bold text-white truncate">{group}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${regimeTone(rows[0]?.rotationRegime)}`}>
                      {rows[0]?.rotationRegime || 'Unclassified'}
                    </span>
                  </span>
                  <span className="text-[11px] text-[#787b86] shrink-0 font-medium">{rows.length} candidates</span>
                </button>

                {/* Simplified Candidate Cards */}
                {!isCollapsed && (
                  <div className="divide-y divide-[#1e222d] border-t border-[#1e222d]">
                    {rows.map((opportunity) => {
                      const symbol = cleanSymbol(opportunity.symbol);
                      const maxDd = metricForOpportunity(opportunity, 'maxDrawdown');
                      const totalReturn = metricForOpportunity(opportunity, 'totalReturn');
                      const alpha = metricForOpportunity(opportunity, 'alpha');

                      return (
                        <div key={symbol} className="p-3 space-y-2.5 hover:bg-[#1e222d]/20 transition-colors">
                          {/* Top: Identity + Strategy Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <TickerLogo symbol={symbol} logoUrl={opportunity.logoUrl} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">{symbol}</span>
                                  <span className="text-[10px] text-[#787b86] font-mono">· {number(opportunity.signal.price, 2)} EGP</span>
                                </div>
                                <p className="truncate text-[11px] text-[#787b86]">{opportunity.companyName}</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-[#2962ff]/15 border border-[#2962ff]/30 px-2 py-0.5 text-[10px] font-semibold text-[#2962ff]">
                              {opportunity.strategyLabel}
                            </span>
                          </div>

                          {/* Middle: Clean 3-Metric Strip */}
                          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[#0d0f14] border border-[#1e222d]/70 p-2 text-center tabular-nums">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-[#787b86] block">Alpha (α)</span>
                              <span className={`text-xs font-bold ${alpha !== null && alpha >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {alpha !== null ? pct(alpha, 1) : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-[#787b86] block">Return</span>
                              <span className={`text-xs font-bold ${totalReturn !== null && totalReturn >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {totalReturn !== null ? pct(totalReturn, 1) : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-[#787b86] block">Max DD</span>
                              <span className="text-xs font-semibold text-[#d1d4dc]">
                                {maxDd !== null ? `${number(maxDd, 1)}%` : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Bottom: Context + Compact Buy Button */}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[10px] text-[#787b86] tabular-nums font-medium">
                              {opportunity.signal.barsAgo ?? 0}s ago · {opportunity.signal.date}
                            </span>

                            <button
                              type="button"
                              onClick={() => onBuy(opportunity)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#089981] px-3 py-1 text-xs font-semibold text-white hover:bg-[#07836f] transition-all shadow-xs cursor-pointer"
                            >
                              <Zap size={11} /> Buy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
