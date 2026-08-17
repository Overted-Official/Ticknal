'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';
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
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-over Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-[101] w-full max-w-md bg-black border-l border-white/[0.09] shadow-2xl h-full flex flex-col text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.09] bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-plt-orange" />
                <div>
                  <h2 className="font-semibold text-white text-sm">Edit {order.tickerSymbol.replace('.CA', '')} Position</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">Modify entry price, quantity, or date</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="text-white/40 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/[0.06]"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 font-mono">
              <div>
                <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Entry Date</label>
                <input 
                  type="date"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-white/20 transition-all"
                  value={form.entryDate}
                  onChange={e => setForm({ ...form, entryDate: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Entry Price</label>
                  <div className="flex items-center bg-white/[0.04] border border-white/[0.09] rounded-md px-3 focus-within:border-white/20 transition-all">
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-transparent py-2 text-xs text-white font-semibold outline-none"
                      value={form.entryPrice}
                      onChange={e => setForm({ ...form, entryPrice: e.target.value })}
                    />
                    <span className="ml-1 text-[10px] text-white/40">EGP</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md px-3 py-2 text-xs font-semibold text-white outline-none focus:border-white/20 transition-all"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Estimated Value */}
              <div className="bg-white/[0.03] rounded-md p-3.5 flex justify-between items-center text-xs border border-white/[0.09]">
                <span className="text-white/40 font-sans text-[11px]">Total Position Cost</span>
                <span className="font-bold text-white text-sm">
                  {(entryPriceNum * quantityNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                </span>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-5 border-t border-white/[0.09] bg-white/[0.02] shrink-0 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-md border border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-medium text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditOrder}
                className="flex-1 py-2.5 rounded-md bg-plt-orange hover:bg-plt-orange-hover text-white font-medium text-xs transition-all shadow-md"
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
