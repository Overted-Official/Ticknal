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
      setForm({
        entryDate: order.entryDate || new Date().toISOString().split('T')[0],
        entryPrice: order.entryPrice ? order.entryPrice.toString() : '',
        quantity: order.quantity ? order.quantity.toString() : ''
      });
    }
  }, [isOpen, order]);

  const handleEditOrder = async () => {
    if (!order || !form.entryPrice || !form.quantity) return;
    try {
      const res = await fetch('/api/orders', {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-tv-base border border-tv-border rounded-tv-lg shadow-2xl w-full max-w-sm overflow-visible animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border bg-tv-surface shrink-0">
          <span className="font-weight-medium text-tv-text">Edit {order.tickerSymbol} Position</span>
          <button onClick={onClose} className="text-tv-muted hover:text-tv-text transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs text-tv-muted mb-1 block">Entry Date</label>
            <input 
              type="date"
              className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-2 py-1.5 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors"
              value={form.entryDate}
              onChange={e => setForm({ ...form, entryDate: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-tv-muted mb-1 block">Entry Price (£)</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-2 py-1.5 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors text-right"
                value={form.entryPrice}
                onChange={e => setForm({ ...form, entryPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-tv-muted mb-1 block">Quantity</label>
              <input 
                type="number"
                min="1"
                className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-2 py-1.5 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors text-right"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-tv-border flex justify-end gap-2 bg-tv-surface shrink-0">
          <button 
            className="px-4 py-1.5 text-xs text-tv-muted hover:text-tv-text transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-1.5 text-xs font-weight-medium text-white bg-tv-accent rounded-tv-sm hover:opacity-90 transition-opacity flex items-center gap-2"
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
