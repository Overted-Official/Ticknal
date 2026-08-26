"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { computeTreemap, type TreemapNode, type TreemapRect } from './treemapMath';
import type { SectorPerformanceItem, StockPerformanceItem, TickerStrategySignalState } from '@/lib/sectors-math';
import { Sparkles, TrendingUp, TrendingDown, CircleDot, LogOut, Target, Zap, Layers, X } from '@/components/ui/icon-library';

interface SectorTreemapProps {
  sectors: SectorPerformanceItem[];
  sizingMetric?: 'turnover' | 'volume' | 'equal';
  mode?: 'nominal' | 'usd' | 'alpha';
  analysisMode?: 'macro' | 'strategy';
  signalsMap?: Record<string, TickerStrategySignalState>;
  sectorSummary?: Record<string, any>;
  filterActiveSignalsOnly?: boolean;
  activeStrategyFilter?:
    | 'ALL'
    | 'BUY_FRESH'
    | 'LONG_ACTIVE'
    | 'LONG_WINNERS'
    | 'LONG_LOSERS'
    | 'EXIT_RECENT'
    | 'ALPHA_POSITIVE'
    | 'ALPHA_NEGATIVE';
  searchQuery?: string;
  selectedSector: string | null;
  onSelectSector: (sectorName: string) => void;
  onSelectTicker: (symbol: string) => void;
}

/**
 * Computes a rich financial heatmap color fill based on performance percentage
 */
function getHeatmapColor(returnPct: number): { bg: string; border: string; text: string } {
  if (returnPct >= 10) {
    return {
      bg: '#059669', // Emerald 600
      border: '#047857',
      text: '#ffffff',
    };
  }
  if (returnPct >= 4) {
    return {
      bg: '#047857', // Emerald 700
      border: '#065f46',
      text: '#ffffff',
    };
  }
  if (returnPct > 0) {
    return {
      bg: '#064e3b', // Emerald 900
      border: '#022c22',
      text: '#ecfdf5',
    };
  }
  if (returnPct === 0) {
    return {
      bg: '#27272a', // Zinc 800
      border: '#18181b',
      text: '#a1a1aa',
    };
  }
  if (returnPct >= -3) {
    return {
      bg: '#7f1d1d', // Red 900
      border: '#450a0a',
      text: '#fef2f2',
    };
  }
  if (returnPct >= -7) {
    return {
      bg: '#991b1b', // Red 800
      border: '#7f1d1d',
      text: '#ffffff',
    };
  }
  if (returnPct >= -12) {
    return {
      bg: '#b91c1c', // Red 700
      border: '#991b1b',
      text: '#ffffff',
    };
  }
  return {
    bg: '#dc2626', // Red 600
    border: '#b91c1c',
    text: '#ffffff',
  };
}

