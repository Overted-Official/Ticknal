'use client';

import React, { Fragment, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Table as TableIcon,
  BarChart2,
  LayoutGrid,
  Plus,
  Search,
  X,
} from '@/components/ui/icon-library';
import { DesktopOrdersSkeleton } from '@/components/platform/OrdersSkeleton';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import {
  type OrderRow,
  type GroupedOrder,
  type SortField,
  type SortDirection,
  formatQuantity,
} from './positionsTypes';

export type ScreenerTab = 'custom' | 'overview' | 'performance' | 'lots' | 'targets';

function TickerLogo({
  symbol,
  logoUrl,
}: {
  symbol: string;
  logoUrl?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = symbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  return (
    <div className="w-6 h-6 rounded-full bg-[#1f1f1f] border border-[#2e2e2e] shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={cleanSymbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span className="text-[9px] font-bold font-mono text-white/90">
          {initial}
        </span>
      )}
    </div>
  );
}

interface PositionsDataTableWidgetProps {
  loading: boolean;
  sortedGroupedOrders: GroupedOrder[];
  filter: 'ALL' | 'OPEN' | 'CLOSED';
  onFilterChange?: (filter: 'ALL' | 'OPEN' | 'CLOSED') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  deletingId: number | null;
  onConfirmDelete: (id: number) => void;
  onCloseOrder: (order: OrderRow) => void;
  onEditOrder: (order: OrderRow) => void;
  onDeleteOrder: (order: OrderRow) => void;
  onAddPosition?: () => void;
}

