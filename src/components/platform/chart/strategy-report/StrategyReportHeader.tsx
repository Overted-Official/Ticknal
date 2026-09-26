'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
} from '@/components/ui/icon-library';
import type { ComputedReportMetrics, BacktestPreset } from './types';

interface StrategyReportHeaderProps {
  symbol: string;
  companyName?: string;
  logoUrl?: string | null;
  selectedStrategy: string;
  setSelectedStrategy?: (strategy: string) => void;
  strategyStartDate?: string;
  strategyEndDate?: string;
  onSelectPresetDate: (preset: BacktestPreset) => void;
  onSetCustomStartDate?: (date: string) => void;
  onSetCustomEndDate?: (date: string) => void;
  activePreset: BacktestPreset;
  metrics?: ComputedReportMetrics;
  hasTrades?: boolean;
  onExportCSV?: () => void;
  onClose: () => void;
}

const STRATEGY_SWITCHERS = [
  { id: 'psi', name: 'Typhon' },
  { id: 'psi_v2', name: 'Cerberus' },
  { id: 'hydra', name: 'Hydra' },
];

const TIMEFRAME_PRESETS: { id: BacktestPreset; label: string }[] = [
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
];

export default function StrategyReportHeader({
  symbol,
  companyName,
  logoUrl,
  selectedStrategy,
  setSelectedStrategy,
  strategyStartDate,
  strategyEndDate,
  onSelectPresetDate,
  onSetCustomStartDate,
  onSetCustomEndDate,
  activePreset,
  onClose,
}: StrategyReportHeaderProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const isPresetActive = (id: BacktestPreset) => {
    if (activePreset === id) return true;
    if (id === 'ytd' && (activePreset as string) === '2025') return true;
    return false;
  };

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
      title="Close Report (Esc)"
      aria-label="Close Strategy Report Drawer"
    >
      <X size={16} />
    </button>
  );

  return (
    <div className="min-h-14 sm:min-h-16 px-4 sm:px-6 py-2.5 xl:py-0 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 xl:gap-4 border-b border-white/10 shrink-0 bg-black">
      {/* Top row on smaller screens / Left side on desktop: Company Info Lockup + Mobile Close */}
      <div className="flex items-center justify-between xl:justify-start gap-3 min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
            {logoUrl && !imgError ? (
              <img
                src={logoUrl}
                alt={symbol}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-xs font-bold text-white uppercase font-sans">
                {symbol.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden leading-tight">
            <span
              className="font-semibold text-xs sm:text-sm text-white tracking-tight truncate block"
              title={companyName || symbol}
            >
              {companyName || symbol}
            </span>
            <span className="text-[10px] sm:text-[11px] text-white/50 font-medium tabular-nums tracking-wide mt-0.5 truncate block">
              {symbol}
            </span>
          </div>
        </div>

        {/* Close button on viewports below xl */}
        <div className="xl:hidden shrink-0">
          {closeButton}
        </div>
      </div>

      {/* Bottom row on smaller screens / Right-aligned control cluster on desktop: Switchers + Divider + Close Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar w-full xl:w-auto shrink-0 pb-0.5 xl:pb-0">
        {/* Algo Switch Buttons */}
        {setSelectedStrategy && (
          <div className="seg-control shrink-0">
            {STRATEGY_SWITCHERS.map((strat) => {
              const isSelected = selectedStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setSelectedStrategy(strat.id)}
                  className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
                >
                  {strat.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="h-4 w-px bg-white/10 shrink-0 hidden md:block" />

        {/* Timeframe Presets & Custom Trigger */}
        <div className="seg-control shrink-0">
          {TIMEFRAME_PRESETS.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => onSelectPresetDate(tf.id)}
              className={`seg-control-btn ${isPresetActive(tf.id) ? 'seg-control-btn-active' : ''}`}
            >
              {tf.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelectPresetDate('custom')}
            className={`seg-control-btn flex items-center gap-1 ${
              activePreset === 'custom' ? 'seg-control-btn-active' : ''
            }`}
            title="Custom Date Range"
          >
            <Calendar size={11} />
            <span>Custom</span>
          </button>
        </div>

        {/* Inline Custom Date Inputs (matches StrategySimulationSection) */}
        {activePreset === 'custom' && (
          <div className="input-control-compact text-xs shrink-0 animate-in fade-in duration-150">
            <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <input
              type="date"
              value={strategyStartDate || '2025-01-01'}
              onChange={(e) => onSetCustomStartDate?.(e.target.value)}
              className="bg-transparent text-text-primary focus:outline-hidden text-xs cursor-pointer [color-scheme:dark] leading-none"
            />
            <span className="text-text-muted select-none text-[11px] leading-none">→</span>
            <input
              type="date"
              value={strategyEndDate || ''}
              onChange={(e) => onSetCustomEndDate?.(e.target.value)}
              className="bg-transparent text-text-primary focus:outline-hidden text-xs cursor-pointer [color-scheme:dark] leading-none"
            />
          </div>
        )}

        {/* Desktop Close Button grouped tightly with the header controls */}
        <div className="hidden xl:flex items-center gap-2 sm:gap-2.5 shrink-0 ml-1">
          <div className="h-4 w-px bg-white/10 shrink-0" />
          {closeButton}
        </div>
      </div>
    </div>
  );
}
