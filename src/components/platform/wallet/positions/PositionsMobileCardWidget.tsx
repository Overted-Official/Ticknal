'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Pencil,
  Trash2,
  ChevronRight,
  X,
  ExternalLink,
  TrendingUp,
  Search,
  Plus,
} from '@/components/ui/icon-library';
import { MobileOrdersSkeleton } from '@/components/platform/OrdersSkeleton';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import {
  type OrderRow,
  type GroupedOrder,
  formatQuantity,
} from './positionsTypes';

function TickerLogo({
  symbol,
  logoUrl,
  size = 'sm',
}: {
  symbol: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'md' ? 'w-8 h-8' : 'w-7 h-7';
  const cleanSymbol = symbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#1f1f1f] border border-[#2e2e2e] shrink-0 flex items-center justify-center overflow-hidden shadow-xs`}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={cleanSymbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span className="text-[10px] font-bold font-mono text-white/90">
          {initial}
        </span>
      )}
    </div>
  );
}

interface PositionsMobileCardWidgetProps {
  loading: boolean;
  sortedGroupedOrders: GroupedOrder[];
  filter: 'ALL' | 'OPEN' | 'CLOSED';
  onFilterChange?: (filter: 'ALL' | 'OPEN' | 'CLOSED') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddPosition?: () => void;
  onCloseOrder?: (order: OrderRow) => void;
  onEditOrder?: (order: OrderRow) => void;
  onDeleteOrder?: (order: OrderRow) => void;
  deletingId?: number | null;
  onConfirmDelete?: (id: number) => void;
}

