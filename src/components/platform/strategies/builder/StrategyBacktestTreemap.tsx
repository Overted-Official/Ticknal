'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { computeTreemap, type TreemapNode, type TreemapRect } from '@/lib/finance/treemapMath';
import { X } from '@/components/ui/icon-library';
import type { BacktestGroupItem, BacktestTickerItem } from './strategy-builder-fixtures';

interface StrategyBacktestTreemapProps {
  readonly groups: readonly BacktestGroupItem[];
  readonly selectedTickerId: string | null;
  readonly locale: 'en' | 'ar';
  readonly onSelectTicker: (symbol: string) => void;
}

/**
 * Computes rich financial heatmap color fill matching SectorTreemap on Markets page
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

export default function StrategyBacktestTreemap({
  groups,
  selectedTickerId,
  locale,
  onSelectTicker,
}: StrategyBacktestTreemapProps) {
  const isAr = locale === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [hoveredStock, setHoveredStock] = useState<{ stock: BacktestTickerItem; groupName: string } | null>(null);
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
    const tooltipHeight = 170;
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

  // ResizeObserver for fluid responsiveness matching SectorTreemap
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = (w: number, h: number) => {
      if (w > 0 && h > 0) {
        setDimensions({
          width: Math.max(w, 280),
          height: Math.max(h, 480),
        });
      }
    };
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      updateDims(rect.width, rect.height);
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateDims(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Format node tree for squarified algorithm
  const treemapTree = useMemo<TreemapNode<BacktestGroupItem | BacktestTickerItem>[]>(() => {
    return groups.map((group) => {
      const children: TreemapNode<BacktestTickerItem>[] = group.tickers.map((stock) => {
        const stockValue = Math.max(30, Math.round(Math.abs(stock.returnPct) * 12) + stock.trades * 10);
        return {
          id: stock.id,
          name: stock.symbol,
          value: stockValue,
          data: stock,
        };
      });

      const groupValue = children.reduce((acc, c) => acc + c.value, 0);

      return {
        id: group.id,
        name: isAr ? group.nameAr : group.name,
        value: Math.max(groupValue, 1),
        data: group,
        children,
      };
    });
  }, [groups, isAr]);

  // Compute layout coordinates
  const layout = useMemo<TreemapRect<BacktestGroupItem | BacktestTickerItem>[]>(() => {
    const usableHeight = Math.max(dimensions.height, 480);
    if (dimensions.width <= 0 || usableHeight <= 0) return [];
    return computeTreemap(treemapTree, dimensions.width, usableHeight);
  }, [treemapTree, dimensions]);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) ?? null;
  }, [groups, selectedGroupId]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-[520px] sm:h-[580px] lg:h-[620px] relative select-none overflow-hidden bg-black flex flex-col font-sans touch-pan-y border-0 rounded-none"
    >
      {/* Reset Group Filter Button */}
      {selectedGroupId && (
        <button
          type="button"
          onClick={() => setSelectedGroupId(null)}
          className="absolute top-2 end-2 z-30 bg-black/80 hover:bg-black text-xs text-neutral-300 hover:text-white px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-md transition flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          <span>
            {isAr
              ? `إعادة ضبط ${activeGroup ? activeGroup.nameAr : ''}`
              : `Reset ${activeGroup ? activeGroup.name : ''}`}
          </span>
          <X size={12} />
        </button>
      )}

      {/* 2. Interactive Canvas Box */}
      <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
        {layout.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-500 text-xs">
            <span>
              {isAr ? 'لا تتوفر بيانات لخريطة أداء الاستراتيجية' : 'No strategy heatmap data available'}
            </span>
          </div>
        )}

        {layout.map((groupRect) => {
          const groupData = groupRect.data as BacktestGroupItem;
          const isSelected = selectedGroupId === groupData.id;
          const groupName = isAr ? groupData.nameAr : groupData.name;
          const ribbonH = groupRect.headerHeight ?? 22;

          return (
            <div
              key={groupRect.id}
              style={{
                position: 'absolute',
                left: groupRect.x,
                top: groupRect.y,
                width: groupRect.width,
                height: groupRect.height,
              }}
              className={`border transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'border-white ring-2 ring-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.85)] z-20 scale-[1.012]'
                  : selectedGroupId
                  ? 'border-white/10 bg-black opacity-70 hover:opacity-100'
                  : 'border-white/10 bg-black'
              }`}
              onClick={() => setSelectedGroupId(isSelected ? null : groupData.id)}
            >
              {/* Group Header Ribbon */}
              {groupData.tickers.length > 1 && ribbonH > 0 && (
                <div
                  style={{ height: ribbonH }}
                  className={`px-2 flex items-center justify-between backdrop-blur-sm border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/15 text-white font-bold' : 'bg-black/90 text-neutral-400'
                  }`}
                >
                  <span className="truncate max-w-[65%]">{groupName}</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      groupData.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                    }`}
                  >
                    {groupData.returnPct >= 0 ? '+' : ''}
                    {groupData.returnPct.toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Nested Stock Rectangles (1-to-1 visual parity with SectorTreemap) */}
              {groupRect.children?.map((stockRect) => {
                const stock = stockRect.data as BacktestTickerItem;
                const colors = getHeatmapColor(stock.returnPct);
                const isTiny = stockRect.width < 48 || stockRect.height < 32;
                const isMicro = stockRect.width < 28 || stockRect.height < 18;
                const isTickerSelected = selectedTickerId === stock.symbol;

                return (
                  <div
                    key={stockRect.id}
                    style={{
                      position: 'absolute',
                      left: stockRect.x - groupRect.x,
                      top: stockRect.y - groupRect.y,
                      width: stockRect.width,
                      height: stockRect.height,
                      backgroundColor: colors.bg,
                    }}
                    className={`border border-black/40 p-1 flex flex-col justify-between cursor-pointer transition-all duration-100 hover:brightness-125 hover:z-20 group relative overflow-hidden rounded-none ${
                      isTickerSelected ? 'ring-2 ring-white z-30 brightness-125' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTicker(stock.symbol);
                    }}
                    onMouseEnter={() => setHoveredStock({ stock, groupName })}
                    onMouseLeave={() => setHoveredStock(null)}
                  >
                    {!isMicro ? (
                      <div className="flex flex-col items-center justify-center h-full text-center leading-none">
                        <span
                          className={`font-bold text-xs tracking-tight tabular-nums truncate max-w-full ${colors.text}`}
                        >
                          {stock.symbol}
                        </span>
                        {!isTiny && (
                          <span className="text-[11px] font-semibold tabular-nums mt-0.5 text-white/90">
                            {stock.returnPct > 0 ? `+${stock.returnPct.toFixed(1)}%` : `${stock.returnPct.toFixed(1)}%`}
                          </span>
                        )}
                        {stockRect.height > 52 && stockRect.width > 56 && (
                          <span className="text-[10px] text-white/60 tabular-nums font-normal mt-0.5">
                            {stock.endPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className={`m-auto text-[9px] font-bold tabular-nums ${colors.text}`}>
                        {stock.symbol.slice(0, 3)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Dynamic Cursor-Following Hover Popover (Borderless #3D3D3D Surface matching Markets page) */}
      {hoveredStock && (
        <div
          style={tooltipStyle}
          className="hover-card absolute z-50 pointer-events-none bg-[#3D3D3D] rounded-xl p-3 shadow-[0_12px_36px_rgba(0,0,0,0.6)] text-xs flex flex-col gap-2 min-w-60 max-w-72 animate-in fade-in duration-100 font-sans select-none border-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-white text-sm tabular-nums">{hoveredStock.stock.symbol}</span>
              <span className="text-[10px] text-plt-muted font-medium px-1.5 py-0.5 rounded bg-white/[0.06] truncate">
                {hoveredStock.groupName}
              </span>
            </div>
            <span
              className={`text-xs font-bold tabular-nums ${
                hoveredStock.stock.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
              }`}
            >
              {hoveredStock.stock.returnPct >= 0 ? '+' : ''}
              {hoveredStock.stock.returnPct.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between text-neutral-300">
              <span className="text-plt-muted">{isAr ? 'الشركة:' : 'Company:'}</span>
              <span className="font-medium truncate max-w-[140px] text-white">
                {isAr ? hoveredStock.stock.nameAr : hoveredStock.stock.name}
              </span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span className="text-plt-muted">{isAr ? 'ألفا مقابل السوق:' : 'Alpha vs Benchmark:'}</span>
              <span
                className={`font-semibold tabular-nums ${
                  hoveredStock.stock.alphaPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                }`}
              >
                {hoveredStock.stock.alphaPct >= 0 ? '+' : ''}
                {hoveredStock.stock.alphaPct.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span className="text-plt-muted">{isAr ? 'نسبة الفوز:' : 'Win Rate:'}</span>
              <span className="font-semibold text-white tabular-nums">{hoveredStock.stock.winRate}%</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span className="text-plt-muted">{isAr ? 'الصفقات:' : 'Trades:'}</span>
              <span className="font-semibold text-white tabular-nums">{hoveredStock.stock.trades}</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span className="text-plt-muted">{isAr ? 'آخر سعر:' : 'Last Price:'}</span>
              <span className="font-medium text-white tabular-nums">
                {hoveredStock.stock.endPrice.toFixed(2)} EGP
              </span>
            </div>
          </div>

          <div className="mt-1 pt-1.5 border-t border-white/[0.08] text-[9px] text-blue-400 font-medium text-end">
            {isAr ? 'انقر للعرض على الرسم البياني ←' : 'Click to inspect on chart →'}
          </div>
        </div>
      )}
    </div>
  );
}
