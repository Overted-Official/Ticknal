'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

export type InitialOrderData = {
  symbol: string;
  companyName?: string;
  signal?: string; // e.g. 'BUY' or 'SELL'
  price?: number;
  date?: string;
};

type Ticker = { symbol: string; companyName: string };

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
  const { toast } = useToast();
  const [newOrderForm, setNewOrderForm] = useState({
    symbol: '',
    entryDate: new Date().toISOString().split('T')[0],
    entryPrice: '',
    quantity: '100'
  });

  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [filteredTickers, setFilteredTickers] = useState<Ticker[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Sync initialData when modal opens, and fetch tickers
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setNewOrderForm({
          symbol: initialData?.symbol || '',
          entryDate: initialData?.date || new Date().toISOString().split('T')[0],
          entryPrice: initialData?.price ? initialData.price.toString() : '',
          quantity: '100'
        });
        setIsSearchOpen(false);
      }, 0);

      fetch('/api/tickers')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTickers(data);
            setFilteredTickers(data.slice(0, 50));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, initialData]);

  const handleSymbolChange = (val: string) => {
    const sym = val.toUpperCase();
    setNewOrderForm(prev => ({ ...prev, symbol: sym }));
    if (!sym) {
      setFilteredTickers(tickers.slice(0, 50));
    } else {
      const filtered = tickers.filter(
        t => t.symbol.toLowerCase().includes(val.toLowerCase()) ||
             t.companyName.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 50);
      setFilteredTickers(filtered);
    }
    setIsSearchOpen(true);
  };

  const handleSelectTicker = (ticker: Ticker) => {
    setNewOrderForm(prev => ({ ...prev, symbol: ticker.symbol }));
    setIsSearchOpen(false);
  };

  const handleAddOrder = async () => {
    if (!newOrderForm.symbol || !newOrderForm.entryPrice) return;
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newOrderForm.symbol,
          entryDate: newOrderForm.entryDate,
          entryPrice: Number(newOrderForm.entryPrice),
          quantity: Number(newOrderForm.quantity)
        })
      });
      if (res.ok) {
        toast.success('Position Added', `${newOrderForm.symbol} position created successfully.`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error('Position Failed', 'Failed to add position.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error', 'Error adding position.');
    }
  };

  const entryPriceNum = parseFloat(newOrderForm.entryPrice) || 0;
  const quantityNum = parseFloat(newOrderForm.quantity) || 0;

  const isBuy = initialData?.signal === 'BUY';
  const isSell = initialData?.signal && initialData.signal.includes('SELL');
  const title = isBuy ? `Buy ${initialData?.symbol.replace('.CA', '') || ''} Position` : isSell ? `Exit ${initialData?.symbol.replace('.CA', '') || ''} Position` : 'Add Tracked Position';

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
                <h2 className="text-xs font-bold text-plt-text tracking-tight font-sans">{title}</h2>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Record a new lot or stock entry</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body (Scrollable) */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 tabular-nums custom-scrollbar text-xs">
              {/* Ticker Section */}
              <div className="border-b border-plt-border-soft pb-3 relative" ref={searchRef}>
                {initialData?.companyName ? (
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-plt-text font-mono">{initialData.symbol.replace('.CA', '')}</h3>
                    <p className="text-xs text-plt-muted truncate max-w-70 font-sans mt-0.5">{initialData.companyName}</p>
                  </div>
                ) : (
                  <div className="w-full relative font-sans space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted">Ticker Symbol</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-plt-muted">
                        <Search size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="Search tickers..."
                        value={newOrderForm.symbol}
                        onChange={(e) => handleSymbolChange(e.target.value)}
                        onFocus={() => setIsSearchOpen(true)}
                        className="h-8 w-full rounded-xl bg-plt-card border border-plt-border-soft pl-8 pr-3 text-xs font-sans text-plt-text focus:border-plt-border-active focus:outline-none"
                      />
                    </div>
                    {/* Search Dropdown */}
                    {isSearchOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-plt-card border border-plt-border-soft rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-plt-border-soft custom-scrollbar">
                        {filteredTickers.length === 0 ? (
                          <div className="px-4 py-4 text-xs text-plt-muted text-center font-sans">No tickers found</div>
                        ) : (
                          filteredTickers.map((t) => (
                            <div
                              key={t.symbol}
                              className="px-3 py-2 hover:bg-plt-hover cursor-pointer transition-colors"
                              onClick={() => handleSelectTicker(t)}
                            >
                              <div className="font-bold text-xs text-plt-text font-mono">{t.symbol.replace('.CA', '')}</div>
                              <div className="text-[11px] text-plt-muted truncate font-sans">{t.companyName}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Entry Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Entry Date</label>
                  <input
                    type="date"
                    value={newOrderForm.entryDate}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, entryDate: e.target.value })}
                    className="date-token"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Entry Price</label>
                  <div className="flex items-center h-8 rounded-xl bg-plt-surface border border-plt-border px-3 focus-within:border-plt-border-active transition-all">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newOrderForm.entryPrice}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, entryPrice: e.target.value })}
                      className="w-full bg-transparent text-xs text-plt-text font-mono focus:outline-none"
                    />
                    <span className="ml-2 text-[11px] text-plt-muted font-sans">EGP</span>
                  </div>
                </div>
              </div>

              {/* Estimates */}
              <div className="card-widget-compact grid grid-cols-2 gap-2">
                <div>
                  <div className="kpi-title">Target (Est. +15%)</div>
                  <div className="kpi-value text-plt-profit mt-1">
                    {(entryPriceNum * 1.15).toFixed(2)} EGP
                  </div>
                </div>
                <div>
                  <div className="kpi-title">Stop (Est. -5%)</div>
                  <div className="kpi-value text-plt-risk mt-1">
                    {(entryPriceNum * 0.95).toFixed(2)} EGP
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Quantity (Shares)</label>
                <input
                  type="number"
                  value={newOrderForm.quantity}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value })}
                  className="input-token"
                  min="1"
                />
              </div>

              {/* Required Margin */}
              <div className="card-widget-compact flex justify-between items-center text-xs">
                <span className="kpi-title">Total Position Value</span>
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
                onClick={handleAddOrder}
                className="btn-token btn-primary btn-compact flex-1 font-sans"
              >
                Save Position
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
