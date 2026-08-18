"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { computeTreemap, type TreemapNode, type TreemapRect } from './treemapMath';
import type { SectorPerformanceItem, StockPerformanceItem } from '@/app/api/sectors/performance/route';
import { Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import type { TickerStrategySignalState } from '@/app/api/sectors/signals/route';

interface SectorTreemapProps {
  sectors: SectorPerformanceItem[];
  sizingMetric?: 'turnover' | 'volume' | 'equal';
  mode?: 'nominal' | 'usd' | 'alpha';
  analysisMode?: 'macro' | 'strategy';
  signalsMap?: Record<string, TickerStrategySignalState>;
  filterActiveSignalsOnly?: boolean;
  selectedSector: string | null;
  onSelectSector: (sectorName: string) => void;
  onSelectTicker: (symbol: string) => void;
}

/**
 * Computes a smooth color fill based on performance percentage
 */
function getHeatmapColor(returnPct: number): { bg: string; border: string; text: string } {
  if (returnPct >= 15) {
    return {
      bg: 'rgba(34, 197, 94, 0.40)',
      border: 'rgba(34, 197, 94, 0.60)',
      text: '#4ade80',
    };
  }
  if (returnPct >= 5) {
    return {
      bg: 'rgba(34, 197, 94, 0.22)',
      border: 'rgba(34, 197, 94, 0.35)',
      text: '#86efac',
    };
  }
  if (returnPct > 0) {
    return {
      bg: 'rgba(34, 197, 94, 0.12)',
      border: 'rgba(34, 197, 94, 0.20)',
      text: '#bbf7d0',
    };
  }
  if (returnPct === 0) {
    return {
      bg: 'rgba(39, 39, 42, 0.40)',
      border: 'rgba(63, 63, 70, 0.30)',
      text: '#a1a1aa',
    };
  }
  if (returnPct >= -5) {
    return {
      bg: 'rgba(239, 68, 68, 0.14)',
      border: 'rgba(239, 68, 68, 0.25)',
      text: '#fca5a5',
    };
  }
  if (returnPct >= -15) {
    return {
      bg: 'rgba(239, 68, 68, 0.25)',
      border: 'rgba(239, 68, 68, 0.40)',
      text: '#f87171',
    };
  }
  return {
    bg: 'rgba(239, 68, 68, 0.42)',
    border: 'rgba(239, 68, 68, 0.65)',
    text: '#ef4444',
  };
}

export default function SectorTreemap({
  sectors,
  sizingMetric = 'turnover',
  mode = 'nominal',
  analysisMode = 'macro',
  signalsMap,
  filterActiveSignalsOnly = false,
  selectedSector,
  onSelectSector,
  onSelectTicker,
}: SectorTreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });
  const [hoveredStock, setHoveredStock] = useState<StockPerformanceItem | null>(null);

  // ResizeObserver for fluid responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.max(entry.contentRect.width, 300),
          height: Math.max(entry.contentRect.height, 400),
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
        let sectorSizingValue = sector.totalTurnover;
        if (sizingMetric === 'volume') {
          sectorSizingValue = sector.stocks.reduce((acc, st) => acc + st.volume, 0);
        } else if (sizingMetric === 'equal') {
          sectorSizingValue = sector.stocks.length * 100;
        }

        const children: TreemapNode<StockPerformanceItem>[] = sector.stocks.map((stock) => {
          let stockValue = stock.turnover;
          if (sizingMetric === 'volume') stockValue = stock.volume;
          else if (sizingMetric === 'equal') stockValue = 100;

          return {
            id: stock.symbol,
            name: stock.symbol,
            value: Math.max(stockValue, 1),
            data: stock,
          };
        });

        return {
          id: sector.sector,
          name: sector.sector,
          value: Math.max(sectorSizingValue, 1),
          data: sector,
          children,
        };
      });
  }, [sectors, sizingMetric]);

  // Compute layout coordinates
  const layout = useMemo(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return [];
    return computeTreemap(treemapTree, dimensions.width, dimensions.height);
  }, [treemapTree, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px] bg-black/40 rounded-xl overflow-hidden select-none border border-white/[0.08]">
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
                ? 'border-plt-orange/80 bg-plt-orange/[0.04] shadow-[0_0_15px_rgba(255,100,13,0.15)] z-10'
                : 'border-white/[0.09] hover:border-white/20 bg-zinc-950/60'
            }`}
            onClick={() => onSelectSector(sectorData.sector)}
          >
            {/* Sector Header Ribbon */}
            <div className="h-6 px-2 flex items-center justify-between bg-black/70 backdrop-blur-md border-b border-white/[0.06] text-[10px] cursor-pointer">
              <span className="font-semibold uppercase tracking-wider text-white/70 truncate max-w-[70%]">
                {sectorData.sector}
              </span>
              <span
                className={`font-mono font-bold ${
                  sectorData.turnoverWeightedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {sectorData.turnoverWeightedReturn >= 0 ? '+' : ''}
                {sectorData.turnoverWeightedReturn.toFixed(1)}%
              </span>
            </div>

            {/* Nested Stock Rectangles */}
            {sectorRect.children?.map((stockRect) => {
              const stock = (stockRect.data as unknown) as StockPerformanceItem;
              const colors = getHeatmapColor(stock.returnPct);
              const isTiny = stockRect.width < 50 || stockRect.height < 40;
              const isMicro = stockRect.width < 35 || stockRect.height < 25;

              const signalState = signalsMap?.[stock.symbol];
              const isBuy = signalState?.status === 'BUY_FRESH';
              const isLong = signalState?.status === 'LONG_ACTIVE';
              const isExit = signalState?.status === 'EXIT_RECENT';
              const isDimmed = filterActiveSignalsOnly && !isBuy && !isLong && !isExit;

              return (
                <div
                  key={stockRect.id}
                  style={{
                    position: 'absolute',
                    left: stockRect.x - sectorRect.x,
                    top: stockRect.y - sectorRect.y,
                    width: stockRect.width,
                    height: stockRect.height,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  }}
                  className={`border rounded-[4px] p-1 flex flex-col justify-between cursor-pointer transition-all duration-150 hover:brightness-125 hover:z-20 group relative overflow-hidden ${
                    isDimmed ? 'opacity-20' : isBuy ? 'ring-1 ring-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSector(sectorData.sector);
                    onSelectTicker(stock.symbol);
                  }}
                  onMouseEnter={() => setHoveredStock(stock)}
                  onMouseLeave={() => setHoveredStock(null)}
                >
                  {!isMicro && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-white font-mono tracking-tight truncate">
                        {stock.symbol}
                      </span>
                      {analysisMode === 'strategy' ? (
                        isBuy ? (
                          <span className="px-1 py-0.2 rounded bg-emerald-400 text-black font-extrabold text-[8px] animate-pulse">
                            BUY
                          </span>
                        ) : isLong ? (
                          <span className="px-1 py-0.2 rounded bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold text-[8px]">
                            LONG
                          </span>
                        ) : isExit ? (
                          <span className="px-1 py-0.2 rounded bg-rose-500/30 border border-rose-400 text-rose-300 font-bold text-[8px]">
                            EXIT
                          </span>
                        ) : null
                      ) : (
                        stock.returnPct >= 10 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
                        )
                      )}
                    </div>
                  )}

                  {!isTiny && (
                    <div className="flex flex-col mt-auto">
                      <span className="text-[11px] font-mono font-bold" style={{ color: colors.text }}>
                        {stock.returnPct > 0 ? `+${stock.returnPct.toFixed(1)}%` : `${stock.returnPct.toFixed(1)}%`}
                      </span>
                      {stockRect.height > 60 && (
                        <span className="text-[9px] font-mono text-white/40 truncate">
                          {stock.endPrice.toFixed(2)} EGP
                        </span>
                      )}
                    </div>
                  )}

                  {isMicro && (
                    <div className="m-auto text-[8px] font-bold font-mono text-white/80">
                      {stock.symbol.slice(0, 3)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Floating Hover Tooltip */}
      {hoveredStock && (
        <div className="absolute bottom-3 left-3 z-30 pointer-events-none bg-zinc-950/95 border border-white/20 rounded-lg p-2.5 shadow-2xl backdrop-blur-xl text-xs flex flex-col gap-1 min-w-[210px] animate-in fade-in duration-100">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-1">
            <span className="font-bold text-white">{hoveredStock.symbol}</span>
            <span className="text-[10px] text-white/40">{hoveredStock.sector}</span>
          </div>
          <p className="text-[11px] text-white/60 truncate">{hoveredStock.companyName}</p>
          <div className="flex items-center justify-between mt-1 font-mono">
            <span className="text-white/50 text-[10px]">Return:</span>
            <span
              className={`font-bold ${
                hoveredStock.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {hoveredStock.returnPct > 0 ? '+' : ''}
              {hoveredStock.returnPct.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-white/50">
            <span>Price:</span>
            <span className="text-white">
              {hoveredStock.startPrice.toFixed(2)} → {hoveredStock.endPrice.toFixed(2)} EGP
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-white/50">
            <span>Turnover:</span>
            <span className="text-white">
              {(hoveredStock.turnover / 1_000_000).toFixed(2)}M EGP
            </span>
          </div>

          {analysisMode === 'strategy' && signalsMap?.[hoveredStock.symbol] && (
            <div className="mt-1 pt-1 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/50">PSI Signal:</span>
              <span
                className={`font-bold ${
                  signalsMap[hoveredStock.symbol].status === 'BUY_FRESH'
                    ? 'text-emerald-400'
                    : signalsMap[hoveredStock.symbol].status === 'LONG_ACTIVE'
                    ? 'text-cyan-400'
                    : signalsMap[hoveredStock.symbol].status === 'EXIT_RECENT'
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              >
                {signalsMap[hoveredStock.symbol].status === 'BUY_FRESH'
                  ? '🎯 Fresh BUY'
                  : signalsMap[hoveredStock.symbol].status === 'LONG_ACTIVE'
                  ? `⚡ Active LONG (${signalsMap[hoveredStock.symbol].tradeReturnPct ? (signalsMap[hoveredStock.symbol].tradeReturnPct! > 0 ? '+' : '') + signalsMap[hoveredStock.symbol].tradeReturnPct!.toFixed(1) + '%' : 'Hold'})`
                  : signalsMap[hoveredStock.symbol].status === 'EXIT_RECENT'
                  ? '🔻 Closed Trade'
                  : '⚪ Idle / Cash'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
