'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

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
        onSuccess();
        onClose();
      } else {
        alert('Failed to close position');
      }
    } catch (e) {
      console.error(e);
      alert('Error closing position');
    }
  };

  if (!isOpen || !order) return null;

  const exitPriceNum = parseFloat(form.exitPrice) || 0;
  const quantityNum = parseFloat(form.quantityToClose) || 0;

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
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <div>
                  <h2 className="font-semibold text-white text-sm">Close {order.tickerSymbol.replace('.CA', '')} Position</h2>
                  <p className="text-[11px] text-white/40 mt-0.5">Realize gains or losses for this lot</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Close Date</label>
                  <input 
                    type="date"
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-white/20 transition-all"
                    value={form.exitDate}
                    onChange={e => setForm({ ...form, exitDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Close Price</label>
                  <div className="flex items-center bg-white/[0.04] border border-white/[0.09] rounded-md px-3 focus-within:border-white/20 transition-all">
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-transparent py-2 text-xs text-white font-semibold outline-none text-right"
                      value={form.exitPrice}
                      onChange={e => setForm({ ...form, exitPrice: e.target.value })}
                    />
                    <span className="ml-1 text-[10px] text-white/40">EGP</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Quantity to Close</label>
                <input 
                  type="number"
                  min="1"
                  max={order.quantity}
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md px-3 py-2 text-xs font-semibold text-white outline-none focus:border-white/20 transition-all"
                  value={form.quantityToClose}
                  onChange={e => setForm({ ...form, quantityToClose: e.target.value })}
                />
                <span className="text-[10px] text-white/40 mt-1 block font-sans">Available in lot: {order.quantity} shares</span>
              </div>

              {/* Close Proceeds */}
              <div className="bg-white/[0.03] rounded-md p-3.5 flex justify-between items-center text-xs border border-white/[0.09]">
                <span className="text-white/40 font-sans text-[11px]">Total Proceeds</span>
                <span className="font-bold text-white text-sm">
                  {(exitPriceNum * quantityNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
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
                onClick={handleCloseOrder}
                className="flex-1 py-2.5 rounded-md bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-semibold text-xs transition-all shadow-md"
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
