'use client';

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  Compass,
  Sparkles,
  GripVertical,
} from '@/components/ui/icon-library';
import type { OpportunitySignal as Opportunity } from '@/lib/opportunities';
import { getTickerQuantMetrics } from '@/lib/portfolio-simulation';
import type { InsightTickerData } from './TickerQuickInsightsDrawer';

interface OpportunityRadarPanelProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  heldSymbols: Set<string>;
  stagedSymbols: Set<string>;
  onStageBuy: (symbol: string, amount: number, ticker: InsightTickerData) => void;
  onSelectTickerForInsight: (ticker: InsightTickerData) => void;
}

export default function OpportunityRadarPanel({
  opportunities,
  isLoading,
  heldSymbols,
  stagedSymbols,
  onStageBuy,
  onSelectTickerForInsight,
}: OpportunityRadarPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'psi' | 'psi_v2' | 'thoth'>('all');
  const [recencyFilter, setRecencyFilter] = useState<number>(5);
  const [regimeFilter, setRegimeFilter] = useState<'all' | 'leading' | 'improving'>('all');

  // Filter opportunities
  const filteredCandidates = useMemo(() => {
    return opportunities.filter((opp) => {
      const cleanSym = opp.symbol.replace('.CA', '').trim().toUpperCase();
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSym = cleanSym.toLowerCase().includes(q);
        const matchesName = (opp.companyName || '').toLowerCase().includes(q);
        const matchesSector = (opp.sector || '').toLowerCase().includes(q);
        if (!matchesSym && !matchesName && !matchesSector) return false;
      }

      // Strategy
      if (strategyFilter !== 'all') {
        if (strategyFilter === 'psi' && opp.strategyId !== 'psi') return false;
        if (strategyFilter === 'psi_v2' && opp.strategyId !== 'psi_v2') return false;
        if (strategyFilter === 'thoth' && opp.strategyId !== 'thoth_egx_macro') return false;
      }

      // Recency
      const barsAgo = opp.signal.barsAgo ?? 0;
      if (barsAgo > recencyFilter) return false;

      // Rotation Regime
      if (regimeFilter === 'leading' && opp.rotationRegime !== 'Leading') return false;
      if (regimeFilter === 'improving' && opp.rotationRegime !== 'Improving' && opp.rotationRegime !== 'Leading') {
        return false;
      }

      return true;
    });
  }, [opportunities, searchQuery, strategyFilter, recencyFilter, regimeFilter]);

  const getRegimeColor = (regime?: string) => {
    switch (regime) {
      case 'Leading':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'Improving':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      case 'Weakening':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      default:
        return 'bg-plt-card text-plt-muted border-plt-border-soft';
    }
  };

  return (
    <div className="card-widget flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="p-3 sm:p-4 border-b border-plt-border-soft space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="widget-title flex items-center gap-2">
              <Zap size={15} className="text-plt-accent" />
              <span>Opportunity Radar (Buy Signals)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-plt-hover text-plt-muted font-normal">
                {filteredCandidates.length} Signals
              </span>
            </h3>
            <p className="widget-subtitle mt-0.5">
              Drag candidates or click Stage to simulate rebalancing impact
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-plt-muted" />
          <input
            type="text"
            placeholder="Search ticker, company, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-plt-base border border-plt-border-soft text-xs text-plt-text placeholder-plt-muted focus:outline-none focus:border-plt-accent/60 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          {/* Strategy Pill Switcher */}
          <div className="flex items-center gap-1 bg-plt-base p-1 rounded-xl border border-plt-border-soft">
            {[
              { id: 'all', label: 'All Models' },
              { id: 'psi', label: 'PSI' },
              { id: 'psi_v2', label: 'PSI V2' },
              { id: 'thoth', label: 'THOTH' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStrategyFilter(st.id as any)}
                className={`px-2 py-0.5 text-[10px] rounded-lg transition-colors font-medium ${
                  strategyFilter === st.id
                    ? 'bg-plt-card text-plt-text font-bold shadow-xs'
                    : 'text-plt-muted hover:text-plt-text'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Recency Selector */}
          <div className="flex items-center gap-1 bg-plt-base p-1 rounded-xl border border-plt-border-soft">
            {[
              { days: 1, label: 'Today' },
              { days: 3, label: '3b' },
              { days: 5, label: '5b' },
              { days: 15, label: '15b' },
            ].map((rc) => (
              <button
                key={rc.days}
                type="button"
                onClick={() => setRecencyFilter(rc.days)}
                className={`px-2 py-0.5 text-[10px] rounded-lg transition-colors font-medium ${
                  recencyFilter === rc.days
                    ? 'bg-plt-card text-plt-accent font-bold shadow-xs'
                    : 'text-plt-muted hover:text-plt-text'
                }`}
              >
                {rc.label}
              </button>
            ))}
          </div>

          {/* Leading Sector Filter */}
          <button
            type="button"
            onClick={() => setRegimeFilter(regimeFilter === 'leading' ? 'all' : 'leading')}
            className={`px-2.5 py-1 text-[10px] rounded-xl border transition-all flex items-center gap-1.5 font-medium ${
              regimeFilter === 'leading'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35 font-bold'
                : 'bg-plt-base border-plt-border-soft text-plt-muted hover:text-plt-text'
            }`}
          >
            <TrendingUp size={11} />
            <span>Leading Sectors</span>
          </button>
        </div>
      </div>

      {/* Candidates List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5">
        {isLoading && opportunities.length === 0 ? (
          <div className="py-16 text-center text-plt-muted text-xs space-y-2">
            <div className="w-6 h-6 border-2 border-plt-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Scanning quantitative buy triggers across EGX...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="py-16 text-center text-plt-muted text-xs space-y-2">
            <Compass size={24} className="mx-auto opacity-40 text-plt-accent" />
            <p className="font-semibold text-plt-text">No Matching Buy Opportunities</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Try adjusting the recency filter or strategy scope to see more historical signals.
            </p>
          </div>
        ) : (
          filteredCandidates.map((opp) => {
            const cleanSym = opp.symbol.replace('.CA', '').trim().toUpperCase();
            const quant = getTickerQuantMetrics(cleanSym);
            const isHeld = heldSymbols.has(cleanSym);
            const isStaged = stagedSymbols.has(cleanSym);

            const tickerData: InsightTickerData = {
              symbol: opp.symbol,
              companyName: opp.companyName,
              sector: opp.sector,
              industryGroup: opp.industryGroup,
              rotationRegime: opp.rotationRegime,
              logoUrl: opp.logoUrl,
              currentPrice: opp.signal.price,
              strategyId: opp.strategyId,
              strategyName: opp.strategyShortName || 'PSI',
              signalType: 'BUY',
              signalDate: opp.signal.date,
              triggerPrice: opp.signal.price,
              barsAgo: opp.signal.barsAgo,
              reasoning: opp.signal.reasoning,
              isHeld,
              isStaged,
            };

            return (
              <div
                key={`${cleanSym}-${opp.strategyId}-${opp.signal.date}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', cleanSym);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onSelectTickerForInsight(tickerData)}
                className="p-3 rounded-xl bg-plt-card border border-plt-border-soft hover:border-plt-border hover:bg-plt-hover/40 transition-all cursor-grab active:cursor-grabbing group space-y-2"
              >
                {/* Card Top: Drag handle, Ticker, Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical size={13} className="text-plt-muted group-hover:text-plt-text shrink-0" />
                    <div className="w-7 h-7 rounded-lg bg-plt-hover border border-plt-border-soft flex items-center justify-center font-mono font-bold text-xs shrink-0 overflow-hidden">
                      {opp.logoUrl ? (
                        <img src={opp.logoUrl} alt={cleanSym} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        cleanSym.slice(0, 3)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-plt-text font-sans group-hover:text-white">
                          {cleanSym}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            opp.strategyBadgeClassName || 'bg-plt-info/10 text-plt-info'
                          }`}
                        >
                          {opp.strategyShortName || 'PSI'}
                        </span>
                      </div>
                      <p className="text-[11px] text-plt-muted truncate max-w-[170px]">{opp.companyName}</p>
                    </div>
                  </div>

                  {/* Trigger Price & Rotation Badge */}
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-plt-profit">
                      {opp.signal.price ? `${opp.signal.price.toFixed(2)} £` : '-'}
                    </div>
                    {opp.rotationRegime && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium inline-block mt-0.5 ${getRegimeColor(
                          opp.rotationRegime
                        )}`}
                      >
                        {opp.rotationRegime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Track record preview & bars ago */}
                <div className="flex items-center justify-between text-[11px] text-plt-muted font-mono pt-1 border-t border-plt-border-soft/50">
                  <div className="flex items-center gap-3">
                    <span>
                      12M Return: <strong className="text-plt-profit">+{quant.roi12M.toFixed(0)}%</strong>
                    </span>
                    <span>
                      Win Rate: <strong className="text-plt-text">{quant.winRate.toFixed(0)}%</strong>
                    </span>
                    <span>
                      Avg: <strong className="text-plt-text">{quant.avgBarsPerTrade}b</strong>
                    </span>
                  </div>

                  <span className="text-[10px] text-plt-muted font-sans">
                    {opp.signal.barsAgo ? `${opp.signal.barsAgo}b ago` : 'Today'}
                  </span>
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {isHeld ? (
                    <span className="text-[10px] font-mono text-plt-muted px-2 py-0.5 rounded bg-plt-hover">
                      Already in Portfolio
                    </span>
                  ) : isStaged ? (
                    <span className="text-[10px] font-mono text-plt-accent px-2 py-0.5 rounded bg-plt-accent/15 border border-plt-accent/30 font-semibold flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Staged in Sandbox</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStageBuy(cleanSym, 25000, tickerData)}
                      className="px-2.5 py-1 rounded-lg bg-plt-profit/15 hover:bg-plt-profit text-plt-profit hover:text-black font-semibold text-xs transition-all flex items-center gap-1 border border-plt-profit/30"
                    >
                      <Plus size={12} />
                      <span>Stage Buy</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
