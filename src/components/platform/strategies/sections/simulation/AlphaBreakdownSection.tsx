'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Plus,
  ChevronDown,
  Clock,
  TrendingUp,
  RotateCcw,
  Check,
  X,
} from '@/components/ui/icon-library';
import type { TickerAlphaItem, QuickFilter } from './types';
import type { TickerChampionInfo } from '@/lib/finance/sectors-math';

interface AlphaBreakdownSectionProps {
  allTickerAlpha: TickerAlphaItem[];
  selectedSectorFilter: string | null;
  quickFilter: QuickFilter;
  searchQuery: string;
  onOpenChart: (symbol: string) => void;
  tickerChampions?: Record<string, TickerChampionInfo>;
}

export type TableViewMode = 'overview' | 'activity';
export type EntryRecencyFilter = 'all' | number;
export type MinPositionRoiFilter = 'all' | 'in_market' | number;

export type OptionalColumnId =
  | 'company'
  | 'setup'
  | 'champion'
  | 'group'
  | 'price'
  | 'alpha'
  | 'sysRoi'
  | 'bh'
  | 'status'
  | 'winRate'
  | 'maxDrawdown'
  | 'avgAdverseExcursion'
  | 'avgBarsHeld'
  | 'tradesCount'
  | 'lastSignal'
  | 'signalDate'
  | 'barsHeld'
  | 'tradeReturn'
  | 'positionMae'
  | 'entryPrice';

type SortColumn = 'symbol' | OptionalColumnId;

interface ColumnDefinition {
  id: OptionalColumnId;
  label: string;
}

// 1. Overview View: All columns visible by default EXCEPT price and status per user request
const OVERVIEW_DEFAULT_COLUMNS: OptionalColumnId[] = [
  'company',
  'setup',
  'champion',
  'group',
  'alpha',
  'sysRoi',
  'bh',
  'winRate',
  'maxDrawdown',
  'avgAdverseExcursion',
  'avgBarsHeld',
  'tradesCount',
];

const OVERVIEW_AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'company', label: 'Company' },
  { id: 'setup', label: 'Position' },
  { id: 'champion', label: 'Best-Fit Model' },
  { id: 'group', label: 'Sector' },
  { id: 'price', label: 'Price' },
  { id: 'alpha', label: 'Alpha vs B&H' },
  { id: 'sysRoi', label: 'Strategy ROI' },
  { id: 'bh', label: 'B&H ROI' },
  { id: 'status', label: 'Status' },
  { id: 'winRate', label: 'Win Rate' },
  { id: 'maxDrawdown', label: 'Max DD' },
  { id: 'avgAdverseExcursion', label: 'Avg MAE' },
  { id: 'avgBarsHeld', label: 'Avg Bars' },
  { id: 'tradesCount', label: 'Trades' },
];

// 2. Position Activity View: Focused on current/latest position performance and timing
const ACTIVITY_DEFAULT_COLUMNS: OptionalColumnId[] = [
  'company',
  'setup',
  'champion',
  'lastSignal',
  'signalDate',
  'barsHeld',
  'tradeReturn',
  'positionMae',
  'entryPrice',
  'price',
  'group',
];

const ACTIVITY_AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'company', label: 'Company' },
  { id: 'setup', label: 'Position' },
  { id: 'champion', label: 'Best-Fit Model' },
  { id: 'lastSignal', label: 'Signal' },
  { id: 'signalDate', label: 'Signal Date' },
  { id: 'barsHeld', label: 'Time in Trade' },
  { id: 'tradeReturn', label: 'Position ROI' },
  { id: 'positionMae', label: 'Position MAE' },
  { id: 'entryPrice', label: 'Entry Price' },
  { id: 'price', label: 'Current Price' },
  { id: 'group', label: 'Sector' },
  { id: 'winRate', label: 'Win Rate' },
  { id: 'tradesCount', label: 'Trades' },
  { id: 'alpha', label: 'Alpha vs B&H' },
  { id: 'sysRoi', label: 'Strategy ROI' },
];