export default function SectorTreemap({
  sectors,
  sizingMetric = 'turnover',
  mode = 'nominal',
  analysisMode = 'macro',
  signalsMap,
  sectorSummary,
  filterActiveSignalsOnly = false,
  activeStrategyFilter = 'ALL',
  searchQuery = '',
  selectedSector,
  onSelectSector,
  onSelectTicker,
}: SectorTreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });
  const [hoveredStock, setHoveredStock] = useState<StockPerformanceItem | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const tooltipStyle = useMemo(() => {
    const tooltipWidth = 250;
    const tooltipHeight = 160;
    let left = mousePos.x + 16;
    let top = mousePos.y + 16;

    if (left + tooltipWidth > dimensions.width - 10) {
      left = mousePos.x - tooltipWidth - 16;
    }
    if (top + tooltipHeight > dimensions.height - 10) {
      top = mousePos.y - tooltipHeight - 16;
    }
    left = Math.max(8, left);
    top = Math.max(8, top);

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [mousePos, dimensions]);

  // ResizeObserver for fluid responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.max(entry.contentRect.width, 300),
          height: Math.max(entry.contentRect.height, 350),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Format node tree for squarified algorithm
  const treemapTree = useMemo(() => {
    return sectors
      .filter((s) => s.stocks.length > 0)
      .map((sector) => {
        const children: TreemapNode<StockPerformanceItem>[] = sector.stocks.map((stock) => {
          let stockValue = stock.turnover;
          if (analysisMode === 'strategy') {
            if (sizingMetric === 'equal') {
              stockValue = 100;
            } else if (sizingMetric === 'volume') {
              stockValue = stock.volume;
            } else {
              // Balanced Strategy Sizing: Base weight 50 + moderated sqrt boost for strategy ROI
              const stratRoi = signalsMap?.[stock.symbol]?.sysRoi ?? 0;
              const trades = signalsMap?.[stock.symbol]?.tradesCount ?? 0;
              if (trades > 0 || signalsMap?.[stock.symbol]?.status === 'BUY_FRESH' || signalsMap?.[stock.symbol]?.status === 'LONG_ACTIVE') {
                if (stratRoi > 0) {
                  stockValue = 50 + Math.sqrt(stratRoi) * 16;
                } else if (stratRoi < 0) {
                  stockValue = Math.max(25, 50 + stratRoi);
                } else {
                  stockValue = 50;
                }
              } else {
                stockValue = 35; // non-traded stocks remain visible & compact
              }
            }
          } else {
            if (sizingMetric === 'volume') stockValue = stock.volume;
            else if (sizingMetric === 'equal') stockValue = 100;
            else stockValue = stock.turnover;
          }

          return {
            id: stock.symbol,
            name: stock.symbol,
            value: Math.max(stockValue, 1),
            data: stock,
          };
        });

        const sectorSizingValue =
          analysisMode === 'strategy'
            ? children.reduce((acc, c) => acc + c.value, 0)
            : sizingMetric === 'volume'
            ? sector.stocks.reduce((acc, st) => acc + st.volume, 0)
            : sizingMetric === 'equal'
            ? sector.stocks.length * 100
            : sector.totalTurnover;

        return {
          id: sector.sector,
          name: sector.sector,
          value: Math.max(sectorSizingValue, 1),
          data: sector,
          children,
        };
      });
  }, [sectors, sizingMetric, analysisMode, signalsMap]);

  // Compute layout coordinates (reserving 28px for top breadcrumbs bar)
  const layout = useMemo(() => {
    const usableHeight = Math.max(dimensions.height - 28, 100);
    if (dimensions.width <= 0 || usableHeight <= 0) return [];
    return computeTreemap(treemapTree, dimensions.width, usableHeight);
  }, [treemapTree, dimensions]);

  const cleanQuery = searchQuery.trim().toLowerCase();

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full relative select-none overflow-hidden bg-plt-base flex flex-col font-sans touch-pan-y"
    >
      {/* 1. Treemap Visual Breadcrumb & Focus Status Bar */}
      <div className="h-7 px-3 flex items-center justify-between bg-plt-surface/90 backdrop-blur-md border-b border-plt-border-soft text-xs text-plt-muted shrink-0 z-30">
        <div className="flex items-center gap-1.5 font-medium truncate">
          <span className="text-plt-text">EGX Market</span>
          {selectedSector && (
            <>
              <span className="text-plt-faint">/</span>
              <span className="text-white font-bold truncate">{selectedSector}</span>
            </>
          )}
          {activeStrategyFilter && activeStrategyFilter !== 'ALL' && (
            <>
              <span className="text-plt-faint">/</span>
              <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                activeStrategyFilter === 'ALPHA_POSITIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : activeStrategyFilter === 'ALPHA_NEGATIVE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : activeStrategyFilter === 'LONG_WINNERS'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : activeStrategyFilter === 'LONG_LOSERS'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : activeStrategyFilter === 'BUY_FRESH'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/10 text-white border border-white/20'
              }`}>
                {activeStrategyFilter === 'ALPHA_POSITIVE'
                  ? 'Positive Alpha (+α)'
                  : activeStrategyFilter === 'ALPHA_NEGATIVE'
                  ? 'Negative Alpha (-α)'
                  : activeStrategyFilter === 'LONG_WINNERS'
                  ? 'Winning Longs'
                  : activeStrategyFilter === 'LONG_LOSERS'
                  ? 'Losing Longs'
                  : activeStrategyFilter === 'BUY_FRESH'
                  ? 'Fresh Buys'
                  : activeStrategyFilter === 'LONG_ACTIVE'
                  ? 'Active Longs'
                  : activeStrategyFilter === 'EXIT_RECENT'
                  ? 'Recent Exits'
                  : activeStrategyFilter}
              </span>
            </>
          )}
          {cleanQuery && (
            <>
              <span className="text-plt-faint">/</span>
              <span className="text-plt-info">Match: "{cleanQuery}"</span>
            </>
          )}
        </div>

        {selectedSector && (
          <button
            type="button"
            onClick={() => onSelectSector('')}
            className="text-[11px] text-plt-muted hover:text-white transition flex items-center gap-1 cursor-pointer shrink-0 ml-2"
          >
            <span>Reset View</span>
            <X size={11} />
          </button>
        )}
      </div>

      {/* 2. Interactive Canvas Box */}
      <div className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
        {layout.map((sectorRect) => {
          const sectorData = sectorRect.data as SectorPerformanceItem;
          const isSelected = selectedSector === sectorData.sector;

          return (
            <div
              key={sectorRect.id}
              style={{
                position: 'absolute',
                left: sectorRect.x,
                top: sectorRect.y,
                width: sectorRect.width,
                height: sectorRect.height,
              }}
              className={`border transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'border-white ring-2 ring-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.85)] z-20 scale-[1.012]'
                  : selectedSector
                  ? 'border-plt-border-soft/50 bg-plt-card opacity-70 hover:opacity-100'
                  : 'border-plt-border-soft bg-plt-card'
              }`}
              onClick={() => onSelectSector(sectorData.sector)}
            >
              {/* Sector Header Ribbon (Only if multi-stock group) */}
              {sectorData.stocks.length > 1 && (() => {
                let sectorStratRoi = 0;
                let activeW = 0;
                let activeL = 0;
                let sumRoi = 0;
                for (const s of sectorData.stocks) {
                  const sig = signalsMap?.[s.symbol];
                  if (sig) {
                    if (sig.sysRoi !== undefined) sumRoi += sig.sysRoi;
                    if (sig.status === 'BUY_FRESH' || sig.status === 'LONG_ACTIVE') {
                      if ((sig.tradeReturnPct ?? 0) > 0) activeW++;
                      else if ((sig.tradeReturnPct ?? 0) < 0) activeL++;
                    }
                  }
                }
                sectorStratRoi = sectorData.stocks.length > 0 ? sumRoi / sectorData.stocks.length : 0;

                return (
                  <div className={`h-[20px] px-2 flex items-center justify-between backdrop-blur-sm border-b border-plt-border-soft text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/15 text-white font-bold' : 'bg-plt-surface/95 text-plt-muted'
                  }`}>
                    <span className="truncate max-w-[65%]">
                      {sectorData.sector}
                    </span>
                    {analysisMode === 'strategy' ? (
                      <div className="flex items-center gap-1.5 tabular-nums text-[10px]">
                        <span className={`font-bold ${
                          sectorStratRoi >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                        }`}>
                          {sectorStratRoi > 0 ? '+' : ''}
                          {sectorStratRoi.toFixed(1)}%
                        </span>
                        {(activeW > 0 || activeL > 0) && (
                          <span className="text-white/50 font-normal">
                            ({activeW}W/{activeL}L)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`tabular-nums font-semibold ${
                          sectorData.turnoverWeightedReturn >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                        }`}
                      >
                        {sectorData.turnoverWeightedReturn >= 0 ? '+' : ''}
                        {sectorData.turnoverWeightedReturn.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Nested Stock Rectangles */}
              {sectorRect.children?.map((stockRect) => {
                const stock = (stockRect.data as unknown) as StockPerformanceItem;
                const colors = getHeatmapColor(stock.returnPct);
                const isTiny = stockRect.width < 48 || stockRect.height < 32;
                const isMicro = stockRect.width < 28 || stockRect.height < 18;

                const signalState = signalsMap?.[stock.symbol];
                const isBuy = signalState?.status === 'BUY_FRESH';
                const isLong = signalState?.status === 'LONG_ACTIVE';
                const isExit = signalState?.status === 'EXIT_RECENT';

                const stratRoi = signalState?.sysRoi ?? 0;
                const stratTradesCount = signalState?.tradesCount ?? 0;
                const stratAlpha = stratRoi - stock.returnPct;

                const isStrategyMatch =
                  !activeStrategyFilter || activeStrategyFilter === 'ALL'
                    ? true
                    : activeStrategyFilter === 'LONG_WINNERS'
                    ? (isLong || isBuy) && (signalState?.tradeReturnPct ?? 0) > 0
                    : activeStrategyFilter === 'LONG_LOSERS'
                    ? (isLong || isBuy) && (signalState?.tradeReturnPct ?? 0) < 0
                    : activeStrategyFilter === 'ALPHA_POSITIVE'
                    ? stratAlpha > 0
                    : activeStrategyFilter === 'ALPHA_NEGATIVE'
                    ? stratAlpha <= 0
                    : signalState?.status === activeStrategyFilter;

                const isSignalDimmed = filterActiveSignalsOnly && !isBuy && !isLong && !isExit;

                const isSearchMatch = cleanQuery
                  ? stock.symbol.toLowerCase().includes(cleanQuery) ||
                    stock.companyName.toLowerCase().includes(cleanQuery) ||
                    stock.sector.toLowerCase().includes(cleanQuery)
                  : true;

                const isDimmed = !isStrategyMatch || isSignalDimmed || !isSearchMatch;

                // Strategy Alpha visual styling
                let tileBg = colors.bg;
                let tileBorder = 'border-black/40';
                let tileTextColor = 'text-white';

                if (analysisMode === 'strategy') {
                  const alphaColors = getHeatmapColor(stratAlpha);
                  if (stratTradesCount > 0 || isBuy || isLong || isExit) {
                    tileBg = alphaColors.bg;
                    tileTextColor = alphaColors.text;
                  } else {
                    tileBg = '#18181b'; // Zinc 900 / dark neutral slate for non-traded stocks
                    tileTextColor = 'text-zinc-500';
                  }

                  tileBorder = isBuy
                    ? 'border-emerald-300 ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.55)] z-20'
                    : isLong
                    ? 'border-cyan-400/80'
                    : isExit
                    ? 'border-rose-400/80'
                    : 'border-white/[0.04]';
                }

                return (
                  <div
                    key={stockRect.id}
                    style={{
                      position: 'absolute',
                      left: stockRect.x - sectorRect.x,
                      top: stockRect.y - sectorRect.y,
                      width: stockRect.width,
                      height: stockRect.height,
                      backgroundColor: tileBg,
                    }}
                    className={`border ${tileBorder} p-1 flex flex-col justify-between cursor-pointer transition-all duration-100 hover:brightness-125 hover:z-20 group relative overflow-hidden rounded-none ${
                      isDimmed
                        ? 'opacity-15'
                        : cleanQuery && isSearchMatch
                        ? 'ring-2 ring-white brightness-125 z-30'
                        : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSector(sectorData.sector);
                      onSelectTicker(stock.symbol);
                    }}
                    onMouseEnter={() => setHoveredStock(stock)}
                    onMouseLeave={() => setHoveredStock(null)}
                  >
                    {!isMicro ? (
                      <div className="flex flex-col items-center justify-center h-full text-center leading-none">
                        <span className={`font-bold text-xs tracking-tight tabular-nums truncate max-w-full ${tileTextColor}`}>
                          {stock.symbol}
                        </span>
                        {!isTiny && (
                          <span className={`text-[11px] font-semibold tabular-nums mt-0.5 ${analysisMode === 'strategy' && stratTradesCount === 0 && !isBuy && !isLong ? 'text-zinc-500' : 'text-white/90'}`}>
                            {analysisMode === 'strategy'
                              ? `${stratAlpha > 0 ? '+' : ''}${stratAlpha.toFixed(1)}% α`
                              : stock.returnPct > 0
                              ? `+${stock.returnPct.toFixed(1)}%`
                              : `${stock.returnPct.toFixed(1)}%`}
                          </span>
                        )}
                        {stockRect.height > 52 && stockRect.width > 56 && (
                          <span className="text-[10px] text-white/60 tabular-nums font-normal mt-0.5">
                            {analysisMode === 'strategy'
                              ? isBuy
                                ? 'Fresh Buy'
                                : isLong
                                ? `Long (${signalState?.tradeReturnPct ? (signalState.tradeReturnPct > 0 ? '+' : '') + signalState.tradeReturnPct.toFixed(0) + '%' : 'Hold'})`
                                : isExit
                                ? 'Exited'
                                : stratTradesCount > 0
                                ? `ROI: ${stratRoi > 0 ? '+' : ''}${stratRoi.toFixed(0)}%`
                                : 'Flat'
                              : stock.endPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={`m-auto text-[9px] font-bold tabular-nums ${tileTextColor}`}>
                        {stock.symbol.slice(0, 3)}
                      </div>
                    )}

                    {/* Clean Colored Dot Indicator in Strategy Mode */}
                    {analysisMode === 'strategy' && (
                      <div className="absolute top-1 right-1 pointer-events-none">
                        {isBuy && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300 ring-1 ring-white" />
                          </span>
                        )}
                        {isLong && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-300 ring-1 ring-cyan-200/60" />
                        )}
                        {isExit && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 ring-1 ring-rose-300/60" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Dynamic Cursor-Following Hover Popover */}
      {hoveredStock && (
        <div
          style={tooltipStyle}
          className="absolute z-50 pointer-events-none bg-plt-raised/98 border border-plt-border-strong rounded-xl p-3 shadow-[0_12px_36px_rgba(0,0,0,0.7)] backdrop-blur-2xl text-xs flex flex-col gap-2 min-w-60 max-w-72 animate-in fade-in duration-100 font-sans select-none"
        >
          {analysisMode === 'strategy' && signalsMap?.[hoveredStock.symbol] ? (
            // Strategy Mode Hover Card
            <>
              <div className="flex items-center justify-between gap-2 border-b border-plt-border/40 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-white text-sm tabular-nums">{hoveredStock.symbol}</span>
                  <span className="text-[10px] text-plt-muted font-medium px-1.5 py-0.5 rounded bg-white/[0.06] truncate">
                    {hoveredStock.sector}
                  </span>
                </div>
                {signalsMap[hoveredStock.symbol].status === 'BUY_FRESH' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-black animate-pulse shadow-xs">
                    BUY NOW
                  </span>
                ) : signalsMap[hoveredStock.symbol].status === 'LONG_ACTIVE' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/50">
                    ACTIVE LONG
                  </span>
                ) : signalsMap[hoveredStock.symbol].status === 'EXIT_RECENT' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/50">
                    RECENT EXIT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-white/[0.06] text-zinc-400">
                    FLAT / CASH
                  </span>
                )}
              </div>

              <p className="text-xs text-plt-muted font-normal truncate" title={hoveredStock.companyName}>
                {hoveredStock.companyName}
              </p>

              {/* Strategy Model Cumulative Performance & Alpha Breakdown */}
              <div className="flex flex-col gap-1 pt-0.5 border-t border-plt-border/40 text-xs tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-plt-muted font-medium">Strategy Alpha (α):</span>
                  <span
                    className={`font-bold ${
                      ((signalsMap[hoveredStock.symbol].sysRoi ?? 0) - hoveredStock.returnPct) >= 0
                        ? 'text-plt-profit'
                        : 'text-plt-risk'
                    }`}
                  >
                    {((signalsMap[hoveredStock.symbol].sysRoi ?? 0) - hoveredStock.returnPct) > 0 ? '+' : ''}
                    {((signalsMap[hoveredStock.symbol].sysRoi ?? 0) - hoveredStock.returnPct).toFixed(1)}% α
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-plt-muted">
                  <span>Strategy Net ROI:</span>
                  <span className={`font-semibold ${(signalsMap[hoveredStock.symbol].sysRoi ?? 0) >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {(signalsMap[hoveredStock.symbol].sysRoi ?? 0) > 0 ? '+' : ''}
                    {(signalsMap[hoveredStock.symbol].sysRoi ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-plt-muted">
                  <span>Buy & Hold ROI:</span>
                  <span className={`font-semibold ${hoveredStock.returnPct >= 0 ? 'text-plt-profit/80' : 'text-plt-risk/80'}`}>
                    {hoveredStock.returnPct > 0 ? '+' : ''}
                    {hoveredStock.returnPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Active Position Details (if open) */}
              {(signalsMap[hoveredStock.symbol].status === 'LONG_ACTIVE' || signalsMap[hoveredStock.symbol].status === 'BUY_FRESH') ? (
                <div className="bg-white/[0.03] border border-cyan-500/20 rounded-lg p-2 flex flex-col gap-1.5 tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-cyan-300 font-semibold">Open Position Gain/Loss:</span>
                    <span
                      className={`font-bold text-xs ${
                        (signalsMap[hoveredStock.symbol].tradeReturnPct ?? 0) >= 0
                          ? 'text-plt-profit'
                          : 'text-plt-risk'
                      }`}
                    >
                      {(signalsMap[hoveredStock.symbol].tradeReturnPct ?? 0) > 0 ? '+' : ''}
                      {(signalsMap[hoveredStock.symbol].tradeReturnPct ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-plt-muted">
                    <span>Entry Price:</span>
                    <span className="text-plt-text font-medium">
                      {signalsMap[hoveredStock.symbol].entryPrice
                        ? `${signalsMap[hoveredStock.symbol].entryPrice!.toFixed(2)} EGP`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-plt-muted">
                    <span>Current Price:</span>
                    <span className="text-plt-text font-medium">
                      {(signalsMap[hoveredStock.symbol].currentPrice || hoveredStock.endPrice).toFixed(2)} EGP
                    </span>
                  </div>
                  {signalsMap[hoveredStock.symbol].barsHeld !== undefined && (
                    <div className="flex items-center justify-between text-[11px] text-plt-muted">
                      <span>Holding Duration:</span>
                      <span className="text-plt-text font-medium">
                        {signalsMap[hoveredStock.symbol].barsHeld} Trading Days
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 flex items-center justify-between text-[11px] text-plt-muted">
                  <span>Open Trade Status:</span>
                  <span className="text-zinc-400 font-medium">No open position (Flat)</span>
                </div>
              )}

              {/* Strategy Model Historical Track Record on this Stock */}
              <div className="pt-1 border-t border-plt-border/40 flex flex-col gap-1 text-[10px] text-plt-muted tabular-nums">
                <div className="flex items-center justify-between">
                  <span>Model Win Rate: <span className="font-bold text-white">{signalsMap[hoveredStock.symbol].winRate !== undefined ? `${signalsMap[hoveredStock.symbol].winRate!.toFixed(0)}%` : 'N/A'}</span></span>
                  <span>Total Trades: <span className="font-bold text-white">{signalsMap[hoveredStock.symbol].tradesCount || 0}</span></span>
                </div>
                {signalsMap[hoveredStock.symbol].maxAdverseExcursion !== undefined && signalsMap[hoveredStock.symbol].maxAdverseExcursion !== 0 && (
                  <div className="flex items-center justify-between pt-0.5 border-t border-white/[0.04]">
                    <span>Max Adverse Excursion (MAE):</span>
                    <span className="font-semibold text-rose-400">
                      {signalsMap[hoveredStock.symbol].maxAdverseExcursion!.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Macro Mode Hover Card
            <>
              <div className="flex items-center justify-between gap-2 border-b border-plt-border/40 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-white text-sm tabular-nums">{hoveredStock.symbol}</span>
                  <span className="text-[10px] text-plt-muted font-medium px-1.5 py-0.5 rounded bg-white/[0.06] truncate">
                    {hoveredStock.sector}
                  </span>
                </div>
                <span
                  className={`font-bold text-xs tabular-nums px-2 py-0.5 rounded-full border shrink-0 ${
                    hoveredStock.returnPct >= 0
                      ? 'bg-plt-profit/15 text-plt-profit border-plt-profit/30'
                      : 'bg-plt-risk/15 text-plt-risk border-plt-risk/30'
                  }`}
                >
                  {hoveredStock.returnPct > 0 ? '+' : ''}
                  {hoveredStock.returnPct.toFixed(2)}%
                </span>
              </div>

              <p className="text-xs text-plt-muted font-normal truncate" title={hoveredStock.companyName}>
                {hoveredStock.companyName}
              </p>

              <div className="space-y-1 pt-0.5 text-xs tabular-nums">
                <div className="flex items-center justify-between text-plt-muted">
                  <span>Price Range:</span>
                  <span className="text-plt-text font-medium">
                    {hoveredStock.startPrice.toFixed(2)} → {hoveredStock.endPrice.toFixed(2)} EGP
                  </span>
                </div>
                <div className="flex items-center justify-between text-plt-muted">
                  <span>Traded Turnover:</span>
                  <span className="text-plt-text font-medium">
                    {hoveredStock.turnover >= 1_000_000_000
                      ? `${(hoveredStock.turnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn EGP`
                      : `${(hoveredStock.turnover / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M EGP`}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
