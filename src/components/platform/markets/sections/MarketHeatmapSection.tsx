'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { SectorPerformanceItem, SectorsPerformanceResponse, SectorStrategySignalsResponse } from '@/lib/sectors-math';
import SectorTreemap from '../SectorTreemap';
import SectorConstituentRowItem from './SectorConstituentRowItem';
import { X } from '@/components/ui/icon-library';
import { TIMEFRAMES } from './MarketOverviewSection';

interface MarketHeatmapSectionProps {
  sectors?: SectorPerformanceItem[];
  marketSummary?: SectorsPerformanceResponse['marketSummary'];
  signalsData?: SectorStrategySignalsResponse;
  benchmarkReturn?: number;
  timeframePreset: '1D' | '5D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom';
  setTimeframePreset: (preset: '1D' | '5D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom') => void;
  granularity: 'sector' | 'industryGroup' | 'industry' | 'ticker';
  setGranularity: (granularity: 'sector' | 'industryGroup' | 'industry' | 'ticker') => void;
  sizingMetric: 'turnover' | 'volume' | 'equal';
  setSizingMetric: (metric: 'turnover' | 'volume' | 'equal') => void;
  selectedSector: string | null;
  onSelectSector: (sectorName: string) => void;
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
  isLoading?: boolean;
}

