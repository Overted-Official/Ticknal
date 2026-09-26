'use client';

import React, { useState } from 'react';
import type { ChartOrder, OrderOverlay } from './types';
import { X } from '@/components/ui/icon-library';

interface ChartOrderOverlaysProps {
  overlays: OrderOverlay[];
  onSelectOrderToEdit: (order: ChartOrder) => void;
  onSelectOrderToClose: (order: ChartOrder) => void;
}

export default function ChartOrderOverlays({
  overlays,
  onSelectOrderToEdit,
  onSelectOrderToClose,
}: ChartOrderOverlaysProps) {
  const [activePopoverId, setActivePopoverId] = useState<number | null>(null);

  if (overlays.length === 0) return null;

  return (
    <>
      {/* ========================================================================= */}
      {/* LAYER 1: Background Corridors and Price Lines (Always below all pills/cards) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {overlays.map((overlay) => {
          const currentY = overlay.currentTop ?? overlay.entryTop;
          const corridorTop = Math.min(overlay.entryTop, currentY);
          const corridorHeight = Math.abs(overlay.entryTop - currentY);

          return (
            <React.Fragment key={`corridor-${overlay.id}`}>
              {/* Holding Performance Corridor (Gain/Loss Zone from Entry Date to Current Price) */}
              {corridorHeight > 2 && (
                <div
                  className={`absolute pointer-events-none transition-all duration-200 ${
                    overlay.isProfit
                      ? 'bg-profit-num/[0.08] border-y border-r border-dashed border-profit-num/30'
                      : 'bg-loss-num/[0.08] border-y border-r border-dashed border-loss-num/30'
                  }`}
                  style={{
                    left: overlay.left,
                    width: overlay.width,
                    top: corridorTop,
                    height: corridorHeight,
                  }}
                />
              )}

              {/* Clean Hairline Entry Price Baseline */}
              <div
                className="absolute border-b border-dashed border-white/20 pointer-events-none"
                style={{
                  left: overlay.left,
                  width: overlay.width,
                  top: overlay.entryTop,
                }}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* LAYER 2: Foreground Position Pills & Popovers (Always renders above Layer 1) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {overlays.map((overlay) => {
          const isPopoverOpen = activePopoverId === overlay.id;

          return (
            <div
              key={`pill-${overlay.id}`}
              className={`group pointer-events-auto absolute flex items-center -translate-y-1/2 ${
                isPopoverOpen ? 'z-50' : 'z-20'
              }`}
              style={{ left: overlay.left, top: overlay.entryTop }}
            >
              {/* Compact Position Pill */}
              <button
                type="button"
                onClick={() => setActivePopoverId(isPopoverOpen ? null : overlay.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer shadow-lg select-none text-[11px] font-sans tabular-nums backdrop-blur-md ${
                  overlay.isProfit
                    ? 'bg-emerald-950/80 hover:bg-emerald-900/90 border-emerald-500/50 hover:border-emerald-400 text-emerald-100'
                    : 'bg-rose-950/80 hover:bg-rose-900/90 border-rose-500/50 hover:border-rose-400 text-rose-100'
                } ${isPopoverOpen ? 'ring-2 ring-white/30' : ''}`}
                title="Click to view position details"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${overlay.isProfit ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="font-semibold text-white/95">
                  {overlay.quantity ?? 0} @ {(overlay.entryPrice ?? 0).toFixed(2)}
                </span>
                <span className={overlay.isProfit ? 'text-emerald-400/40' : 'text-rose-400/40'}>•</span>
                <span className={`font-bold tabular-nums ${overlay.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overlay.isProfit ? '+' : ''}{(overlay.profitLossPct ?? 0).toFixed(2)}%
                </span>
              </button>

              {/* Detailed Position Popover (Solid pitch-black surface with z-50 to prevent any background bleed) */}
              {isPopoverOpen && (
                <div
                  className="absolute left-0 top-full mt-2.5 z-50 w-64 p-4 rounded-xl bg-black border border-border-default shadow-[0_16px_48px_rgba(0,0,0,0.85)] text-xs space-y-3 select-none animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">Long Position</span>
                      <span className="text-[10px] text-text-muted font-sans tabular-nums">
                        ({overlay.order.entryDate})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopoverId(null)}
                      className="p-1 rounded text-text-muted hover:text-white hover:bg-surface-raised transition cursor-pointer"
                      title="Close popover"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                    <div className="p-2 rounded-lg bg-surface-raised/60 border border-border-subtle">
                      <span className="text-text-muted block text-[10px]">Position Size</span>
                      <span className="text-white font-semibold tabular-nums mt-0.5 block">
                        {(overlay.quantity ?? 0).toLocaleString()} units
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-raised/60 border border-border-subtle">
                      <span className="text-text-muted block text-[10px]">Entry Price</span>
                      <span className="text-white font-semibold tabular-nums mt-0.5 block">
                        {(overlay.entryPrice ?? 0).toFixed(2)} EGP
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-raised/60 border border-border-subtle">
                      <span className="text-text-muted block text-[10px]">Current Price</span>
                      <span className="text-white font-semibold tabular-nums mt-0.5 block">
                        {(overlay.currentPrice ?? 0).toFixed(2)} EGP
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-raised/60 border border-border-subtle">
                      <span className="text-text-muted block text-[10px]">Unrealized P&L</span>
                      <span className={`font-semibold tabular-nums mt-0.5 block ${overlay.isProfit ? 'text-profit-num' : 'text-loss-num'}`}>
                        {(overlay.profitLoss ?? 0) >= 0 ? '+' : ''}{(overlay.profitLoss ?? 0).toFixed(2)} EGP ({(overlay.profitLossPct ?? 0) >= 0 ? '+' : ''}{(overlay.profitLossPct ?? 0).toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-border-subtle flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopoverId(null);
                        onSelectOrderToEdit(overlay.order);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-white bg-surface-raised hover:bg-surface-active border border-border-subtle hover:border-border-default transition-colors text-center cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopoverId(null);
                        onSelectOrderToClose(overlay.order);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-loss-num bg-loss-num/10 hover:bg-loss-num/20 border border-loss-num/30 transition-colors text-center cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
