'use client';
import { Plus, MoreHorizontal, Settings, Search } from '@/components/ui/icons';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export interface WatchlistItem {
  symbol: string;
  companyName: string;
  website?: string;
  price: string;
  change: string;
  isUp: boolean;
}

interface RightSidebarProps {
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  timeframe: string;
}

export default function RightSidebar({ watchlist, selectedSymbol, timeframe }: RightSidebarProps) {
  const [liveData, setLiveData] = useState<{ price: string, change: string, isUp: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const baseSelectedItem = watchlist.find(i => i.symbol === selectedSymbol) || watchlist[0];
  const displaySelectedSymbol = selectedSymbol.replace('.CA', '');

  useEffect(() => {
    let isMounted = true;
    
    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/quote?symbol=${selectedSymbol}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (!isMounted) return;
        
        const change = data.close - data.previousClose;
        const changePct = data.previousClose ? (change / data.previousClose) * 100 : 0;
        
        setLiveData({
          price: Number(data.close).toFixed(2),
          change: `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`,
          isUp: change >= 0
        });
      } catch (e) {}
    };

    fetchLive();
    const intervalId = setInterval(fetchLive, 15000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedSymbol]);

  // Merge live data with base data
  const selectedItem = liveData 
    ? { ...baseSelectedItem, ...liveData } 
    : baseSelectedItem;

  const filteredWatchlist = watchlist.filter(item => 
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-tv-base border-l border-tv-border flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-tv-border">
        <div className="font-weight-medium text-tv-text">Watchlist</div>
        <div className="flex space-x-2 text-tv-muted">
          <button className="hover:text-tv-text transition-colors"><Plus size={18} /></button>
          <button className="hover:text-tv-text transition-colors"><Settings size={18} /></button>
          <button className="hover:text-tv-text transition-colors"><MoreHorizontal size={18} /></button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-tv-border">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tv-muted" />
          <input 
            type="text" 
            placeholder="Search tickers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-8 py-1.5 text-sm text-tv-text focus:outline-none focus:border-tv-accent placeholder-tv-muted transition-colors"
          />
        </div>
      </div>

      {/* Columns */}
      <div className="flex px-3 py-2 text-tv-muted uppercase font-weight-medium border-b border-tv-border text-[0.65rem]">
        <div className="flex-1">Symbol</div>
        <div className="w-20 text-right">Last</div>
        <div className="w-20 text-right">Chg%</div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {filteredWatchlist.map((item) => (
          <Link href={`?ticker=${item.symbol}&timeframe=${timeframe}`} key={item.symbol} className={`flex px-3 py-1.5 hover:bg-tv-hover cursor-pointer transition-colors group ${item.symbol === selectedSymbol ? 'bg-tv-hover' : ''}`}>
            <div className="flex-1 font-weight-medium flex items-center space-x-2">
              {item.website ? (
                <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="w-5 h-5 rounded-tv-full bg-tv-surface border border-tv-border object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-tv-full bg-tv-surface flex items-center justify-center font-weight-medium text-tv-text border border-tv-border text-[0.5rem]">
                  {item.symbol.substring(0, 2)}
                </div>
              )}
              <span className={item.symbol === selectedSymbol ? 'text-tv-accent' : 'text-tv-text'}>
                {item.symbol.replace('.CA', '')}
              </span>
            </div>
            <div className={`w-20 text-right font-weight-medium ${item.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
              {item.price}
            </div>
            <div className={`w-20 text-right font-weight-medium ${item.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
              {item.change}
            </div>
          </Link>
        ))}
      </div>

      {/* Details Panel */}
      {selectedItem && (
        <div className="h-64 border-t border-tv-border bg-tv-base p-4 flex flex-col">
          <div className="flex items-center space-x-3 mb-2">
            {selectedItem.website ? (
              <img src={`https://logo.clearbit.com/${selectedItem.website}`} alt={selectedItem.symbol} className="w-8 h-8 rounded-tv-full bg-tv-surface border border-tv-border object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-tv-full bg-tv-surface flex items-center justify-center font-weight-medium text-tv-text border border-tv-border">
                {displaySelectedSymbol.substring(0, 2)}
              </div>
            )}
            <span className="font-weight-medium text-tv-text text-lg">{displaySelectedSymbol}</span>
          </div>
          <div className="text-tv-muted font-weight-light mb-4 text-sm">
            {selectedItem.companyName} • EGX
          </div>
          <div className="flex items-end space-x-2 mb-1">
            <span className={`text-2xl font-weight-medium ${selectedItem.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
              {selectedItem.price}
            </span>
            <span className="text-tv-muted mb-1 font-weight-light">EGP</span>
          </div>
          <div className={`font-weight-medium ${selectedItem.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
            {selectedItem.change}
          </div>
        </div>
      )}
    </div>
  );
}
