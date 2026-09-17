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
    <div className="w-full min-w-0 relative space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">03 · Buy opportunities</p>
          <h2 className="mt-1 text-base font-semibold text-plt-text">Find the best candidates to add</h2>
          <p className="mt-1 text-xs text-plt-muted">
            Unheld tickers by default · BUY signals from the last {freshness} trading sessions · sorted {sort === 'alpha' ? 'by alpha' : 'by your selected sort'}.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-plt-accent-soft px-2.5 py-1.5 text-[11px] font-semibold text-plt-accent">
          <Filter size={13} /> {strategyOpportunities.length} qualifying ticker{strategyOpportunities.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-xl bg-plt-card/25 md:block custom-scrollbar">
        <div className="opportunity-table-min">
          <div className="table-layout-opportunity border-b border-plt-border-soft px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-plt-muted">
            <span>Ticker</span>
            <span>Triggering strategy</span>
            <span>Last</span>
            <span>Signal date</span>
            <span>Signal age</span>
            <span>Avg bars</span>
            <span>Max DD</span>
            <span>Max MAE</span>
            <span>Total return</span>
            <span>Alpha</span>
            <span>Action</span>
          </div>

          {isLoadingOpportunities ? (
            <div className="flex items-center justify-center gap-2 px-3 py-10 text-xs text-plt-muted">
              <Loader2 size={14} className="animate-spin" /> Scanning the market with canonical strategy analysis…
            </div>
          ) : groupedOpportunities.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-plt-muted">
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
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center justify-between border-b border-plt-border-soft bg-plt-base/60 px-3 py-2.5 text-left hover:bg-plt-hover/40 cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronDown size={14} className={`shrink-0 text-plt-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="btn-typography-semibold text-plt-text">{group}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(rows[0]?.rotationRegime)}`}>
                        {rows[0]?.rotationRegime || 'Unclassified'}
                      </span>
                    </span>
                    <span className="text-right text-[10px] text-plt-muted">
                      <span>{rows.length} candidate{rows.length === 1 ? '' : 's'} · {allocatedValue > 0 ? `${number(allocationPct)}% allocated` : 'No current allocation'}</span>
                      {concentrationWarning && <span className="ml-2 text-plt-warning">Concentration &gt;30%</span>}
                    </span>
                  </button>

                  {!isCollapsed &&
                    rows.map((opportunity) => {
                      const symbol = cleanSymbol(opportunity.symbol);
                      return (
                        <div key={symbol} className="table-layout-opportunity items-center border-b border-plt-border-soft px-3 py-3 last:border-b-0 hover:bg-plt-hover/40">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <TickerLogo symbol={symbol} logoUrl={opportunity.logoUrl} />
                            <div className="min-w-0">
                              <p className="portfolio-ticker-name">{symbol}</p>
                              <p className="truncate text-[11px] text-plt-muted">{opportunity.companyName}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-plt-accent-soft px-1.5 py-1 text-[10px] font-semibold text-plt-accent">
                              {opportunity.strategyShortName}
                            </span>
                            {strategy === 'all' &&
                              opportunities
                                .filter(
                                  (item) =>
                                    cleanSymbol(item.symbol) === symbol &&
                                    item.signal.signal === 'BUY' &&
                                    (item.signal.barsAgo ?? Number.POSITIVE_INFINITY) < freshness &&
                                    item.strategyId !== opportunity.strategyId
                                )
                                .filter((item, index, items) => items.findIndex((candidate) => candidate.strategyId === item.strategyId) === index)
                                .map((item) => (
                                  <span key={item.strategyId} className="rounded-md bg-plt-hover px-1.5 py-1 text-[10px] text-plt-muted">
                                    {item.strategyShortName}
                                  </span>
                                ))}
                          </div>

                          <span className="text-xs text-plt-text">{number(latestPriceMap[symbol] ?? opportunity.signal.price, 2)}</span>
                          <span className="text-[11px] text-plt-muted">{opportunity.signal.date}</span>
                          <span className="text-[11px] text-plt-muted">{opportunity.signal.barsAgo ?? 'Unavailable'} sessions</span>
                          <span className="text-[11px] text-plt-text">{number(metricForOpportunity(opportunity, 'avgBarsPerTrade'))}</span>
                          <span className="text-[11px] text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxDrawdown'))}</span>
                          <span className="text-[11px] text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxAdverseExcursion'))}</span>
                          <span className="text-[11px] text-plt-text">{pct(metricForOpportunity(opportunity, 'totalReturn'))}</span>
                          <span className="text-[11px] font-semibold text-plt-profit">{pct(metricForOpportunity(opportunity, 'alpha'))}</span>

                          <button
                            type="button"
                            onClick={() => onBuy(opportunity)}
                            className="inline-flex w-fit items-center gap-1.5 rounded-md bg-plt-accent px-2.5 py-1.5 btn-typography-semibold text-plt-base hover:opacity-90 cursor-pointer"
                          >
                            <Zap size={12} /> Buy
                          </button>
                        </div>
                      );
                    })}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div className="space-y-3 md:hidden">
        {isLoadingOpportunities ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-plt-card/25 px-3 py-10 text-xs text-plt-muted">
            <Loader2 size={14} className="animate-spin" /> Scanning the market…
          </div>
        ) : groupedOpportunities.length === 0 ? (
          <div className="rounded-xl bg-plt-card/25 px-3 py-10 text-center text-xs text-plt-muted">
            No candidates match the current filters.
          </div>
        ) : (
          groupedOpportunities.map(([group, rows]) => {
            const allocatedValue = holdings
              .filter((holding) => (grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry) === group)
              .reduce((sum, holding) => sum + holding.marketValue, 0);
            const allocationPct = investedValue > 0 ? (allocatedValue / investedValue) * 100 : 0;
            const isCollapsed = collapsedGroups[group] === true;

            return (
              <div key={group} className="space-y-2">
                <button
                  type="button"
                  onClick={() => onToggleGroup(group)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center justify-between border-b border-plt-border-soft px-1 py-2 text-left hover:bg-plt-hover/40 cursor-pointer"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown size={14} className={`shrink-0 text-plt-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    <span className="truncate btn-typography-semibold text-plt-text">{group}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(rows[0]?.rotationRegime)}`}>
                      {rows[0]?.rotationRegime || 'Unclassified'}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-plt-muted">
                    {rows.length} · {allocatedValue > 0 ? `${number(allocationPct)}%` : 'No allocation'}
                  </span>
                </button>

                {!isCollapsed &&
                  rows.map((opportunity) => {
                    const symbol = cleanSymbol(opportunity.symbol);
                    const triggerStrategies = opportunities
                      .filter((item) => cleanSymbol(item.symbol) === symbol && item.signal.signal === 'BUY' && (item.signal.barsAgo ?? Number.POSITIVE_INFINITY) < freshness)
                      .map((item) => ({ id: item.strategyId, label: item.strategyShortName }))
                      .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);

                    return (
                      <article key={symbol} className="rounded-xl bg-plt-card/25 px-3 py-3 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <TickerLogo symbol={symbol} logoUrl={opportunity.logoUrl} />
                            <div className="min-w-0">
                              <p className="portfolio-ticker-name">{symbol}</p>
                              <p className="truncate text-[11px] text-plt-muted">{opportunity.companyName}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-semibold text-plt-text">{number(latestPriceMap[symbol] ?? opportunity.signal.price, 2)} EGP</p>
                            <p className="text-[11px] text-plt-muted">{opportunity.signal.date}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(strategy === 'all' ? triggerStrategies : [{ id: opportunity.strategyId, label: opportunity.strategyShortName }]).map((item) => (
                            <span key={item.id} className="rounded-md bg-plt-accent-soft px-1.5 py-1 text-[10px] font-semibold text-plt-accent">
                              {item.label}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-plt-border-soft py-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-plt-muted">Signal age</p>
                            <p className="mt-1 text-xs text-plt-text">{opportunity.signal.barsAgo ?? 'Unavailable'} sessions</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-plt-muted">Avg bars / trade</p>
                            <p className="mt-1 text-xs text-plt-text">{number(metricForOpportunity(opportunity, 'avgBarsPerTrade'))}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-plt-muted">Max drawdown</p>
                            <p className="mt-1 text-xs text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxDrawdown'))}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-plt-muted">Max adverse excursion</p>
                            <p className="mt-1 text-xs text-plt-risk">{pct(metricForOpportunity(opportunity, 'maxAdverseExcursion'))}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-plt-muted">Total return</p>
                            <p className="mt-1 text-xs text-plt-text">{pct(metricForOpportunity(opportunity, 'totalReturn'))}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-plt-muted">Alpha</p>
                            <p className="mt-1 text-xs font-semibold text-plt-profit">{pct(metricForOpportunity(opportunity, 'alpha'))}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onBuy(opportunity)}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-plt-accent px-3 py-2.5 btn-typography-semibold text-plt-base cursor-pointer"
                        >
                          <Zap size={13} /> Buy {symbol}
                        </button>
                      </article>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
