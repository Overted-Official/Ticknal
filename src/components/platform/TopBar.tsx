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
      <div className="h-[48px] w-full bg-[#141414]/90 backdrop-blur-xl border-b border-white/[0.08] flex items-center px-3 justify-between select-none relative z-40 shrink-0 text-white">
        {/* Left section (Logo + Symbol Command trigger) */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <button 
            type="button"
            className="flex items-center space-x-2.5 cursor-pointer hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] px-2 py-1 rounded-lg transition-all text-left"
            onClick={() => setIsSearchOpen(true)}
          >
            {/* Circular Logo */}
            <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.08] overflow-hidden p-[1px]">
              {currentTicker.logoUrl ? (
                <img src={currentTicker.logoUrl} alt={displaySymbol} className="w-full h-full object-contain rounded-full bg-transparent" />
              ) : currentTicker.website ? (
                <img src={`https://logo.clearbit.com/${currentTicker.website}`} alt={displaySymbol} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-[9px] font-bold text-white">{displaySymbol.substring(0, 2)}</span>
              )}
            </div>
            
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-white text-xs font-semibold truncate hidden md:block leading-tight">{currentTicker.companyName}</span>
              <div className="flex items-center space-x-1.5 text-white/50 text-[11px] leading-tight font-medium">
                <span className="text-white font-semibold">{displaySymbol}</span>
                <span className="opacity-40">•</span>
                <span>EGX</span>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/40 font-mono">
              <Search size={10} />
              <span>⌘K</span>
            </div>
          </button>
        </div>

        {/* Middle/Right section */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar whitespace-nowrap ml-auto">
          {/* Segmented Timeframe Switch */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-lg p-0.5">
            {timeframes.map((tf) => (
              <Link
                key={tf}
                href={`?ticker=${symbol}&timeframe=${tf}${replayQuery}`}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  tf === timeframe 
                    ? 'bg-white/[0.1] text-plt-orange shadow-sm' 
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tf}
              </Link>
            ))}
          </div>

          <div className="h-4 w-px bg-white/[0.08] shrink-0 mx-0.5" />

          {/* Bell Icon Alert */}
          <button
            type="button"
            onClick={() => toggleAlert(symbol)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
              alertEnabled 
                ? 'text-plt-orange bg-plt-orange/15 border border-plt-orange/30 shadow-[0_0_10px_rgba(255,100,13,0.2)]' 
                : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
            }`}
            title={alertEnabled ? "Disable Alert" : "Set Price Alert"}
          >
            <Bell size={14} fill={alertEnabled ? 'currentColor' : 'none'} />
          </button>

          {/* Indicators & Replay Quick Links */}
          <div className="hidden sm:flex items-center space-x-1">
            <button className="flex items-center space-x-1.5 hover:bg-white/[0.05] px-2.5 py-1 rounded-lg transition-colors text-white/70 hover:text-white text-xs font-medium">
              <BarChart2 size={14} />
              <span className="hidden md:inline">Indicators</span>
            </button>
            <Link
              href={`?ticker=${symbol}&timeframe=${timeframe}&replay=1`}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-colors text-xs font-medium ${
                replay ? 'text-plt-orange bg-plt-orange/10 font-semibold' : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <RotateCcw size={14} />
              <span className="hidden md:inline">Replay</span>
            </Link>
          </div>

          {/* CTA Add Order Button */}
          <div className="hidden md:flex items-center pl-1">
            <button 
              onClick={() => setIsAddOrderOpen(true)}
              className="rounded-lg bg-plt-orange hover:bg-plt-orange-hover px-3 py-1 text-xs text-white font-semibold transition-all shadow-[0_0_15px_rgba(255,100,13,0.3)] hover:shadow-[0_0_20px_rgba(255,100,13,0.45)]"
            >
              + Add Order
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="absolute left-3 top-[52px] z-50 rounded-lg border border-white/[0.1] bg-[#161616]/95 backdrop-blur-xl px-3 py-2 text-xs text-white shadow-2xl hidden md:block">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Search Modal (Glassmorphic Command Palette) */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/75 backdrop-blur-md px-4 animate-in fade-in duration-150" 
          onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
        >
          <div className="bg-[#141414]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[75vh] overflow-hidden animate-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
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
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors group"
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(`?ticker=${item.symbol}&timeframe=${timeframe}${replayQuery}`);
                    }}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-7 w-7 rounded-full bg-transparent object-contain p-[1px] shrink-0" />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[10px] font-bold text-white">
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

      <AddOrderModal 
        isOpen={isAddOrderOpen} 
        onClose={() => setIsAddOrderOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </>
  );
}
