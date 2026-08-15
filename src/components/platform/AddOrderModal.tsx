'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from '@/components/ui/icons';
import { motion } from 'framer-motion';

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

  // Sync initialData when modal opens, and fetch tickers if manual entry
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

      if (!initialData?.symbol) {
        fetch('/api/tickers')
          .then(res => res.json())
          .then((data: Ticker[]) => {
            setTickers(data);
            setFilteredTickers(data.slice(0, 50));
          })
          .catch(console.error);
      }
    }
  }, [isOpen, initialData]);

  const handleSymbolChange = (val: string) => {
    setNewOrderForm({ ...newOrderForm, symbol: val.toUpperCase() });
    const filtered = tickers.filter(t => 
      t.symbol.toLowerCase().includes(val.toLowerCase()) || 
      t.companyName.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 50);
    setFilteredTickers(filtered);
    setIsSearchOpen(true);
  };

  const handleSelectTicker = (ticker: Ticker) => {
    setNewOrderForm({ ...newOrderForm, symbol: ticker.symbol });
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

  const entryPriceNum = parseFloat(newOrderForm.entryPrice) || 0;
  const quantityNum = parseFloat(newOrderForm.quantity) || 0;

  const isBuy = initialData?.signal === 'BUY';
  const isSell = initialData?.signal && initialData.signal.includes('SELL');

  let title = 'Add Tracked Position';
  if (isBuy) title = `Buy ${initialData?.symbol.replace('.CA', '')} Position`;
  else if (isSell) title = `Exit ${initialData?.symbol.replace('.CA', '')} Position`;

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
        className="glass-panel bg-black border border-white/[0.14] rounded-md shadow-2xl w-full max-w-sm overflow-visible flex flex-col text-white"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.09] bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-plt-orange" />
            <span className="font-semibold text-white text-sm">{title}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-4 overflow-visible max-h-[80vh]">
          {/* Ticker Section */}
          <div className="flex justify-between items-end border-b border-white/[0.09] pb-3 relative" ref={searchRef}>
            {initialData?.companyName ? (
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">{initialData.symbol.replace('.CA', '')}</h3>
                <p className="text-xs text-white/40 truncate max-w-[220px]">{initialData.companyName}</p>
              </div>
            ) : (
              <div className="w-full relative">
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1.5">Ticker Symbol</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search tickers..."
                    value={newOrderForm.symbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md pl-9 pr-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-white/20 transition-all placeholder:text-white/30"
                  />
                </div>
                {/* Search Dropdown */}
                {isSearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#181818] border border-white/[0.1] rounded-md shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar p-1">
                    {filteredTickers.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-white/40 text-center">No tickers found</div>
                    ) : (
                      filteredTickers.map((t) => (
                        <div 
                          key={t.symbol} 
                          className="px-3 py-2 hover:bg-white/[0.06] rounded-md cursor-pointer transition-colors"
                          onClick={() => handleSelectTicker(t)}
                        >
                          <div className="font-semibold text-xs text-white">{t.symbol.replace('.CA', '')}</div>
                          <div className="text-[10px] text-white/40 truncate">{t.companyName}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Entry Info */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 font-sans">Entry Date</label>
              <input
                type="date"
                value={newOrderForm.entryDate}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, entryDate: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1 font-sans">Entry Price</label>
              <div className="flex items-center bg-white/[0.04] border border-white/[0.09] rounded-md px-3 focus-within:border-white/20 transition-all">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newOrderForm.entryPrice}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, entryPrice: e.target.value })}
                  className="w-full bg-transparent py-2 text-xs text-white font-semibold focus:outline-none"
                />
                <span className="ml-1 text-[10px] text-white/40">EGP</span>
              </div>
            </div>
          </div>
          
          {/* Estimates */}
          <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.04] rounded-md p-3 font-mono">
            <div>
              <label className="block text-[9px] uppercase font-semibold tracking-wider text-white/40 mb-0.5 font-sans">Target (Est.)</label>
              <div className="text-[#22c55e] text-xs font-semibold">
                {(entryPriceNum * 1.15).toFixed(2)} EGP
              </div>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-semibold tracking-wider text-white/40 mb-0.5 font-sans">Stop (Est.)</label>
              <div className="text-[#ef4444] text-xs font-semibold">
                {(entryPriceNum * 0.95).toFixed(2)} EGP
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Quantity (Shares)</label>
            <input
              type="number"
              value={newOrderForm.quantity}
              onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.09] rounded-md px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none focus:border-white/20 transition-all"
              min="1"
            />
          </div>

          {/* Required Margin */}
          <div className="bg-white/[0.03] rounded-md p-3 flex justify-between items-center text-xs border border-white/[0.09] font-mono">
            <span className="text-white/40 font-sans text-[11px]">Required Margin</span>
            <span className="font-bold text-white">
              {(entryPriceNum * quantityNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 shrink-0">
          <button
            onClick={handleAddOrder}
            className={`w-full py-2.5 rounded-md font-medium text-xs transition-all shadow-md ${
              isBuy 
                ? 'bg-[#22c55e] hover:bg-[#22c55e]/90 text-black' 
                : isSell 
                  ? 'bg-[#ef4444] hover:bg-[#ef4444]/90 text-white'
                  : 'bg-plt-orange hover:bg-plt-orange-hover text-white'
            }`}
          >
            {isBuy || isSell ? 'Place Order' : 'Save Order'}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
