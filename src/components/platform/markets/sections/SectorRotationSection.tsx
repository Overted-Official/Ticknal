'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type SectorPerformanceItem,
  type SectorsPerformanceResponse,
  aggregateSectorsFromStocks,
} from '@/lib/sectors-math';
import SectorRotationMatrix from '../SectorRotationMatrix';
import SectorConcentrationFlowPanel from './SectorConcentrationFlowPanel';
import { X } from '@/components/ui/icon-library';
import { type MarketTimeframe, TIMEFRAMES } from './MarketOverviewSection';

export type GICSGranularity = 'sector' | 'industryGroup' | 'industry';

interface SectorRotationSectionProps {
  macroData?: SectorsPerformanceResponse;
  sectors?: SectorPerformanceItem[];
  selectedSector?: string | null;
  onSelectSector?: (sectorName: string) => void;
  timeframe?: MarketTimeframe;
  onTimeframeChange?: (tf: MarketTimeframe) => void;
}

export default function SectorRotationSection({
  macroData,
  sectors = [],
  selectedSector = null,
  onSelectSector,
  timeframe,
  onTimeframeChange,
}: SectorRotationSectionProps) {
  const [granularity, setGranularity] = useState<GICSGranularity>('sector');
  const [internalTimeframe, setInternalTimeframe] = useState<MarketTimeframe>('1M');
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const activeTimeframe = timeframe || internalTimeframe;
  const handleTimeframeChange = (tf: MarketTimeframe) => {
    setInternalTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const displaySectors = useMemo(() => {
    if (macroData?.rawStockItems && macroData.rawStockItems.length > 0) {
      return aggregateSectorsFromStocks(
        macroData.rawStockItems,
        granularity,
        macroData.egx30Return ?? null
      ).sectors;
    }
    return sectors;
  }, [macroData, granularity, sectors]);

  // Determine active category for the side panel (defaults to first available if none clicked)
  const activeCategoryName = internalSelectedCategory || selectedSector || displaySectors[0]?.sector || null;

  const activeCategoryItem = useMemo(() => {
    if (!activeCategoryName) return displaySectors[0] || null;
    return (
      displaySectors.find(
        (s) => s.sector.toLowerCase() === activeCategoryName.toLowerCase()
      ) ||
      displaySectors[0] ||
      null
    );
  }, [displaySectors, activeCategoryName]);

  const benchmarkReturn = macroData?.egx30Return ?? 0;
  const totalMarketTurnover = macroData?.marketSummary?.totalTurnover || 0;

  const handleCategorySelect = (categoryName: string) => {
    setInternalSelectedCategory(categoryName);
    onSelectSector?.(categoryName);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  };

  return (
    <section id="sector-rotation" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header Title */}
      <div className="flex flex-col gap-0.5 min-w-0 pb-2 border-b border-border-subtle">
        <h2 className="section-title">Sector Rotation (RRG)</h2>
        <p className="section-subtitle">
          Track sector momentum against the EGX30 benchmark to identify institutional rotation cycles and capital shifts
        </p>
      </div>

      {/* 2. Dedicated Controls Toolbar (Placed below header, open center prevents collision with floating nav) */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs select-none">
        {/* Left: 3-Level GICS Switcher */}
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
                setGranularity(lvl.id as GICSGranularity);
                setInternalSelectedCategory(null);
              }}
              className={`seg-control-btn ${granularity === lvl.id ? 'seg-control-btn-active' : ''}`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Right: Timeframe Switcher (Shared with Market Overview) */}
        <div className="seg-control">
          {TIMEFRAMES.map((tf) => {
            const isSelected = activeTimeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main RRG Canvas (Left) + Sector Concentration & Capital Flow Analysis (Right) */}
      <div className="w-full flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left: Matrix Canvas */}
        <div className="flex-1 min-w-0 bg-black overflow-hidden flex flex-col border-0 h-[520px] sm:h-[620px] lg:h-[calc(100vh-210px)] lg:min-h-[640px] lg:max-h-[860px]">
          <SectorRotationMatrix
            sectors={displaySectors}
            selectedSector={activeCategoryItem?.sector || null}
            onSelectSector={handleCategorySelect}
          />
        </div>

        {/* Right: Desktop Sector Concentration & Flow Panel (Hidden on mobile < lg, side-by-side on desktop >= lg) */}
        <div className="hidden lg:flex w-[370px] xl:w-[410px] shrink-0 bg-transparent border-0 overflow-hidden flex-col h-[calc(100vh-210px)] min-h-[640px] max-h-[860px]">
          <SectorConcentrationFlowPanel
            sector={activeCategoryItem}
            totalMarketTurnover={totalMarketTurnover}
            benchmarkReturn={benchmarkReturn}
          />
        </div>
      </div>

      {/* 3. Mobile Bottom Drawer for Sector Concentration & Capital Flow Analysis */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isDrawerOpen && activeCategoryItem && (
              <div className="fixed inset-0 z-[75] flex items-end justify-center select-none font-sans lg:hidden">
                {/* Backdrop */}
                <motion.div
                  key="sector-mobile-drawer-backdrop"
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
                  key="sector-mobile-drawer-sheet"
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
                  className="relative w-full max-h-[85vh] bg-black text-white rounded-none border-t border-white/10 flex flex-col shadow-2xl z-10 overflow-hidden touch-pan-y"
                >
                  {/* Drag Handle */}
                  <div
                    className="w-full flex items-center justify-center pt-3 pb-1 cursor-pointer"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Drag down to close"
                  >
                    <div className="w-10 h-1 bg-white/25 rounded-full hover:bg-white/40 transition-colors" />
                  </div>

                  {/* Drawer Header Close Button Bar */}
                  <div className="px-4 py-2 flex items-center justify-between border-b border-white/[0.08] shrink-0">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Sector Analysis
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

                  {/* Scrollable Sector Concentration & Flow Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 pb-8">
                    <SectorConcentrationFlowPanel
                      sector={activeCategoryItem}
                      totalMarketTurnover={totalMarketTurnover}
                      benchmarkReturn={benchmarkReturn}
                    />
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
