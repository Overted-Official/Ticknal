'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

export type CloseOrderRow = {
  id: number;
  tickerSymbol: string;
  quantity: number;
  currentPrice: number;
  entryPrice?: number;
  companyName?: string;
  logoUrl?: string | null;
  sector?: string;
};

interface CloseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: CloseOrderRow | null;
}

export default function CloseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: CloseOrderModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    exitDate: new Date().toISOString().split('T')[0],
    exitPrice: '',
    quantityToClose: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && order) {
      setForm({
        exitDate: new Date().toISOString().split('T')[0],
        exitPrice: order.currentPrice ? String(order.currentPrice) : '',
        quantityToClose: order.quantity ? String(order.quantity) : '1',
      });
      setIsSubmitting(false);
    }
  }, [isOpen, order]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanSymbol = order?.tickerSymbol?.replace('.CA', '').trim().toUpperCase() || '';
  const exitPriceNum = parseFloat(form.exitPrice) || 0;
  const quantityNum = parseFloat(form.quantityToClose) || 0;
  const totalProceeds = exitPriceNum * quantityNum;

  const realizedPl = order?.entryPrice ? (exitPriceNum - order.entryPrice) * quantityNum : null;
  const realizedPlPct = order?.entryPrice && order.entryPrice > 0 ? ((exitPriceNum - order.entryPrice) / order.entryPrice) * 100 : null;

  const handleCloseOrder = async () => {
    if (!order || !form.exitPrice || !form.quantityToClose || isSubmitting) return;

    if (quantityNum <= 0 || quantityNum > order.quantity) {
      toast.error('Invalid Quantity', `Quantity must be between 1 and ${order.quantity}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: order.id,
          exitDate: form.exitDate,
          exitPrice: exitPriceNum,
          quantityToClose: quantityNum,
        }),
      });

      if (res.ok) {
        toast.success(
          'Position Closed',
          `Closed ${quantityNum} share(s) of ${cleanSymbol} at ${exitPriceNum.toFixed(2)} EGP.`
        );
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        toast.error('Close Failed', data?.error || 'Failed to close position.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'An error occurred while closing position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen || !order) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="close-order-modal-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            aria-label="Close modal overlay"
          />

          {/* Centered Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full max-w-lg bg-black text-text-primary rounded-xl border border-border-subtle shadow-2xl flex flex-col z-10 max-h-[90vh] overflow-hidden"
          >
            {/* Header: Clean Black Surface */}
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between shrink-0 bg-black">
              <div className="flex flex-col min-w-0">
                <h2 className="font-semibold text-base text-text-primary tracking-tight truncate font-sans">
                  Close {cleanSymbol} Position
                </h2>
                <p className="text-xs text-text-muted font-normal mt-0.5 font-sans">
                  Realize gains or losses for lot #{order.id}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-surface-raised transition cursor-pointer"
                title="Close (Esc)"
                aria-label="Close Modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body (Scrollable Form Fields) */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              {/* 1. Asset Identity Card */}
              <div className="space-y-1.5">
                <label className="field-label">Asset Identity</label>
                <div className="field-card">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circular Logo */}
                    <div className="w-10 h-10 rounded-full bg-white border border-border-default p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {order.logoUrl ? (
                        <img
                          src={order.logoUrl}
                          alt={cleanSymbol}
                          className="w-full h-full object-contain rounded-full"
                        />
                      ) : (
                        <span className="text-xs font-bold font-sans text-zinc-900">{cleanSymbol.slice(0, 2)}</span>
                      )}
                    </div>

                    {/* Ticker & Full Name Details */}
                    <div className="flex flex-col min-w-0 justify-center">
                      <span className="text-sm font-semibold text-text-primary truncate font-sans" title={order.companyName || cleanSymbol}>
                        {order.companyName || cleanSymbol}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400 min-w-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-surface-raised text-text-primary border border-border-subtle tracking-wider shrink-0">
                          {cleanSymbol}
                        </span>
                        {order.sector && (
                          <>
                            <span className="text-zinc-600 text-[10px] shrink-0">•</span>
                            <span className="truncate max-w-[150px] sm:max-w-xs font-sans">{order.sector}</span>
                          </>
                        )}
                        <span className="text-zinc-600 text-[10px] shrink-0">•</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 font-sans shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          EGX
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Order Parameters Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Exit Date */}
                <div className="space-y-1.5">
                  <label className="field-label">Exit Date</label>
                  <input
                    type="date"
                    value={form.exitDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, exitDate: e.target.value }))}
                    className="field-date-input"
                  />
                </div>

                {/* Quantity to Close */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="field-label">Units to Close</label>
                    <span className="text-[10px] text-text-muted font-sans tabular-nums">
                      Max: {order.quantity}
                    </span>
                  </div>
                  <div className="field-group">
                    <input
                      type="number"
                      min="1"
                      max={order.quantity}
                      step="1"
                      placeholder="1"
                      value={form.quantityToClose}
                      onChange={(e) => setForm((prev) => ({ ...prev, quantityToClose: e.target.value }))}
                      className="field-input"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, quantityToClose: String(order.quantity) }))}
                      className="px-2 py-0.5 text-[10px] font-semibold text-brand-blue hover:opacity-80 transition cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Exit Price */}
              <div className="space-y-1.5">
                <label className="field-label">Exit Price (EGP)</label>
                <div className="field-group">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.exitPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, exitPrice: e.target.value }))}
                    className="field-input"
                  />
                  <span className="field-suffix shrink-0">EGP</span>
                </div>
              </div>

              {/* 3. Summary Card */}
              <div className="field-card space-y-2 select-none">
                <div className="flex items-center justify-between">
                  <span className="field-label">Total Realized Proceeds</span>
                  <span className="text-base font-bold text-text-primary font-sans tabular-nums">
                    {totalProceeds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                  </span>
                </div>

                {realizedPl !== null && quantityNum > 0 && (
                  <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-sans">Estimated Realized P/L:</span>
                    <div className="flex items-center gap-1.5 font-sans tabular-nums">
                      <span className={`font-semibold ${realizedPl >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                        {realizedPl >= 0 ? '+' : ''}{realizedPl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                      </span>
                      {realizedPlPct !== null && (
                        <span className={`text-[11px] font-medium ${realizedPl >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                          ({realizedPlPct >= 0 ? '+' : ''}{realizedPlPct.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 border-t border-border-subtle bg-black flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-text-muted hover:text-white hover:bg-surface-raised transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseOrder}
                disabled={isSubmitting || !form.exitPrice || !form.quantityToClose || quantityNum <= 0 || quantityNum > order.quantity}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-loss-num hover:opacity-90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Confirm Close'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
