'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-tv-base border border-tv-border rounded-tv-lg shadow-2xl w-full max-w-sm overflow-visible animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border bg-tv-surface shrink-0">
          <span className="font-weight-medium text-tv-text">Close {order.tickerSymbol} Position</span>
          <button onClick={onClose} className="text-tv-muted hover:text-tv-text transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-tv-muted mb-1 block">Close Date</label>
              <input 
                type="date"
                className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-2 py-1.5 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors"
                value={form.exitDate}
                onChange={e => setForm({ ...form, exitDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-tv-muted mb-1 block">Close Price (£)</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-2 py-1.5 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors text-right"
                value={form.exitPrice}
                onChange={e => setForm({ ...form, exitPrice: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-tv-muted mb-1 block">Units to Sell (Max {order.quantity})</label>
            <input 
              type="number"
              min="1"
              max={order.quantity}
              className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-3 py-2 text-sm text-tv-text outline-none focus:border-tv-accent transition-colors"
              value={form.quantityToClose}
              onChange={e => {
                const val = Number(e.target.value);
                if (val > order.quantity) {
                  setForm({ ...form, quantityToClose: order.quantity.toString() });
                } else {
                  setForm({ ...form, quantityToClose: e.target.value });
                }
              }}
            />
            {Number(form.quantityToClose) > 0 && Number(form.quantityToClose) < order.quantity && (
              <p className="mt-2 text-xs text-[#E1B000]">
                Closing {form.quantityToClose} units will leave {order.quantity - Number(form.quantityToClose)} units open.
              </p>
            )}
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
            className="px-4 py-1.5 text-xs font-weight-medium text-white bg-tv-down rounded-tv-sm hover:opacity-90 transition-opacity flex items-center gap-2"
            onClick={handleCloseOrder}
            disabled={!form.exitPrice || !form.quantityToClose || Number(form.quantityToClose) <= 0}
          >
            Confirm Close
          </button>
        </div>

      </div>
    </div>
  );
}
