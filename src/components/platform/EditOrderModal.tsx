'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

export type EditOrderRow = {
  id: number;
  tickerSymbol: string;
  quantity: number;
  entryPrice: number;
  entryDate: string;
  companyName?: string;
  logoUrl?: string | null;
  sector?: string;
};

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: EditOrderRow | null;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: EditOrderModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    entryDate: '',
    entryPrice: '',
    quantity: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (order) {
      setForm({
        entryDate: order.entryDate || new Date().toISOString().split('T')[0],
        entryPrice: order.entryPrice ? String(order.entryPrice) : '',
        quantity: order.quantity ? String(order.quantity) : '',
      });
      setIsSubmitting(false);
    }
  }, [order]);

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
  const entryPriceNum = parseFloat(form.entryPrice) || 0;
  const quantityNum = parseFloat(form.quantity) || 0;
  const totalCost = entryPriceNum * quantityNum;

  const handleEditOrder = async () => {
    if (!order || !form.entryPrice || !form.quantity || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          entryDate: form.entryDate,
          entryPrice: Number(form.entryPrice),
          quantity: Number(form.quantity),
        }),
      });

      if (res.ok) {
        toast.success('Position Updated', `Updated lot #${order.id} for ${cleanSymbol} successfully.`);
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        toast.error('Update Failed', data?.error || 'Failed to edit position.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'Error editing position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen || !order) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="edit-order-modal-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
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
                  Edit {cleanSymbol} Position
                </h2>
                <p className="text-xs text-text-muted font-normal mt-0.5 font-sans">
                  Modify entry parameters for lot #{order.id}
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
                <div className="field-card flex items-center justify-between gap-3">
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
                        <span className="badge-symbol">
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

                  <span className="badge-count text-[11px]">
                    Lot #{order.id}
                  </span>
                </div>
              </div>

              {/* 2. Order Parameters Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Entry Date */}
                <div className="space-y-1.5">
                  <label className="field-label">Entry Date</label>
                  <input
                    type="date"
                    value={form.entryDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                    className="field-date-input"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="field-label"># of Units (Shares)</label>
                  <div className="field-group">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      value={form.quantity}
                      onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      className="field-input"
                    />
                    <span className="field-suffix shrink-0">Units</span>
                  </div>
                </div>
              </div>

              {/* Entry Price */}
              <div className="space-y-1.5">
                <label className="field-label">Entry Price (EGP)</label>
                <div className="field-group">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.entryPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, entryPrice: e.target.value }))}
                    className="field-input"
                  />
                  <span className="field-suffix shrink-0">EGP</span>
                </div>
              </div>

              {/* 3. Summary Card */}
              <div className="field-card space-y-2 select-none">
                <div className="flex items-center justify-between">
                  <span className="field-label">Total Position Cost</span>
                  <span className="text-base font-bold text-text-primary font-sans tabular-nums">
                    {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                  </span>
                </div>
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
                onClick={handleEditOrder}
                disabled={isSubmitting || !form.entryPrice || !form.quantity || quantityNum <= 0 || entryPriceNum <= 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-blue hover:opacity-90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
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
