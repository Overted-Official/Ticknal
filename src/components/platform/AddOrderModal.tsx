'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';

export type InitialOrderData = {
  symbol: string;
  companyName?: string;
  signal?: string; // e.g. 'BUY' or 'SELL'
  price?: number;
  date?: string;
};

export default function AddOrderModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialData
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess?: () => void;
  initialData?: InitialOrderData | null;
}) {
  const [newOrderForm, setNewOrderForm] = useState({ 
    symbol: '', 
    entryDate: new Date().toISOString().split('T')[0], 
    entryPrice: '', 
    quantity: '100' 
  });

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewOrderForm({
        symbol: initialData?.symbol || '',
        entryDate: initialData?.date || new Date().toISOString().split('T')[0],
        entryPrice: initialData?.price ? initialData.price.toString() : '',
        quantity: '100'
      });
    }
  }, [isOpen, initialData]);

  const handleAddOrder = async () => {
    if (!newOrderForm.symbol || !newOrderForm.entryPrice) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newOrderForm.symbol,
          entryDate: newOrderForm.entryDate,
          entryPrice: Number(newOrderForm.entryPrice),
          quantity: Number(newOrderForm.quantity)
        }),
      });
      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('Failed to add order');
      }
    } catch (e) {
      console.error(e);
      alert('Error adding order');
    }
  };

  if (!isOpen) return null;

  const isBuy = initialData?.signal === 'BUY';
  const isSell = initialData?.signal === 'SELL' || initialData?.signal?.startsWith('SELL_');
  const title = isBuy ? 'Long Position' : isSell ? 'Short Position' : 'New Order';

  const entryPriceNum = Number(newOrderForm.entryPrice) || 0;
  const quantityNum = Number(newOrderForm.quantity) || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-tv-base border border-tv-border rounded-tv-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-tv-border bg-tv-surface shrink-0">
          <span className="font-weight-medium text-tv-text">{title}</span>
          <button onClick={onClose} className="text-tv-muted hover:text-tv-text transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Ticker Section */}
          <div className="flex justify-between items-end border-b border-tv-border pb-3">
            {initialData?.companyName ? (
              <div>
                <h3 className="text-xl font-weight-medium text-tv-text">{initialData.symbol}</h3>
                <p className="text-xs text-tv-muted truncate max-w-[200px]">{initialData.companyName}</p>
              </div>
            ) : (
              <div className="w-full">
                <label className="block text-[10px] uppercase text-tv-muted mb-1.5">Ticker Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. CIEB"
                  value={newOrderForm.symbol}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-3 py-2 text-sm text-tv-text font-weight-medium focus:outline-none focus:border-tv-accent transition-colors"
                />
              </div>
            )}
          </div>

          {/* Entry Info */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase text-tv-muted mb-1">Entry Date</label>
              <input
                type="date"
                value={newOrderForm.entryDate}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, entryDate: e.target.value })}
                className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-2 py-1 text-sm text-tv-text focus:outline-none focus:border-tv-accent transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase text-tv-muted mb-1">Entry Price</label>
              <div className="flex items-center bg-tv-surface border border-tv-border rounded-tv-sm px-2 focus-within:border-tv-accent transition-colors">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newOrderForm.entryPrice}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, entryPrice: e.target.value })}
                  className="w-full bg-transparent py-1 text-sm text-tv-text focus:outline-none"
                />
                <span className="ml-1 text-xs text-tv-muted">EGP</span>
              </div>
            </div>
          </div>
          
          {/* Estimates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-tv-muted mb-1">Target (Est.)</label>
              <div className="text-tv-up text-sm font-weight-medium">
                {(entryPriceNum * 1.15).toFixed(2)} EGP
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-tv-muted mb-1">Stop (Est.)</label>
              <div className="text-tv-down text-sm font-weight-medium">
                {(entryPriceNum * 0.95).toFixed(2)} EGP
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-weight-medium text-tv-muted uppercase mb-1.5">Quantity (Shares)</label>
            <input
              type="number"
              value={newOrderForm.quantity}
              onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value })}
              className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-3 py-2 text-sm text-tv-text focus:outline-none focus:border-tv-accent transition-colors"
              min="1"
            />
          </div>

          {/* Required Margin */}
          <div className="bg-tv-surface rounded-tv-sm p-3 flex justify-between items-center text-xs border border-tv-border">
            <span className="text-tv-muted">Required Margin</span>
            <span className="font-weight-medium text-tv-text">
              {(entryPriceNum * quantityNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 shrink-0">
          <button
            onClick={handleAddOrder}
            className={`w-full py-2.5 rounded-tv-sm font-weight-medium text-sm transition-colors ${
              isBuy 
                ? 'bg-tv-up hover:bg-tv-up/90 text-black shadow-[0_0_15px_rgba(0,255,167,0.3)]' 
                : isSell 
                  ? 'bg-tv-down hover:bg-tv-down/90 text-white shadow-[0_0_15px_rgba(255,82,82,0.3)]'
                  : 'bg-tv-accent hover:bg-tv-accent/90 text-white shadow-[0_0_10px_rgba(41,98,255,0.3)]'
            }`}
          >
            {isBuy || isSell ? 'Place Order' : 'Save Order'}
          </button>
        </div>

      </div>
    </div>
  );
}
