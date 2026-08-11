"use client";

import React, { useState, useEffect } from 'react';
import { Target, Activity, CheckCircle, AlertTriangle, ShieldCheck } from '@/components/ui/icons';
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
}

export default function SignalPanel({
  activeSymbol,
  replayActive = false,
  replayStartDate = null,
  replayEndDate = null,
}: SignalPanelProps) {
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!activeSymbol) return;
    if (replayActive && !replayEndDate) return;

    const fetchSignals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ symbol: activeSymbol, limit: '1' });
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
  }, [activeSymbol, replayActive, replayEndDate, replayStartDate]);

  if (!activeSymbol) return null;

  const visibleSignalData = replayActive && !replayEndDate ? null : signalData;
  const isExit = visibleSignalData?.signal.startsWith('SELL') ?? false;
  const signalLabel = visibleSignalData ? (isExit ? 'EXIT' : visibleSignalData.signal) : '';
  const reason = visibleSignalData?.entryReason || visibleSignalData?.exitReason || 'PSI';

  return (
    <div className="absolute bottom-6 left-16 z-10 w-64 bg-tv-glass backdrop-blur-md border border-tv-border rounded-tv-lg shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col">
      {/* Header / Main Signal */}
      <div 
        className="p-4 cursor-pointer hover:bg-tv-hover transition-colors flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-xs font-weight-medium text-tv-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> PSI Strategy
          </h3>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-6 w-20 bg-tv-surface animate-pulse rounded-tv-sm" />
            ) : visibleSignalData ? (
              <>
                <span className={`text-lg font-weight-medium ${
                  visibleSignalData.signal === 'BUY' ? 'text-tv-up' :
                  isExit ? 'text-tv-down' :
                  'text-tv-text'
                }`}>
                  {signalLabel}
                </span>
                <span className="text-xs bg-tv-surface px-1.5 py-0.5 rounded-tv-sm text-tv-text font-weight-medium">
                  {reason}
                </span>
              </>
            ) : (
              <span className="text-sm text-tv-muted">No PSI signals</span>
            )}
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-tv-full bg-tv-surface border border-tv-border">
           {visibleSignalData?.signal === 'BUY' ? <CheckCircle className="w-4 h-4 text-tv-up" /> : 
            isExit ? <AlertTriangle className="w-4 h-4 text-tv-down" /> : 
            <Activity className="w-4 h-4 text-tv-muted" />}
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
            
            <div className="mt-2 pt-2 border-t border-tv-border flex items-center justify-between text-[10px] text-tv-muted">
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
