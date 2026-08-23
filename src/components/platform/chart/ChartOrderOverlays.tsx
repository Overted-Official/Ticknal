'use client';

import type { ChartOrder, OrderOverlay } from './types';

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
  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay) => (
        <div key={overlay.id} className="absolute inset-0 z-10 pointer-events-none">
          {/* Target / Profit Zone (Subtle green tint, NO blur so candlesticks are crisp) */}
          {overlay.profitBoxTop !== null && overlay.profitBoxHeight > 0 && (
            <div
              className="absolute border-t border-l border-r border-plt-profit-border bg-plt-profit-soft pointer-events-none rounded-xl"
              style={{
                left: overlay.left,
                width: overlay.width,
                top: overlay.profitBoxTop,
                height: overlay.profitBoxHeight,
              }}
            />
          )}

          {/* Stop / Loss Zone (Subtle red tint, NO blur) */}
          {overlay.stopBoxTop !== null && overlay.stopBoxHeight > 0 && (
            <div
              className="absolute border-b border-l border-r border-plt-risk-border bg-plt-risk-soft pointer-events-none rounded-xl"
              style={{
                left: overlay.left,
                width: overlay.width,
                top: overlay.stopBoxTop,
                height: overlay.stopBoxHeight,
              }}
            />
          )}

          {/* Center Entry Price Line */}
          <div
            className="absolute border-b border-plt-border-strong pointer-events-none"
            style={{
              left: overlay.left,
              width: overlay.width,
              top: overlay.entryTop,
            }}
          />

          {/* Apple Liquid Glass Position Card */}
          <div
            className="group pointer-events-auto absolute flex flex-col -translate-y-1/2 rounded-2xl border border-white/[0.16] bg-white/[0.06] hover:bg-white/[0.09] hover:border-white/40 p-2.5 text-plt-text shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-2xl transition-all select-none z-30 min-w-44 max-w-56"
            style={{ left: overlay.left, top: overlay.entryTop }}
          >
            {/* Row 1: long (date) */}
            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-plt-text uppercase tracking-wider">
                  Long
                </span>
                <span className="text-[10px] text-plt-muted font-mono">
                  ({overlay.order.entryDate})
                </span>
              </div>
            </div>

            {/* Row 2: Units • Entry Price */}
            <div className="pt-1.5 text-[10px] font-medium text-plt-text tabular-nums flex items-center gap-1.5">
              <span>{overlay.quantity.toLocaleString()} Units</span>
              <span className="text-plt-muted">•</span>
              <span>{overlay.entryPrice.toFixed(2)} EGP</span>
            </div>

            {/* Row 3: P/L egp (ROI %) */}
            <div className="pt-1 text-[10px] font-medium tabular-nums flex items-center gap-1.5 font-mono">
              <span className={overlay.isProfit ? 'text-plt-profit' : 'text-plt-risk'}>
                {overlay.profitLoss >= 0 ? '+' : ''}
                {overlay.profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
              </span>
              <span className={overlay.isProfit ? 'text-plt-profit' : 'text-plt-risk'}>
                ({overlay.profitLossPct >= 0 ? '+' : ''}{overlay.profitLossPct.toFixed(2)}%)
              </span>
            </div>

            {/* Row 4: Action Buttons (Details Button • Close Button) */}
            <div className="pt-2 mt-1 flex items-center gap-1.5 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOrderToEdit(overlay.order);
                }}
                className="flex-1 py-1 px-2 rounded-lg text-[10px] font-medium text-plt-text bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] transition-colors text-center cursor-pointer"
                title="View / Edit Position Details"
              >
                Details
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOrderToClose(overlay.order);
                }}
                className="flex-1 py-1 px-2 rounded-lg text-[10px] font-medium text-plt-risk bg-plt-risk-soft hover:bg-plt-risk hover:text-plt-inverse border border-plt-risk-border transition-colors text-center cursor-pointer"
                title="Close Position"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
