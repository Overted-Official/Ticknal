'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

type OrderRow = {
  id: number;
  tickerSymbol: string;
  quantity: number;
  entryPrice: number;
  entryDate: string;
};

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: OrderRow | null;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order
}: EditOrderModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    entryDate: '',
    entryPrice: '',
    quantity: ''
  });

  useEffect(() => {
    if (order) {
      setTimeout(() => {
        setForm({
          entryDate: order.entryDate || new Date().toISOString().split('T')[0],
          entryPrice: order.entryPrice ? order.entryPrice.toString() : '',
          quantity: order.quantity ? order.quantity.toString() : ''
        });
      }, 0);
    }
  }, [order]);

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

  const handleEditOrder = async () => {
    if (!order || !form.entryPrice || !form.quantity) return;
    try {
      const res = await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          entryDate: form.entryDate,
          entryPrice: Number(form.entryPrice),
          quantity: Number(form.quantity)
        }),
      });
      if (res.ok) {
        toast.success('Position Updated', `Updated ${order.tickerSymbol} successfully.`);
        onSuccess();
        onClose();
      } else {
        toast.error('Update Failed', 'Failed to edit position.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'Error editing position.');
    }
  };

  if (!isOpen || !order) return null;

  const entryPriceNum = parseFloat(form.entryPrice) || 0;
  const quantityNum = parseFloat(form.quantity) || 0;

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
                <h2 className="text-xs font-bold text-plt-text tracking-tight font-sans">Edit {order.tickerSymbol.replace('.CA', '')} Position</h2>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Modify entry price, quantity, or date</p>
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
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Entry Date</label>
                <input
                  type="date"
                  className="date-token"
                  value={form.entryDate}
                  onChange={e => setForm({ ...form, entryDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Entry Price</label>
                  <div className="flex items-center h-8 rounded-xl bg-plt-surface border border-plt-border px-3 focus-within:border-plt-border-active transition-all">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-transparent text-xs text-plt-text font-mono focus:outline-none"
                      value={form.entryPrice}
                      onChange={e => setForm({ ...form, entryPrice: e.target.value })}
                    />
                    <span className="ml-2 text-[11px] text-plt-muted font-sans">EGP</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="input-token"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
              </div>

              {/* Estimated Value */}
              <div className="card-widget-compact flex justify-between items-center text-xs">
                <span className="kpi-title">Total Position Cost</span>
                <span className="kpi-value text-plt-text font-bold">
                  {(entryPriceNum * quantityNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
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
                onClick={handleEditOrder}
                className="btn-token btn-primary btn-compact flex-1 font-sans"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
