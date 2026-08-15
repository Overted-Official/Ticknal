'use client';

import { Bell, ChevronDown, ChevronRight, MoreHorizontal, Plus, Search } from '@/components/ui/icons';
import { ExternalLink, Grid, Edit3, Bookmark, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
    if (!quoteData) return null;
    const change = quoteData.close - quoteData.previousClose;
    const changePct = quoteData.previousClose ? (change / quoteData.previousClose) * 100 : 0;
    
    return {
      price: Number(quoteData.close).toFixed(2),
      change: `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`,
      changePct: `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      isUp: change >= 0
    };
  }, [quoteData]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(265);
  const [isResizing, setIsResizing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(340);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [collapsedSectors, setCollapsedSectors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isResizingPanel) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 180 && newHeight <= 600) {
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
      if (newWidth >= 230 && newWidth <= 420) {
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
  const dLow = rangeData?.dayLow ?? (currentPriceNum * 0.98);
  const dHigh = rangeData?.dayHigh ?? (currentPriceNum * 1.02);
  const yLow = rangeData?.yearLow ?? (currentPriceNum * 0.6);
  const yHigh = rangeData?.yearHigh ?? (currentPriceNum * 1.15);

  const dayPct = Math.min(100, Math.max(0, ((currentPriceNum - dLow) / (dHigh - dLow || 1)) * 100));
  const yearPct = Math.min(100, Math.max(0, ((currentPriceNum - yLow) / (yHigh - yLow || 1)) * 100));

  return (
    <div 
      className="bg-plt-surface border-l border-plt-border flex flex-col select-none relative shrink-0 text-plt-text"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Resizer Handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-plt-orange/60 active:bg-plt-orange z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-plt-border bg-plt-surface shrink-0">
        <div className="flex items-center space-x-1.5 cursor-pointer hover:opacity-80 transition-opacity">
          <svg className="w-3.5 h-3.5 text-[#ff4954] fill-[#ff4954]" viewBox="0 0 24 24">
            <path d="M5 3h14a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z" />
          </svg>
          <span className="text-xs font-semibold text-plt-text flex items-center gap-1">
            Portfolio <ChevronDown size={11} className="text-plt-muted" />
          </span>
        </div>

        <div className="flex items-center space-x-2 text-plt-muted">
          <button title="Add symbol" className="hover:text-plt-text transition-colors p-0.5">
            <Plus size={14} />
          </button>
          <button title="Layout / Table view" className="hover:text-plt-text transition-colors p-0.5">
            <Grid size={13} />
          </button>
          <button title="More options" className="hover:text-plt-text transition-colors p-0.5">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Columns Header */}
      <div className="flex items-center px-2 py-1.5 text-plt-muted font-medium border-b border-plt-border text-[10px] bg-plt-surface shrink-0">
        <div className="flex-1 min-w-0 pl-4">Symbol</div>
        <div className="w-[46px] text-right">Last</div>
        <div className="w-[48px] text-right">Chg%</div>
        <div className="w-[44px] text-right pr-1">Vol</div>
      </div>

      {/* Watchlist Rows */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-0.5">
        {groupedWatchlist.map(([sector, items]) => {
          const collapsed = collapsedSectors.has(sector) && searchQuery.length === 0;
          return (
            <div key={sector} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleSector(sector)}
                className="flex w-full items-center gap-1 px-2 py-1 text-left text-[9px] uppercase tracking-wider text-plt-muted/80 transition-colors hover:text-plt-text"
              >
                {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                <span className="min-w-0 flex-1 truncate font-semibold">{sector}</span>
                <span className="text-[8px] opacity-60">{items.length}</span>
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
                    className={`flex items-center cursor-pointer px-1.5 py-1 text-[11px] transition-all group ${
                      isSelected 
                        ? 'border border-white/20 rounded-md bg-[#1a1a1a] shadow-sm mx-1 my-0.5' 
                        : 'hover:bg-plt-hover/70 rounded-sm mx-1'
                    }`}
                  >
                    {/* Red Ribbon Indicator Tag */}
                    <div className="w-1 h-3 bg-[#ff4954] rounded-r-xs shrink-0 mr-1.5" />

                    {/* Logo & Symbol info */}
                    <div className="flex min-w-0 flex-1 items-center space-x-1.5 font-medium">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-4 w-4 rounded-full bg-transparent object-contain shrink-0" />
                      ) : item.website ? (
                        <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="h-4 w-4 rounded-full border border-plt-border bg-plt-card object-cover shrink-0" />
                      ) : (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-plt-border bg-plt-card text-[7px] font-semibold text-plt-text">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      
                      <span className="truncate text-xs font-semibold text-white tracking-tight">
                        {item.symbol.replace('.CA', '')}
                      </span>
                      
                      <span className="text-[8px] font-bold text-plt-orange leading-none">D</span>
                      <span className="text-plt-muted/40 text-[9px] leading-none">•</span>
                    </div>

                    {/* Last Price */}
                    <div className="w-[46px] shrink-0 text-right font-medium text-white text-[11px] whitespace-nowrap">
                      {item.price}
                    </div>

                    {/* Chg% */}
                    <div className={`w-[48px] shrink-0 text-right font-medium text-[11px] whitespace-nowrap ${
                      isPositive ? 'text-[#00e676]' : 'text-[#ff4d58]'
                    }`}>
                      {changePctDisplay}
                    </div>

                    {/* Volume */}
                    <div className="w-[44px] shrink-0 text-right font-normal text-plt-muted text-[10px] whitespace-nowrap pr-0.5 truncate">
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
          className="border-t border-plt-border bg-plt-surface flex flex-col shrink-0 relative overflow-hidden transition-all duration-150"
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
                <div className="w-5 h-5 rounded-full bg-plt-card flex items-center justify-center font-bold text-plt-text border border-plt-border text-[9px]">
                  {displaySelectedSymbol.substring(0, 2)}
                </div>
              )}
              <span className="font-bold text-plt-text text-sm">{displaySelectedSymbol}</span>
            </div>

            <div className="flex items-center space-x-2 text-plt-muted">
              <button title="Grid View" className="hover:text-plt-text transition-colors p-0.5">
                <Grid size={13} />
              </button>
              <button title="Notes" className="hover:text-plt-text transition-colors p-0.5">
                <Edit3 size={13} />
              </button>
              <button 
                onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                className="hover:text-plt-text transition-colors p-0.5 text-plt-muted"
                title="Toggle details"
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
          </div>

          {!isDetailsCollapsed && (
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 space-y-2.5">
              {/* Company Meta */}
              <div>
                <div className="text-white text-[11px] font-medium leading-snug">
                  {selectedItem.companyName}
                </div>
                <div className="flex items-center text-[10px] text-plt-muted space-x-1 mt-0.5">
                  <ExternalLink size={10} className="hover:text-plt-text cursor-pointer" />
                  <span>•</span>
                  <span>EGX</span>
                </div>
                <div className="text-[10px] text-plt-muted mt-0.5">
                  Finance • {selectedItem.sector}
                </div>
              </div>

              {/* Big Price & Change */}
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {selectedItem.price}
                  </span>
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-bold text-plt-orange">D</span>
                    <span className="text-[9px] text-plt-muted">EGP</span>
                  </div>
                  <div className={`ml-2 text-xs font-semibold ${selectedItem.isUp ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                    {selectedItem.change ? selectedItem.change.split(' ')[0] : ''} {selectedItem.changePct || ''}
                  </div>
                </div>

                <div className="flex items-center text-plt-muted text-[10px] mt-1 space-x-1.5">
                  <span className="inline-block w-1.5 h-0.5 bg-plt-muted rounded-full" />
                  <span>Market closed</span>
                </div>
                <div className="text-plt-muted/70 text-[9px] mt-0.5">
                  Last update at {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 14:28 GMT+3
                </div>
              </div>

              {/* Bid / Ask Pills */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="bg-[#0c2340]/80 border border-[#1d4ed8]/40 text-[#60a5fa] text-[10px] py-1 text-center rounded font-mono font-medium">
                  {(currentPriceNum * 0.999).toFixed(2)} × 100
                </div>
                <div className="bg-[#381015]/80 border border-[#b91c1c]/40 text-[#f87171] text-[10px] py-1 text-center rounded font-mono font-medium">
                  {(currentPriceNum * 1.001).toFixed(2)} × 250
                </div>
              </div>

              {/* Range Sliders */}
              <div className="space-y-2 pt-1">
                {/* Day's Range */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white font-medium">{dLow.toFixed(2)}</span>
                    <span className="text-plt-muted text-[8px] uppercase tracking-wider font-semibold">Day&apos;s Range</span>
                    <span className="text-white font-medium">{dHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-plt-border rounded-full relative">
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
                    <span className="text-white font-medium">{yLow.toFixed(2)}</span>
                    <span className="text-plt-muted text-[8px] uppercase tracking-wider font-semibold">52Wk Range</span>
                    <span className="text-white font-medium">{yHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-plt-border rounded-full relative">
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