export default function MarketHeatmapSection({
  sectors = [],
  marketSummary,
  signalsData,
  benchmarkReturn = 0,
  timeframePreset,
  setTimeframePreset,
  granularity,
  setGranularity,
  sizingMetric,
  setSizingMetric,
  selectedSector,
  onSelectSector,
  selectedTicker,
  onSelectTicker,
  isLoading = false,
}: MarketHeatmapSectionProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key when mobile drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsDrawerOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDrawerOpen]);

  // Active chosen sector object
  const activeSectorData = useMemo(() => {
    return sectors.find((s) => s.sector === selectedSector) || sectors[0] || null;
  }, [sectors, selectedSector]);

  // Sorted constituents of the active category by Alpha descending
  const sortedConstituents = useMemo(() => {
    if (!activeSectorData?.stocks || activeSectorData.stocks.length === 0) return [];
    return [...activeSectorData.stocks].sort((a, b) => {
      const alphaA = a.returnPct - benchmarkReturn;
      const alphaB = b.returnPct - benchmarkReturn;
      return alphaB - alphaA;
    });
  }, [activeSectorData, benchmarkReturn]);

  const handleSectorSelect = (sectorName: string) => {
    onSelectSector(sectorName);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  };

  const handleTickerSelect = (symbol: string) => {
    onSelectTicker(symbol);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  };

  return (
    <section id="market-heatmap" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header Title */}
      <div className="flex flex-col gap-0.5 min-w-0 pb-2 border-b border-border-subtle">
        <h2 className="section-title">Market Heatmap</h2>
        <p className="section-subtitle">
          Visual map of EGX equities structured by GICS hierarchy and trading turnover
        </p>
      </div>

      {/* 2. Dedicated Controls Toolbar (Placed below header, open center prevents any collision with floating nav) */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs select-none">
        {/* Left: GICS Granularity + Sizing Metric */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Granularity Switcher */}
          <div className="seg-control">
            {[
              { id: 'sector', label: 'Sector' },
              { id: 'industryGroup', label: 'Industry Group' },
              { id: 'industry', label: 'Industry' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setGranularity(lvl.id as any);
                  if (selectedSector) onSelectSector('');
                }}
                className={`seg-control-btn ${granularity === lvl.id ? 'seg-control-btn-active' : ''}`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Sizing Metric Switcher */}
          <div className="seg-control">
            {[
              { id: 'turnover', label: 'Turnover' },
              { id: 'volume', label: 'Volume' },
              { id: 'equal', label: 'Equal Weight' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSizingMetric(m.id as any)}
                className={`seg-control-btn ${sizingMetric === m.id ? 'seg-control-btn-active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Timeframe Switcher */}
        <div className="seg-control">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframePreset(tf)}
              className={`seg-control-btn ${timeframePreset === tf ? 'seg-control-btn-active' : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Workspace: Squarified Treemap (Left) + Constituent Tickers List (Right) */}
      <div className="w-full flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left Canvas: Treemap without outer border */}
        <div className="w-full lg:flex-1 min-w-0 bg-black overflow-hidden flex flex-col border-0 h-[520px] sm:h-[620px] min-h-[500px] sm:min-h-[580px] lg:h-[calc(100vh-210px)] lg:min-h-[640px] lg:max-h-[860px]">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-plt-base/40">
              <span className="w-6 h-6 rounded-full border-2 border-profit-num border-t-transparent animate-spin" />
              <span className="text-xs tabular-nums text-text-muted">Aggregating EGX Market Performance...</span>
            </div>
          ) : (
            <SectorTreemap
              sectors={sectors}
              sizingMetric={sizingMetric}
              analysisMode="macro"
              selectedSector={selectedSector}
              onSelectSector={handleSectorSelect}
              onSelectTicker={handleTickerSelect}
            />
          )}
        </div>

        {/* Right Panel: Desktop Constituent Tickers List (Hidden on mobile < lg, side-by-side on desktop >= lg) */}
        <div className="hidden lg:flex w-[370px] xl:w-[410px] shrink-0 bg-transparent border-0 overflow-hidden flex-col h-[calc(100vh-210px)] min-h-[640px] max-h-[860px]">
          {/* Panel Header */}
          <div className="px-1.5 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-transparent">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white truncate max-w-[200px]" title={activeSectorData?.sector}>
                  {activeSectorData?.sector || 'Constituents'}
                </h3>
                {activeSectorData && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      activeSectorData.rotationRegime === 'Leading'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : activeSectorData.rotationRegime === 'Improving'
                        ? 'bg-sky-500/20 text-sky-300'
                        : activeSectorData.rotationRegime === 'Weakening'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {activeSectorData.rotationRegime}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {sortedConstituents.length} {sortedConstituents.length === 1 ? 'ticker' : 'tickers'}
              </p>
            </div>

            {activeSectorData && (
              <span
                className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 ${
                  activeSectorData.turnoverWeightedReturn >= 0
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-rose-500/15 text-rose-300'
                }`}
                title="Volume/turnover-weighted sector return (ROI)"
              >
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-75">
                  Return
                </span>
                <span>
                  {activeSectorData.turnoverWeightedReturn > 0 ? '+' : ''}
                  {activeSectorData.turnoverWeightedReturn.toFixed(1)}%
                </span>
              </span>
            )}
          </div>

          {/* Panel Scrollable Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sortedConstituents.length > 0 ? (
              sortedConstituents.map((stock) => (
                <SectorConstituentRowItem
                  key={stock.symbol}
                  stock={stock}
                  benchmarkReturn={benchmarkReturn}
                  onSelectTicker={onSelectTicker}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-neutral-500 text-xs">
                Select a sector on the heatmap to view constituent tickers
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Mobile Bottom Drawer for Constituent Tickers (Slides from bottom up on phone/tablet) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isDrawerOpen && activeSectorData && (
              <div className="fixed inset-0 z-[75] flex items-end justify-center select-none font-sans lg:hidden">
                {/* Backdrop */}
                <motion.div
                  key="heatmap-mobile-drawer-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close drawer"
                />

                {/* Bottom Sheet Surface */}
                <motion.div
                  key="heatmap-mobile-drawer-sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  drag="y"
                  dragConstraints={{ top: 0 }}
                  dragElastic={{ top: 0, bottom: 0.4 }}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 500) {
                      setIsDrawerOpen(false);
                    }
                  }}
                  className="relative w-full max-h-[82vh] bg-black text-white rounded-none border-t border-white/10 flex flex-col shadow-2xl z-10 overflow-hidden touch-pan-y"
                >
                  {/* Drag Handle */}
                  <div
                    className="w-full flex items-center justify-center pt-3 pb-1 cursor-pointer"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Drag down to close"
                  >
                    <div className="w-10 h-1 bg-white/25 rounded-full hover:bg-white/40 transition-colors" />
                  </div>

                  {/* Drawer Header */}
                  <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-transparent">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white truncate max-w-[180px] sm:max-w-[260px]">
                          {activeSectorData.sector}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            activeSectorData.rotationRegime === 'Leading'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : activeSectorData.rotationRegime === 'Improving'
                              ? 'bg-sky-500/20 text-sky-300'
                              : activeSectorData.rotationRegime === 'Weakening'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {activeSectorData.rotationRegime}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {sortedConstituents.length} {sortedConstituents.length === 1 ? 'ticker' : 'tickers'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 ${
                          activeSectorData.turnoverWeightedReturn >= 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                        title="Volume/turnover-weighted sector return (ROI)"
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wider opacity-75">
                          Return
                        </span>
                        <span>
                          {activeSectorData.turnoverWeightedReturn > 0 ? '+' : ''}
                          {activeSectorData.turnoverWeightedReturn.toFixed(1)}%
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Constituents List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-1 pb-8">
                    {sortedConstituents.length > 0 ? (
                      sortedConstituents.map((stock) => (
                        <SectorConstituentRowItem
                          key={stock.symbol}
                          stock={stock}
                          benchmarkReturn={benchmarkReturn}
                          onSelectTicker={onSelectTicker}
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-500 text-xs">
                        No constituent tickers found
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}
