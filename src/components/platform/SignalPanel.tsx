"use client";

import React, { useState, useEffect } from 'react';
import { Target, Activity, CheckCircle, AlertTriangle, ShieldCheck, ChevronDown } from '@/components/ui/icons';
import { motion } from 'framer-motion';

type SignalData = {
  date: string;
  signal: 'BUY' | 'SELL_TP' | 'SELL_TRAIL' | 'SELL_SL' | 'SELL_STRUCT';
  confidence: number;
  price: number;
  masterIndex: number;
  masterIndexAdjusted: number;
  medianDailyMove: number | null;
  entryReason?: string;
  exitReason?: string;
  modelVersion: string;
};
interface SignalPanelProps {
  activeSymbol: string | null;
  replayActive?: boolean;
  replayStartDate?: string | null;
  replayEndDate?: string | null;
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  buyThreshold?: number;
  setBuyThreshold?: (t: number) => void;
  sellThreshold?: number;
  setSellThreshold?: (t: number) => void;
  strategyStartDate?: string;
  strategyEndDate?: string;
  setStrategyStartDate?: (d: string) => void;
  setStrategyEndDate?: (d: string) => void;
}

export default function SignalPanel({
  activeSymbol,
  replayActive = false,
  replayStartDate = null,
  replayEndDate = null,
  selectedStrategy,
  setSelectedStrategy,
  buyThreshold = 75,
  setBuyThreshold,
  sellThreshold = 75,
  setSellThreshold,
  strategyStartDate,
  strategyEndDate,
  setStrategyStartDate,
  setStrategyEndDate,
}: SignalPanelProps) {
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const strategies: { id: string; label: string; disabled?: boolean }[] = [
    { id: 'psi', label: 'PSI Strategy' },
    { id: 'quantum_exhaustion', label: 'Quantum Exhaustion (QE)' },
    { id: 'quantum_exhaustion_v2', label: 'Quantum Exhaustion v2 (Research Gate)', disabled: true },
  ];

  const selectedLabel = strategies.find(s => s.id === selectedStrategy)?.label || 'Strategy';

  useEffect(() => {
    if (!activeSymbol) return;
    if (replayActive && !replayEndDate) return;

    const fetchSignals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ 
          symbol: activeSymbol, 
          limit: '1',
          strategy: selectedStrategy,
          buyThreshold: buyThreshold.toString(),
          sellThreshold: sellThreshold.toString()
        });
        if (replayActive && replayEndDate) {
          params.set('end', replayEndDate);
          if (replayStartDate) params.set('start', replayStartDate);
        }

        const res = await fetch(`/api/signals?${params.toString()}`);
        const data = await res.json();
        if (data.signals && data.signals.length > 0) {
          setSignalData(data.signals[0]);
        } else {
          setSignalData(null);
        }
      } catch (err) {
        console.error("Error fetching signals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    if (replayActive) return;

    const interval = setInterval(fetchSignals, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [activeSymbol, replayActive, replayEndDate, replayStartDate, selectedStrategy, buyThreshold, sellThreshold]);

  if (!activeSymbol) return null;

  const visibleSignalData = replayActive && !replayEndDate ? null : signalData;
  const isExit = visibleSignalData?.signal.startsWith('SELL') ?? false;
  const signalLabel = visibleSignalData ? (isExit ? 'EXIT' : visibleSignalData.signal) : '';
  const reason = visibleSignalData?.entryReason || visibleSignalData?.exitReason || 'PSI';

  return (
    <div className="absolute top-4 left-4 z-10 w-48 md:w-64 bg-tv-glass backdrop-blur-md border border-tv-border rounded-tv-lg shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex flex-col">
      {/* Header / Main Signal */}
      <div 
        className={`p-2 md:p-4 cursor-pointer hover:bg-tv-hover transition-colors flex items-center justify-between ${expanded ? 'rounded-t-tv-lg' : 'rounded-tv-lg'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="relative">
            <div 
              className="mb-1 md:mb-1.5 flex items-center gap-1.5 cursor-pointer text-tv-muted hover:text-tv-text transition-colors" 
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            >
              <Target className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span className="text-[10px] md:text-xs font-weight-medium uppercase tracking-wider">
                {selectedLabel}
              </span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
            
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} 
                />
                <div className="absolute top-full left-0 w-36 md:w-40 bg-[#1e222d] border border-tv-border rounded-tv-sm shadow-xl z-50 overflow-hidden">
                  {strategies.map((strat) => (
                    <div
                      key={strat.id}
                      className={`px-3 py-2 text-[10px] md:text-xs font-weight-medium uppercase tracking-wider ${
                        strat.disabled 
                          ? 'text-tv-muted/40 cursor-not-allowed' 
                          : strat.id === selectedStrategy 
                            ? 'text-tv-up bg-tv-hover cursor-default' 
                            : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover cursor-pointer transition-colors'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!strat.disabled) {
                          setSelectedStrategy(strat.id);
                          setDropdownOpen(false);
                        }
                      }}
                    >
                      {strat.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-4 md:h-6 w-16 md:w-20 bg-tv-surface animate-pulse rounded-tv-sm" />
            ) : visibleSignalData ? (
              <>
                <span className={`text-sm md:text-lg font-weight-medium ${
                  visibleSignalData.signal === 'BUY' ? 'text-tv-up' :
                  isExit ? 'text-tv-down' :
                  'text-tv-text'
                }`}>
                  {signalLabel}
                </span>
                <span className="text-[10px] md:text-xs bg-tv-surface px-1 md:px-1.5 py-0.5 rounded-tv-sm text-tv-text font-weight-medium">
                  {reason}
                </span>
              </>
            ) : (
              <span className="text-xs md:text-sm text-tv-muted">No PSI signals</span>
            )}
          </div>
        </div>
        <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-tv-full bg-tv-surface border border-tv-border shrink-0 ml-2">
           {visibleSignalData?.signal === 'BUY' ? <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-tv-up" /> : 
            isExit ? <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-tv-down" /> : 
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-tv-muted" />}
        </div>
      </div>

      {/* Expanded Details */}
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        className="overflow-hidden border-t border-tv-border"
      >
        {visibleSignalData && (
          <div className="p-4 bg-tv-base flex flex-col gap-3">
            {selectedStrategy === 'quantum_exhaustion' ? (
              <div className="flex flex-col gap-3 text-xs">
                <div className="rounded-tv-sm bg-tv-surface p-2">
                  <div className="text-tv-muted mb-2 flex justify-between">
                    <span>BUY Threshold</span>
                    <span className="text-tv-text font-weight-medium">{buyThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={buyThreshold}
                    onChange={(e) => setBuyThreshold?.(Number(e.target.value))}
                    className="w-full accent-tv-up cursor-pointer"
                  />
                </div>
                <div className="rounded-tv-sm bg-tv-surface p-2">
                  <div className="text-tv-muted mb-2 flex justify-between">
                    <span>SELL Threshold</span>
                    <span className="text-tv-text font-weight-medium">{sellThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={sellThreshold}
                    onChange={(e) => setSellThreshold?.(Number(e.target.value))}
                    className="w-full accent-tv-down cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-tv-sm bg-tv-surface p-2">
                  <div className="text-tv-muted mb-1">Master Index</div>
                  <div className="text-tv-text font-weight-medium">{visibleSignalData.masterIndex.toFixed(2)}</div>
                </div>
                <div className="rounded-tv-sm bg-tv-surface p-2">
                  <div className="text-tv-muted mb-1">AYM Index</div>
                  <div className="text-tv-text font-weight-medium">{visibleSignalData.masterIndexAdjusted.toFixed(2)}</div>
                </div>
                <div className="rounded-tv-sm bg-tv-surface p-2">
                  <div className="text-tv-muted mb-1">Price</div>
                  <div className="text-tv-text font-weight-medium">{Number(visibleSignalData.price).toFixed(2)}</div>
                </div>
                <div className="rounded-tv-sm bg-tv-surface p-2">
                  <div className="text-tv-muted mb-1">MDM</div>
                  <div className="text-tv-text font-weight-medium">
                    {visibleSignalData.medianDailyMove === null ? 'N/A' : `${visibleSignalData.medianDailyMove.toFixed(2)}%`}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-tv-border/50">
              <div className="flex items-center justify-between">
                <label className="text-tv-muted text-[10px]">Start Date</label>
                <input 
                  type="date" 
                  className="bg-tv-surface border border-tv-border rounded-tv-sm px-1 py-0.5 text-tv-text text-[10px] focus:outline-none focus:border-tv-accent w-28"
                  value={strategyStartDate || ''}
                  onChange={(e) => setStrategyStartDate?.(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-tv-muted text-[10px]">End Date</label>
                <input 
                  type="date" 
                  className="bg-tv-surface border border-tv-border rounded-tv-sm px-1 py-0.5 text-tv-text text-[10px] focus:outline-none focus:border-tv-accent w-28"
                  value={strategyEndDate || ''}
                  onChange={(e) => setStrategyEndDate?.(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 pt-2 border-t border-tv-border/50 text-[10px] text-tv-muted">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {visibleSignalData.modelVersion || 'v1.0'}
              </span>
              <span>Updated {new Date(visibleSignalData.date).toLocaleDateString()}</span>
            </div>
            {replayActive && replayEndDate && (
              <div className="text-[10px] text-tv-muted">Replay as of {new Date(replayEndDate).toLocaleDateString()}</div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
