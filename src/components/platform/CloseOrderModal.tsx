'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

type OrderRow = {
  id: number;
  tickerSymbol: string;
  quantity: number;
  currentPrice: number;
};

export default function CloseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: OrderRow | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    exitDate: new Date().toISOString().split('T')[0],
    exitPrice: '',
    quantityToClose: ''
  });

  useEffect(() => {
    if (isOpen && order) {
      setTimeout(() => {
        setForm({
          exitDate: new Date().toISOString().split('T')[0],
          exitPrice: order.currentPrice ? order.currentPrice.toString() : '',
          quantityToClose: order.quantity ? order.quantity.toString() : '1'
        });
      }, 0);
    }
  }, [isOpen, order]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCloseOrder = async () => {
    if (!order || !form.exitPrice || !form.quantityToClose) return;
    try {
      const res = await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'CLOSED',
          exitDate: form.exitDate,
          exitPrice: Number(form.exitPrice),
          quantityToClose: Number(form.quantityToClose)
        }),
      });
      if (res.ok) {
        toast.success('Position Closed', `Closed ${order.tickerSymbol} at ${Number(form.exitPrice).toLocaleString()} EGP.`);
        onSuccess();
        onClose();
      } else {
        toast.error('Close Failed', 'Failed to close position.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'Error closing position.');
    }
  };

  if (!isOpen || !order) return null;

  const exitPriceNum = parseFloat(form.exitPrice) || 0;
  const quantityNum = parseFloat(form.quantityToClose) || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-plt-base/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-modal-content w-full max-w-md bg-plt-base border-l border-plt-border-soft shadow-2xl h-full flex flex-col text-plt-text select-none"
          >
            {/* Header */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-plt-border-soft bg-plt-card shrink-0">
              <div>
                <h2 className="text-xs font-bold text-plt-text tracking-tight font-sans">Close {order.tickerSymbol.replace('.CA', '')} Position</h2>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Realize gains or losses for this lot</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 tabular-nums custom-scrollbar text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Close Date</label>
                  <input
                    type="date"
                    className="date-token"
                    value={form.exitDate}
                    onChange={e => setForm({ ...form, exitDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Close Price</label>
                  <div className="flex items-center h-8 rounded-xl bg-plt-surface border border-plt-border px-3 focus-within:border-plt-border-active transition-all">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-transparent text-xs text-plt-text font-mono focus:outline-none text-right"
                      value={form.exitPrice}
                      onChange={e => setForm({ ...form, exitPrice: e.target.value })}
                    />
                    <span className="ml-2 text-[11px] text-plt-muted font-sans">EGP</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Quantity to Close</label>
                <input
                  type="number"
                  min="1"
                  max={order.quantity}
                  className="input-token"
                  value={form.quantityToClose}
                  onChange={e => setForm({ ...form, quantityToClose: e.target.value })}
                />
                <span className="text-[11px] text-plt-muted font-sans block">Available in lot: {order.quantity} shares</span>
              </div>

              {/* Close Proceeds */}
              <div className="card-widget-compact flex justify-between items-center text-xs">
                <span className="kpi-title">Total Proceeds</span>
                <span className="kpi-value text-plt-profit">
                  {(exitPriceNum * quantityNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-plt-border-soft bg-plt-card shrink-0 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-token btn-secondary btn-compact flex-1 font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseOrder}
                className="btn-token btn-compact flex-1 bg-plt-profit hover:bg-plt-profit/90 text-plt-inverse font-semibold font-sans shadow-md"
              >
                Confirm Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
