'use client';

import { useState } from 'react';
import { Search, BarChart2, Bell, RotateCcw, Layout, Settings, Maximize, Camera, X } from '@/components/ui/icons';
import Link from 'next/link';
import Image from 'next/image';
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

  const filteredWatchlist = watchlist.filter(item => 
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="h-12 w-full bg-tv-base border-b border-tv-border flex items-center px-3 justify-between select-none relative z-40">
        {/* Left section */}
        <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto no-scrollbar whitespace-nowrap">
          {/* Logo / Symbol */}
          <div 
            className="flex items-center space-x-1 md:space-x-2 cursor-pointer hover:bg-tv-hover p-1.5 rounded-tv-md transition-colors"
            onClick={() => setIsSearchOpen(true)}
          >
            <div className="hidden md:block relative w-6 h-6 rounded overflow-hidden mr-1 shadow-[0_0_8px_rgba(255,255,255,0.1)]">
              <Image src="/logo.jpg" alt="QuantEGX" fill className="object-cover" />
            </div>
            <span className="text-tv-text text-sm font-weight-medium">{displaySymbol}</span>
            <span className="text-tv-muted font-weight-light text-xs md:text-sm hidden sm:inline">EGX</span>
            <Search size={14} className="text-tv-muted ml-1 md:ml-2" />
          </div>

          <div className="h-5 w-px bg-tv-border shrink-0" />

          {/* Timeframes */}
          <div className="flex items-center space-x-0.5 md:space-x-1">
            {timeframes.map((tf) => (
              <Link
                key={tf}
                href={`?ticker=${symbol}&timeframe=${tf}${replayQuery}`}
                className={`px-2 py-1 rounded-tv-sm hover:bg-tv-hover transition-colors text-xs ${
                  tf === timeframe ? 'text-tv-accent' : 'text-tv-muted'
                }`}
              >
                {tf}
              </Link>
            ))}
          </div>

          <div className="h-5 w-px bg-tv-border shrink-0 hidden sm:block mx-1" />

          {/* Bell Icon visible on mobile */}
          <button
            type="button"
            onClick={() => toggleAlert(symbol)}
            className={`flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors text-xs ${
              alertEnabled ? 'text-tv-accent' : 'text-tv-text'
            }`}
          >
            <Bell size={16} fill={alertEnabled ? 'currentColor' : 'none'} />
            <span className="hidden md:inline">Alert</span>
          </button>

          {/* Indicators & Tools - hidden on small mobile, visible on sm and up */}
          <div className="hidden sm:flex items-center space-x-2 ml-1">
            <button className="flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors text-tv-text text-xs">
              <BarChart2 size={16} />
              <span className="hidden md:inline">Indicators</span>
            </button>
            <Link
              href={`?ticker=${symbol}&timeframe=${timeframe}&replay=1`}
              className={`flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors text-xs ${
                replay ? 'text-tv-accent' : 'text-tv-text'
              }`}
            >
              <RotateCcw size={16} />
              <span className="hidden md:inline">Replay</span>
            </Link>
          </div>
        </div>

        {/* Right section - hidden on mobile */}
        <div className="hidden md:flex items-center space-x-2">
          <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
            <Layout size={18} />
          </button>
          <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
            <Settings size={18} />
          </button>
          <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
            <Maximize size={18} />
          </button>
          <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
            <Camera size={18} />
          </button>
          <button 
            onClick={() => setIsAddOrderOpen(true)}
            className="rounded-tv-sm border border-tv-border px-3 py-1.5 text-xs text-tv-muted transition-colors hover:border-tv-border-highlight hover:text-tv-text ml-2"
          >
            + Add Order
          </button>
        </div>

        {statusMessage && (
          <div className="absolute left-3 top-12 z-50 rounded-tv-sm border border-tv-border bg-tv-surface px-3 py-2 text-xs text-tv-text shadow-lg hidden md:block">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}>
          <div className="bg-tv-base border border-tv-border rounded-tv-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center p-4 border-b border-tv-border bg-tv-surface">
              <Search size={20} className="text-tv-muted mr-3" />
              <input 
                type="text" 
                placeholder="Search tickers..."
                className="flex-1 bg-transparent border-none outline-none text-tv-text placeholder:text-tv-muted"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setIsSearchOpen(false)} className="p-2 text-tv-muted hover:text-tv-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {filteredWatchlist.length === 0 ? (
                <div className="p-8 text-center text-tv-muted">No tickers found</div>
              ) : (
                filteredWatchlist.map((item) => (
                  <div 
                    key={item.symbol}
                    className="flex items-center justify-between p-4 border-b border-tv-border hover:bg-tv-hover cursor-pointer"
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(`?ticker=${item.symbol}&timeframe=${timeframe}${replayQuery}`);
                    }}
                  >
                    <div>
                      <div className="font-weight-medium text-tv-text">{item.symbol.replace('.CA', '')}</div>
                      <div className="text-xs text-tv-muted mt-1">{item.companyName}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xs text-tv-muted">{item.sector}</div>
                        <div className="text-xs font-weight-medium text-tv-text mt-1">{item.price ? Number(item.price).toFixed(2) : ''} {item.price ? 'EGP' : ''}</div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAlert(item.symbol);
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          isAlerted(item.symbol) ? 'text-tv-accent bg-tv-accent/10' : 'text-tv-muted hover:text-tv-accent hover:bg-tv-border'
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
