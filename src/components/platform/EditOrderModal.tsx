'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';

type OrderRow = {
  id: number;
  tickerSymbol: string;
  quantity: number;
  entryPrice: number;
  entryDate: string;
};

export default function EditOrderModal({ 
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
    entryDate: '', 
    entryPrice: '', 
    quantity: ''
  });

  useEffect(() => {
    if (isOpen && order) {
      setTimeout(() => {
        setForm({
          entryDate: order.entryDate || new Date().toISOString().split('T')[0],
          entryPrice: order.entryPrice ? order.entryPrice.toString() : '',
          quantity: order.quantity ? order.quantity.toString() : ''
        });
      }, 0);
    }
  }, [isOpen, order]);

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
        onSuccess();
        onClose();
      } else {
        alert('Failed to edit order');
      }
    } catch (e) {
      console.error(e);
      alert('Error editing order');
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 animate-in fade-in duration-150">
      <div className="bg-[#141414]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl w-full max-w-sm overflow-visible animate-in zoom-in-95 duration-150 flex flex-col text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
          <span className="font-semibold text-white text-sm">Edit {order.tickerSymbol.replace('.CA', '')} Position</span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-4 font-mono">
          <div>
            <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Entry Date</label>
            <input 
              type="date"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20 transition-all"
              value={form.entryDate}
              onChange={e => setForm({ ...form, entryDate: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 block font-sans">Entry Price</label>
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 focus-within:border-white/20 transition-all">
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
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-white/20 transition-all"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
          
          {/* Estimated Value */}
          <div className="bg-white/[0.03] rounded-xl p-3 flex justify-between items-center text-xs border border-white/[0.06]">
            <span className="text-white/40 font-sans text-[11px]">Total Position Cost</span>
            <span className="font-bold text-white">
              {((parseFloat(form.entryPrice) || 0) * (parseFloat(form.quantity) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
            </span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 pt-0 shrink-0 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-semibold text-xs transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleEditOrder}
            className="flex-1 py-2.5 rounded-xl bg-plt-orange hover:bg-plt-orange-hover text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(255,100,13,0.3)]"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
