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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-plt-surface border border-plt-border rounded-tv-lg shadow-2xl w-full max-w-sm overflow-visible animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-plt-border bg-plt-card shrink-0">
          <span className="font-weight-medium text-plt-text">Edit {order.tickerSymbol} Position</span>
          <button onClick={onClose} className="text-plt-muted hover:text-plt-text transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs text-plt-muted mb-1 block">Entry Date</label>
            <input 
              type="date"
              className="w-full bg-plt-card border border-plt-border rounded-tv-sm px-2 py-1.5 text-sm text-plt-text outline-none focus:border-plt-border-active transition-colors"
              value={form.entryDate}
              onChange={e => setForm({ ...form, entryDate: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-plt-muted mb-1 block">Entry Price (EGP)</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                className="w-full bg-plt-card border border-plt-border rounded-tv-sm px-2 py-1.5 text-sm text-plt-text outline-none focus:border-plt-border-active transition-colors text-right"
                value={form.entryPrice}
                onChange={e => setForm({ ...form, entryPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-plt-muted mb-1 block">Quantity</label>
              <input 
                type="number"
                min="1"
                className="w-full bg-plt-card border border-plt-border rounded-tv-sm px-2 py-1.5 text-sm text-plt-text outline-none focus:border-plt-border-active transition-colors text-right"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-plt-border flex justify-end gap-2 bg-plt-card shrink-0">
          <button 
            className="px-4 py-1.5 text-xs text-plt-muted hover:text-plt-text transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-1.5 text-xs font-weight-medium text-white bg-plt-red rounded-tv-sm hover:bg-plt-red-hover transition-colors flex items-center gap-2 shadow-md"
            onClick={handleEditOrder}
            disabled={!form.entryPrice || !form.quantity || Number(form.quantity) <= 0}
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
