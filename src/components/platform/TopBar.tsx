'use client';

import { useState } from 'react';
import { Search, X, Bell } from '@/components/ui/icon-library';
import { WatchlistItem } from './RightSidebar';
import { useRouter, useSearchParams } from 'next/navigation';
import { LineChart, Briefcase, LayoutGrid } from '@/components/ui/icon-library';
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
      <div className="h-12 w-full bg-plt-base/90 backdrop-blur-xl border-b border-plt-border flex items-center px-4 justify-between select-none relative z-40 shrink-0 text-plt-text">
        {/* Left section (Logo + Symbol Command trigger) */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <button
            type="button"
            className="flex items-center space-x-2 cursor-pointer hover:bg-plt-hover border border-transparent hover:border-plt-border px-2 py-2 rounded-xl transition-all text-left"
            onClick={() => setIsSearchOpen(true)}
          >
            {/* Circular Logo */}
            <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-plt-hover border border-plt-border overflow-hidden">
              {currentTicker.logoUrl ? (
                <img src={currentTicker.logoUrl} alt={displaySymbol} className="ticker-logo-image" />
              ) : currentTicker.website ? (
                <img src={`https://logo.clearbit.com/${currentTicker.website}`} alt={displaySymbol} className="ticker-logo-image" />
              ) : (
                <span className="text-compact font-medium text-plt-text">{displaySymbol.substring(0, 2)}</span>
              )}
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <span className="text-plt-text text-xs font-medium truncate hidden md:block leading-tight">{currentTicker.companyName}</span>
              <div className="flex items-center space-x-2 text-plt-muted text-caption leading-tight font-medium">
                <span className="text-plt-text font-medium">{displaySymbol}</span>
                <span className="opacity-40">•</span>
                <span>{['GC1!', 'SI1!'].includes(symbol.toUpperCase()) ? 'COMEX' : symbol.toUpperCase() === 'USDEGP' ? 'FOREX' : 'EGX'}</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 ml-2 px-2 py-2 rounded-xl bg-plt-hover border border-plt-border text-mini text-plt-muted tabular-nums">
              <Search size={16} />
              <span>⌘K</span>
            </div>
          </button>
        </div>

        {/* Center section: Desktop View Switcher Pills */}
        <div className="pill-switch hidden md:flex">
          <button
            type="button"
            onClick={() => switchView('chart')}
            className={`pill-switch-btn flex items-center gap-1.5 ${activeView === 'chart' ? 'active' : ''}`}
          >
            <LineChart size={14} className={activeView === 'chart' ? 'text-plt-text' : 'text-plt-muted'} />
            <span>Chart</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('positions')}
            className={`pill-switch-btn flex items-center gap-1.5 ${activeView === 'positions' ? 'active' : ''}`}
          >
            <Briefcase size={14} className={activeView === 'positions' ? 'text-plt-text' : 'text-plt-muted'} />
            <span>Positions</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('sectors')}
            className={`pill-switch-btn flex items-center gap-1.5 ${activeView === 'sectors' ? 'active' : ''}`}
          >
            <LayoutGrid size={14} className={activeView === 'sectors' ? 'text-plt-text' : 'text-plt-muted'} />
            <span>Sectors & Heatmap</span>
          </button>
        </div>

        {/* Right side empty placeholder or alerts */}
        {statusMessage && (
          <div className="absolute right-4 top-2 z-50 rounded-xl border border-plt-border bg-plt-base/95 backdrop-blur-xl px-4 py-2 text-xs text-plt-text shadow-2xl hidden md:block">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Search Modal (Glassmorphic Command Palette) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-modal flex items-start justify-center modal-search-offset bg-plt-base/80 backdrop-blur-md px-4 animate-in fade-in duration-150"
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
        >
          <div className="bg-plt-base/95 backdrop-blur-2xl border border-plt-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-search-results overflow-hidden animate-in zoom-in-95 duration-150 text-plt-text">
            <div className="flex items-center px-4 py-3 border-b border-plt-border bg-plt-hover">
              <Search size={14} className="text-plt-muted mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Search Egyptian stocks, indices, commodities..."
                className="flex-1 bg-transparent border-none outline-none text-plt-text text-xs font-sans placeholder:text-plt-muted placeholder:text-xs"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-plt-muted hover:text-plt-text transition-colors rounded-xl hover:bg-plt-hover"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar min-h-76 p-2 space-y-2">
              {filteredWatchlist.length === 0 ? (
                <div className="p-10 text-center text-plt-muted text-xs">No matching symbols found</div>
              ) : (
                filteredWatchlist.map((item) => (
                  <div
                    key={item.symbol}
                    className="flex items-center justify-between px-4 py-2 rounded-xl hover:bg-plt-hover cursor-pointer transition-colors group"
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(`?ticker=${item.symbol}&timeframe=${timeframe}&view=chart${replayQuery}`);
                    }}
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="ticker-logo-image h-8 w-8 shrink-0" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-plt-border bg-plt-hover text-mini font-medium text-plt-text">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 truncate">
                        <div className="font-medium text-plt-text text-xs group-hover:text-white transition-colors">
                          {item.symbol.replace('.CA', '')}
                        </div>
                        <div className="text-caption text-plt-muted truncate max-w-60">{item.companyName}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0">
                      <div className="text-right">
                        <div className="text-mini text-plt-muted ">{item.sector}</div>
                        <div className="text-xs tabular-nums font-medium text-plt-text">
                          {item.price ? Number(item.price).toFixed(2) : ''} EGP
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAlert(item.symbol);
                        }}
                        className={`p-2 rounded-xl transition-colors ${
                          isAlerted(item.symbol) ? 'text-plt-profit bg-plt-profit/15' : 'text-plt-faint hover:text-plt-text hover:bg-plt-hover'
                        }`}
                      >
                         <Bell size={16} fill={isAlerted(item.symbol) ? 'currentColor' : 'none'} />
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