function formatSignalDate(d?: string): string {
  if (!d) return '—';
  try {
    const parts = d.split('-');
    if (parts.length === 3) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${monthNames[m] || parts[1]} ${day}, ${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return d;
}

function formatTimeInTrade(bars?: number, isOpen?: boolean): string {
  if (bars === undefined || bars === null) return '—';
  if (bars === 0) return isOpen ? 'Today (0 bars)' : '—';
  if (bars === 1) return '1 bar';
  if (bars < 20) return `${bars} bars`;
  const months = (bars / 21).toFixed(1);
  return `${months} ${months === '1.0' ? 'Month' : 'Months'} (${bars} bars)`;
}

export default function AlphaBreakdownSection({
  allTickerAlpha,
  selectedSectorFilter,
  quickFilter,
  searchQuery,
  onOpenChart,
  tickerChampions,
}: AlphaBreakdownSectionProps) {
  const [tableView, setTableView] = useState<TableViewMode>('overview');
  const [sortColumn, setSortColumn] = useState<SortColumn>('alpha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Independent column visibility per view
  const [overviewColumns, setOverviewColumns] = useState<Set<OptionalColumnId>>(
    () => new Set(OVERVIEW_DEFAULT_COLUMNS)
  );
  const [activityColumns, setActivityColumns] = useState<Set<OptionalColumnId>>(
    () => new Set(ACTIVITY_DEFAULT_COLUMNS)
  );

  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const [plusBtnRect, setPlusBtnRect] = useState<DOMRect | null>(null);

  // Advanced Filters: Entry Recency & Minimum Position ROI
  const [entryRecencyFilter, setEntryRecencyFilter] = useState<EntryRecencyFilter>('all');
  const [customEntryDays, setCustomEntryDays] = useState('');
  const [isRecencyFilterOpen, setIsRecencyFilterOpen] = useState(false);
  const recencyFilterRef = useRef<HTMLDivElement>(null);

  const [minPositionRoiFilter, setMinPositionRoiFilter] = useState<MinPositionRoiFilter>('all');
  const [customMinRoi, setCustomMinRoi] = useState('');
  const [isRoiFilterOpen, setIsRoiFilterOpen] = useState(false);
  const roiFilterRef = useRef<HTMLDivElement>(null);

  // Active view columns and definitions
  const activeVisibleColumns = tableView === 'overview' ? overviewColumns : activityColumns;
  const activeAvailableColumns = tableView === 'overview' ? OVERVIEW_AVAILABLE_COLUMNS : ACTIVITY_AVAILABLE_COLUMNS;

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        columnPickerRef.current &&
        !columnPickerRef.current.contains(target) &&
        !plusBtnRef.current?.contains(target)
      ) {
        setIsColumnPickerOpen(false);
      }
      if (
        recencyFilterRef.current &&
        !recencyFilterRef.current.contains(target)
      ) {
        setIsRecencyFilterOpen(false);
      }
      if (
        roiFilterRef.current &&
        !roiFilterRef.current.contains(target)
      ) {
        setIsRoiFilterOpen(false);
      }
    }

    if (isColumnPickerOpen || isRecencyFilterOpen || isRoiFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isColumnPickerOpen, isRecencyFilterOpen, isRoiFilterOpen]);

  // Keep column picker popover position synced during scrolling or window resizing
  useEffect(() => {
    if (!isColumnPickerOpen) return;
    const updateRect = () => {
      if (plusBtnRef.current) {
        setPlusBtnRect(plusBtnRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [isColumnPickerOpen]);

  const handleToggleColumnPicker = () => {
    if (!isColumnPickerOpen && plusBtnRef.current) {
      setPlusBtnRect(plusBtnRef.current.getBoundingClientRect());
    }
    setIsColumnPickerOpen((prev) => !prev);
    setIsRecencyFilterOpen(false);
    setIsRoiFilterOpen(false);
  };

  const toggleColumn = (id: OptionalColumnId) => {
    if (tableView === 'overview') {
      setOverviewColumns((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          if (next.size > 1) next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setActivityColumns((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          if (next.size > 1) next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const resetColumnsToDefault = () => {
    if (tableView === 'overview') {
      setOverviewColumns(new Set(OVERVIEW_DEFAULT_COLUMNS));
    } else {
      setActivityColumns(new Set(ACTIVITY_DEFAULT_COLUMNS));
    }
  };

  const handleViewChange = (view: TableViewMode) => {
    setTableView(view);
    // Explicitly close popovers so new view opens cleanly
    setIsColumnPickerOpen(false);
    setIsRecencyFilterOpen(false);
    setIsRoiFilterOpen(false);

    if (view === 'activity') {
      if (sortColumn === 'alpha' || sortColumn === 'sysRoi') {
        setSortColumn('signalDate');
        setSortDirection('desc');
      }
    } else {
      if (sortColumn === 'signalDate' || sortColumn === 'tradeReturn') {
        setSortColumn('alpha');
        setSortDirection('desc');
      }
    }
  };

  const hasActiveFilters = entryRecencyFilter !== 'all' || minPositionRoiFilter !== 'all';

  const handleClearFilters = () => {
    setEntryRecencyFilter('all');
    setMinPositionRoiFilter('all');
    setCustomEntryDays('');
    setCustomMinRoi('');
  };

  // 1. Sector filtering from top pill rail
  const sectorFiltered = useMemo(() => {
    if (!selectedSectorFilter) return allTickerAlpha;
    return allTickerAlpha.filter(
      (t) => t.group.toLowerCase() === selectedSectorFilter.toLowerCase()
    );
  }, [allTickerAlpha, selectedSectorFilter]);

  // 2. Counts for active in-market vs out-of-market tickers
  const { inMarketCount, outOfMarketCount } = useMemo(() => {
    let inM = 0;
    let outM = 0;
    for (const t of sectorFiltered) {
      if (t.isOpen) inM++;
      else outM++;
    }
    return { inMarketCount: inM, outOfMarketCount: outM };
  }, [sectorFiltered]);

  // 3. Quick filter tabs + search query + sort
  const displayedTickers = useMemo(() => {
    let list = sectorFiltered;

    // Quick filter tab
    if (quickFilter === 'beating') {
      list = list.filter((t) => t.alpha > 0);
    } else if (quickFilter === 'trailing') {
      list = list.filter((t) => t.alpha <= 0);
    } else if (quickFilter === 'active') {
      list = list.filter((t) => t.isOpen);
    }

    // New positions within N days filter (user requested)
    if (entryRecencyFilter !== 'all') {
      list = list.filter((t) => {
        if (!t.isOpen) return false;
        const bars = t.barsHeld ?? 0;
        return bars <= entryRecencyFilter;
      });
    }

    // In-market positions with ROI >= X% filter (user requested)
    if (minPositionRoiFilter !== 'all') {
      if (minPositionRoiFilter === 'in_market') {
        list = list.filter((t) => t.isOpen);
      } else {
        list = list.filter((t) => {
          if (!t.isOpen) return false;
          const roi = t.tradeReturnPct ?? 0;
          return roi >= minPositionRoiFilter;
        });
      }
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((t) => {
        const sym = t.symbol.toLowerCase();
        const clean = t.symbol.replace('.CA', '').toLowerCase();
        const name = (t.meta?.companyName || '').toLowerCase();
        const grp = t.group.toLowerCase();
        return sym.includes(q) || clean.includes(q) || name.includes(q) || grp.includes(q);
      });
    }

    // Sort
    return [...list].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'company':
          aVal = a.meta?.companyName || a.symbol;
          bVal = b.meta?.companyName || b.symbol;
          break;
        case 'setup': {
          const rank = (item: TickerAlphaItem) => {
            if (item.isFresh || item.status === 'BUY_FRESH') return 3;
            if (item.isOpen || item.status === 'LONG_ACTIVE') return 2;
            if (item.status === 'EXIT_RECENT') return 1;
            return 0;
          };
          aVal = rank(a);
          bVal = rank(b);
          break;
        }
        case 'champion': {
          const cleanA = a.symbol.replace('.CA', '');
          const cleanB = b.symbol.replace('.CA', '');
          const aChamp = tickerChampions?.[cleanA] || tickerChampions?.[a.symbol];
          const bChamp = tickerChampions?.[cleanB] || tickerChampions?.[b.symbol];
          aVal = aChamp?.alpha ?? -999;
          bVal = bChamp?.alpha ?? -999;
          break;
        }
        case 'group':
          aVal = a.group;
          bVal = b.group;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'alpha':
          aVal = a.alpha;
          bVal = b.alpha;
          break;
        case 'sysRoi':
          aVal = a.sysRoi;
          bVal = b.sysRoi;
          break;
        case 'bh':
          aVal = a.bh;
          bVal = b.bh;
          break;
        case 'status':
          aVal = a.alpha > 0 ? 1 : 0;
          bVal = b.alpha > 0 ? 1 : 0;
          break;
        case 'winRate':
          aVal = a.winRate;
          bVal = b.winRate;
          break;
        case 'maxDrawdown':
          aVal = a.maxDrawdown;
          bVal = b.maxDrawdown;
          break;
        case 'avgAdverseExcursion':
          aVal = a.avgAdverseExcursion;
          bVal = b.avgAdverseExcursion;
          break;
        case 'avgBarsHeld':
          aVal = a.avgBarsHeld;
          bVal = b.avgBarsHeld;
          break;
        case 'tradesCount':
          aVal = a.tradesCount;
          bVal = b.tradesCount;
          break;
        case 'lastSignal':
          aVal = a.lastSignalType || '';
          bVal = b.lastSignalType || '';
          break;
        case 'signalDate':
          aVal = a.lastSignalDate || '';
          bVal = b.lastSignalDate || '';
          break;
        case 'barsHeld':
          aVal = a.barsHeld ?? 0;
          bVal = b.barsHeld ?? 0;
          break;
        case 'tradeReturn':
          aVal = a.tradeReturnPct ?? 0;
          bVal = b.tradeReturnPct ?? 0;
          break;
        case 'positionMae':
          aVal = Math.abs(a.positionMae ?? 0);
          bVal = Math.abs(b.positionMae ?? 0);
          break;
        case 'entryPrice':
          aVal = a.entryPrice ?? 0;
          bVal = b.entryPrice ?? 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [sectorFiltered, quickFilter, searchQuery, sortColumn, sortDirection, entryRecencyFilter, minPositionRoiFilter]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  const renderSortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) return null;
    return (
      <span className="text-[10px] text-white font-bold leading-none shrink-0">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col bg-[#000000] rounded-xl overflow-hidden select-none font-sans">
      {/* 1. View Switcher & Advanced Filters Bar */}
      <div className="flex items-center justify-between gap-2.5 px-3 py-2 bg-[#000000] border-b border-white/10 select-none flex-wrap">
        {/* Left: View Tabs & Filter Popovers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Tabs (Overview vs Position Activity) */}
          <div className="seg-control">
            <button
              type="button"
              onClick={() => handleViewChange('overview')}
              className={`seg-control-btn ${tableView === 'overview' ? 'seg-control-btn-active' : ''}`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('activity')}
              className={`seg-control-btn flex items-center gap-1.5 ${
                tableView === 'activity' ? 'seg-control-btn-active' : ''
              }`}
            >
              <span>Position Activity</span>
              {inMarketCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-pulse" />
              )}
            </button>
          </div>

          <div className="h-4 w-px bg-white/15 hidden sm:block" />

          {/* Filter 1: Entry Recency (≤ N Days) */}
          <div className="relative" ref={recencyFilterRef}>
            <button
              type="button"
              onClick={() => {
                setIsRecencyFilterOpen((prev) => !prev);
                setIsRoiFilterOpen(false);
                setIsColumnPickerOpen(false);
              }}
              className={`filter-control-btn ${
                entryRecencyFilter !== 'all' ? 'filter-control-btn-active' : ''
              }`}
              title="Filter by position entry recency"
            >
              <Clock size={12} className={entryRecencyFilter !== 'all' ? 'text-[#089981]' : 'text-neutral-400'} />
              <span>
                {entryRecencyFilter === 'all'
                  ? 'Entry: All'
                  : entryRecencyFilter === 1
                  ? 'Entry: Today (≤ 1d)'
                  : `Entry: ≤ ${entryRecencyFilter}d`}
              </span>
              <ChevronDown size={11} className="text-neutral-400" />
            </button>

            {isRecencyFilterOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#000000] border border-white/15 rounded-xl shadow-2xl p-3 z-50 text-left font-sans animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-white">Position Entry Recency</span>
                  {entryRecencyFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEntryRecencyFilter('all');
                        setCustomEntryDays('');
                      }}
                      className="text-[10px] text-text-muted hover:text-white transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mb-2">
                  Show tickers with active positions entered within N trading days:
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { label: 'All Entries', value: 'all' as const },
                    { label: 'Today (≤ 1d)', value: 1 },
                    { label: '≤ 3 Days', value: 3 },
                    { label: '≤ 7 Days (1 Wk)', value: 7 },
                    { label: '≤ 14 Days (2 Wks)', value: 14 },
                    { label: '≤ 30 Days (1 Mo)', value: 30 },
                  ].map((opt) => {
                    const isSel = entryRecencyFilter === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          setEntryRecencyFilter(opt.value);
                          setCustomEntryDays('');
                          setIsRecencyFilterOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer flex items-center justify-between ${
                          isSel
                            ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                            : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSel && <Check size={12} className="text-[#089981]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Days Input */}
                <div className="pt-2 border-t border-white/10 flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-400 shrink-0">≤</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Custom days"
                    value={customEntryDays}
                    onChange={(e) => setCustomEntryDays(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = parseInt(customEntryDays, 10);
                        if (!isNaN(v) && v > 0) {
                          setEntryRecencyFilter(v);
                          setIsRecencyFilterOpen(false);
                        }
                      }
                    }}
                    className="w-full h-7 px-2 text-xs bg-white/5 border border-white/15 rounded text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#089981] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = parseInt(customEntryDays, 10);
                      if (!isNaN(v) && v > 0) {
                        setEntryRecencyFilter(v);
                        setIsRecencyFilterOpen(false);
                      }
                    }}
                    className="px-2.5 h-7 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium cursor-pointer shrink-0 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter 2: Position ROI (≥ +X%) */}
          <div className="relative" ref={roiFilterRef}>
            <button
              type="button"
              onClick={() => {
                setIsRoiFilterOpen((prev) => !prev);
                setIsRecencyFilterOpen(false);
                setIsColumnPickerOpen(false);
              }}
              className={`filter-control-btn ${
                minPositionRoiFilter !== 'all' ? 'filter-control-btn-active' : ''
              }`}
              title="Filter by active position return"
            >
              <TrendingUp size={12} className={minPositionRoiFilter !== 'all' ? 'text-[#089981]' : 'text-neutral-400'} />
              <span>
                {minPositionRoiFilter === 'all'
                  ? 'Position ROI: All'
                  : minPositionRoiFilter === 'in_market'
                  ? 'In Market Only'
                  : minPositionRoiFilter === 0
                  ? 'ROI: > 0%'
                  : `ROI: ≥ +${minPositionRoiFilter}%`}
              </span>
              <ChevronDown size={11} className="text-neutral-400" />
            </button>

            {isRoiFilterOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#000000] border border-white/15 rounded-xl shadow-2xl p-3 z-50 text-left font-sans animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-white">Minimum Position ROI</span>
                  {minPositionRoiFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinPositionRoiFilter('all');
                        setCustomMinRoi('');
                      }}
                      className="text-[10px] text-text-muted hover:text-white transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mb-2">
                  Show active in-market positions with return at or above threshold:
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[
                    { label: 'All ROI', value: 'all' as const },
                    { label: 'In Market (Any)', value: 'in_market' as const },
                    { label: 'Profitable (> 0%)', value: 0 },
                    { label: '≥ +3% ROI', value: 3 },
                    { label: '≥ +5% ROI', value: 5 },
                    { label: '≥ +10% ROI', value: 10 },
                    { label: '≥ +15% ROI', value: 15 },
                    { label: '≥ +20% ROI', value: 20 },
                  ].map((opt) => {
                    const isSel = minPositionRoiFilter === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          setMinPositionRoiFilter(opt.value);
                          setCustomMinRoi('');
                          setIsRoiFilterOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer flex items-center justify-between ${
                          isSel
                            ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                            : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSel && <Check size={12} className="text-[#089981]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom ROI % Input */}
                <div className="pt-2 border-t border-white/10 flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-400 shrink-0">≥ +</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Custom %"
                    value={customMinRoi}
                    onChange={(e) => setCustomMinRoi(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = parseFloat(customMinRoi);
                        if (!isNaN(v)) {
                          setMinPositionRoiFilter(v);
                          setIsRoiFilterOpen(false);
                        }
                      }
                    }}
                    className="w-full h-7 px-2 text-xs bg-white/5 border border-white/15 rounded text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#089981] tabular-nums"
                  />
                  <span className="text-[11px] text-neutral-400 shrink-0">%</span>
                  <button
                    type="button"
                    onClick={() => {
                      const v = parseFloat(customMinRoi);
                      if (!isNaN(v)) {
                        setMinPositionRoiFilter(v);
                        setIsRoiFilterOpen(false);
                      }
                    }}
                    className="px-2.5 h-7 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium cursor-pointer shrink-0 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Chip */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="filter-reset-btn"
              title="Reset entry recency and ROI filters"
            >
              <RotateCcw size={11} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Right: Ticker Status Counts */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <span className="tabular-nums text-neutral-300">
            {displayedTickers.length} of {sectorFiltered.length} tickers
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-[#089981] font-medium tabular-nums">
            {inMarketCount} in market
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-400 tabular-nums">
            {outOfMarketCount} out of market
          </span>
        </div>
      </div>

      {/* 2. TradingView Screener Table (Sticky headers, customizable columns, seamless surface) */}
      <div className="w-full min-w-0 overflow-x-auto custom-scrollbar max-h-[580px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-[#000000] border-b border-white/10 text-text-muted text-[11px] font-semibold">
            <tr className="h-9 select-none">
              {/* Symbol & Logo (pinned left) */}
              <th
                onClick={() => handleSort('symbol')}
                className="py-2 px-2 sticky left-0 z-30 bg-[#000000] min-w-[76px] w-[76px] cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span className="text-text-primary">Symbol</span>
                  {renderSortIndicator('symbol')}
                </div>
              </th>

              {/* Company Name */}
              {activeVisibleColumns.has('company') && (
                <th
                  onClick={() => handleSort('company')}
                  className="py-2 px-3 min-w-[150px] max-w-[200px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Company</span>
                    {renderSortIndicator('company')}
                  </div>
                </th>
              )}

              {/* Algo Position (In Market / Out of Market) */}
              {activeVisibleColumns.has('setup') && (
                <th
                  onClick={() => handleSort('setup')}
                  className="py-2 px-3 text-center min-w-[105px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Position</span>
                    {renderSortIndicator('setup')}
                  </div>
                </th>
              )}

              {/* Best-Fit Champion Model */}
              {activeVisibleColumns.has('champion') && (
                <th
                  onClick={() => handleSort('champion')}
                  className="py-2 px-3 text-center min-w-[110px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Best-Fit Model</span>
                    {renderSortIndicator('champion')}
                  </div>
                </th>
              )}

              {/* ── Position Activity Specific Columns ── */}
              {tableView === 'activity' && (
                <>
                  {/* Signal Type */}
                  {activeVisibleColumns.has('lastSignal') && (
                    <th
                      onClick={() => handleSort('lastSignal')}
                      className="py-2 px-3 text-center min-w-[70px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Signal</span>
                        {renderSortIndicator('lastSignal')}
                      </div>
                    </th>
                  )}

                  {/* Signal Date */}
                  {activeVisibleColumns.has('signalDate') && (
                    <th
                      onClick={() => handleSort('signalDate')}
                      className="py-2 px-3 text-center min-w-[100px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Signal Date</span>
                        {renderSortIndicator('signalDate')}
                      </div>
                    </th>
                  )}

                  {/* Time in Trade */}
                  {activeVisibleColumns.has('barsHeld') && (
                    <th
                      onClick={() => handleSort('barsHeld')}
                      className="py-2 px-3 text-right min-w-[130px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Time in Trade</span>
                        {renderSortIndicator('barsHeld')}
                      </div>
                    </th>
                  )}

                  {/* Position ROI (Unrealized or Last Trade Return) */}
                  {activeVisibleColumns.has('tradeReturn') && (
                    <th
                      onClick={() => handleSort('tradeReturn')}
                      className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Position ROI</span>
                        {renderSortIndicator('tradeReturn')}
                      </div>
                    </th>
                  )}

                  {/* Position MAE (Adverse excursion during position) */}
                  {activeVisibleColumns.has('positionMae') && (
                    <th
                      onClick={() => handleSort('positionMae')}
                      className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Position MAE</span>
                        {renderSortIndicator('positionMae')}
                      </div>
                    </th>
                  )}

                  {/* Entry Price */}
                  {activeVisibleColumns.has('entryPrice') && (
                    <th
                      onClick={() => handleSort('entryPrice')}
                      className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Entry Price</span>
                        {renderSortIndicator('entryPrice')}
                      </div>
                    </th>
                  )}
                </>
              )}

              {/* Sector / Group */}
              {activeVisibleColumns.has('group') && (
                <th
                  onClick={() => handleSort('group')}
                  className="py-2 px-3 min-w-[110px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Sector</span>
                    {renderSortIndicator('group')}
                  </div>
                </th>
              )}

              {/* Price (Current Close) */}
              {activeVisibleColumns.has('price') && (
                <th
                  onClick={() => handleSort('price')}
                  className="py-2 px-3 text-right min-w-[85px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{tableView === 'activity' ? 'Current Price' : 'Price'}</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>
              )}

              {/* ── Overview Specific Columns ── */}
              {tableView === 'overview' && (
                <>
                  {/* Alpha vs B&H */}
                  {activeVisibleColumns.has('alpha') && (
                    <th
                      onClick={() => handleSort('alpha')}
                      className="py-2 px-3 text-right min-w-[105px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Alpha vs B&H</span>
                        {renderSortIndicator('alpha')}
                      </div>
                    </th>
                  )}

                  {/* Strategy ROI */}
                  {activeVisibleColumns.has('sysRoi') && (
                    <th
                      onClick={() => handleSort('sysRoi')}
                      className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Strategy ROI</span>
                        {renderSortIndicator('sysRoi')}
                      </div>
                    </th>
                  )}

                  {/* Buy & Hold ROI */}
                  {activeVisibleColumns.has('bh') && (
                    <th
                      onClick={() => handleSort('bh')}
                      className="py-2 px-3 text-right min-w-[85px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>B&H ROI</span>
                        {renderSortIndicator('bh')}
                      </div>
                    </th>
                  )}

                  {/* Status Badge */}
                  {activeVisibleColumns.has('status') && (
                    <th
                      onClick={() => handleSort('status')}
                      className="py-2 px-3 text-center min-w-[95px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {renderSortIndicator('status')}
                      </div>
                    </th>
                  )}

                  {/* Max Drawdown (MAE) */}
                  {activeVisibleColumns.has('maxDrawdown') && (
                    <th
                      onClick={() => handleSort('maxDrawdown')}
                      className="py-2 px-3 text-right min-w-[80px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Max DD</span>
                        {renderSortIndicator('maxDrawdown')}
                      </div>
                    </th>
                  )}

                  {/* Avg Adverse Excursion */}
                  {activeVisibleColumns.has('avgAdverseExcursion') && (
                    <th
                      onClick={() => handleSort('avgAdverseExcursion')}
                      className="py-2 px-3 text-right min-w-[80px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Avg MAE</span>
                        {renderSortIndicator('avgAdverseExcursion')}
                      </div>
                    </th>
                  )}

                  {/* Avg Bars Held */}
                  {activeVisibleColumns.has('avgBarsHeld') && (
                    <th
                      onClick={() => handleSort('avgBarsHeld')}
                      className="py-2 px-3 text-right min-w-[80px] cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Avg Bars</span>
                        {renderSortIndicator('avgBarsHeld')}
                      </div>
                    </th>
                  )}
                </>
              )}

              {/* Win Rate */}
              {activeVisibleColumns.has('winRate') && (
                <th
                  onClick={() => handleSort('winRate')}
                  className="py-2 px-3 text-right min-w-[80px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Win Rate</span>
                    {renderSortIndicator('winRate')}
                  </div>
                </th>
              )}

              {/* Total Trades */}
              {activeVisibleColumns.has('tradesCount') && (
                <th
                  onClick={() => handleSort('tradesCount')}
                  className="py-2 px-3 text-right min-w-[70px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Trades</span>
                    {renderSortIndicator('tradesCount')}
                  </div>
                </th>
              )}

              {/* Cumulative ROI for Activity View (if enabled via +) */}
              {tableView === 'activity' && activeVisibleColumns.has('alpha') && (
                <th
                  onClick={() => handleSort('alpha')}
                  className="py-2 px-3 text-right min-w-[105px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Alpha vs B&H</span>
                    {renderSortIndicator('alpha')}
                  </div>
                </th>
              )}
              {tableView === 'activity' && activeVisibleColumns.has('sysRoi') && (
                <th
                  onClick={() => handleSort('sysRoi')}
                  className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Strategy ROI</span>
                    {renderSortIndicator('sysRoi')}
                  </div>
                </th>
              )}

              {/* Plus Column for Column Picker (TradingView-style + at end of table) */}
              <th className="py-1 px-3 text-right w-[40px] min-w-[40px] select-none">
                <button
                  ref={plusBtnRef}
                  type="button"
                  onClick={handleToggleColumnPicker}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ml-auto ${
                    isColumnPickerOpen
                      ? 'bg-white/20 text-white'
                      : 'text-text-muted hover:text-white hover:bg-white/10'
                  }`}
                  title={`Customize ${tableView === 'overview' ? 'Overview' : 'Position Activity'} columns`}
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/[0.05]">
            {displayedTickers.length === 0 ? (
              <tr>
                <td
                  colSpan={25}
                  className="py-12 text-center text-text-muted text-xs bg-black"
                >
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <p className="text-neutral-300 font-medium">No tickers match your active screener filters.</p>
                    <p className="text-neutral-500 text-[11px]">
                      Try adjusting your entry recency, position ROI, or search query.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw size={12} />
                        <span>Reset All Filters</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedTickers.map((item) => {
                const cleanSymbol = item.symbol.replace('.CA', '');
                const champ = tickerChampions?.[cleanSymbol] || tickerChampions?.[item.symbol];
                const isAlphaPos = item.alpha > 0;
                const initials = cleanSymbol.slice(0, 2).toUpperCase();

                return (
                  <tr
                    key={item.symbol}
                    onClick={() => onOpenChart(item.symbol)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group h-10"
                  >
                    {/* 1. Symbol & Circular Logo (pinned left) */}
                    <td className="py-1 px-2 sticky left-0 z-10 bg-[#000000] whitespace-nowrap min-w-[76px] w-[76px]">
                      <div className="flex items-center gap-1.5">
                        {/* Circular Logo */}
                        <div className="w-4.5 h-4.5 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.meta?.logoUrl ? (
                            <img
                              src={item.meta.logoUrl}
                              alt={cleanSymbol}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-[7.5px] font-bold text-white/80">
                              {initials}
                            </span>
                          )}
                        </div>

                        {/* Ticker Pill (truncated if > 4 letters) */}
                        <span
                          className="px-1 py-0.5 rounded-[3px] bg-white/[0.08] group-hover:bg-[#2962FF] group-hover:text-white text-white font-semibold text-[11px] tracking-wide transition-colors truncate max-w-[42px] inline-block text-center"
                          title={cleanSymbol}
                        >
                          {cleanSymbol.length > 4 ? `${cleanSymbol.slice(0, 4)}…` : cleanSymbol}
                        </span>
                      </div>
                    </td>

                    {/* 2. Company Name */}
                    {activeVisibleColumns.has('company') && (
                      <td className="py-1 px-3 whitespace-nowrap min-w-[150px] max-w-[200px]">
                        <span className="text-[12px] text-[#d1d4dc] group-hover:text-white transition-colors truncate block">
                          {item.meta?.companyName || cleanSymbol}
                        </span>
                      </td>
                    )}

                    {/* 3. Algo Position (In Market / Out of Market) */}
                    {activeVisibleColumns.has('setup') && (
                      <td className="py-1 px-3 text-center whitespace-nowrap min-w-[105px]">
                        {item.isOpen ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#089981]/15 text-[#089981] border border-[#089981]/30 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-pulse shrink-0" />
                            <span>In Market{item.isFresh ? ' (New)' : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-neutral-400 border border-white/10 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
                            <span>Out of Market{item.status === 'EXIT_RECENT' ? ' (Exit)' : ''}</span>
                          </span>
                        )}
                      </td>
                    )}

                    {/* Best-Fit Champion Model */}
                    {activeVisibleColumns.has('champion') && (
                      <td className="py-1 px-3 text-center whitespace-nowrap min-w-[110px]">
                        {champ && champ.hasPositiveAlpha ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              champ.champion === 'psi'
                                ? 'bg-[#2962FF]/15 text-[#2962FF] border-[#2962FF]/30'
                                : champ.champion === 'hydra'
                                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {champ.championName}
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">—</span>
                        )}
                      </td>
                    )}

                    {/* ── Position Activity Specific Row Cells ── */}
                    {tableView === 'activity' && (
                      <>
                        {/* Signal Type */}
                        {activeVisibleColumns.has('lastSignal') && (
                          <td className="py-1 px-3 text-center whitespace-nowrap min-w-[70px]">
                            {item.lastSignalType === 'BUY' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/30">
                                BUY
                              </span>
                            ) : item.lastSignalType === 'EXIT' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30">
                                EXIT
                              </span>
                            ) : (
                              <span className="text-text-muted text-[11px]">—</span>
                            )}
                          </td>
                        )}

                        {/* Signal Date */}
                        {activeVisibleColumns.has('signalDate') && (
                          <td className="py-1 px-3 text-center whitespace-nowrap min-w-[100px] tabular-nums text-[11px] text-[#d1d4dc]">
                            {formatSignalDate(item.lastSignalDate)}
                          </td>
                        )}

                        {/* Time in Trade */}
                        {activeVisibleColumns.has('barsHeld') && (
                          <td className="py-1 px-3 text-right tabular-nums text-text-muted text-[11px] whitespace-nowrap min-w-[130px]">
                            {item.barsHeld !== undefined && (item.isOpen || item.barsHeld > 0) ? (
                              <span>{formatTimeInTrade(item.barsHeld, item.isOpen)}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        )}

                        {/* Position ROI */}
                        {activeVisibleColumns.has('tradeReturn') && (
                          <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[95px]">
                            {item.tradeReturnPct !== undefined ? (
                              <span
                                className={`text-[12px] font-semibold ${
                                  item.tradeReturnPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                                }`}
                              >
                                {item.tradeReturnPct >= 0 ? '+' : ''}
                                {item.tradeReturnPct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        )}

                        {/* Position MAE */}
                        {activeVisibleColumns.has('positionMae') && (
                          <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[90px]">
                            {item.positionMae !== undefined && Math.abs(item.positionMae) > 0 ? (
                              <span className="text-[12px] text-[#f23645] font-medium">
                                -{Math.abs(item.positionMae).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted">0.0%</span>
                            )}
                          </td>
                        )}

                        {/* Entry Price */}
                        {activeVisibleColumns.has('entryPrice') && (
                          <td className="py-1 px-3 text-right tabular-nums text-[12px] whitespace-nowrap min-w-[90px] text-[#d1d4dc]">
                            {item.entryPrice && item.entryPrice > 0 ? (
                              <span>
                                {item.entryPrice.toFixed(2)}{' '}
                                <span className="text-[10px] text-text-muted font-normal">EGP</span>
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        )}
                      </>
                    )}

                    {/* Sector / Group */}
                    {activeVisibleColumns.has('group') && (
                      <td className="py-1 px-3 text-text-muted text-[11px] whitespace-nowrap min-w-[110px] truncate max-w-[140px]">
                        {item.group || item.meta?.sector || '—'}
                      </td>
                    )}

                    {/* Price (Current Close) */}
                    {activeVisibleColumns.has('price') && (
                      <td className="py-1 px-3 text-right tabular-nums text-white text-[12px] whitespace-nowrap min-w-[85px]">
                        {item.price > 0 ? (
                          <span>
                            {item.price.toFixed(2)}{' '}
                            <span className="text-[10px] text-text-muted font-normal">EGP</span>
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    )}

                    {/* ── Overview Specific Row Cells ── */}
                    {tableView === 'overview' && (
                      <>
                        {/* Alpha vs B&H */}
                        {activeVisibleColumns.has('alpha') && (
                          <td className="py-1 px-3 text-right tabular-nums bg-white/[0.015] whitespace-nowrap min-w-[105px]">
                            <span
                              className={`text-[12px] font-bold ${
                                isAlphaPos ? 'text-[#089981]' : 'text-[#f23645]'
                              }`}
                            >
                              {isAlphaPos ? '+' : ''}
                              {item.alpha.toFixed(1)}% α
                            </span>
                          </td>
                        )}

                        {/* Strategy ROI */}
                        {activeVisibleColumns.has('sysRoi') && (
                          <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[95px]">
                            <span
                              className={`text-[12px] font-medium ${
                                item.sysRoi >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                              }`}
                            >
                              {item.sysRoi >= 0 ? '+' : ''}
                              {item.sysRoi.toFixed(1)}%
                            </span>
                          </td>
                        )}

                        {/* Buy & Hold ROI */}
                        {activeVisibleColumns.has('bh') && (
                          <td className="py-1 px-3 text-right tabular-nums text-text-muted text-[12px] whitespace-nowrap min-w-[85px]">
                            <span>
                              {item.bh >= 0 ? '+' : ''}
                              {item.bh.toFixed(1)}%
                            </span>
                          </td>
                        )}

                        {/* Status Badge */}
                        {activeVisibleColumns.has('status') && (
                          <td className="py-1 px-3 text-center whitespace-nowrap min-w-[95px]">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold border ${
                                isAlphaPos
                                  ? 'bg-[#089981]/15 text-[#089981] border-[#089981]/30'
                                  : 'bg-[#f23645]/15 text-[#f23645] border-[#f23645]/30'
                              }`}
                            >
                              {isAlphaPos ? 'Beating B&H' : 'Trailing B&H'}
                            </span>
                          </td>
                        )}

                        {/* Max Drawdown (MAE) */}
                        {activeVisibleColumns.has('maxDrawdown') && (
                          <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[80px]">
                            {item.maxDrawdown !== 0 ? (
                              <span className="text-[12px] text-[#f23645] font-medium">
                                {Math.abs(item.maxDrawdown).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        )}

                        {/* Avg Adverse Excursion */}
                        {activeVisibleColumns.has('avgAdverseExcursion') && (
                          <td className="py-1 px-3 text-right tabular-nums text-text-muted text-[11px] whitespace-nowrap min-w-[80px]">
                            {item.avgAdverseExcursion !== 0 ? (
                              <span>
                                {Math.abs(item.avgAdverseExcursion).toFixed(1)}%
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        )}

                        {/* Avg Bars Held */}
                        {activeVisibleColumns.has('avgBarsHeld') && (
                          <td className="py-1 px-3 text-right tabular-nums text-text-muted text-[11px] whitespace-nowrap min-w-[80px]">
                            {item.avgBarsHeld > 0 ? (
                              <span>{item.avgBarsHeld.toFixed(0)} bars</span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        )}
                      </>
                    )}

                    {/* Win Rate */}
                    {activeVisibleColumns.has('winRate') && (
                      <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[80px]">
                        {item.winRate > 0 ? (
                          <span
                            className={`text-[12px] font-medium ${
                              item.winRate >= 50 ? 'text-emerald-400' : 'text-text-muted'
                            }`}
                          >
                            {item.winRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    )}

                    {/* Trades Count */}
                    {activeVisibleColumns.has('tradesCount') && (
                      <td className="py-1 px-3 text-right tabular-nums text-text-muted text-[11px] whitespace-nowrap min-w-[70px]">
                        {item.tradesCount > 0 ? item.tradesCount : '—'}
                      </td>
                    )}

                    {/* Optional Cumulative ROI in Activity View */}
                    {tableView === 'activity' && activeVisibleColumns.has('alpha') && (
                      <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[105px]">
                        <span
                          className={`text-[12px] font-bold ${
                            isAlphaPos ? 'text-[#089981]' : 'text-[#f23645]'
                          }`}
                        >
                          {isAlphaPos ? '+' : ''}
                          {item.alpha.toFixed(1)}% α
                        </span>
                      </td>
                    )}
                    {tableView === 'activity' && activeVisibleColumns.has('sysRoi') && (
                      <td className="py-1 px-3 text-right tabular-nums whitespace-nowrap min-w-[95px]">
                        <span
                          className={`text-[12px] font-medium ${
                            item.sysRoi >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                          }`}
                        >
                          {item.sysRoi >= 0 ? '+' : ''}
                          {item.sysRoi.toFixed(1)}%
                        </span>
                      </td>
                    )}

                    {/* Action Column */}
                    <td className="py-1 px-3 text-right whitespace-nowrap w-[40px] min-w-[40px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChart(item.symbol);
                        }}
                        className="p-1 rounded text-text-muted hover:text-white transition-colors cursor-pointer inline-flex items-center"
                        title="View Interactive Chart"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Column Picker Popover Modal (Anchored to the + button) */}
      {isColumnPickerOpen && (
        <div
          ref={columnPickerRef}
          key={`col-picker-${tableView}`}
          style={{
            position: 'fixed',
            top: `${(plusBtnRect?.bottom ?? 0) + 6}px`,
            right: `${
              typeof window !== 'undefined' && plusBtnRect
                ? Math.max(12, window.innerWidth - plusBtnRect.right)
                : 16
            }px`,
            zIndex: 9999,
          }}
          className="w-64 bg-[#000000] border border-white/15 rounded-xl shadow-2xl p-3 text-left font-sans animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Customize Columns</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white/90 border border-white/15">
                {tableView === 'overview' ? 'Overview' : 'Position Activity'}
              </span>
            </div>
            <button
              type="button"
              onClick={resetColumnsToDefault}
              className="text-[10px] text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
          <p className="text-[10px] text-text-muted pb-2">
            Select columns to show in {tableView === 'overview' ? 'Overview' : 'Position Activity'} mode:
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {activeAvailableColumns.map((col) => {
              const isVisible = activeVisibleColumns.has(col.id);
              return (
                <label
                  key={`${tableView}-${col.id}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer transition-colors text-xs select-none"
                >
                  <span className={isVisible ? 'text-white font-medium' : 'text-text-muted'}>
                    {col.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(col.id)}
                    className="rounded border-white/20 bg-black text-[#2962FF] focus:ring-0 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
