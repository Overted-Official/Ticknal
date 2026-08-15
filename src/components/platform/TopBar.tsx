'use client';

import { useState } from 'react';
import { Search, BarChart2, Bell, RotateCcw, X } from '@/components/ui/icons';
import Link from 'next/link';
import AddOrderModal from '@/components/platform/AddOrderModal';
import { WatchlistItem } from './RightSidebar';
import { useRouter } from 'next/navigation';
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
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { isAlerted, statusMessage, toggleAlert } = useAlerts();
  
  const timeframes = ['D', 'W', 'M'];
  const displaySymbol = symbol.replace('.CA', '');
  const replayQuery = replay ? '&replay=1' : '';
  const alertEnabled = isAlerted(symbol);

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
      <div className="h-[48px] w-full bg-plt-surface border-b border-plt-border flex items-center px-3 justify-between select-none relative z-40 shrink-0">
        {/* Left section (Logo + Symbol) */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-plt-hover px-1.5 py-1 rounded-tv-md transition-colors"
            onClick={() => setIsSearchOpen(true)}
          >
            {/* Logo visible on all screens */}
            <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-tv-full bg-plt-card border border-plt-border overflow-hidden p-[1px]">
              {currentTicker.logoUrl ? (
                <img src={currentTicker.logoUrl} alt={displaySymbol} className="w-full h-full object-contain rounded-tv-full bg-transparent" />
              ) : currentTicker.website ? (
                <img src={`https://logo.clearbit.com/${currentTicker.website}`} alt={displaySymbol} className="w-full h-full object-cover rounded-tv-full" />
              ) : (
                <span className="text-[10px] font-weight-medium text-plt-text">{displaySymbol.substring(0, 2)}</span>
              )}
            </div>
            
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-plt-text text-xs font-weight-medium truncate hidden md:block leading-tight">{currentTicker.companyName}</span>
              <div className="flex items-center space-x-1 font-weight-medium md:font-weight-light text-plt-text md:text-plt-muted text-xs leading-tight">
                <span>{displaySymbol}</span>
                <span className="text-[10px] hidden md:inline">•</span>
                <span className="hidden md:inline">EGX</span>
              </div>
            </div>
            
            <Search size={13} className="text-plt-muted ml-0.5 shrink-0" />
          </div>
        </div>

        {/* Middle/Right section */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar whitespace-nowrap ml-auto">
          {/* Timeframes */}
          <div className="flex items-center space-x-0.5">
            {timeframes.map((tf) => (
              <Link
                key={tf}
                href={`?ticker=${symbol}&timeframe=${tf}${replayQuery}`}
                className={`px-2 py-0.5 rounded-tv-sm hover:bg-plt-hover transition-colors text-xs ${
                  tf === timeframe ? 'text-plt-orange font-semibold' : 'text-plt-muted'
                }`}
              >
                {tf}
              </Link>
            ))}
          </div>

          <div className="h-4 w-px bg-plt-border shrink-0 mx-1" />

          {/* Bell Icon visible on mobile & desktop */}
          <button
            type="button"
            onClick={() => toggleAlert(symbol)}
            className={`flex items-center justify-center hover:bg-plt-hover w-7 h-7 rounded-tv-sm transition-colors ${
              alertEnabled ? 'text-plt-orange bg-plt-orange/15 border border-plt-orange/30' : 'text-plt-text'
            }`}
          >
            <Bell size={15} fill={alertEnabled ? 'currentColor' : 'none'} />
          </button>

          {/* Indicators & Tools */}
          <div className="hidden sm:flex items-center space-x-1.5 ml-1">
            <button className="flex items-center space-x-1 hover:bg-plt-hover px-2 py-1 rounded-tv-sm transition-colors text-plt-text text-xs">
              <BarChart2 size={15} />
              <span className="hidden md:inline">Indicators</span>
            </button>
            <Link
              href={`?ticker=${symbol}&timeframe=${timeframe}&replay=1`}
              className={`flex items-center space-x-1 hover:bg-plt-hover px-2 py-1 rounded-tv-sm transition-colors text-xs ${
                replay ? 'text-plt-orange font-medium' : 'text-plt-text'
              }`}
            >
              <RotateCcw size={15} />
              <span className="hidden md:inline">Replay</span>
            </Link>
          </div>
        </div>

        {/* Right section - Add Order */}
        <div className="hidden md:flex items-center space-x-2">
          <button 
            onClick={() => setIsAddOrderOpen(true)}
            className="rounded-tv-sm border border-plt-orange/40 bg-plt-orange/10 px-2.5 py-1 text-xs text-plt-orange font-medium transition-all hover:bg-plt-orange hover:text-white ml-2 shadow-[0_0_12px_rgba(255,100,13,0.2)]"
          >
            + Add Order
          </button>
        </div>

        {statusMessage && (
          <div className="absolute left-3 top-[52px] z-50 rounded-tv-sm border border-plt-border bg-plt-card px-3 py-2 text-xs text-plt-text shadow-lg hidden md:block">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}>
          <div className="bg-plt-surface border border-plt-border rounded-tv-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center p-4 border-b border-plt-border bg-plt-card">
              <Search size={20} className="text-plt-muted mr-3" />
              <input 
                type="text" 
                placeholder="Search tickers..."
                className="flex-1 bg-transparent border-none outline-none text-plt-text placeholder:text-plt-muted"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setIsSearchOpen(false)} className="p-2 text-plt-muted hover:text-plt-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {filteredWatchlist.length === 0 ? (
                <div className="p-8 text-center text-plt-muted">No tickers found</div>
              ) : (
                filteredWatchlist.map((item) => (
                  <div 
                    key={item.symbol}
                    className="flex items-center justify-between p-4 border-b border-plt-border hover:bg-plt-hover cursor-pointer transition-colors"
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(`?ticker=${item.symbol}&timeframe=${timeframe}${replayQuery}`);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-8 w-8 rounded-tv-full bg-transparent object-contain p-[2px]" />
                      ) : item.website ? (
                        <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="h-8 w-8 rounded-tv-full border border-plt-border bg-plt-card object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-tv-full border border-plt-border bg-plt-card text-xs font-weight-medium text-plt-text">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-weight-medium text-plt-text">{item.symbol.replace('.CA', '')}</div>
                        <div className="text-xs text-plt-muted mt-1">{item.companyName}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xs text-plt-muted">{item.sector}</div>
                        <div className="text-xs font-weight-medium text-plt-text mt-1">{item.price ? Number(item.price).toFixed(2) : ''} {item.price ? 'EGP' : ''}</div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAlert(item.symbol);
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          isAlerted(item.symbol) ? 'text-plt-red bg-plt-red/10' : 'text-plt-muted hover:text-plt-red hover:bg-plt-hover'
                        }`}
                      >
                         <Bell size={18} fill={isAlerted(item.symbol) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <AddOrderModal 
        isOpen={isAddOrderOpen} 
        onClose={() => setIsAddOrderOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </>
  );
}
