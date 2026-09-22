"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  LayoutGrid,
  Compass,
  Zap,
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
} from '@/components/ui/icon-library';
import type { StrategyDefinition } from '@/strategies/registry';

interface SectorsHeaderProps {
  timeframePreset: '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom';
  setTimeframePreset: (preset: '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  analysisMode: 'macro' | 'strategy';
  setAnalysisMode: (mode: 'macro' | 'strategy') => void;
  granularity: 'sector' | 'industryGroup' | 'industry' | 'ticker';
  setGranularity: (granularity: 'sector' | 'industryGroup' | 'industry' | 'ticker') => void;
  sizingMetric: 'turnover' | 'volume' | 'equal';
  setSizingMetric: (metric: 'turnover' | 'volume' | 'equal') => void;
  viewLayout: 'treemap' | 'matrix';
  setViewLayout: (layout: 'treemap' | 'matrix') => void;
  filterActiveSignalsOnly: boolean;
  setFilterActiveSignalsOnly: (activeOnly: boolean) => void;
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  availableStrategies: StrategyDefinition[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onResetSelection: () => void;
}

export default function SectorsHeader({
  timeframePreset,
  setTimeframePreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  analysisMode,
  setAnalysisMode,
  granularity,
  setGranularity,
  sizingMetric,
  setSizingMetric,
  viewLayout,
  setViewLayout,
  filterActiveSignalsOnly,
  setFilterActiveSignalsOnly,
  selectedStrategy,
  setSelectedStrategy,
  availableStrategies,
  searchQuery,
  setSearchQuery,
  onResetSelection,
}: SectorsHeaderProps) {
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);
  const [isStrategyMenuOpen, setIsStrategyMenuOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const displayMenuRef = useRef<HTMLDivElement>(null);
  const timeframeMenuRef = useRef<HTMLDivElement>(null);
  const strategyMenuRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (displayMenuRef.current && !displayMenuRef.current.contains(e.target as Node)) {
        setIsDisplayMenuOpen(false);
      }
      if (timeframeMenuRef.current && !timeframeMenuRef.current.contains(e.target as Node)) {
        setIsTimeframeMenuOpen(false);
      }
      if (strategyMenuRef.current && !strategyMenuRef.current.contains(e.target as Node)) {
        setIsStrategyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryTimeframes = ['1D', '1W', '1M', 'YTD', '1Y'] as const;
  const extendedTimeframes = ['3M', '6M', 'custom'] as const;
  const isExtendedActive = extendedTimeframes.includes(timeframePreset as any);

  // Whether any non-default filter is active (for the indicator dot on mobile)
  const hasActiveFilters =
    timeframePreset !== 'YTD' ||
    granularity !== 'sector' ||
    sizingMetric !== 'turnover';

  const allTimeframes = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y'] as const;

  return (
    <>
      {/* ================================================================ */}
      {/* DESKTOP LAYOUT (md and up) — unchanged                           */}
      {/* ================================================================ */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 text-xs select-none font-sans shrink-0">
        {/* 1. Left: Timeframe Segmented Selector */}
        <div className="flex items-center gap-2">
          <div className="pill-switch">
            {primaryTimeframes.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTimeframePreset(preset)}
                className={`pill-switch-btn ${timeframePreset === preset ? 'active' : ''}`}
              >
                {preset}
              </button>
            ))}

            {/* More Timeframes Dropdown */}
            <div className="relative" ref={timeframeMenuRef}>
              <button
                type="button"
                onClick={() => setIsTimeframeMenuOpen(!isTimeframeMenuOpen)}
                className={`pill-switch-btn flex items-center gap-1 ${isExtendedActive ? 'active' : ''}`}
              >
                <span>{isExtendedActive ? timeframePreset : 'More'}</span>
                <ChevronDown size={11} className={`transition-transform ${isTimeframeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTimeframeMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl bg-plt-raised/98 border border-plt-border-strong p-2 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframePreset('3M');
                      setIsTimeframeMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left btn-typography transition ${
                      timeframePreset === '3M' ? 'bg-white/[0.12] text-white btn-typography-semibold' : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.04]'
                    }`}
                  >
                    3 Months (3M)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframePreset('6M');
                      setIsTimeframeMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left btn-typography transition ${
                      timeframePreset === '6M' ? 'bg-white/[0.12] text-white btn-typography-semibold' : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.04]'
                    }`}
                  >
                    6 Months (6M)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframePreset('custom');
                      setIsTimeframeMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left btn-typography transition ${
                      timeframePreset === 'custom' ? 'bg-white/[0.12] text-white btn-typography-semibold' : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.04]'
                    }`}
                  >
                    Custom Range...
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {timeframePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-plt-card border border-plt-border-soft px-2.5 py-1 rounded-xl text-xs animate-in fade-in duration-150">
              <Calendar className="w-3.5 h-3.5 text-plt-muted" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-plt-text focus:outline-hidden text-xs"
              />
              <span className="text-plt-muted">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-plt-text focus:outline-hidden text-xs"
              />
            </div>
          )}
        </div>

        {/* 2. Center: Primary View / Mode Switcher */}
        <div className="pill-switch">
          <button
            type="button"
            onClick={() => {
              setAnalysisMode('macro');
              setViewLayout('treemap');
            }}
            className={`pill-switch-btn flex items-center gap-1.5 ${
              analysisMode === 'macro' && viewLayout === 'treemap' ? 'active' : ''
            }`}
          >
            <LayoutGrid size={13} />
            <span>Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAnalysisMode('macro');
              setViewLayout('matrix');
            }}
            className={`pill-switch-btn flex items-center gap-1.5 ${
              analysisMode === 'macro' && viewLayout === 'matrix' ? 'active' : ''
            }`}
          >
            <Compass size={13} />
            <span>Rotation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAnalysisMode('strategy');
              setViewLayout('treemap');
            }}
            className={`pill-switch-btn flex items-center gap-1.5 ${
              analysisMode === 'strategy' ? 'active' : ''
            }`}
          >
            <Zap size={13} />
            <span>Strategy Alpha</span>
          </button>
        </div>

        {/* 3. Right: Strategy Selector (in strategy mode) + Search Input + Display Settings HUD */}
        <div className="flex items-center gap-2">
          {/* Strategy Model Selector Dropdown Button */}
          {analysisMode === 'strategy' && (
            <div className="relative" ref={strategyMenuRef}>
              <button
                type="button"
                onClick={() => setIsStrategyMenuOpen(!isStrategyMenuOpen)}
                className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 btn-typography-semibold transition cursor-pointer shadow-xs ${
                  isStrategyMenuOpen
                    ? 'bg-plt-profit/20 border-plt-profit text-white'
                    : 'bg-plt-raised border-plt-profit/40 text-plt-profit hover:border-plt-profit hover:bg-plt-profit/10'
                }`}
                title="Select Quantitative Strategy Model"
              >
                <Zap size={12} className="text-plt-profit" />
                <span>{availableStrategies.find((s) => s.id === selectedStrategy)?.label || 'Typhon Strategy'}</span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${isStrategyMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStrategyMenuOpen && (
                <div className="absolute left-0 md:right-0 md:left-auto top-full mt-1.5 w-60 p-1.5 rounded-xl bg-plt-raised/98 border border-plt-border-strong shadow-[0_12px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 flex flex-col gap-1 font-sans">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-plt-muted border-b border-plt-border/40">
                    Select Strategy Model
                  </div>
                  {availableStrategies.map((strat) => {
                    const isSelected = selectedStrategy === strat.id;
                    return (
                      <button
                        key={strat.id}
                        type="button"
                        onClick={() => {
                          setSelectedStrategy(strat.id);
                          setIsStrategyMenuOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-left btn-typography transition flex flex-col cursor-pointer ${
                          isSelected
                            ? 'bg-plt-profit/15 text-white font-bold border border-plt-profit/30'
                            : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={isSelected ? 'text-plt-profit' : 'text-plt-text'}>{strat.label}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-plt-profit" />}
                        </div>
                        {strat.description && (
                          <span className="text-[10px] text-plt-muted font-normal line-clamp-1 mt-0.5">
                            {strat.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Ticker / Sector Search */}
          <div className="relative flex items-center w-40 md:w-52">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#787b86]">
              <Search size={13} />
            </div>
            <input
              type="text"
              placeholder="Search tickers or sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full rounded-lg bg-[#18181b] border border-[#3f3f46] pl-8 pr-6 text-xs text-white placeholder:text-[#787b86] focus:border-[#2962ff] focus:outline-none transition-colors leading-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-[#787b86] hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Display Settings Dropdown HUD */}
          <div className="relative" ref={displayMenuRef}>
            <button
              type="button"
              onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
              className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 btn-typography transition cursor-pointer ${
                isDisplayMenuOpen
                  ? 'bg-[#3f3f46] border-[#3f3f46] text-white'
                  : 'bg-[#18181b] border-[#3f3f46] text-[#787b86] hover:text-white hover:bg-[#27272a]'
              }`}
              title="Display HUD & Grouping Settings"
            >
              <SlidersHorizontal size={12} />
              <span className="capitalize">{granularity === 'industryGroup' ? 'Group' : granularity}</span>
              <ChevronDown size={11} className={`transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDisplayMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[#27272a] border border-[#3f3f46] p-3 shadow-2xl z-50 flex flex-col gap-3">
                {/* Grouping Tier */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-1.5">
                    Hierarchy Level
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: 'sector', label: 'Sector (11)' },
                      { id: 'industryGroup', label: 'Group (25)' },
                      { id: 'industry', label: 'Industry' },
                      { id: 'ticker', label: 'Ticker' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setGranularity(item.id as any);
                          onResetSelection();
                        }}
                        className={`px-2 py-1.5 rounded-lg btn-typography transition text-left ${
                          granularity === item.id
                            ? 'bg-white/[0.15] text-white'
                            : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.04]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizing Metric */}
                <div className="pt-2 border-t border-plt-border/40">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-1.5 flex items-center justify-between">
                    <span>Tile Sizing Metric</span>
                    {analysisMode === 'strategy' && (
                      <span className="text-[9px] text-plt-profit font-semibold uppercase">Strategy ROI</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'turnover', label: analysisMode === 'strategy' ? 'Strat ROI' : 'Turnover' },
                      { id: 'volume', label: 'Volume' },
                      { id: 'equal', label: 'Equal' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSizingMetric(item.id as any)}
                        className={`px-2 py-1.5 rounded-lg btn-typography transition text-center ${
                          sizingMetric === item.id
                            ? 'bg-white/[0.15] text-white font-semibold'
                            : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.04]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy Mode Controls in HUD */}
                {analysisMode === 'strategy' && (
                  <div className="pt-2 border-t border-plt-border/40 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted">
                      Strategy Configuration
                    </div>

                    <button
                      type="button"
                      onClick={() => setFilterActiveSignalsOnly(!filterActiveSignalsOnly)}
                      className={`w-full px-2.5 py-1.5 rounded-lg btn-typography transition flex items-center justify-between ${
                        filterActiveSignalsOnly
                          ? 'bg-plt-profit/15 text-plt-profit border border-plt-profit/30'
                          : 'bg-white/[0.04] text-plt-muted hover:text-plt-text'
                      }`}
                    >
                      <span>Active Setups Only</span>
                      <span>{filterActiveSignalsOnly ? '✓' : '—'}</span>
                    </button>

                    {availableStrategies.length > 0 && (
                      <select
                        value={selectedStrategy}
                        onChange={(e) => setSelectedStrategy(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-hidden"
                      >
                        {availableStrategies.map((strat) => (
                          <option key={strat.id} value={strat.id} className="bg-plt-base text-plt-text">
                            {strat.label || strat.shortName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE LAYOUT (below md) — new design                            */}
      {/* ================================================================ */}
      <div className="flex md:hidden flex-col gap-2 text-xs select-none font-sans shrink-0">
        {/* Row 1: Search + Filter split pill */}
        <div className="flex items-stretch h-9 rounded-xl overflow-hidden border border-plt-border bg-plt-raised">
          {/* Search side */}
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-0 pl-3 flex items-center pointer-events-none text-plt-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search tickers or sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-full w-full bg-transparent pl-9 pr-3 text-[12px] text-plt-text placeholder:text-plt-muted focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 pr-3 flex items-center text-plt-muted hover:text-plt-text transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="w-px bg-plt-border shrink-0" />

          {/* Filter button side */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative flex items-center gap-1.5 px-3.5 btn-typography text-plt-muted hover:text-plt-text transition-colors shrink-0"
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {/* Active indicator dot */}
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-plt-profit" />
            )}
          </button>
        </div>

        {/* Row 2: Mode switches */}
        <div className="pill-switch w-full">
          <button
            type="button"
            onClick={() => {
              setAnalysisMode('macro');
              setViewLayout('treemap');
            }}
            className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
              analysisMode === 'macro' && viewLayout === 'treemap' ? 'active' : ''
            }`}
          >
            <LayoutGrid size={13} />
            <span>Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAnalysisMode('macro');
              setViewLayout('matrix');
            }}
            className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
              analysisMode === 'macro' && viewLayout === 'matrix' ? 'active' : ''
            }`}
          >
            <Compass size={13} />
            <span>Rotation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAnalysisMode('strategy');
              setViewLayout('treemap');
            }}
            className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
              analysisMode === 'strategy' ? 'active' : ''
            }`}
          >
            <Zap size={13} />
            <span>Strategy Alpha</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE FILTERS BOTTOM DRAWER                                      */}
      {/* ================================================================ */}
      {isMobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden animate-in fade-in duration-200"
          style={{ backgroundColor: 'var(--plt-overlay, rgba(0,0,0,0.7))' }}
          onClick={() => setIsMobileFiltersOpen(false)}
        >
          <div
            className="flex flex-col rounded-t-2xl border-t border-plt-border-strong bg-plt-surface shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[82dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-plt-border-strong" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-plt-border/40 shrink-0">
              <span className="text-sm font-bold text-plt-text">Filters</span>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="p-1.5 rounded-full text-plt-muted hover:text-plt-text hover:bg-white/[0.08] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-5 px-5 py-5">

              {/* Section: Timeframe */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2.5">
                  Timeframe
                </div>
                <div className="pill-switch w-full">
                  {allTimeframes.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimeframePreset(preset)}
                      className={`pill-switch-btn flex-1 ${timeframePreset === preset ? 'active' : ''}`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTimeframePreset('custom')}
                    className={`pill-switch-btn flex-1 ${timeframePreset === 'custom' ? 'active' : ''}`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom date pickers */}
                {timeframePreset === 'custom' && (
                  <div className="mt-3 flex items-center gap-2 bg-plt-card border border-plt-border-soft px-3 py-2 rounded-xl text-xs">
                    <Calendar className="w-3.5 h-3.5 text-plt-muted shrink-0" />
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-transparent text-plt-text focus:outline-none text-xs flex-1 min-w-0"
                    />
                    <span className="text-plt-muted">→</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-transparent text-plt-text focus:outline-none text-xs flex-1 min-w-0"
                    />
                  </div>
                )}
              </div>

              {/* Section: Grouping */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2.5">
                  Hierarchy Level
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sector', label: 'Sector (11)' },
                    { id: 'industryGroup', label: 'Group (25)' },
                    { id: 'industry', label: 'Industry' },
                    { id: 'ticker', label: 'Ticker' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setGranularity(item.id as any);
                        onResetSelection();
                      }}
                      className={`px-3 py-2.5 rounded-xl btn-typography transition text-left border ${
                        granularity === item.id
                          ? 'bg-white/[0.12] text-white border-plt-border-strong'
                          : 'text-plt-muted border-plt-border hover:text-plt-text hover:bg-white/[0.04]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section: Tile Sizing */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2.5">
                  Tile Sizing
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'turnover', label: analysisMode === 'strategy' ? 'Strat ROI' : 'Turnover' },
                    { id: 'volume', label: 'Volume' },
                    { id: 'equal', label: 'Equal' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSizingMetric(item.id as any)}
                      className={`px-3 py-2.5 rounded-xl btn-typography transition text-center border ${
                        sizingMetric === item.id
                          ? 'bg-white/[0.12] text-white border-plt-border-strong btn-typography-semibold'
                          : 'text-plt-muted border-plt-border hover:text-plt-text hover:bg-white/[0.04]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section: Strategy (when in strategy mode) */}
              {analysisMode === 'strategy' && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2.5">
                    Strategy Configuration
                  </div>

                  <button
                    type="button"
                    onClick={() => setFilterActiveSignalsOnly(!filterActiveSignalsOnly)}
                    className={`w-full px-3 py-2.5 rounded-xl btn-typography transition flex items-center justify-between border ${
                      filterActiveSignalsOnly
                        ? 'bg-plt-profit/15 text-plt-profit border-plt-profit/30'
                        : 'bg-white/[0.04] text-plt-muted border-plt-border hover:text-plt-text'
                    }`}
                  >
                    <span>Active Setups Only</span>
                    <span>{filterActiveSignalsOnly ? '✓' : '—'}</span>
                  </button>

                  {availableStrategies.length > 0 && (
                    <select
                      value={selectedStrategy}
                      onChange={(e) => setSelectedStrategy(e.target.value)}
                      className="mt-2 w-full h-10 px-3 rounded-xl bg-plt-card border border-plt-border-soft text-xs text-plt-text focus:outline-none"
                    >
                      {availableStrategies.map((strat) => (
                        <option key={strat.id} value={strat.id} className="bg-plt-base text-plt-text">
                          {strat.label || strat.shortName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Apply / Close */}
            <div className="px-5 pb-6 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full h-11 rounded-xl bg-plt-raised border border-plt-border-strong btn-typography-semibold text-plt-text hover:bg-plt-hover transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
