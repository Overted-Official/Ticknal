'use client';

import { X, Loader2 } from '@/components/ui/icon-library';
import type { OrderDraft } from './types';

interface ChartOrderDraftPopoverProps {
  orderDraft: OrderDraft | null;
  symbol: string;
  savingOrder: boolean;
  orderError: string | null;
  onUpdateDraft: (updater: (draft: OrderDraft | null) => OrderDraft | null) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ChartOrderDraftPopover({
  orderDraft,
  symbol,
  savingOrder,
  orderError,
  onUpdateDraft,
  onClose,
  onSave,
}: ChartOrderDraftPopoverProps) {
  if (!orderDraft) return null;

  return (
    <div
      className="absolute z-40 w-72 text-xs text-plt-text backdrop-blur-2xl border border-white/[0.16] bg-plt-card/95 p-3.5 rounded-2xl shadow-popover animate-in fade-in zoom-in-95 duration-100 select-none"
      style={{ left: orderDraft.x, top: orderDraft.y }}
    >
      <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div>
          <div className="font-bold text-xs text-plt-text">Open Long Position</div>
          <div className="text-[10px] text-plt-muted font-mono">{symbol.replace('.CA', '')} • {orderDraft.date}</div>
        </div>
        <button
          type="button"
          aria-label="Close order popover"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-plt-muted transition-colors hover:bg-white/[0.08] hover:text-plt-text cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="text-[10px] uppercase font-semibold text-plt-muted font-sans block">
          Entry Price
          <input
            type="number"
            step="0.01"
            value={orderDraft.entryPrice}
            onChange={(event) =>
              onUpdateDraft((current) => (current ? { ...current, entryPrice: event.target.value } : current))
            }
            className="h-8 w-full mt-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-2.5 text-xs font-mono font-semibold text-plt-text outline-none focus:border-plt-border-active"
          />
        </label>
        <label className="text-[10px] uppercase font-semibold text-plt-muted font-sans block">
          Quantity
          <input
            type="number"
            step="1"
            min="1"
            value={orderDraft.quantity}
            onChange={(event) =>
              onUpdateDraft((current) => (current ? { ...current, quantity: event.target.value } : current))
            }
            className="h-8 w-full mt-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-2.5 text-xs font-mono font-semibold text-plt-text outline-none focus:border-plt-border-active"
          />
        </label>
        <label className="text-[10px] uppercase font-semibold text-plt-profit/80 font-sans block">
          Target Price
          <input
            type="number"
            step="0.01"
            value={orderDraft.targetPrice}
            placeholder={orderDraft.loadingLevels ? 'Loading' : 'Optional'}
            onChange={(event) =>
              onUpdateDraft((current) => (current ? { ...current, targetPrice: event.target.value } : current))
            }
            className="h-8 w-full mt-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-2.5 text-xs font-mono font-semibold text-plt-profit outline-none focus:border-plt-border-active"
          />
        </label>
        <label className="text-[10px] uppercase font-semibold text-plt-risk/80 font-sans block">
          Stop Loss
          <input
            type="number"
            step="0.01"
            value={orderDraft.stopPrice}
            placeholder={orderDraft.loadingLevels ? 'Loading' : 'Optional'}
            onChange={(event) =>
              onUpdateDraft((current) => (current ? { ...current, stopPrice: event.target.value } : current))
            }
            className="h-8 w-full mt-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-2.5 text-xs font-mono font-semibold text-plt-risk outline-none focus:border-plt-border-active"
          />
        </label>
      </div>

      {(orderDraft.targetLabel || orderDraft.stopLabel || orderError) && (
        <div className="mt-2 text-[10px] font-mono text-plt-muted">
          {[orderDraft.targetLabel, orderDraft.stopLabel].filter(Boolean).join(' • ')}
          {orderError && <div className="mt-1 text-plt-risk">{orderError}</div>}
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={savingOrder}
        className="w-full h-8 mt-3 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-98"
      >
        {savingOrder ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Saving Position...</span>
          </>
        ) : (
          <span>Save Position</span>
        )}
      </button>
    </div>
  );
}
