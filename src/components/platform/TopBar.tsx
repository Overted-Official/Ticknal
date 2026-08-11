'use client';

import { useState } from 'react';
import { Search, BarChart2, Bell, RotateCcw, Layout, Settings, Maximize, Camera, X } from '@/components/ui/icons';
import Link from 'next/link';
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
            className="flex items-center space-x-1 md:space-x-2 font-weight-medium cursor-pointer hover:bg-tv-hover p-1.5 rounded-tv-md transition-colors"
            onClick={() => setIsSearchOpen(true)}
          >
            <div className="text-tv-accent hidden md:block">Q</div>
            <span className="text-tv-text text-sm md:text-base">{displaySymbol}</span>
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
                className={`px-2 py-1 rounded-tv-sm hover:bg-tv-hover transition-colors text-xs md:text-sm ${
                  tf === timeframe ? 'text-tv-accent' : 'text-tv-text'
                }`}
              >
                {tf}
              </Link>
            ))}
          </div>

          <div className="h-5 w-px bg-tv-border shrink-0 hidden sm:block" />

          {/* Indicators & Tools - hidden on small mobile, visible on sm and up */}
          <div className="hidden sm:flex items-center space-x-2">
            <button className="flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors text-tv-text">
              <BarChart2 size={16} />
              <span className="hidden md:inline">Indicators</span>
            </button>
            <button
              type="button"
              onClick={() => toggleAlert(symbol)}
              className={`flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors ${
                alertEnabled ? 'text-tv-accent' : 'text-tv-text'
              }`}
            >
              <Bell size={16} fill={alertEnabled ? 'currentColor' : 'none'} />
              <span className="hidden md:inline">Alert</span>
            </button>
            <Link
              href={`?ticker=${symbol}&timeframe=${timeframe}&replay=1`}
              className={`flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors ${
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
          <button className="bg-tv-accent hover:bg-tv-accent-hover text-tv-text px-4 py-1.5 rounded-tv-sm font-weight-medium ml-2 transition-colors">
            Publish
          </button>
        </div>

        {statusMessage && (
          <div className="absolute left-3 top-12 z-50 rounded-tv-sm border border-tv-border bg-tv-surface px-3 py-2 text-xs text-tv-text shadow-lg">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Mobile Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-tv-base flex flex-col md:hidden">
          <div className="flex items-center p-4 border-b border-tv-border">
            <Search size={20} className="text-tv-muted mr-3" />
            <input 
              type="text" 
              placeholder="Search tickers..."
              className="flex-1 bg-transparent border-none outline-none text-tv-text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => setIsSearchOpen(false)} className="p-2 text-tv-muted">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredWatchlist.map((item) => (
              <div 
                key={item.symbol}
                className="flex items-center justify-between p-4 border-b border-tv-border hover:bg-tv-hover active:bg-tv-hover"
                onClick={() => {
                  setIsSearchOpen(false);
                  router.push(`?ticker=${item.symbol}&timeframe=${timeframe}${replayQuery}`);
                }}
              >
                <div>
                  <div className="font-weight-medium text-tv-text">{item.symbol.replace('.CA', '')}</div>
                  <div className="text-xs text-tv-muted">{item.companyName}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isAlerted(item.symbol) ? `Disable ${item.symbol} alert` : `Enable ${item.symbol} alert`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleAlert(item.symbol);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-tv-sm border border-tv-border ${
                      isAlerted(item.symbol) ? 'text-tv-accent' : 'text-tv-muted'
                    }`}
                  >
                    <Bell size={16} fill={isAlerted(item.symbol) ? 'currentColor' : 'none'} />
                  </button>
                  <div className="text-right">
                    <div className="font-weight-medium text-tv-text">{item.price}</div>
                    <div className={`text-xs ${item.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
                      {item.change}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
