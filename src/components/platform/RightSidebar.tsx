'use client';

import { ChevronDown, ChevronRight } from '@/components/ui/icons';
import { ExternalLink, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import useSWR from 'swr';
import { useAlerts } from './AlertProvider';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface WatchlistItem {
  symbol: string;
  companyName: string;
  website?: string | null;
  sector: string;
  price: string;
  change?: string;
  changePct?: string;
  volume?: string;
  isUp: boolean;
  hasOpenPosition?: boolean;
  logoUrl?: string | null;
  recentBuyOpportunity?: boolean;
}

interface RightSidebarProps {
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  timeframe: string;
  rangeData?: { dayHigh: number; dayLow: number; yearHigh: number; yearLow: number };
}

export default function RightSidebar({ watchlist, selectedSymbol, timeframe, rangeData }: RightSidebarProps) {
  const { data: quoteData } = useSWR(
    selectedSymbol ? `/api/quote?symbol=${selectedSymbol}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const liveData = useMemo(() => {
    if (!quoteData || typeof quoteData.close !== 'number' || isNaN(quoteData.close)) return null;
    const close = Number(quoteData.close);
    const prevClose = typeof quoteData.previousClose === 'number' && !isNaN(quoteData.previousClose) && quoteData.previousClose > 0 
      ? Number(quoteData.previousClose) 
      : close;
    const change = close - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    
    return {
      price: close.toFixed(2),
      change: `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`,
      changePct: `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      isUp: change >= 0
    };
  }, [quoteData]);

  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<'ALL' | 'OPEN' | 'OPPORTUNITIES'>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(265);
  const [isResizing, setIsResizing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(300);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [collapsedSectors, setCollapsedSectors] = useState<Set<string>>(new Set());

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isResizingPanel) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 160 && newHeight <= 600) {
        setPanelHeight(newHeight);
      }
    };
    const handleMouseUp = () => setIsResizingPanel(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPanel]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 220 && newWidth <= 420) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const router = useRouter();
  const { isAlerted, toggleAlert } = useAlerts();
  
  const baseSelectedItem = watchlist.find(i => i.symbol === selectedSymbol) || watchlist[0];
  const displaySelectedSymbol = selectedSymbol.replace('.CA', '');

  const selectedItem = liveData 
    ? { ...baseSelectedItem, ...liveData } 
    : baseSelectedItem;

  const filteredWatchlist = watchlist.filter(item => {
    if (listFilter === 'OPEN' && !item.hasOpenPosition) return false;
    if (listFilter === 'OPPORTUNITIES' && !item.recentBuyOpportunity) return false;
    const q = searchQuery.toLowerCase();
    return (
      item.symbol.toLowerCase().includes(q) || 
      item.companyName.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
    );
  });

  const groupedWatchlist = useMemo(() => {
    const groups = new Map<string, WatchlistItem[]>();

    for (const item of filteredWatchlist) {
      const sector = item.sector || 'Unclassified';
      const items = groups.get(sector) ?? [];
      items.push(item);
      groups.set(sector, items);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredWatchlist]);

  const toggleSector = (sector: string) => {
    setCollapsedSectors((current) => {
      const next = new Set(current);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  const openTicker = (symbol: string) => {
    router.push(`?ticker=${symbol}&timeframe=${timeframe}`);
  };

  const currentPriceNum = parseFloat(selectedItem?.price || '0');
  const validPrice = !isNaN(currentPriceNum) && currentPriceNum > 0 ? currentPriceNum : 100;
  const dLow = rangeData?.dayHigh ? rangeData.dayLow : validPrice * 0.98;
  const dHigh = rangeData?.dayHigh ? rangeData.dayHigh : validPrice * 1.02;
  const yLow = rangeData?.yearLow ? rangeData.yearLow : validPrice * 0.6;
  const yHigh = rangeData?.yearHigh ? rangeData.yearHigh : validPrice * 1.15;

  const dayPct = Math.min(100, Math.max(0, ((validPrice - dLow) / (dHigh - dLow || 1)) * 100));
  const yearPct = Math.min(100, Math.max(0, ((validPrice - yLow) / (yHigh - yLow || 1)) * 100));

  const filterLabels = {
    ALL: 'Portfolio (All)',
    OPEN: 'Open Positions',
    OPPORTUNITIES: 'Buy Signals'
  };

  return (
    <div 
      className="bg-[#141414]/95 backdrop-blur-xl border-l border-white/[0.08] flex flex-col select-none relative shrink-0 text-white"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resizer Handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-plt-orange/60 active:bg-plt-orange z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Top Header Bar with Filter Switch Dropdown */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-white/[0.01] shrink-0 relative" ref={filterDropdownRef}>
        <button 
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
          className="flex items-center space-x-1.5 cursor-pointer hover:bg-white/[0.06] px-3 py-1 rounded-full border border-white/[0.08] transition-all text-xs font-semibold text-white focus:outline-none"
        >
          <span>{filterLabels[listFilter]}</span>
          <ChevronDown size={12} className={`text-white/50 transition-transform duration-150 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isFilterDropdownOpen && (
          <div className="absolute left-3 top-10 bg-[#181818]/95 backdrop-blur-2xl border border-white/[0.1] rounded-xl shadow-2xl z-50 w-44 p-1 animate-in fade-in zoom-in-95 duration-100">
            {(['ALL', 'OPEN', 'OPPORTUNITIES'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setListFilter(mode);
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs text-left rounded-lg flex items-center justify-between transition-colors ${
                  listFilter === mode ? 'text-plt-orange font-semibold bg-white/[0.06]' : 'text-white/80 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span>{filterLabels[mode]}</span>
                {listFilter === mode && <Check size={13} className="text-plt-orange" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Columns Header */}
      <div className="flex items-center px-3 py-1.5 text-white/40 font-semibold uppercase tracking-wider border-b border-white/[0.06] text-[9px] bg-white/[0.01] shrink-0">
        <div className="flex-1 min-w-0">Symbol</div>
        <div className="w-[48px] text-right">Last</div>
        <div className="w-[50px] text-right">Chg%</div>
        <div className="w-[44px] text-right pr-0.5">Vol</div>
      </div>

      {/* Watchlist Rows */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-1">
        {groupedWatchlist.map(([sector, items]) => {
          const collapsed = collapsedSectors.has(sector) && searchQuery.length === 0;
          return (
            <div key={sector} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleSector(sector)}
                className="flex w-full items-center gap-1.5 px-3 py-1 text-left text-[9px] uppercase tracking-wider text-white/45 transition-colors hover:text-white group"
              >
                {collapsed ? <ChevronRight size={10} className="text-white/30 group-hover:text-white" /> : <ChevronDown size={10} className="text-white/30 group-hover:text-white" />}
                <span className="min-w-0 flex-1 truncate font-semibold">{sector}</span>
                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.04] text-white/40">{items.length}</span>
              </button>

              {!collapsed && items.map((item) => {
                const isSelected = item.symbol === selectedSymbol;
                const changePctDisplay = item.changePct || (item.change ? item.change.split('(')[1]?.replace(')', '') : '0.00%');
                const isPositive = item.isUp;

                return (
                  <div
                    key={item.symbol}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTicker(item.symbol)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openTicker(item.symbol);
                    }}
                    className={`flex items-center cursor-pointer px-2.5 py-1.5 text-[11px] transition-all group mx-1 my-0.5 rounded-lg ${
                      isSelected 
                        ? 'border border-white/[0.12] bg-white/[0.06] shadow-sm' 
                        : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    {/* Logo & Symbol info */}
                    <div className="flex min-w-0 flex-1 items-center space-x-2">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-4 w-4 rounded-full bg-transparent object-contain shrink-0" />
                      ) : item.website ? (
                        <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="h-4 w-4 rounded-full border border-white/[0.08] bg-white/[0.04] object-cover shrink-0" />
                      ) : (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[7px] font-bold text-white">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      
                      <span className={`truncate text-[12px] ${isSelected ? 'font-semibold text-plt-orange' : 'font-normal text-white'}`}>
                        {item.symbol.replace('.CA', '')}
                      </span>
                    </div>

                    {/* Last Price */}
                    <div className="w-[48px] shrink-0 text-right font-mono font-medium text-white text-[11px] whitespace-nowrap">
                      {item.price}
                    </div>

                    {/* Chg% */}
                    <div className={`w-[50px] shrink-0 text-right font-mono font-medium text-[11px] whitespace-nowrap ${
                      isPositive ? 'text-[#00e676]' : 'text-[#ff4d58]'
                    }`}>
                      {changePctDisplay}
                    </div>

                    {/* Volume */}
                    <div className="w-[44px] shrink-0 text-right font-mono text-white/40 text-[10px] whitespace-nowrap pr-0.5 truncate">
                      {item.volume || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Details Panel (Bottom Section) */}
      {selectedItem && (
        <div 
          className="border-t border-white/[0.08] bg-[#121212]/90 backdrop-blur-2xl flex flex-col shrink-0 relative overflow-hidden transition-all duration-150"
          style={{ height: isDetailsCollapsed ? 'auto' : `${panelHeight}px` }}
        >
          {/* Vertical Resizer */}
          {!isDetailsCollapsed && (
            <div 
              className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-plt-orange/60 active:bg-plt-orange z-50 transition-colors"
              onMouseDown={() => setIsResizingPanel(true)}
            />
          )}

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1 shrink-0">
            <div className="flex items-center space-x-2">
              {selectedItem.logoUrl ? (
                <img src={selectedItem.logoUrl} alt={selectedItem.symbol} className="w-5 h-5 rounded-full bg-transparent object-contain" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center font-bold text-white border border-white/[0.08] text-[9px]">
                  {displaySelectedSymbol.substring(0, 2)}
                </div>
              )}
              <span className="font-bold text-white text-sm tracking-tight">{displaySelectedSymbol}</span>
            </div>
          </div>

          {!isDetailsCollapsed && (
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 space-y-2.5">
              {/* Company Meta */}
              <div>
                <div className="text-white text-[11px] font-medium leading-snug">
                  {selectedItem.companyName}
                </div>
                <div className="flex items-center text-[10px] text-white/50 space-x-1 mt-0.5">
                  <ExternalLink size={10} className="hover:text-white cursor-pointer" />
                  <span>•</span>
                  <span>EGX</span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  Finance • {selectedItem.sector}
                </div>
              </div>

              {/* Big Price & Change Hero Card */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold font-mono text-white tracking-tight">
                    {selectedItem.price || '0.00'}
                  </span>
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-bold text-plt-orange">D</span>
                    <span className="text-[9px] text-white/40">EGP</span>
                  </div>
                  <div className={`ml-2 text-xs font-semibold font-mono ${selectedItem.isUp ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                    {selectedItem.change ? selectedItem.change.split(' ')[0] : ''} {selectedItem.changePct || ''}
                  </div>
                </div>

                <div className="flex items-center text-white/50 text-[10px] mt-1.5 space-x-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span>Market closed</span>
                </div>
                <div className="text-white/35 text-[9px] mt-0.5">
                  Last update at {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 14:28 GMT+3
                </div>
              </div>

              {/* Range Sliders */}
              <div className="space-y-2.5 pt-0.5">
                {/* Day's Range */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white font-mono font-medium">{dLow.toFixed(2)}</span>
                    <span className="text-white/40 text-[8px] uppercase tracking-wider font-semibold">Day&apos;s Range</span>
                    <span className="text-white font-mono font-medium">{dHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full relative">
                    <div 
                      className={`absolute h-full rounded-full ${selectedItem.isUp ? 'bg-[#00e676]' : 'bg-[#ff4d58]'}`}
                      style={{ width: `${dayPct}%`, left: 0 }} 
                    />
                    <div 
                      className="absolute top-1.5 -ml-1 w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[4.5px] border-l-transparent border-r-transparent border-b-white"
                      style={{ left: `${dayPct}%` }}
                    />
                  </div>
                </div>

                {/* 52Wk Range */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white font-mono font-medium">{yLow.toFixed(2)}</span>
                    <span className="text-white/40 text-[8px] uppercase tracking-wider font-semibold">52Wk Range</span>
                    <span className="text-white font-mono font-medium">{yHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full relative">
                    <div 
                      className={`absolute h-full rounded-full ${selectedItem.isUp ? 'bg-[#00e676]' : 'bg-[#ff4d58]'}`}
                      style={{ width: `${yearPct}%`, left: 0 }} 
                    />
                    <div 
                      className="absolute top-1.5 -ml-1 w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[4.5px] border-l-transparent border-r-transparent border-b-white"
                      style={{ left: `${yearPct}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
