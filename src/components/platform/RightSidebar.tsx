'use client';
import { Bell, ChevronDown, ChevronRight, MoreHorizontal, Plus, Search, Settings } from '@/components/ui/icons';
import { ExternalLink, Grid, Edit3, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAlerts } from './AlertProvider';

export interface WatchlistItem {
  symbol: string;
  companyName: string;
  website?: string | null;
  sector: string;
  price: string;
  change?: string;
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
  const [liveData, setLiveData] = useState<{ price: string, change: string, isUp: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<'ALL' | 'OPEN' | 'OPPORTUNITIES'>('ALL');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(380);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);

  useEffect(() => {
    if (!isResizingPanel) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 200 && newHeight <= 800) {
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
      if (newWidth >= 260 && newWidth <= 500) {
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
  const [collapsedSectors, setCollapsedSectors] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { isAlerted, toggleAlert } = useAlerts();
  
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
      } catch {}
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

  return (
    <div 
      className="bg-tv-base border-l border-tv-border flex flex-col select-none relative shrink-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-tv-accent/50 active:bg-tv-accent z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
      {/* Header */}
      <div className="flex items-center p-2 border-b border-tv-border">
        <div className="flex w-full bg-tv-surface rounded-tv-sm p-0.5">
          <button 
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-tv-sm transition-colors ${listFilter === 'ALL' ? 'bg-tv-hover text-tv-text' : 'text-tv-muted hover:text-tv-text'}`}
            onClick={() => setListFilter('ALL')}
          >
            All
          </button>
          <button 
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-tv-sm transition-colors ${listFilter === 'OPEN' ? 'bg-tv-hover text-tv-text' : 'text-tv-muted hover:text-tv-text'}`}
            onClick={() => setListFilter('OPEN')}
          >
            Positions
          </button>
          <button 
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-tv-sm transition-colors ${listFilter === 'OPPORTUNITIES' ? 'bg-tv-hover text-tv-text' : 'text-tv-muted hover:text-tv-text'}`}
            onClick={() => setListFilter('OPPORTUNITIES')}
          >
            Buy Signals
          </button>
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
            className="w-full bg-tv-surface border border-tv-border rounded-tv-sm px-8 py-1.5 text-sm text-tv-text focus:outline-none focus:border-tv-accent placeholder:text-tv-muted transition-colors"
          />
        </div>
      </div>

      {/* Columns */}
      <div className="flex px-3 py-2 text-tv-muted uppercase font-weight-medium border-b border-tv-border text-[0.65rem]">
        <div className="flex-1 min-w-0">Symbol</div>
        <div className="w-[50px] text-right">Last</div>
        <div className="w-[85px] text-right">Chg%</div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {groupedWatchlist.map(([sector, items]) => {
          const collapsed = collapsedSectors.has(sector) && searchQuery.length === 0;
          return (
            <div key={sector}>
              <button
                type="button"
                onClick={() => toggleSector(sector)}
                className="flex w-full items-center gap-1 border-b border-tv-border bg-tv-base px-3 py-1.5 text-left text-[0.65rem] uppercase text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text"
              >
                {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span className="min-w-0 flex-1 truncate">{sector}</span>
                <span>{items.length}</span>
              </button>

              {!collapsed && items.map((item) => {
                const alertEnabled = isAlerted(item.symbol);
                return (
                  <div
                    key={item.symbol}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTicker(item.symbol)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openTicker(item.symbol);
                    }}
                    className={`flex items-center cursor-pointer px-3 py-1.5 transition-colors hover:bg-tv-hover group text-[11px] ${item.symbol === selectedSymbol ? 'bg-tv-hover' : ''}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center space-x-2 font-weight-medium">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-5 w-5 rounded-tv-full bg-white object-contain p-[1px]" />
                      ) : item.website ? (
                        <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="h-5 w-5 rounded-tv-full border border-tv-border bg-tv-surface object-cover" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-tv-full border border-tv-border bg-tv-surface text-[0.5rem] font-weight-medium text-tv-text">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      <span className={`truncate ${item.symbol === selectedSymbol ? 'text-tv-accent' : 'text-tv-text'}`}>
                        {item.symbol.replace('.CA', '')}
                      </span>
                      {item.recentBuyOpportunity && (
                        <span title="Recent Buy Signal" className="ml-0.5 shrink-0 flex items-center">
                          <Zap size={12} className="text-tv-accent" />
                        </span>
                      )}
                      <button
                        type="button"
                        title={alertEnabled ? 'Disable alert' : 'Enable alert'}
                        aria-label={alertEnabled ? `Disable ${item.symbol} alert` : `Enable ${item.symbol} alert`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleAlert(item.symbol);
                        }}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-tv-sm transition-colors hover:bg-tv-surface ${
                          alertEnabled ? 'text-tv-accent opacity-100' : 'text-tv-muted opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Bell size={13} fill={alertEnabled ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div className={`w-[50px] shrink-0 text-right font-weight-medium whitespace-nowrap ${item.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
                      {item.price}
                    </div>
                    <div className={`w-[85px] shrink-0 text-right font-weight-medium whitespace-nowrap ${item.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
                      {item.change}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Details Panel */}
      {selectedItem && (
        <div 
          className="border-t border-tv-border bg-tv-base p-4 flex flex-col shrink-0 relative overflow-hidden transition-all duration-200"
          style={{ height: isDetailsCollapsed ? 'auto' : `${panelHeight}px` }}
        >
          {/* Vertical Resizer */}
          {!isDetailsCollapsed && (
            <div 
              className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-tv-accent/50 active:bg-tv-accent z-50 transition-colors"
              onMouseDown={() => setIsResizingPanel(true)}
            />
          )}

          <div className="flex items-center justify-between mb-3 mt-1">
            <div className="flex items-center space-x-2">
              {selectedItem.logoUrl ? (
                <img src={selectedItem.logoUrl} alt={selectedItem.symbol} className="w-7 h-7 rounded-tv-full bg-white border border-tv-border object-contain p-[2px]" />
              ) : selectedItem.website ? (
                <img src={`https://logo.clearbit.com/${selectedItem.website}`} alt={selectedItem.symbol} className="w-7 h-7 rounded-tv-full bg-tv-surface border border-tv-border object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-tv-full bg-tv-surface flex items-center justify-center font-weight-medium text-tv-text border border-tv-border text-xs">
                  {displaySelectedSymbol.substring(0, 2)}
                </div>
              )}
              <span className="font-weight-medium text-tv-text text-base">{displaySelectedSymbol}</span>
            </div>
            <div className="flex items-center space-x-2 text-tv-text">
              <button 
                onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                className="hover:text-tv-accent transition-colors ml-1"
              >
                <ChevronDown size={18} className={`transition-transform ${isDetailsCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {!isDetailsCollapsed && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="text-tv-text mb-1 flex items-center text-sm font-weight-medium">
                {selectedItem.companyName}
                <ExternalLink size={12} className="ml-1 text-tv-muted hover:text-tv-text cursor-pointer" />
                <span className="text-tv-muted font-weight-light mx-1">•</span>
                <span className="text-tv-text">EGX</span>
              </div>
              
              <div className="text-tv-muted font-weight-light text-xs mb-4">
                Finance • {selectedItem.sector}
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-3xl font-weight-medium text-tv-text tracking-tight">
                  {selectedItem.price}
                </span>
                <span className="text-tv-muted font-weight-medium text-xs relative top-[-10px] left-[-4px] text-orange-500">D</span>
                <span className="text-tv-muted font-weight-medium text-xs">EGP</span>
                <span className={`text-lg font-weight-medium ${selectedItem.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
                  {selectedItem.change ? selectedItem.change.split(' ')[0] : ''}
                </span>
                <span className={`text-lg font-weight-medium ${selectedItem.isUp ? 'text-tv-up' : 'text-tv-down'}`}>
                  {selectedItem.change ? selectedItem.change.split(' ')[1] : ''}
                </span>
              </div>

              <div className="flex items-center text-tv-muted text-xs mb-1">
                <div className="w-2 h-1 bg-tv-muted rounded-full mr-2" />
                Market closed
              </div>
              <div className="text-tv-muted text-xs mb-4">
                Last update at {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 14:26 GMT+3
              </div>

              {rangeData && (
                <>
                  {/* Range Bars */}
                  <div className="mb-4 mt-2">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-tv-text font-medium">{rangeData.dayLow.toFixed(2)}</span>
                      <span className="text-tv-muted text-[10px] uppercase">Day&apos;s Range</span>
                      <span className="text-tv-text font-medium">{rangeData.dayHigh.toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-tv-border rounded-tv-full relative mx-1">
                      <div 
                        className={`absolute h-full rounded-tv-full ${selectedItem.isUp ? 'bg-tv-up' : 'bg-tv-down'}`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.dayLow) / (rangeData.dayHigh - rangeData.dayLow)) * 100))}%`, 
                          left: 0 
                        }} 
                      />
                      <div 
                        className="absolute top-1.5 -ml-1.5 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-tv-text"
                        style={{ left: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.dayLow) / (rangeData.dayHigh - rangeData.dayLow)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-tv-text font-medium">{rangeData.yearLow.toFixed(2)}</span>
                      <span className="text-tv-muted text-[10px] uppercase">52Wk Range</span>
                      <span className="text-tv-text font-medium">{rangeData.yearHigh.toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-tv-border rounded-tv-full relative mx-1">
                      <div 
                        className={`absolute h-full rounded-tv-full ${selectedItem.isUp ? 'bg-tv-up' : 'bg-tv-down'}`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.yearLow) / (rangeData.yearHigh - rangeData.yearLow)) * 100))}%`, 
                          left: 0 
                        }} 
                      />
                      <div 
                        className="absolute top-1.5 -ml-1.5 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-tv-text"
                        style={{ left: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.yearLow) / (rangeData.yearHigh - rangeData.yearLow)) * 100))}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
