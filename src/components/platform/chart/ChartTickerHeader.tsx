'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Search, ChevronDown } from '@/components/ui/icon-library';
import type { ChartData } from './types';
import type { WatchlistItem } from '@/components/platform/RightSidebar';
import { formatVolume } from './utils';

interface ChartTickerHeaderProps {
  symbol: string;
  watchlist: WatchlistItem[];
  activeCandle: ChartData | null;
  timeframe?: string;
}

export default function ChartTickerHeader({
  symbol,
  watchlist,
  activeCandle,
  timeframe = '1D',
}: ChartTickerHeaderProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displaySymbol = symbol.replace('.CA', '');
  const currentTickerItem = watchlist.find((item) => item.symbol === symbol) ?? {
    symbol,
    companyName: symbol,
    price: '',
    changePct: '',
    isUp: false,
    logoUrl: null,
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const searchResults = watchlist.filter(
    (item) =>
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute OHLCV values & change
  const open = activeCandle?.open ?? 0;
  const high = activeCandle?.high ?? 0;
  const low = activeCandle?.low ?? 0;
  const close = activeCandle?.close ?? 0;
  const volume = activeCandle?.volume ?? 0;

  const diff = close - open;
  const diffPct = open > 0 ? (diff / open) * 100 : 0;
  const isUp = diff >= 0;

  return (
    <div className="absolute top-3 left-3 z-30 pointer-events-auto select-none" ref={dropdownRef}>
      {/* Top Row: Globe/Logo + Company Name / Ticker Title (No background, directly on chart) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsSearchOpen((prev) => !prev)}
          className="group flex items-center gap-1.5 text-left bg-transparent border-0 p-0 focus:outline-none cursor-pointer"
          title="Search / Change Ticker"
        >
          {/* Globe or Ticker Logo */}
          <div className="w-4 h-4 rounded-full flex items-center justify-center overflow-hidden shrink-0 text-plt-info">
            {currentTickerItem.logoUrl ? (
              <img
                src={currentTickerItem.logoUrl}
                alt={displaySymbol}
                className="ticker-logo-image"
              />
            ) : (
              <Globe size={15} className="text-plt-info" />
            )}
          </div>

          {/* Title */}
          <span className="text-[13px] font-semibold text-plt-text tracking-tight group-hover:text-white transition-colors flex items-center gap-1">
            <span className="truncate max-w-[150px] sm:max-w-none">{currentTickerItem.companyName || displaySymbol}</span>
            <span className="text-plt-muted font-normal text-xs shrink-0">· {timeframe} · EGX</span>
            <ChevronDown size={14} className={`text-plt-muted shrink-0 transition-transform duration-150 ${isSearchOpen ? 'rotate-180 text-plt-text' : ''}`} />
          </span>
        </button>
      </div>

      {/* Bottom Row: OHLCV + Change Metrics */}
      {activeCandle && (
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] sm:text-[11px] leading-tight tabular-nums overflow-x-auto no-scrollbar max-w-[calc(100vw-24px)]">
          <div className="flex items-center gap-1">
            <span className="text-plt-muted font-sans text-[10px] sm:text-[11px]">O</span>
            <span className="text-plt-info font-medium">{open.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-plt-muted font-sans text-[10px] sm:text-[11px]">H</span>
            <span className="text-plt-info font-medium">{high.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-plt-muted font-sans text-[10px] sm:text-[11px]">L</span>
            <span className="text-plt-info font-medium">{low.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-plt-muted font-sans text-[10px] sm:text-[11px]">C</span>
            <span className="text-plt-info font-medium">{close.toFixed(2)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <span className="text-plt-muted font-sans text-[11px]">Vol</span>
            <span className="text-plt-info font-medium">{formatVolume(volume)}</span>
          </div>

          <div className={`font-medium shrink-0 ${isUp ? 'text-plt-profit' : 'text-plt-risk'}`}>
            {isUp ? '+' : ''}{diff.toFixed(2)} ({isUp ? '+' : ''}{diffPct.toFixed(2)}%)
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isSearchOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-[#121216] border border-white/[0.14] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="flex items-center px-3.5 py-2.5 border-b border-white/[0.08] bg-white/[0.03]">
            <Search size={14} className="text-plt-muted mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search EGX tickers or names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-plt-text text-xs placeholder:text-plt-muted"
            />
            <div className="text-[10px] tabular-nums text-plt-muted px-1.5 py-0.5 rounded bg-plt-border-soft border border-plt-border-soft">
              ESC
            </div>
          </div>

          {/* List of Tickers */}
          <div className="max-h-64 overflow-y-auto no-scrollbar py-1">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-plt-muted text-xs">No tickers found</div>
            ) : (
              searchResults.map((item, index) => {
                const isSelected = item.symbol === symbol;
                const itemDisplay = item.symbol.replace('.CA', '');
                return (
                  <div key={item.symbol}>
                    {index > 0 && (
                      <div className="mx-3.5 h-px bg-plt-border-soft" />
                    )}
                    <div
                      onClick={() => {
                        setIsSearchOpen(false);
                        router.push(`?ticker=${item.symbol}`);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-white/[0.06] text-plt-text font-medium'
                          : 'hover:bg-white/[0.04] text-plt-text'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-transparent flex items-center justify-center overflow-hidden shrink-0">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt={item.symbol} className="ticker-logo-image" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-plt-hover flex items-center justify-center text-[9px] font-semibold text-plt-text">
                              {itemDisplay.substring(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-plt-text flex items-center gap-1.5">
                            <span className={isSelected ? 'text-white font-semibold' : 'text-plt-text'}>{itemDisplay}</span>
                            <span className="text-[11px] text-plt-muted font-normal truncate max-w-36">{item.companyName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2 font-mono">
                        <div className="text-xs tabular-nums font-semibold text-plt-text">{item.price}</div>
                        {item.changePct && (
                          <div className={`text-[10px] tabular-nums font-medium ${item.isUp ? 'text-plt-profit' : 'text-plt-risk'}`}>
                            {item.changePct}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
