'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Plus,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { PortfolioPosition, StagedItem } from '@/lib/portfolio-simulation';
import type { HoldingConsensus } from '@/lib/multi-strategy-consensus';
import type { InsightTickerData } from './TickerQuickInsightsDrawer';

interface HoldingsConsensusMatrixProps {
  positions: PortfolioPosition[];
  consensusMap: Record<string, HoldingConsensus>;
  stagedItems: StagedItem[];
  isSandbox: boolean;
  onSimulateExit: (symbol: string) => void;
  onRemoveStaged: (symbol: string) => void;
  onSelectTickerForInsight: (ticker: InsightTickerData) => void;
  onDropCandidate: (symbol: string) => void;
}

type GroupByMode = 'sector' | 'industry' | 'regime' | 'flat';

export default function HoldingsConsensusMatrix({
  positions,
  consensusMap,
  stagedItems,
  isSandbox,
  onSimulateExit,
  onRemoveStaged,
  onSelectTickerForInsight,
  onDropCandidate,
}: HoldingsConsensusMatrixProps) {
  const { isPrivacy } = usePrivacyMode();
  const [groupBy, setGroupBy] = useState<GroupByMode>('sector');
  const [isDragOver, setIsDragOver] = useState(false);

  const stagedExits = useMemo(
    () => new Set(stagedItems.filter((i) => i.action === 'EXIT').map((i) => i.symbol.toUpperCase())),
    [stagedItems]
  );

  const stagedAdds = useMemo(
    () => stagedItems.filter((i) => i.action === 'BUY'),
    [stagedItems]
  );

  const formatMoney = (val: number, showSign = false) => {
    if (isPrivacy) return '****** £';
    const sign = showSign && val > 0 ? '+' : '';
    return `${sign}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} £`;
  };

  const getOpinionColor = (verdict?: string) => {
    switch (verdict) {
      case 'BUY':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'SELL':
        return 'bg-red-500/15 text-red-400 border-red-500/30 font-bold';
      default:
        return 'bg-plt-card text-plt-muted border-plt-border-soft';
    }
  };

  // Grouping logic
  const groupedHoldings = useMemo(() => {
    const groups: Record<string, PortfolioPosition[]> = {};

    for (const pos of positions) {
      let key = pos.sector;
      if (groupBy === 'industry') key = pos.industryGroup || pos.sector;
      if (groupBy === 'regime') key = pos.rotationRegime || 'Neutral';
      if (groupBy === 'flat') key = 'All Active Holdings';

      if (!groups[key]) groups[key] = [];
      groups[key].push(pos);
    }

    return Object.entries(groups).sort((a, b) => {
      const sumA = a[1].reduce((s, p) => s + p.marketValue, 0);
      const sumB = b[1].reduce((s, p) => s + p.marketValue, 0);
      return sumB - sumA;
    });
  }, [positions, groupBy]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const symbol = e.dataTransfer.getData('text/plain');
        if (symbol) onDropCandidate(symbol);
      }}
      className={`card-widget flex flex-col h-full overflow-hidden transition-all duration-200 ${
        isDragOver ? 'border-2 border-dashed border-plt-accent bg-plt-accent/5' : ''
      }`}
    >
      {/* Panel Header */}
      <div className="p-3 sm:p-4 border-b border-plt-border-soft flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="widget-title flex items-center gap-2">
            <span>Portfolio Holdings & Strategy Verdicts</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-plt-hover text-plt-muted font-normal">
              {positions.length} Active {stagedAdds.length > 0 && `(+${stagedAdds.length} Staged)`}
            </span>
          </h3>
          <p className="widget-subtitle mt-0.5">
            Real-time consensus across PSI, PSI V2, and THOTH models per holding
          </p>
        </div>

        {/* Group By Selector */}
        <div className="flex items-center gap-1 bg-plt-base p-1 rounded-xl border border-plt-border-soft">
          {[
            { id: 'sector', label: 'Sector' },
            { id: 'industry', label: 'Industry' },
            { id: 'regime', label: 'Regime' },
            { id: 'flat', label: 'Flat' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setGroupBy(mode.id as GroupByMode)}
              className={`px-2 py-1 text-[11px] rounded-lg transition-colors font-medium ${
                groupBy === mode.id
                  ? 'bg-plt-card text-plt-text shadow-xs font-semibold'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Hint Banner */}
      {isDragOver && (
        <div className="p-3 bg-plt-accent/15 border-b border-plt-accent/30 text-plt-accent text-xs font-semibold flex items-center justify-center gap-2">
          <Plus size={16} />
          <span>Release to stage candidate in portfolio sandbox</span>
        </div>
      )}

      {/* Holdings List Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4">
        {positions.length === 0 && stagedAdds.length === 0 ? (
          <div className="py-16 text-center text-plt-muted text-xs font-sans space-y-2">
            <Compass size={28} className="mx-auto text-plt-muted opacity-40" />
            <p className="font-semibold text-plt-text text-sm">No Active Positions Found</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Stage buy candidates from the Opportunity Radar on the right to start building your simulated portfolio.
            </p>
          </div>
        ) : (
          groupedHoldings.map(([groupTitle, groupPositions]) => {
            const groupTotalValue = groupPositions.reduce((s, p) => s + p.marketValue, 0);

            return (
              <div key={groupTitle} className="space-y-2">
                {/* Group Section Header */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-plt-text font-sans">{groupTitle}</span>
                    <span className="text-[10px] font-mono text-plt-muted">({groupPositions.length})</span>
                  </div>
                  <span className="font-mono text-[11px] text-plt-muted">{formatMoney(groupTotalValue)}</span>
                </div>

                {/* Group Position Cards */}
                <div className="space-y-2">
                  {groupPositions.map((pos) => {
                    const cleanSym = pos.tickerSymbol.replace('.CA', '').trim().toUpperCase();
                    const consensus = consensusMap[cleanSym];
                    const isExited = stagedExits.has(cleanSym);

                    return (
                      <div
                        key={pos.id}
                        onClick={() =>
                          onSelectTickerForInsight({
                            symbol: pos.tickerSymbol,
                            companyName: pos.companyName,
                            sector: pos.sector,
                            industryGroup: pos.industryGroup,
                            rotationRegime: pos.rotationRegime,
                            logoUrl: pos.logoUrl,
                            currentPrice: pos.currentPrice,
                            isHeld: true,
                            isStaged: isExited,
                            stagedAction: isExited ? 'EXIT' : undefined,
                          })
                        }
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isExited
                            ? 'bg-red-500/5 border-red-500/30 opacity-60 line-through'
                            : consensus?.overallVerdict === 'CRITICAL_EXIT'
                            ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                            : 'bg-plt-card border-plt-border-soft hover:border-plt-border hover:bg-plt-hover/40'
                        }`}
                      >
                        {/* Top: Ticker, Weight, Unrealized PnL */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-plt-hover border border-plt-border-soft flex items-center justify-center font-mono font-bold text-xs shrink-0 overflow-hidden">
                              {pos.logoUrl ? (
                                <img src={pos.logoUrl} alt={cleanSym} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                cleanSym.slice(0, 3)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-plt-text font-sans">{cleanSym}</span>
                                <span className="text-[10px] font-mono text-plt-muted">
                                  {pos.weightPct ? `${pos.weightPct.toFixed(1)}% weight` : ''}
                                </span>
                              </div>
                              <p className="text-[11px] text-plt-muted truncate">{pos.companyName}</p>
                            </div>
                          </div>

                          {/* P&L & Value */}
                          <div className="text-right font-mono shrink-0">
                            <div className="text-xs font-semibold text-plt-text">{formatMoney(pos.marketValue)}</div>
                            <div
                              className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                                pos.unrealizedPnl >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                              }`}
                            >
                              {pos.unrealizedPnl >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                              <span>{formatMoney(pos.unrealizedPnl, true)} ({pos.unrealizedPnlPct.toFixed(1)}%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Consensus Verdict & Strategy Breakdown */}
                        <div className="mt-2.5 pt-2 border-t border-plt-border-soft/60 flex flex-wrap items-center justify-between gap-2">
                          {/* 3 Strategy Verdict Badges */}
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span
                              title={consensus?.opinions.psi.reason}
                              className={`px-1.5 py-0.5 rounded border ${getOpinionColor(consensus?.opinions.psi.verdict)}`}
                            >
                              PSI: {consensus?.opinions.psi.verdict || 'HOLD'}
                            </span>
                            <span
                              title={consensus?.opinions.psiV2.reason}
                              className={`px-1.5 py-0.5 rounded border ${getOpinionColor(consensus?.opinions.psiV2.verdict)}`}
                            >
                              V2: {consensus?.opinions.psiV2.verdict || 'HOLD'}
                            </span>
                            <span
                              title={consensus?.opinions.thoth.reason}
                              className={`px-1.5 py-0.5 rounded border ${getOpinionColor(consensus?.opinions.thoth.verdict)}`}
                            >
                              THOTH: {consensus?.opinions.thoth.verdict || 'HOLD'}
                            </span>
                          </div>

                          {/* Action Button & Overall Verdict */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {consensus && (
                              <span
                                className={`text-[10px] font-sans px-2 py-0.5 rounded-md border font-medium ${consensus.verdictBadgeClass}`}
                              >
                                {consensus.verdictIcon} {consensus.verdictLabel}
                              </span>
                            )}

                            {isSandbox && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExited) onRemoveStaged(cleanSym);
                                  else onSimulateExit(cleanSym);
                                }}
                                className={`px-2 py-0.5 text-[10px] rounded-lg border transition-colors flex items-center gap-1 ${
                                  isExited
                                    ? 'bg-plt-card border-plt-border text-plt-text hover:bg-plt-hover'
                                    : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                                }`}
                              >
                                <Trash2 size={10} />
                                <span>{isExited ? 'Restore' : 'Simulate Exit'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Staged Buy Additions (Sandbox Mode) */}
        {isSandbox && stagedAdds.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-plt-accent/30">
            <div className="flex items-center justify-between text-xs text-plt-accent font-semibold px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Staged Additions (Sandbox)</span>
              </div>
              <span className="font-mono">+{stagedAdds.length} Tickers</span>
            </div>

            <div className="space-y-2">
              {stagedAdds.map((add) => {
                const cleanSym = add.symbol.replace('.CA', '').trim().toUpperCase();

                return (
                  <div
                    key={cleanSym}
                    className="p-3 rounded-xl border border-plt-accent/40 bg-plt-accent/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-plt-accent/15 border border-plt-accent/30 flex items-center justify-center font-mono font-bold text-xs text-plt-accent shrink-0">
                        {cleanSym.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-plt-text font-sans">{cleanSym}</span>
                          <span className="text-[10px] font-mono text-plt-profit font-semibold">
                            +STAGE BUY
                          </span>
                        </div>
                        <p className="text-[11px] text-plt-muted truncate">
                          {add.industryGroup || add.sector}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-plt-text">{formatMoney(add.allocatedAmount)}</span>
                        <span className="text-[10px] text-plt-muted block">Simulated Stake</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveStaged(cleanSym)}
                        className="p-1.5 rounded-lg text-plt-muted hover:text-plt-risk hover:bg-plt-hover transition-colors"
                        title="Remove staged addition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
