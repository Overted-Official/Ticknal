'use client';

import { useState } from 'react';
import { Search, X, Bell } from '@/components/ui/icons';
import { WatchlistItem } from './RightSidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { LineChart, Briefcase, LayoutGrid } from 'lucide-react';
import { useAlerts } from './AlertProvider';

export default function TopBar({ 
  symbol, 
  timeframe, 
  replay = false,
  watchlist = []
}: { 
  symbol: string, 
  timeframe: string, 
  replay?: boolean,
  watchlist?: WatchlistItem[]
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { isAlerted, statusMessage, toggleAlert } = useAlerts();
  
  const displaySymbol = symbol.replace('.CA', '');
  const replayQuery = replay ? '&replay=1' : '';

  const searchParams = useSearchParams();
  const rawView = searchParams.get('view');
  const activeView = (rawView === 'positions' || rawView === 'sectors' ? rawView : 'chart');

  const switchView = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', newView);
    router.push(`?${params.toString()}`);
  };

  const currentTicker = watchlist.find(item => item.symbol === symbol) || {
    symbol,
    companyName: displaySymbol,
    logoUrl: null,
    website: null
  };

  const filteredWatchlist = watchlist.filter(item => 
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="h-[48px] w-full bg-black/90 backdrop-blur-xl border-b border-white/[0.09] flex items-center px-3 justify-between select-none relative z-40 shrink-0 text-white">
        {/* Left section (Logo + Symbol Command trigger) */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <button 
            type="button"
            className="flex items-center space-x-2.5 cursor-pointer hover:bg-white/[0.04] border border-transparent hover:border-white/[0.09] px-2.5 py-1 rounded-md transition-all text-left"
            onClick={() => setIsSearchOpen(true)}
          >
            {/* Circular Logo */}
            <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.09] overflow-hidden p-[1px]">
              {currentTicker.logoUrl ? (
                <img src={currentTicker.logoUrl} alt={displaySymbol} className="w-full h-full object-contain rounded-md bg-transparent" />
              ) : currentTicker.website ? (
                <img src={`https://logo.clearbit.com/${currentTicker.website}`} alt={displaySymbol} className="w-full h-full object-cover rounded-md" />
              ) : (
                <span className="text-[9px] font-bold text-white">{displaySymbol.substring(0, 2)}</span>
              )}
            </div>
            
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-white text-xs font-semibold truncate hidden md:block leading-tight">{currentTicker.companyName}</span>
              <div className="flex items-center space-x-1.5 text-white/50 text-[11px] leading-tight font-medium">
                <span className="text-white font-semibold">{displaySymbol}</span>
                <span className="opacity-40">•</span>
                <span>{['GC1!', 'SI1!'].includes(symbol.toUpperCase()) ? 'COMEX' : symbol.toUpperCase() === 'USDEGP' ? 'FOREX' : 'EGX'}</span>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-[4px] bg-white/[0.06] border border-white/[0.09] text-[10px] text-white/40 font-mono">
              <Search size={10} />
              <span>⌘K</span>
            </div>
          </button>
        </div>

        {/* Center section: Desktop View Switcher Pills */}
        <div className="hidden md:flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => switchView('chart')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === 'chart'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <LineChart size={13} className={activeView === 'chart' ? 'text-plt-orange' : 'text-white/40'} />
            <span>Chart</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('positions')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === 'positions'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <Briefcase size={13} className={activeView === 'positions' ? 'text-sky-400' : 'text-white/40'} />
            <span>Positions</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('sectors')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === 'sectors'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <LayoutGrid size={13} className={activeView === 'sectors' ? 'text-emerald-400' : 'text-white/40'} />
            <span>Sectors & Heatmap</span>
          </button>
        </div>

        {/* Right side empty placeholder or alerts */}
        {statusMessage && (
          <div className="absolute right-3 top-[10px] z-50 rounded-md border border-white/[0.09] bg-black/95 backdrop-blur-xl px-3.5 py-1.5 text-xs text-white shadow-2xl hidden md:block">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Search Modal (Glassmorphic Command Palette) */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/80 backdrop-blur-md px-4 animate-in fade-in duration-150" 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
        >
          <div className="bg-black/95 backdrop-blur-2xl border border-white/[0.09] rounded-md shadow-2xl w-full max-w-lg flex flex-col max-h-[75vh] overflow-hidden animate-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center px-4 py-3.5 border-b border-white/[0.09] bg-white/[0.02]">
              <Search size={18} className="text-white/40 mr-3 shrink-0" />
              <input 
                type="text" 
                placeholder="Search Egyptian stocks, indices, commodities..."
                className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                onClick={() => setIsSearchOpen(false)} 
                className="p-1 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar min-h-[300px] p-2 space-y-1">
              {filteredWatchlist.length === 0 ? (
                <div className="p-10 text-center text-white/40 text-xs">No matching symbols found</div>
              ) : (
                filteredWatchlist.map((item) => (
                  <div 
                    key={item.symbol}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-white/[0.05] cursor-pointer transition-colors group"
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(`?ticker=${item.symbol}&timeframe=${timeframe}&view=chart${replayQuery}`);
                    }}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-7 w-7 rounded-full bg-transparent object-contain p-[1px] shrink-0" />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04] text-[10px] font-bold text-white">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-white text-xs group-hover:text-plt-orange transition-colors">
                          {item.symbol.replace('.CA', '')}
                        </div>
                        <div className="text-[11px] text-white/50 truncate max-w-[240px]">{item.companyName}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-white/40 uppercase">{item.sector}</div>
                        <div className="text-xs font-mono font-medium text-white">
                          {item.price ? Number(item.price).toFixed(2) : ''} EGP
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAlert(item.symbol);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isAlerted(item.symbol) ? 'text-plt-orange bg-plt-orange/15' : 'text-white/30 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                         <Bell size={15} fill={isAlerted(item.symbol) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