export default function PositionsDataTableWidget({
  loading,
  sortedGroupedOrders,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  sortField,
  sortDirection,
  onSort,
  expandedKeys,
  onToggleExpand,
  deletingId,
  onConfirmDelete,
  onCloseOrder,
  onEditOrder,
  onDeleteOrder,
  onAddPosition,
}: PositionsDataTableWidgetProps) {
  const { isPrivacy } = usePrivacyMode();
  const [activeTab, setActiveTab] = useState<ScreenerTab>('custom');
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'grid'>('table');
  const [localSearch, setLocalSearch] = useState('');

  const searchVal = searchQuery !== undefined ? searchQuery : localSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const formatMoney = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) {
      if (value === 0) return '••••••';
      const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
      return `${sign}••••••`;
    }
    if (value === 0) return '0.00';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted}`;
  };

  const formatPriceVal = (value: number): string => {
    if (isPrivacy) return '••••••';
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Filter orders by search if managed locally
  const displayedOrders = useMemo(() => {
    if (searchQuery !== undefined || !localSearch.trim()) return sortedGroupedOrders;
    const q = localSearch.toLowerCase().trim();
    return sortedGroupedOrders.filter(
      (g) =>
        g.tickerSymbol.toLowerCase().includes(q) ||
        g.companyName.toLowerCase().includes(q) ||
        g.sector.toLowerCase().includes(q)
    );
  }, [sortedGroupedOrders, localSearch, searchQuery]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-[11px] text-white inline-block">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div
      className="hidden md:flex flex-col w-full min-w-0 bg-[#000000] text-[#dbdbdb] select-none border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl relative"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
        fontFeatureSettings: '"tnum" on, "lnum" on',
      }}
    >
      {/* 1. TradingView Screener Top Navigation Rail with Co-Located Search, Filter Pills & Add CTA */}
      <div className="h-[48px] px-3 flex items-center justify-between border-b border-[#2e2e2e] bg-[#000000] shrink-0 gap-3">
        {/* Left: View Modes + Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* View Toggles: [Table] [Chart] [Heatmap] */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#1f1f1f] border border-[#3d3d3d] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#2e2e2e] text-white shadow-xs' : 'text-[#8c8c8c] hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
            </button>
            <Link
              href="/invest"
              className="p-1.5 rounded text-xs text-[#8c8c8c] hover:text-white transition-colors"
              title="Chart Analysis"
            >
              <BarChart2 size={14} />
            </Link>
            <Link
              href="/dashboard?tab=investments"
              className="p-1.5 rounded text-xs text-[#8c8c8c] hover:text-white transition-colors"
              title="Allocation Grid"
            >
              <LayoutGrid size={14} />
            </Link>
          </div>

          <div className="h-4 w-px bg-[#2e2e2e] shrink-0 mx-0.5" />

          {/* Category Tabs: Custom, Overview, Performance, Execution Lots, Targets & Stops */}
          <div className="flex items-center gap-1 shrink-0">
            {(
              [
                { id: 'custom', label: 'Custom' },
                { id: 'overview', label: 'Overview' },
                { id: 'performance', label: 'Performance' },
                { id: 'lots', label: 'Execution Lots' },
                { id: 'targets', label: 'Targets & Stops' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#2e2e2e] text-white border border-[#3d3d3d] font-semibold'
                    : 'text-[#8c8c8c] hover:text-white font-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Filter Input + All/Open/Closed Switch + Add Position CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Table Search Input */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-[#8c8c8c] pointer-events-none" />
            <input
              type="text"
              placeholder="Filter symbol..."
              value={searchVal}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-7 w-32 lg:w-44 bg-[#1f1f1f] border border-[#3d3d3d] rounded pl-7 pr-6 text-xs text-[#dbdbdb] placeholder:text-[#8c8c8c] focus:outline-none focus:border-[#2962ff]"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-1.5 text-[#8c8c8c] hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* All | Open | Closed Status Filter Switch */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#1f1f1f] border border-[#3d3d3d] shrink-0">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilterChange?.(value)}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                  filter === value
                    ? 'bg-[#2e2e2e] text-white shadow-xs'
                    : 'text-[#8c8c8c] hover:text-white'
                }`}
              >
                {value === 'ALL' ? 'All' : value === 'OPEN' ? 'Open' : 'Closed'}
              </button>
            ))}
          </div>

          {/* + Add Position Button */}
          {onAddPosition && (
            <button
              type="button"
              onClick={onAddPosition}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2962ff] text-white hover:bg-[#1e53e5] transition-all shadow-xs cursor-pointer shrink-0"
              title="Add Tracked Position"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Position</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TradingView Screener Table */}
      <div className="w-full min-w-0 flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header: Exactly 44px height, uppercase muted labels with counts */}
          <thead className="sticky top-0 z-10 bg-[#000000] border-b border-[#2e2e2e] text-[#8c8c8c] font-normal text-[11px]">
            <tr className="h-[44px]">
              {/* Symbol & Count Header */}
              <th
                className="py-1 px-3 cursor-pointer select-none group hover:text-white transition-colors min-w-[220px]"
                onClick={() => onSort('ticker')}
              >
                <div className="flex items-center gap-2">
                  <Search size={12} className="text-[#8c8c8c] opacity-80" />
                  <div className="flex flex-col leading-tight">
                    <span className="flex items-center">
                      Symbol
                      {renderSortIndicator('ticker')}
                    </span>
                    <span className="text-[10px] text-[#707070] font-normal">
                      {displayedOrders.length}
                    </span>
                  </div>
                </div>
              </th>

              {/* Sector */}
              <th className="py-1 px-3 min-w-[130px]">
                <span>Sector</span>
              </th>

              {/* Price */}
              <th
                className="py-1 px-3 text-right cursor-pointer select-none group hover:text-white transition-colors min-w-[100px]"
                onClick={() => onSort('current')}
              >
                <div className="flex items-center justify-end">
                  <span>Price</span>
                  {renderSortIndicator('current')}
                </div>
              </th>

              {/* Mkt Cap / Mkt Value */}
              <th
                className="py-1 px-3 text-right cursor-pointer select-none group hover:text-white transition-colors min-w-[120px]"
                onClick={() => onSort('mktValue')}
              >
                <div className="flex items-center justify-end">
                  <span>↓ Mkt value</span>
                  {renderSortIndicator('mktValue')}
                </div>
              </th>

              {/* Avg Entry */}
              {(activeTab === 'custom' || activeTab === 'performance' || activeTab === 'lots') && (
                <th
                  className="py-1 px-3 text-right cursor-pointer select-none group hover:text-white transition-colors min-w-[100px]"
                  onClick={() => onSort('entry')}
                >
                  <div className="flex items-center justify-end">
                    <span>Avg Entry</span>
                    {renderSortIndicator('entry')}
                  </div>
                </th>
              )}

              {/* Target / Stop */}
              {(activeTab === 'custom' || activeTab === 'performance' || activeTab === 'targets') && (
                <th
                  className="py-1 px-3 text-right cursor-pointer select-none group hover:text-white transition-colors min-w-[110px]"
                  onClick={() => onSort('target')}
                >
                  <div className="flex items-center justify-end">
                    <span>Target / Stop</span>
                    {renderSortIndicator('target')}
                  </div>
                </th>
              )}

              {/* Qty */}
              {(activeTab === 'custom' || activeTab === 'overview' || activeTab === 'lots') && (
                <th
                  className="py-1 px-3 text-right cursor-pointer select-none group hover:text-white transition-colors min-w-[90px]"
                  onClick={() => onSort('quantity')}
                >
                  <div className="flex items-center justify-end">
                    <span>Total Qty</span>
                    {renderSortIndicator('quantity')}
                  </div>
                </th>
              )}

              {/* Total P/L */}
              <th
                className="py-1 px-3 text-right cursor-pointer select-none group hover:text-white transition-colors min-w-[110px]"
                onClick={() => onSort('pl')}
              >
                <div className="flex items-center justify-end">
                  <span>Total P/L</span>
                  {renderSortIndicator('pl')}
                </div>
              </th>

              {/* Return % (Perf %) */}
              <th className="py-1 px-3 text-right min-w-[95px]">
                <span>Perf %</span>
              </th>

              {/* Actions Header */}
              <th className="py-1 px-3 text-right w-[90px]">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          {/* Table Body: Exactly 40px cell height, hover bg-[#1f1f1f], border-[#1f1f1f] */}
          <tbody className="divide-y divide-[#1f1f1f]">
            {loading ? (
              <DesktopOrdersSkeleton />
            ) : displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-[#8c8c8c] text-xs">
                  No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
                </td>
              </tr>
            ) : (
              displayedOrders.map((group) => {
                const isMulti = group.orders.length > 1;
                const isExpanded = expandedKeys.has(group.key) || activeTab === 'lots';
                const isPositive = group.totalProfitLoss >= 0;
                const cleanSymbol = group.tickerSymbol.replace('.CA', '').trim().toUpperCase();

                return (
                  <Fragment key={group.key}>
                    {/* Main Row */}
                    <tr className="h-[40px] hover:bg-[#1f1f1f] transition-colors group">
                      {/* Column 1: Marker + Logo + Ticker Capsule + Company Name */}
                      <td className="py-1 px-3">
                        <div className="flex items-center min-w-0">
                          {/* Status indicator square on left: Green for OPEN, Red for CLOSED */}
                          <div
                            className={`w-1.5 h-3.5 rounded-[2px] mr-2 shrink-0 transition-colors ${
                              group.status === 'OPEN' ? 'bg-[#22ab94]' : 'bg-[#f7525f]'
                            }`}
                            title={group.status === 'OPEN' ? 'Open Position' : 'Closed Position'}
                          />

                          {/* Multi-lot expand button */}
                          {isMulti ? (
                            <button
                              type="button"
                              onClick={() => onToggleExpand(group.key)}
                              className="p-0.5 -ml-1 mr-1 text-[#8c8c8c] hover:text-white transition-colors cursor-pointer shrink-0"
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          ) : (
                            <div className="w-3 shrink-0" />
                          )}

                          {/* Circular Logo */}
                          <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} />

                          {/* Ticker Capsule Pill */}
                          <Link
                            href={`/invest?ticker=${group.tickerSymbol}&view=chart&timeframe=D`}
                            className="ml-2 px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#dbdbdb] text-[11px] font-mono font-bold tracking-wider hover:text-white hover:border-[#4a4a4a] transition-colors shrink-0"
                          >
                            {cleanSymbol}
                          </Link>

                          {/* Company Name */}
                          <span className="ml-2 text-xs text-[#dbdbdb] truncate max-w-[150px] lg:max-w-[190px] hover:text-white transition-colors">
                            {group.companyName || cleanSymbol}
                          </span>

                          {/* Multi-lot Badge */}
                          {isMulti && (
                            <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-[#2962ff]/10 text-[#2962ff] border border-[#2962ff]/20 shrink-0">
                              {group.orders.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Sector */}
                      <td className="py-1 px-3">
                        <span className="text-xs text-[#8c8c8c] truncate max-w-[120px] block">
                          {group.sector || 'Finance'}
                        </span>
                      </td>

                      {/* Column 3: Price */}
                      <td className="py-1 px-3 text-right tabular-nums">
                        <span className="text-xs text-[#dbdbdb] font-normal">
                          {formatPriceVal(group.currentPrice)}
                        </span>
                        <span className="text-[10px] text-[#8c8c8c] ml-1">EGP</span>
                      </td>

                      {/* Column 4: Mkt Value */}
                      <td className="py-1 px-3 text-right tabular-nums">
                        {group.status === 'OPEN' ? (
                          <>
                            <span className="text-xs text-[#dbdbdb] font-normal">
                              {formatMoney(group.totalMktValue)}
                            </span>
                            <span className="text-[10px] text-[#8c8c8c] ml-1">EGP</span>
                          </>
                        ) : (
                          <span className="text-[#8c8c8c]">—</span>
                        )}
                      </td>

                      {/* Column 5: Avg Entry */}
                      {(activeTab === 'custom' || activeTab === 'performance' || activeTab === 'lots') && (
                        <td className="py-1 px-3 text-right tabular-nums">
                          <span className="text-xs text-[#dbdbdb] font-normal">
                            {formatPriceVal(group.avgEntryPrice)}
                          </span>
                          <span className="text-[10px] text-[#8c8c8c] ml-1">EGP</span>
                        </td>
                      )}

                      {/* Column 6: Target / Stop */}
                      {(activeTab === 'custom' || activeTab === 'performance' || activeTab === 'targets') && (
                        <td className="py-1 px-3 text-right tabular-nums">
                          {group.targetPrice ? (
                            <span className="text-xs text-[#22ab94]">
                              {formatPriceVal(group.targetPrice)}
                            </span>
                          ) : (
                            <span className="text-[#8c8c8c]">—</span>
                          )}
                          {group.stopPrice && (
                            <span className="text-[10px] text-[#f7525f] ml-1.5">
                              /{formatPriceVal(group.stopPrice)}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Column 7: Qty */}
                      {(activeTab === 'custom' || activeTab === 'overview' || activeTab === 'lots') && (
                        <td className="py-1 px-3 text-right tabular-nums text-xs text-[#dbdbdb]">
                          {formatQuantity(group.totalQuantity)}
                        </td>
                      )}

                      {/* Column 8: Total P/L */}
                      <td className="py-1 px-3 text-right tabular-nums">
                        <span
                          className={`text-xs font-medium ${
                            group.totalProfitLoss > 0
                              ? 'text-[#22ab94]'
                              : group.totalProfitLoss < 0
                              ? 'text-[#f7525f]'
                              : 'text-[#8c8c8c]'
                          }`}
                        >
                          {formatMoney(group.totalProfitLoss, true)}
                        </span>
                        <span className="text-[10px] text-[#8c8c8c] ml-1">EGP</span>
                      </td>

                      {/* Column 9: Perf % */}
                      <td className="py-1 px-3 text-right tabular-nums">
                        <span
                          className={`text-xs font-medium ${
                            isPositive ? 'text-[#22ab94]' : 'text-[#f7525f]'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {group.totalProfitLossPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Column 10: Actions */}
                      <td className="py-1 px-3 text-right">
                        {!isMulti ? (
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {group.orders[0].status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => onCloseOrder(group.orders[0])}
                                className="p-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-[#22ab94] hover:border-[#22ab94]/40 transition-all cursor-pointer"
                                title="Close Position"
                              >
                                <CheckCircle size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEditOrder(group.orders[0])}
                              className="p-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-white hover:border-[#4a4a4a] transition-all cursor-pointer"
                              title="Edit Position"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (deletingId === group.orders[0].id) {
                                  onDeleteOrder(group.orders[0]);
                                } else {
                                  onConfirmDelete(group.orders[0].id);
                                }
                              }}
                              className="p-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-[#f7525f] hover:border-[#f7525f]/40 transition-all cursor-pointer"
                              title="Delete Position"
                            >
                              {deletingId === group.orders[0].id ? (
                                <span className="text-[9px] text-[#f7525f] font-bold px-0.5">Sure?</span>
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#707070]">
                            {isExpanded ? 'Expanded' : `${group.orders.length} lots`}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Multi-Lot Child Rows */}
                    {isMulti &&
                      isExpanded &&
                      group.orders.map((subOrder) => {
                        const isSubPositive = subOrder.profitLoss >= 0;
                        const subProfitLossPct =
                          subOrder.entryPrice > 0
                            ? ((subOrder.currentPrice - subOrder.entryPrice) / subOrder.entryPrice) * 100
                            : 0;

                        return (
                          <tr
                            key={subOrder.id}
                            className="h-[36px] bg-[#0c0c0c] hover:bg-[#1f1f1f] transition-colors text-[11px]"
                          >
                            {/* Lot indicator + ID */}
                            <td className="py-1 pl-8 pr-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    subOrder.status === 'OPEN' ? 'bg-[#22ab94]' : 'bg-[#f7525f]'
                                  }`}
                                />
                                <span className="font-mono text-[#8c8c8c]">
                                  Lot #{subOrder.id}
                                </span>
                                <span className="text-[10px] text-[#707070]">
                                  · {subOrder.entryDate}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-1 px-3">
                              <span className="text-[10px] text-[#8c8c8c]">
                                {subOrder.status}
                              </span>
                            </td>

                            {/* Current Price */}
                            <td className="py-1 px-3 text-right tabular-nums text-[#dbdbdb]">
                              {formatPriceVal(subOrder.currentPrice)}
                              <span className="text-[9px] text-[#8c8c8c] ml-1">EGP</span>
                            </td>

                            {/* Mkt Value */}
                            <td className="py-1 px-3 text-right tabular-nums text-[#dbdbdb]">
                              {subOrder.status === 'OPEN' ? (
                                <>
                                  {formatMoney(subOrder.currentPrice * subOrder.quantity)}
                                  <span className="text-[9px] text-[#8c8c8c] ml-1">EGP</span>
                                </>
                              ) : (
                                <span className="text-[#8c8c8c]">—</span>
                              )}
                            </td>

                            {/* Avg Entry */}
                            {(activeTab === 'custom' || activeTab === 'performance' || activeTab === 'lots') && (
                              <td className="py-1 px-3 text-right tabular-nums text-[#dbdbdb]">
                                {formatPriceVal(subOrder.entryPrice)}
                                <span className="text-[9px] text-[#8c8c8c] ml-1">EGP</span>
                              </td>
                            )}

                            {/* Target / Stop */}
                            {(activeTab === 'custom' || activeTab === 'performance' || activeTab === 'targets') && (
                              <td className="py-1 px-3 text-right tabular-nums">
                                {subOrder.targetPrice ? (
                                  <span className="text-[#22ab94]">
                                    {formatPriceVal(subOrder.targetPrice)}
                                  </span>
                                ) : (
                                  <span className="text-[#8c8c8c]">—</span>
                                )}
                                {subOrder.stopPrice && (
                                  <span className="text-[#f7525f] ml-1">
                                    /{formatPriceVal(subOrder.stopPrice)}
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Qty */}
                            {(activeTab === 'custom' || activeTab === 'overview' || activeTab === 'lots') && (
                              <td className="py-1 px-3 text-right tabular-nums text-[#dbdbdb]">
                                {formatQuantity(subOrder.quantity)}
                              </td>
                            )}

                            {/* Total P/L */}
                            <td className="py-1 px-3 text-right tabular-nums">
                              <span
                                className={`font-medium ${
                                  subOrder.profitLoss > 0
                                    ? 'text-[#22ab94]'
                                    : subOrder.profitLoss < 0
                                    ? 'text-[#f7525f]'
                                    : 'text-[#8c8c8c]'
                                }`}
                              >
                                {formatMoney(subOrder.profitLoss, true)}
                              </span>
                              <span className="text-[9px] text-[#8c8c8c] ml-1">EGP</span>
                            </td>

                            {/* Return % */}
                            <td className="py-1 px-3 text-right tabular-nums">
                              <span
                                className={`font-medium ${
                                  isSubPositive ? 'text-[#22ab94]' : 'text-[#f7525f]'
                                }`}
                              >
                                {isSubPositive ? '+' : ''}
                                {subProfitLossPct.toFixed(2)}%
                              </span>
                            </td>

                            {/* Lot Actions */}
                            <td className="py-1 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {subOrder.status === 'OPEN' && (
                                  <button
                                    type="button"
                                    onClick={() => onCloseOrder(subOrder)}
                                    className="p-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-[#22ab94] hover:border-[#22ab94]/40 transition-all cursor-pointer"
                                    title="Close Lot"
                                  >
                                    <CheckCircle size={11} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onEditOrder(subOrder)}
                                  className="p-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-white hover:border-[#4a4a4a] transition-all cursor-pointer"
                                  title="Edit Lot"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (deletingId === subOrder.id) {
                                      onDeleteOrder(subOrder);
                                    } else {
                                      onConfirmDelete(subOrder.id);
                                    }
                                  }}
                                  className="p-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-[#f7525f] hover:border-[#f7525f]/40 transition-all cursor-pointer"
                                  title="Delete Lot"
                                >
                                  {deletingId === subOrder.id ? (
                                    <span className="text-[8px] text-[#f7525f] font-bold px-0.5">Sure?</span>
                                  ) : (
                                    <Trash2 size={11} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
