'use client';

import React from 'react';
import {
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { HoldingConsensus } from '@/lib/multi-strategy-consensus';
import type { StrategyId } from '@/lib/strategy-analysis';
import {
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
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="w-full min-w-0 relative space-y-3 select-none font-sans">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-2 border-b border-[#1e222d]">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Open Holdings Ledger</h3>
          <p className="text-xs text-[#787b86] mt-0.5">Aggregated positions, allocation weights, and algorithmic consensus</p>
        </div>
        <span className="text-xs text-[#787b86] font-medium">
          {holdings.length} active ticker{holdings.length === 1 ? '' : 's'} · {totalLotsCount} lot{totalLotsCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block custom-scrollbar">
        <div className="portfolio-table-min">
          <div className="table-layout-portfolio border-b border-[#1e222d] px-3 py-2 text-[11px] font-medium text-[#787b86]">
            <span>Ticker</span>
            <span>Accounts</span>
            <span>Position</span>
            <span>Weight</span>
            <span>Group / Regime</span>
            <span>Typhon</span>
            <span>Cerberus</span>
            <span className="text-right">Actions</span>
          </div>

          {holdings.length === 0 ? (
            <div className="px-3 py-12 text-center text-xs text-[#787b86]">No open positions in your portfolio yet.</div>
          ) : (
            holdings.map((holding) => {
              const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;
              const consensus = consensusMap[holding.symbol];

              return (
                <div
                  key={holding.symbol}
                  className="table-layout-portfolio items-center border-b border-[#1e222d]/60 px-3 py-3 hover:bg-[#1e222d]/30 transition-colors group cursor-pointer"
                >
                  {/* Ticker & Logo */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TickerLogo symbol={holding.symbol} logoUrl={holding.logoUrl} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-[#2962ff] transition-colors">
                        {holding.symbol}
                      </p>
                      <p className="truncate text-[11px] text-[#787b86]">{holding.companyName}</p>
                    </div>
                  </div>

                  {/* Accounts */}
                  <div className="min-w-0 text-[11px] text-[#787b86]" title={holding.accountNames.join(', ')}>
                    {holding.accountNames.length ? (
                      <span className="text-[#d1d4dc]">{holding.accountNames.length} account{holding.accountNames.length === 1 ? '' : 's'}</span>
                    ) : (
                      <span className="text-amber-400">Not linked</span>
                    )}
                  </div>

                  {/* Position Qty / Value / P&L */}
                  <div className="holding-position-cell tabular-nums">
                    <div className="holding-position-line">
                      <span className="holding-position-label text-[#787b86]">Qty</span>
                      <span className="holding-position-value font-medium text-white">{isPrivacy ? '••••' : number(holding.quantity, 2)}</span>
                    </div>
                    <div className="holding-position-line">
                      <span className="holding-position-label text-[#787b86]">Value</span>
                      <span className="holding-position-value font-semibold text-white">{isPrivacy ? '••••••••' : money(holding.marketValue)}</span>
                    </div>
                    <div className="holding-position-line">
                      <span className="holding-position-label text-[#787b86]">P/L</span>
                      <span className={`holding-position-value font-semibold ${holding.unrealizedPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {isPrivacy ? (holding.unrealizedPnl >= 0 ? '+••••' : '-••••') : (
                          <>{pct(holding.unrealizedPnlPct)} · {holding.unrealizedPnl > 0 ? '+' : ''}{money(holding.unrealizedPnl)}</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Weight */}
                  <span className="text-xs font-semibold text-[#d1d4dc] tabular-nums">{number(holding.weightPct)}%</span>

                  {/* Group / Regime */}
                  <div className="text-[11px] min-w-0">
                    <span className="block truncate text-white font-medium">{group}</span>
                    <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${regimeTone(holding.regime)}`}>
                      {holding.regime}
                    </span>
                  </div>

                  {/* Strategy Decision Cells */}
                  <StrategyDecisionCell label="Typhon" opinion={opinionFor(consensus, 'psi', freshness)} loading={isLoadingConsensus} active={strategy === 'psi'} />
                  <StrategyDecisionCell label="Cerberus" opinion={opinionFor(consensus, 'psi_v2', freshness)} loading={isLoadingConsensus} active={strategy === 'psi_v2'} />

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenChart(holding.symbol)}
                      className="rounded-lg p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-white transition-colors cursor-pointer"
                      title="Open Candlestick Chart"
                    >
                      <LineChart size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyMore(holding)}
                      className="rounded-lg p-1.5 text-[#089981] hover:bg-[#089981]/15 transition-colors cursor-pointer"
                      title="Buy More"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSell(holding)}
                      className="rounded-lg p-1.5 text-[#f23645] hover:bg-[#f23645]/15 transition-colors cursor-pointer"
                      title="Sell Position"
                    >
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
      <div className="space-y-2.5 md:hidden">
        {holdings.length === 0 ? (
          <div className="rounded-xl border border-[#1e222d] bg-[#14171f] px-3 py-10 text-center text-xs text-[#787b86]">
            No open positions yet.
          </div>
        ) : (
          holdings.map((holding) => {
            const consensus = consensusMap[holding.symbol];
            const selectedOpinion = opinionFor(consensus, strategy, freshness);
            const latestDecision = strategy === 'all' ? latestFreshOpinion(consensus, freshness) : selectedOpinion;
            const selectedMetrics = strategyMetricsFor(consensus, strategy);
            const group = grouping === 'sector' ? holding.sector : grouping === 'industryGroup' ? holding.industryGroup : holding.industry;

            return (
              <article key={holding.symbol} className="rounded-xl border border-[#1e222d] bg-[#14171f] p-3.5 min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TickerLogo symbol={holding.symbol} logoUrl={holding.logoUrl} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{holding.symbol}</p>
                      <p className="truncate text-[11px] text-[#787b86]">{holding.companyName}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-xs font-bold text-white">{isPrivacy ? '••••••••' : money(holding.marketValue)}</p>
                    <p className={`text-[11px] font-semibold ${holding.unrealizedPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                      {isPrivacy ? (holding.unrealizedPnl >= 0 ? '+••••' : '-••••') : pct(holding.unrealizedPnlPct)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-[#1e222d] pb-2 text-[11px]">
                  <span className="truncate text-[#787b86]">{group}</span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${regimeTone(holding.regime)}`}>
                    {holding.regime}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-b border-[#1e222d] pb-3 text-xs tabular-nums">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#787b86]">Quantity</p>
                    <p className="mt-0.5 font-semibold text-white">{isPrivacy ? '••••' : number(holding.quantity, 2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#787b86]">Last Price</p>
                    <p className="mt-0.5 font-semibold text-white">{number(holding.currentPrice, 2)} EGP</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#787b86]">Weight</p>
                    <p className="mt-0.5 font-semibold text-[#d1d4dc]">{number(holding.weightPct)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#787b86]">Account</p>
                    <p className="mt-0.5 truncate font-medium text-white">
                      {holding.accountNames.length ? `${holding.accountNames.length} account${holding.accountNames.length === 1 ? '' : 's'}` : 'Not linked'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-[#787b86]">
                    <span className="font-semibold uppercase tracking-wider">Strategy Decision</span>
                    <span>{isLoadingConsensus ? 'Analyzing…' : latestDecision ? `${latestDecision.barsAgo ?? 0} sessions old` : 'Current window'}</span>
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

                <div className="grid grid-cols-3 gap-2 border-t border-[#1e222d] pt-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenChart(holding.symbol)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#2a2e39] px-2 py-1.5 text-xs font-semibold text-white hover:bg-[#323644] transition-colors cursor-pointer"
                  >
                    <LineChart size={13} /> Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => onBuyMore(holding)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#089981]/15 border border-[#089981]/30 px-2 py-1.5 text-xs font-semibold text-[#089981] hover:bg-[#089981]/25 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight size={13} /> Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => onSell(holding)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#f23645]/15 border border-[#f23645]/30 px-2 py-1.5 text-xs font-semibold text-[#f23645] hover:bg-[#f23645]/25 transition-colors cursor-pointer"
                  >
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