export default function PositionsMobileCardWidget({
  loading,
  sortedGroupedOrders,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onAddPosition,
  onCloseOrder,
  onEditOrder,
  onDeleteOrder,
  deletingId,
  onConfirmDelete,
}: PositionsMobileCardWidgetProps) {
  const { isPrivacy } = usePrivacyMode();
  const [selectedGroup, setSelectedGroup] = useState<GroupedOrder | null>(null);

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

  return (
    <div
      className="md:hidden w-full min-w-0"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
        fontFeatureSettings: '"tnum" on, "lnum" on',
      }}
    >
      {/* Mobile Controls Bar (Search + Add Position + Status Switch) */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8c8c8c]" />
            <input
              type="text"
              placeholder="Filter symbol or company..."
              value={searchQuery ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full h-8 pl-8 pr-7 bg-[#141414] hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] border border-[#2e2e2e] focus:border-[#2962ff] rounded-lg text-xs text-[#dbdbdb] placeholder-[#707070] outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8c8c8c] hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Add Position Button */}
          {onAddPosition && (
            <button
              type="button"
              onClick={onAddPosition}
              className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold rounded-lg bg-[#2962ff] text-white hover:bg-[#1e53e5] transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Status Switch Tabs */}
        {onFilterChange && (
          <div className="flex items-center justify-between">
            <div className="inline-flex p-0.5 rounded-lg bg-[#141414] border border-[#2e2e2e]">
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFilterChange(value)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                    filter === value
                      ? 'bg-[#2e2e2e] text-white shadow-xs'
                      : 'text-[#8c8c8c] hover:text-white'
                  }`}
                >
                  {value === 'ALL' ? 'All' : value === 'OPEN' ? 'Open' : 'Closed'}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-[#8c8c8c] font-medium">
              {sortedGroupedOrders.length} {sortedGroupedOrders.length === 1 ? 'ticker' : 'tickers'}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <MobileOrdersSkeleton />
      ) : sortedGroupedOrders.length === 0 ? (
        <div className="py-14 text-center text-[#8c8c8c] text-xs bg-[#000000] border border-[#2e2e2e] rounded-xl">
          No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
        </div>
      ) : (
        /* High-Level Simplified Summary List */
        <div className="flex flex-col divide-y divide-[#1f1f1f] bg-[#000000] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
          {sortedGroupedOrders.map((group) => {
            const isMulti = group.orders.length > 1;
            const isPositive = group.totalProfitLoss >= 0;
            const cleanSymbol = group.tickerSymbol.replace('.CA', '').trim().toUpperCase();

            return (
              <div
                key={group.key}
                onClick={() => setSelectedGroup(group)}
                className="h-[56px] px-3 flex items-center justify-between hover:bg-[#1f1f1f] active:bg-[#2e2e2e] transition-colors cursor-pointer select-none"
              >
                {/* Left Side: Status Marker + Logo + Ticker + Name */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {/* Status Indicator Square: Green for OPEN, Red for CLOSED */}
                  <div
                    className={`w-1.5 h-4 rounded-[2px] mr-0.5 shrink-0 ${
                      group.status === 'OPEN' ? 'bg-[#22ab94]' : 'bg-[#f7525f]'
                    }`}
                  />

                  <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="sm" />

                  <div className="flex flex-col min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-white text-[11px] font-mono font-bold tracking-wider shrink-0">
                        {cleanSymbol}
                      </span>
                      <span className="text-xs text-[#dbdbdb] font-normal truncate max-w-[110px] sm:max-w-[150px]">
                        {group.companyName || cleanSymbol}
                      </span>
                      {isMulti && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-[#2962ff]/15 text-[#2962ff] border border-[#2962ff]/25 shrink-0">
                          {group.orders.length}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[#8c8c8c] truncate mt-0.5">
                      {formatQuantity(group.totalQuantity)} shares
                      {group.status === 'OPEN'
                        ? ` · ${formatMoney(group.totalMktValue)} EGP`
                        : ' · Closed'}
                    </div>
                  </div>
                </div>

                {/* Right Side: Current Price + Return % + Chevron */}
                <div className="flex items-center gap-2 shrink-0 pl-1">
                  <div className="flex flex-col items-end leading-tight text-right">
                    <div className="text-xs text-[#dbdbdb] font-normal tabular-nums">
                      {formatPriceVal(group.currentPrice)}
                      <span className="text-[9px] text-[#8c8c8c] ml-1">EGP</span>
                    </div>

                    <div
                      className={`text-[11px] font-semibold tabular-nums mt-0.5 ${
                        isPositive ? 'text-[#22ab94]' : 'text-[#f7525f]'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {group.totalProfitLossPct.toFixed(2)}%
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-[#8c8c8c] shrink-0 opacity-70" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep-Dive Detail Bottom Drawer for Phone */}
      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 z-modal flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedGroup(null)}
            />

            {/* Slide-Up Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-modal-content w-full max-h-[85vh] bg-[#000000] border-t border-[#2e2e2e] rounded-t-2xl shadow-2xl flex flex-col text-[#dbdbdb] overflow-hidden"
            >
              {/* Drag Handle Bar */}
              <div className="w-10 h-1 rounded-full bg-[#3d3d3d] mx-auto mt-2.5 mb-1.5 shrink-0" />

              {/* Drawer Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-[#1f1f1f] bg-[#000000] shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TickerLogo
                    symbol={selectedGroup.tickerSymbol}
                    logoUrl={selectedGroup.logoUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-white tracking-tight">
                        {selectedGroup.tickerSymbol.replace('.CA', '')}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                          selectedGroup.status === 'OPEN'
                            ? 'bg-[#22ab94]/15 text-[#22ab94] border border-[#22ab94]/30'
                            : 'bg-[#f7525f]/15 text-[#f7525f] border border-[#f7525f]/30'
                        }`}
                      >
                        {selectedGroup.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#8c8c8c] truncate">
                      {selectedGroup.companyName} · {selectedGroup.sector || 'Equities'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/invest?ticker=${selectedGroup.tickerSymbol}&view=chart&timeframe=D`}
                    className="p-1.5 rounded-lg bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-white transition-colors"
                    title="Open Chart"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="p-1.5 rounded-lg bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar text-xs">
                {/* Hero P/L Banner Card */}
                <div className="p-3.5 rounded-xl bg-[#0c0c0c] border border-[#2e2e2e] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#8c8c8c] uppercase tracking-wider block">
                      Total Profit / Loss
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span
                        className={`text-lg font-bold tabular-nums ${
                          selectedGroup.totalProfitLoss > 0
                            ? 'text-[#22ab94]'
                            : selectedGroup.totalProfitLoss < 0
                            ? 'text-[#f7525f]'
                            : 'text-[#8c8c8c]'
                        }`}
                      >
                        {formatMoney(selectedGroup.totalProfitLoss, true)}
                      </span>
                      <span className="text-[11px] text-[#8c8c8c]">EGP</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#8c8c8c] uppercase tracking-wider block">
                      Return (Perf %)
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tabular-nums mt-0.5 ${
                        selectedGroup.totalProfitLoss >= 0
                          ? 'bg-[#22ab94]/15 text-[#22ab94] border border-[#22ab94]/30'
                          : 'bg-[#f7525f]/15 text-[#f7525f] border border-[#f7525f]/30'
                      }`}
                    >
                      {selectedGroup.totalProfitLoss >= 0 ? '+' : ''}
                      {selectedGroup.totalProfitLossPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Complete Stats Grid (Preserving 100% of information) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Market Value */}
                  <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                    <span className="text-[10px] text-[#8c8c8c] block">Market Value</span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {selectedGroup.status === 'OPEN'
                        ? `${formatMoney(selectedGroup.totalMktValue)} EGP`
                        : '—'}
                    </span>
                  </div>

                  {/* Current Price */}
                  <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                    <span className="text-[10px] text-[#8c8c8c] block">Current Price</span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {formatPriceVal(selectedGroup.currentPrice)} EGP
                    </span>
                  </div>

                  {/* Avg Entry */}
                  <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                    <span className="text-[10px] text-[#8c8c8c] block">Average Entry</span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {formatPriceVal(selectedGroup.avgEntryPrice)} EGP
                    </span>
                    <span className="text-[9px] text-[#707070] block mt-0.5">
                      {selectedGroup.orders.length > 1
                        ? `${selectedGroup.firstEntryDate} → ${selectedGroup.lastEntryDate}`
                        : selectedGroup.orders[0].entryDate}
                    </span>
                  </div>

                  {/* Total Quantity */}
                  <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                    <span className="text-[10px] text-[#8c8c8c] block">Total Shares</span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {formatQuantity(selectedGroup.totalQuantity)} shs
                    </span>
                    <span className="text-[9px] text-[#707070] block mt-0.5">
                      {selectedGroup.orders.length} execution lot{selectedGroup.orders.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Target Price */}
                  <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                    <span className="text-[10px] text-[#8c8c8c] block">Target Price</span>
                    <span className="text-sm font-semibold text-[#22ab94] tabular-nums">
                      {selectedGroup.targetPrice
                        ? `${formatPriceVal(selectedGroup.targetPrice)} EGP`
                        : '—'}
                    </span>
                  </div>

                  {/* Stop Loss */}
                  <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                    <span className="text-[10px] text-[#8c8c8c] block">Stop Loss</span>
                    <span className="text-sm font-semibold text-[#f7525f] tabular-nums">
                      {selectedGroup.stopPrice
                        ? `${formatPriceVal(selectedGroup.stopPrice)} EGP`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Individual Lots Section */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#8c8c8c] uppercase tracking-wider">
                    <span>Individual Execution Lots ({selectedGroup.orders.length})</span>
                    <span className="text-[10px] text-[#707070] font-normal">
                      Order details & actions
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedGroup.orders.map((subOrder) => {
                      const isSubPositive = subOrder.profitLoss >= 0;
                      const subProfitLossPct =
                        subOrder.entryPrice > 0
                          ? ((subOrder.currentPrice - subOrder.entryPrice) / subOrder.entryPrice) * 100
                          : 0;

                      return (
                        <div
                          key={subOrder.id}
                          className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-3 space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-3 rounded-[2px] shrink-0 ${
                                  subOrder.status === 'OPEN' ? 'bg-[#22ab94]' : 'bg-[#f7525f]'
                                }`}
                              />
                              <span className="font-mono text-white font-medium text-xs">
                                Lot #{subOrder.id}
                              </span>
                              <span className="text-[10px] text-[#8c8c8c]">
                                · {subOrder.entryDate}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded ${
                                subOrder.status === 'OPEN'
                                  ? 'bg-[#22ab94]/15 text-[#22ab94]'
                                  : 'bg-[#f7525f]/15 text-[#f7525f]'
                              }`}
                            >
                              {subOrder.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-[9px] text-[#8c8c8c] block">Entry</span>
                              <span className="text-[#dbdbdb] font-normal tabular-nums">
                                {formatPriceVal(subOrder.entryPrice)} EGP
                              </span>
                            </div>

                            <div className="text-center">
                              <span className="text-[9px] text-[#8c8c8c] block">Quantity</span>
                              <span className="text-[#dbdbdb] font-normal tabular-nums">
                                {formatQuantity(subOrder.quantity)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-[#8c8c8c] block">P/L & Return</span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  subOrder.profitLoss > 0
                                    ? 'text-[#22ab94]'
                                    : subOrder.profitLoss < 0
                                    ? 'text-[#f7525f]'
                                    : 'text-[#8c8c8c]'
                                }`}
                              >
                                {isSubPositive ? '+' : ''}
                                {subProfitLossPct.toFixed(2)}%
                              </span>
                            </div>
                          </div>

                          {/* Lot Actions */}
                          <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-2">
                            <span className="text-[10px] text-[#8c8c8c] tabular-nums">
                              P/L: {formatMoney(subOrder.profitLoss, true)} EGP
                            </span>

                            <div className="flex items-center gap-1.5">
                              {onCloseOrder && subOrder.status === 'OPEN' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onCloseOrder(subOrder);
                                    setSelectedGroup(null);
                                  }}
                                  className="px-2 py-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-[#22ab94] text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Close Lot"
                                >
                                  <CheckCircle size={12} />
                                  <span>Close</span>
                                </button>
                              )}
                              {onEditOrder && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEditOrder(subOrder);
                                    setSelectedGroup(null);
                                  }}
                                  className="px-2 py-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Edit Lot"
                                >
                                  <Pencil size={12} />
                                  <span>Edit</span>
                                </button>
                              )}
                              {onDeleteOrder && onConfirmDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (deletingId === subOrder.id) {
                                      onDeleteOrder(subOrder);
                                      setSelectedGroup(null);
                                    } else {
                                      onConfirmDelete(subOrder.id);
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] hover:text-[#f7525f] text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Delete Lot"
                                >
                                  <Trash2 size={12} />
                                  <span>{deletingId === subOrder.id ? 'Sure?' : 'Delete'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Action Bar */}
              <div className="p-3 border-t border-[#1f1f1f] bg-[#000000] shrink-0 flex items-center gap-2">
                {selectedGroup.status === 'OPEN' && onCloseOrder && selectedGroup.orders[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      onCloseOrder(selectedGroup.orders[0]);
                      setSelectedGroup(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#22ab94]/20 border border-[#22ab94]/40 text-[#22ab94] hover:bg-[#22ab94]/30 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <CheckCircle size={14} />
                    <span>Close Position</span>
                  </button>
                )}

                {onEditOrder && selectedGroup.orders[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditOrder(selectedGroup.orders[0]);
                      setSelectedGroup(null);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-[#1f1f1f] border border-[#3d3d3d] text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>
                )}

                {onDeleteOrder && onConfirmDelete && selectedGroup.orders[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      if (deletingId === selectedGroup.orders[0].id) {
                        onDeleteOrder(selectedGroup.orders[0]);
                        setSelectedGroup(null);
                      } else {
                        onConfirmDelete(selectedGroup.orders[0].id);
                      }
                    }}
                    className="py-2.5 px-4 rounded-xl bg-[#1f1f1f] border border-[#3d3d3d] text-[#f7525f] hover:bg-[#f7525f]/15 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <Trash2 size={13} />
                    <span>{deletingId === selectedGroup.orders[0].id ? 'Sure?' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
