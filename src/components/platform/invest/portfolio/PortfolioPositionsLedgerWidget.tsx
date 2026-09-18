'use client';

import React from 'react';
import {
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
} from '@/components/ui/icon-library';
import type { HoldingConsensus } from '@/lib/multi-strategy-consensus';
import type { StrategyId } from '@/lib/strategy-analysis';
import {
  cleanSymbol,
  money,
  number,
  pct,
  regimeTone,
  opinionFor,
  latestFreshOpinion,
  strategyMetricsFor,
  type HoldingRow,
  type StrategyFilter,
  type Grouping,
} from './portfolioTypes';
import { TickerLogo, DecisionChip, StrategyDecisionCell } from './portfolioComponents';

interface PortfolioPositionsLedgerWidgetProps {
  holdings: HoldingRow[];
  totalLotsCount: number;
  strategy: StrategyFilter;
  freshness: number;
  grouping: Grouping;
  consensusMap: Record<string, HoldingConsensus>;
  isLoadingConsensus: boolean;
  onOpenChart: (symbol: string, strategyId?: StrategyId) => void;
  onBuyMore: (holding: HoldingRow) => void;
  onSell: (holding: HoldingRow) => void;
}

export default function PortfolioPositionsLedgerWidget({
  holdings,
  totalLotsCount,
  strategy,
  freshness,
  grouping,
  consensusMap,
  isLoadingConsensus,
  onOpenChart,
  onBuyMore,
  onSell,
}: PortfolioPositionsLedgerWidgetProps) {
  return (
    <div className="w-full min-w-0 relative space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">02 · Current portfolio</p>
          <h2 className="mt-1 text-base font-semibold text-plt-text">Open positions, one row per ticker</h2>
          <p className="mt-1 text-xs text-plt-muted">Multiple lots and accounts are aggregated here; use the account detail before selling.</p>
        </div>
        <span className="text-[11px] text-plt-muted">
          {holdings.length} active ticker{holdings.length === 1 ? '' : 's'} · {totalLotsCount} lot{totalLotsCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-xl bg-plt-card/25 md:block custom-scrollbar">
        <div className="portfolio-table-min">
          <div className="table-layout-portfolio border-b border-plt-border-soft px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-plt-muted">
            <span>Ticker</span>
            <span>Accounts</span>
            <span>Position</span>
            <span>Weight</span>
            <span>Group / regime</span>
            <span>Typhon</span>
            <span>Cerberus</span>
            <span>Actions</span>
          </div>

          {holdings.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-plt-muted">No open positions yet.</div>
          ) : (
            holdings.map((holding) => {
              const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;
              const consensus = consensusMap[holding.symbol];

              return (
                <div key={holding.symbol} className="table-layout-portfolio items-center border-b border-plt-border-soft px-3 py-3 last:border-b-0 hover:bg-plt-hover/40">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TickerLogo symbol={holding.symbol} logoUrl={holding.logoUrl} />
                    <div className="min-w-0">
                      <p className="portfolio-ticker-name">{holding.symbol}</p>
                      <p className="truncate text-[11px] text-plt-muted">{holding.companyName}</p>
                    </div>
                  </div>

                  <div className="min-w-0 text-[11px] text-plt-muted" title={holding.accountNames.join(', ')}>
                    {holding.accountNames.length ? (
                      <>{holding.accountNames.length} account{holding.accountNames.length === 1 ? '' : 's'}</>
                    ) : (
                      <span className="text-plt-warning">Not linked</span>
                    )}
                  </div>

                  <div className="holding-position-cell">
                    <div className="holding-position-line">
                      <span className="holding-position-label">Qty</span>
                      <span className="holding-position-value">{number(holding.quantity, 2)}</span>
                    </div>
                    <div className="holding-position-line">
                      <span className="holding-position-label">Value</span>
                      <span className="holding-position-value">{money(holding.marketValue)}</span>
                    </div>
                    <div className="holding-position-line">
                      <span className="holding-position-label">P/L</span>
                      <span className={`holding-position-value ${holding.unrealizedPnl >= 0 ? 'holding-position-value-profit' : 'holding-position-value-risk'}`}>
                        {pct(holding.unrealizedPnlPct)} · {money(holding.unrealizedPnl)}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-plt-muted">{number(holding.weightPct)}%</span>

                  <div className="text-[11px]">
                    <span className="block truncate text-plt-text">{group}</span>
                    <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(holding.regime)}`}>
                      {holding.regime}
                    </span>
                  </div>

                  <StrategyDecisionCell label="Typhon" opinion={opinionFor(consensus, 'psi', freshness)} loading={isLoadingConsensus} active={strategy === 'psi'} />
                  <StrategyDecisionCell label="Cerberus" opinion={opinionFor(consensus, 'psi_v2', freshness)} loading={isLoadingConsensus} active={strategy === 'psi_v2'} />

                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => onOpenChart(holding.symbol)} className="rounded-md p-1.5 text-plt-muted hover:bg-plt-hover hover:text-plt-text cursor-pointer" title="Open chart">
                      <LineChart size={14} />
                    </button>
                    <button type="button" onClick={() => onBuyMore(holding)} className="rounded-md p-1.5 text-plt-accent hover:bg-plt-accent-soft cursor-pointer" title="Buy more">
                      <ArrowUpRight size={14} />
                    </button>
                    <button type="button" onClick={() => onSell(holding)} className="rounded-md p-1.5 text-plt-risk hover:bg-plt-risk-soft cursor-pointer" title="Sell">
                      <ArrowDownRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-2 md:hidden">
        {holdings.length === 0 ? (
          <div className="rounded-xl bg-plt-card/25 px-3 py-10 text-center text-xs text-plt-muted">No open positions yet.</div>
        ) : (
          holdings.map((holding) => {
            const consensus = consensusMap[holding.symbol];
            const selectedOpinion = opinionFor(consensus, strategy, freshness);
            const latestDecision = strategy === 'all' ? latestFreshOpinion(consensus, freshness) : selectedOpinion;
            const selectedMetrics = strategyMetricsFor(consensus, strategy);
            const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;

            return (
              <article key={holding.symbol} className="rounded-xl bg-plt-card/25 px-3 py-3 min-w-0">
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
                    <p className={holding.unrealizedPnl >= 0 ? 'text-[11px] text-plt-profit' : 'text-[11px] text-plt-risk'}>
                      {pct(holding.unrealizedPnlPct)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-b border-plt-border-soft pb-2.5">
                  <span className="truncate text-[11px] text-plt-muted">{group}</span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(holding.regime)}`}>{holding.regime}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-plt-border-soft py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-plt-muted">Quantity</p>
                    <p className="mt-1 text-xs text-plt-text">{number(holding.quantity, 2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-plt-muted">Last price</p>
                    <p className="mt-1 text-xs text-plt-text">{number(holding.currentPrice, 2)} EGP</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-plt-muted">Weight</p>
                    <p className="mt-1 text-xs text-plt-text">{number(holding.weightPct)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-plt-muted">Account</p>
                    <p className="mt-1 truncate text-xs text-plt-text">
                      {holding.accountNames.length ? `${holding.accountNames.length} account${holding.accountNames.length === 1 ? '' : 's'}` : 'Not linked'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-plt-muted">Signal date</p>
                    <p className="mt-1 text-xs text-plt-text">{isLoadingConsensus ? 'Analyzing…' : latestDecision?.signalDate || 'No fresh signal'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-plt-muted">Strategy alpha</p>
                    <p className="mt-1 text-xs text-plt-text">{isLoadingConsensus ? 'Analyzing…' : pct(selectedMetrics?.alpha)}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted">Decision</span>
                    <span className="text-[10px] text-plt-muted">
                      {isLoadingConsensus ? 'Loading canonical analysis' : latestDecision ? `${latestDecision.barsAgo ?? 0} sessions old` : 'Selected window'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy === 'all' ? (
                      <>
                        <DecisionChip strategy="Typhon" opinion={opinionFor(consensus, 'psi', freshness) || undefined} loading={isLoadingConsensus} />
                        <DecisionChip strategy="Cerberus" opinion={opinionFor(consensus, 'psi_v2', freshness) || undefined} loading={isLoadingConsensus} />
                      </>
                    ) : (
                      <DecisionChip strategy={strategy === 'psi' ? 'Typhon' : 'Cerberus'} opinion={selectedOpinion || undefined} loading={isLoadingConsensus} />
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-plt-border-soft pt-3">
                  <button type="button" onClick={() => onOpenChart(holding.symbol)} className="inline-flex items-center justify-center gap-1 rounded-md bg-plt-hover px-2 py-2 btn-typography-semibold text-plt-text cursor-pointer">
                    <LineChart size={13} /> Chart
                  </button>
                  <button type="button" onClick={() => onBuyMore(holding)} className="inline-flex items-center justify-center gap-1 rounded-md bg-plt-accent-soft px-2 py-2 btn-typography-semibold text-plt-accent cursor-pointer">
                    <ArrowUpRight size={13} /> Buy
                  </button>
                  <button type="button" onClick={() => onSell(holding)} className="inline-flex items-center justify-center gap-1 rounded-md bg-plt-risk-soft px-2 py-2 btn-typography-semibold text-plt-risk cursor-pointer">
                    <ArrowDownRight size={13} /> Sell
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
