'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';
import { motion } from 'framer-motion';

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
        alert('Failed to close order');
      }
    } catch (e) {
      console.error(e);
      alert('Error closing order');
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-xl shadow-2xl w-full max-w-sm overflow-visible flex flex-col text-white bg-[#141414]/95 backdrop-blur-2xl border border-white/[0.12]"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]" />
            <span className="font-semibold text-white text-sm">Close {order.tickerSymbol.replace('.CA', '')} Position</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-4 font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Close Date</label>
              <input 
                type="date"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20 transition-all"
                value={form.exitDate}
                onChange={e => setForm({ ...form, exitDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Close Price</label>
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 focus-within:border-white/20 transition-all">
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
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-white/20 transition-all"
              value={form.quantityToClose}
              onChange={e => setForm({ ...form, quantityToClose: e.target.value })}
            />
            <span className="text-[10px] text-white/40 mt-1 block font-sans">Available: {order.quantity} shares</span>
          </div>

          {/* Close Proceeds */}
          <div className="bg-white/[0.03] rounded-xl p-3 flex justify-between items-center text-xs border border-white/[0.06]">
            <span className="text-white/40 font-sans text-[11px]">Total Proceeds</span>
            <span className="font-bold text-white">
              {((parseFloat(form.exitPrice) || 0) * (parseFloat(form.quantityToClose) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
            </span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 pt-0 shrink-0 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-semibold text-xs transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCloseOrder}
            className="flex-1 py-2.5 rounded-full bg-plt-orange hover:bg-plt-orange-hover text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(255,100,13,0.3)]"
          >
            Confirm Close
          </button>
        </div>

      </motion.div>
    </div>
  );
}
