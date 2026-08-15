'use client';
import { Bell, ChevronDown, ChevronRight, MoreHorizontal, Plus, Search, Settings } from '@/components/ui/icons';
import { ExternalLink, Grid, Edit3, Zap } from 'lucide-react';
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
      isUp: change >= 0
    };
  }, [quoteData]);

  // Merge live data with base data
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
      className="bg-plt-surface border-l border-plt-border flex flex-col select-none relative shrink-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-plt-red/50 active:bg-plt-red z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
      {/* Header Filter Tabs */}
      <div className="flex items-center p-2 border-b border-plt-border">
        <div className="flex w-full bg-plt-base rounded-tv-sm p-0.5 border border-plt-border/50">
          <button 
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-tv-sm transition-colors ${listFilter === 'ALL' ? 'bg-plt-hover text-plt-text shadow-sm' : 'text-plt-muted hover:text-plt-text'}`}
            onClick={() => setListFilter('ALL')}
          >
            All
          </button>
          <button 
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-tv-sm transition-colors ${listFilter === 'OPEN' ? 'bg-plt-hover text-plt-text shadow-sm' : 'text-plt-muted hover:text-plt-text'}`}
            onClick={() => setListFilter('OPEN')}
          >
            Positions
          </button>
          <button 
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-tv-sm transition-colors ${listFilter === 'OPPORTUNITIES' ? 'bg-plt-hover text-plt-text shadow-sm' : 'text-plt-muted hover:text-plt-text'}`}
            onClick={() => setListFilter('OPPORTUNITIES')}
          >
            Buy Signals
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-plt-border">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-plt-muted" />
          <input 
            type="text" 
            placeholder="Search tickers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-plt-base border border-plt-border rounded-tv-sm px-8 py-1.5 text-sm text-plt-text focus:outline-none focus:border-plt-border-active placeholder:text-plt-muted transition-colors"
          />
        </div>
      </div>

      {/* Columns Header */}
      <div className="flex px-3 py-2 text-plt-muted uppercase font-weight-medium border-b border-plt-border text-[0.65rem] bg-plt-surface">
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
                className="flex w-full items-center gap-1 border-b border-plt-border bg-plt-base px-3 py-1.5 text-left text-[0.65rem] uppercase text-plt-muted transition-colors hover:bg-plt-hover hover:text-plt-text"
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
                    className={`flex items-center cursor-pointer px-3 py-1.5 transition-colors hover:bg-plt-hover group text-[11px] ${item.symbol === selectedSymbol ? 'bg-plt-hover' : ''}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center space-x-2 font-weight-medium">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-5 w-5 rounded-tv-full bg-transparent object-contain p-[1px]" />
                      ) : item.website ? (
                        <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="h-5 w-5 rounded-tv-full border border-plt-border bg-plt-card object-cover" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-tv-full border border-plt-border bg-plt-card text-[0.5rem] font-weight-medium text-plt-text">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      <span className={`truncate ${item.symbol === selectedSymbol ? 'text-plt-orange font-bold' : 'text-plt-text'}`}>
                        {item.symbol.replace('.CA', '')}
                      </span>
                      {item.recentBuyOpportunity && (
                        <span title="Recent Buy Signal" className="ml-0.5 shrink-0 flex items-center">
                          <Zap size={12} className="text-plt-orange fill-plt-orange/30" />
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
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-tv-sm transition-colors hover:bg-plt-card ${
                          alertEnabled ? 'text-plt-orange opacity-100' : 'text-plt-muted opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Bell size={13} fill={alertEnabled ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div className={`w-[50px] shrink-0 text-right font-weight-medium whitespace-nowrap ${item.isUp ? 'text-plt-green' : 'text-plt-red'}`}>
                      {item.price}
                    </div>
                    <div className={`w-[85px] shrink-0 text-right font-weight-medium whitespace-nowrap ${item.isUp ? 'text-plt-green' : 'text-plt-red'}`}>
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
          className="border-t border-plt-border bg-plt-surface p-4 flex flex-col shrink-0 relative overflow-hidden transition-all duration-200"
          style={{ height: isDetailsCollapsed ? 'auto' : `${panelHeight}px` }}
        >
          {/* Vertical Resizer */}
          {!isDetailsCollapsed && (
            <div 
              className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-plt-orange/50 active:bg-plt-orange z-50 transition-colors"
              onMouseDown={() => setIsResizingPanel(true)}
            />
          )}

          <div className="flex items-center justify-between mb-3 mt-1">
            <div className="flex items-center space-x-2">
              {selectedItem.logoUrl ? (
                <img src={selectedItem.logoUrl} alt={selectedItem.symbol} className="w-7 h-7 rounded-tv-full bg-transparent border border-plt-border object-contain p-[2px]" />
              ) : selectedItem.website ? (
                <img src={`https://logo.clearbit.com/${selectedItem.website}`} alt={selectedItem.symbol} className="w-7 h-7 rounded-tv-full bg-plt-card border border-plt-border object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-tv-full bg-plt-card flex items-center justify-center font-weight-medium text-plt-text border border-plt-border text-xs">
                  {displaySelectedSymbol.substring(0, 2)}
                </div>
              )}
              <span className="font-weight-medium text-plt-text text-base">{displaySelectedSymbol}</span>
            </div>
            <div className="flex items-center space-x-2 text-plt-text">
              <button 
                onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                className="hover:text-plt-text transition-colors ml-1 text-plt-muted"
              >
                <ChevronDown size={18} className={`transition-transform ${isDetailsCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {!isDetailsCollapsed && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="text-plt-text mb-1 flex items-center text-sm font-weight-medium">
                {selectedItem.companyName}
                <ExternalLink size={12} className="ml-1 text-plt-muted hover:text-plt-text cursor-pointer" />
                <span className="text-plt-muted font-weight-light mx-1">•</span>
                <span className="text-plt-text">EGX</span>
              </div>
              
              <div className="text-plt-muted font-weight-light text-xs mb-4">
                Finance • {selectedItem.sector}
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-3xl font-weight-medium text-plt-text tracking-tight">
                  {selectedItem.price}
                </span>
                <span className="font-semibold text-xs relative top-[-10px] left-[-4px] text-plt-orange">D</span>
                <span className="text-plt-muted font-weight-medium text-xs">EGP</span>
                <span className={`text-lg font-weight-medium ${selectedItem.isUp ? 'text-plt-green' : 'text-plt-red'}`}>
                  {selectedItem.change ? selectedItem.change.split(' ')[0] : ''}
                </span>
                <span className={`text-lg font-weight-medium ${selectedItem.isUp ? 'text-plt-green' : 'text-plt-red'}`}>
                  {selectedItem.change ? selectedItem.change.split(' ')[1] : ''}
                </span>
              </div>

              <div className="flex items-center text-plt-muted text-xs mb-1">
                <div className="w-2 h-1 bg-plt-muted rounded-full mr-2" />
                Market closed
              </div>
              <div className="text-plt-muted text-xs mb-4">
                Last update at {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 14:26 GMT+3
              </div>

              {rangeData && (
                <>
                  {/* Range Bars */}
                  <div className="mb-4 mt-2">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-plt-text font-medium">{rangeData.dayLow.toFixed(2)}</span>
                      <span className="text-plt-muted text-[10px] uppercase">Day&apos;s Range</span>
                      <span className="text-plt-text font-medium">{rangeData.dayHigh.toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-plt-border rounded-tv-full relative mx-1">
                      <div 
                        className={`absolute h-full rounded-tv-full ${selectedItem.isUp ? 'bg-plt-green' : 'bg-plt-red'}`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.dayLow) / (rangeData.dayHigh - rangeData.dayLow)) * 100))}%`, 
                          left: 0 
                        }} 
                      />
                      <div 
                        className="absolute top-1.5 -ml-1.5 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-plt-text"
                        style={{ left: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.dayLow) / (rangeData.dayHigh - rangeData.dayLow)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-plt-text font-medium">{rangeData.yearLow.toFixed(2)}</span>
                      <span className="text-plt-muted text-[10px] uppercase">52Wk Range</span>
                      <span className="text-plt-text font-medium">{rangeData.yearHigh.toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-plt-border rounded-tv-full relative mx-1">
                      <div 
                        className={`absolute h-full rounded-tv-full ${selectedItem.isUp ? 'bg-plt-green' : 'bg-plt-red'}`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, ((parseFloat(selectedItem.price) - rangeData.yearLow) / (rangeData.yearHigh - rangeData.yearLow)) * 100))}%`, 
                          left: 0 
                        }} 
                      />
                      <div 
                        className="absolute top-1.5 -ml-1.5 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-plt-text"
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
