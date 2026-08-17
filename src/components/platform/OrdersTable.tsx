'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, Fragment } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { containerStagger, itemFadeInUp } from '@/lib/motion';
import { CheckCircle, Trash2, Pencil, Search, ChevronDown, ChevronRight } from '@/components/ui/icons';
import AddOrderModal from '@/components/platform/AddOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import { DesktopOrdersSkeleton, MobileOrdersSkeleton } from '@/components/platform/OrdersSkeleton';

type OrderRow = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  status: 'OPEN' | 'CLOSED';
  entryDate: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number | null;
  stopPrice: number | null;
  exitDate: string | null;
  exitPrice: number | null;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function TickerLogo({ symbol, logoUrl, size = 'sm' }: { symbol: string; logoUrl?: string | null; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'md' ? 'w-7 h-7' : 'w-6 h-6';

  return (
    <div className={`${sizeClasses} rounded-md bg-white/[0.04] border border-white/[0.08] p-0.5 shrink-0 flex items-center justify-center overflow-hidden`}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain rounded-[3px] bg-transparent"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold text-white/50 uppercase">{symbol.slice(0, 2)}</span>
      )}
    </div>
  );
}

export default function OrdersTable() {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [orderToClose, setOrderToClose] = useState<OrderRow | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Auto-reset confirmation "Sure?" after 4 seconds
  useEffect(() => {
    if (deletingId === null) return;
    const timer = setTimeout(() => setDeletingId(null), 4000);
    return () => clearTimeout(timer);
  }, [deletingId]);

  const { data, isLoading, mutate } = useSWR<{ orders: OrderRow[] }>('/api/positions', fetcher);
  const orders = data?.orders ?? [];
  const loading = isLoading;

  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      const matchesFilter = filter === 'ALL' ? true : order.status === filter;
      const matchesSearch = 
        order.tickerSymbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
        order.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [filter, orders, searchQuery],
  );

  const totals = useMemo(() => {
    const openOrders = orders.filter((order) => order.status === 'OPEN');
    const closedOrders = orders.filter((order) => order.status === 'CLOSED');

    const openWins = openOrders.filter((o) => o.profitLoss > 0).length;
    const openLosses = openOrders.filter((o) => o.profitLoss < 0).length;

    const closedWins = closedOrders.filter((o) => o.profitLoss > 0).length;
    const closedLosses = closedOrders.filter((o) => o.profitLoss < 0).length;

    return {
      openCount: openOrders.length,
      closedCount: closedOrders.length,
      openWins,
      openLosses,
      closedWins,
      closedLosses,
      unrealized: openOrders.reduce((sum, order) => sum + order.profitLoss, 0),
      realized: closedOrders.reduce((sum, order) => sum + order.profitLoss, 0),
      portfolioValue: openOrders.reduce((sum, order) => sum + (order.currentPrice * order.quantity), 0),
    };
  }, [orders]);

  const groupedOrders = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    
    for (const order of filteredOrders) {
      const groupKey = `${order.tickerSymbol}_${order.status}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(order);
    }

    const result = [];
    
    for (const [key, rows] of map.entries()) {
      // Sort lots by entryDate descending
      rows.sort((a, b) => (a.entryDate > b.entryDate ? -1 : 1));

      const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
      const totalCost = rows.reduce((sum, r) => sum + (r.entryPrice * r.quantity), 0);
      const avgEntryPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      const currentPrice = rows[0].currentPrice;
      const totalMktValue = rows[0].status === 'OPEN' ? currentPrice * totalQuantity : 0;
      const totalProfitLoss = rows.reduce((sum, r) => sum + r.profitLoss, 0);
      const totalProfitLossPct = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

      const targets = Array.from(new Set(rows.map(r => r.targetPrice).filter((v): v is number => v !== null)));
      const stops = Array.from(new Set(rows.map(r => r.stopPrice).filter((v): v is number => v !== null)));

      result.push({
        key,
        tickerSymbol: rows[0].tickerSymbol,
        companyName: rows[0].companyName,
        sector: rows[0].sector,
        logoUrl: rows[0].logoUrl ?? null,
        status: rows[0].status,
        currentPrice,
        totalQuantity,
        totalCost,
        avgEntryPrice,
        totalMktValue,
        totalProfitLoss,
        totalProfitLossPct,
        firstEntryDate: rows[rows.length - 1].entryDate,
        lastEntryDate: rows[0].entryDate,
        targetPrice: targets.length === 1 ? targets[0] : null,
        hasMultipleTargets: targets.length > 1,
        stopPrice: stops.length === 1 ? stops[0] : null,
        hasMultipleStops: stops.length > 1,
        orders: rows,
      });
    }

    return result;
  }, [filteredOrders]);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  async function closeOrder(order: OrderRow) {
    setOrderToClose(order);
  }

  function editOrder(order: OrderRow) {
    setOrderToEdit(order);
  }

  async function deleteOrder(order: OrderRow) {
    const res = await fetch(`/api/positions?id=${order.id}`, { method: 'DELETE' });
    if (res.ok) {
      mutate({ orders: orders.filter((item) => item.id !== order.id) }, { revalidate: false });
    }
  }

  const formatPrice = (p: number) => `${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
  const formatQuantity = (q: number) => Number.isInteger(q) ? q.toLocaleString('en-US') : q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const formatMoney = (val: number) => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val);
    return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerStagger}
      className="flex h-full min-h-0 flex-col bg-transparent text-white relative z-10"
    >
      {/* Top Header Banner */}
      <motion.div variants={itemFadeInUp} className="border-b border-white/[0.09] px-6 py-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-plt-orange" />
              <h1 className="text-lg font-medium tracking-[-0.02em] text-white">Positions</h1>
            </div>
            <p className="mt-0.5 text-[13px] text-white/30">Tracked long positions and execution trade history</p>
          </div>
          
          <div className="flex items-center gap-2 flex-nowrap w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex items-center flex-1 min-w-0 sm:flex-initial">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-white/40">
                <Search size={13} />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full sm:w-48 md:w-56 rounded-md bg-white/[0.03] border border-white/[0.09] pl-8 pr-2.5 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none transition-all leading-none"
              />
            </div>

            {/* Filter Pill Switch */}
            <div className="flex items-center h-8 bg-black border border-white/[0.09] rounded-md p-0.5 gap-0.5 box-border shrink-0">
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`h-full px-2 sm:px-3 rounded-[4px] text-[11px] sm:text-xs font-medium transition-all flex items-center justify-center leading-none ${
                    filter === value
                      ? 'bg-white/[0.08] text-white font-semibold'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {/* Add Position CTA */}
            <button
              type="button"
              onClick={() => setIsAddingOrder(true)}
              className="h-8 w-8 sm:w-auto rounded-md bg-plt-orange hover:bg-plt-orange-hover text-white px-0 sm:px-3 text-xs font-medium transition-colors flex items-center justify-center gap-1 leading-none shadow-sm shrink-0"
              title="Add Tracked Position"
            >
              <span className="text-base leading-none font-medium -mt-0.5">+</span>
              <span className="hidden sm:inline">Add Position</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Canvas: 24px outer padding (p-6), 8px widget gap (space-y-2) */}
      <div className="min-h-0 flex-1 overflow-auto p-6 space-y-2">
        {/* Metric Strip (5 items in unified master container: Portfolio Value, Unrealized P/L, Realized P/L, Open Positions, Closed Positions) */}
        <motion.div 
          variants={itemFadeInUp}
          className="border border-white/[0.09] rounded-md bg-black divide-y md:divide-y-0 md:divide-x divide-white/[0.06] grid grid-cols-2 md:grid-cols-5 overflow-hidden"
        >
          {/* 1. Portfolio Value */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors col-span-2 md:col-span-1">
            <div className="text-[11px] text-white/40 font-medium">Portfolio Value</div>
            <div>
              <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">{formatPrice(totals.portfolioValue)}</div>
              <div className="mt-1 text-[11px] text-white/30 font-mono">Invested + Live P/L</div>
            </div>
          </div>

          {/* 2. Unrealized P/L */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Unrealized P/L</div>
            <div>
              <div className={`mt-2 text-xl font-semibold font-mono tracking-tight ${totals.unrealized > 0 ? 'text-[#22c55e]' : totals.unrealized < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                {formatMoney(totals.unrealized)}
              </div>
              <div className="mt-1 text-[11px] text-white/30 font-mono">Open positions</div>
            </div>
          </div>

          {/* 3. Realized P/L */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Realized P/L</div>
            <div>
              <div className={`mt-2 text-xl font-semibold font-mono tracking-tight ${totals.realized > 0 ? 'text-[#22c55e]' : totals.realized < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                {formatMoney(totals.realized)}
              </div>
              <div className="mt-1 text-[11px] text-white/30 font-mono">Closed positions</div>
            </div>
          </div>

          {/* 4. Open Positions */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Open Positions</div>
            <div>
              <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">{totals.openCount}</div>
              <div className="mt-1 text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-[#22c55e] font-medium">{totals.openWins}W</span>
                <span className="text-white/20">·</span>
                <span className="text-[#ef4444] font-medium">{totals.openLosses}L</span>
              </div>
            </div>
          </div>

          {/* 5. Closed Positions */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Closed Positions</div>
            <div>
              <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">{totals.closedCount}</div>
              <div className="mt-1 text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-[#22c55e] font-medium">{totals.closedWins}W</span>
                <span className="text-white/20">·</span>
                <span className="text-[#ef4444] font-medium">{totals.closedLosses}L</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden flex flex-col space-y-3">
          {loading ? (
            <MobileOrdersSkeleton />
          ) : groupedOrders.length === 0 ? (
            <div className="p-10 text-center text-white/40 text-xs">No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found</div>
          ) : (
            groupedOrders.map((group) => {
              const isMulti = group.orders.length > 1;
              const isExpanded = expandedKeys.has(group.key);

              return (
                <div key={group.key} className="border border-white/[0.09] rounded-md bg-black p-5">
                  <div className="flex justify-between items-start border-b border-white/[0.09] pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/charts?ticker=${group.tickerSymbol}&timeframe=D`} className="font-semibold text-white hover:text-plt-orange text-sm flex items-center gap-1.5">
                            {group.tickerSymbol}
                            <span className="text-[10px] text-white/40 font-normal">({group.sector})</span>
                          </Link>
                          {isMulti && (
                            <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] bg-white/[0.06] border border-white/[0.09] text-white/70 font-mono">
                              {group.orders.length} Lots
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/40 truncate max-w-[180px] mt-0.5">{group.companyName}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium ${
                      group.status === 'OPEN' ? 'bg-white/[0.06] text-white/90 border border-white/[0.09]' : 'bg-white/[0.02] text-white/40'
                    }`}>
                      {group.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs mb-3 font-mono">
                    <div>
                      <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">
                        {isMulti ? 'Avg Entry' : 'Entry'}
                      </span>
                      <span className="text-white font-medium">{formatPrice(group.avgEntryPrice)}</span>
                      <span className="text-white/40 text-[10px] block">
                        {isMulti ? `${group.firstEntryDate} → ${group.lastEntryDate}` : group.orders[0].entryDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">Current</span>
                      <span className="text-white font-medium">{formatPrice(group.currentPrice)}</span>
                      <span className="text-white/40 text-[10px] block">Qty: {formatQuantity(group.totalQuantity)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">Mkt Value</span>
                      <span className="text-white/80">{group.status === 'OPEN' ? formatPrice(group.totalMktValue) : '—'}</span>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">Total P/L</span>
                      <div className={`font-semibold ${group.totalProfitLoss > 0 ? 'text-[#22c55e]' : group.totalProfitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                        {formatMoney(group.totalProfitLoss)}
                        <span className="text-[10px] ml-1 opacity-80">({group.totalProfitLossPct.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>

                  {isMulti ? (
                    <div className="border-t border-white/[0.09] pt-2.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.key)}
                        className="w-full py-1.5 px-3 rounded-[4px] bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white border border-white/[0.07] text-xs font-medium flex items-center justify-between transition-colors"
                      >
                        <span>{isExpanded ? 'Hide individual lots' : `View ${group.orders.length} individual lots`}</span>
                        <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 pt-2 border-t border-white/[0.05]">
                          {group.orders.map((order, idx) => (
                            <div key={order.id} className="p-3 rounded-[4px] bg-white/[0.02] border border-white/[0.06] text-xs font-mono">
                              <div className="flex justify-between items-center mb-2 font-sans">
                                <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/60 font-mono">Lot #{idx + 1}</span>
                                <span className="text-white/40 text-[10px]">{order.entryDate}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                <div>
                                  <span className="text-[10px] text-white/35 font-sans block">Entry @ Qty</span>
                                  <span>{formatPrice(order.entryPrice)} × {formatQuantity(order.quantity)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-white/35 font-sans block">P/L</span>
                                  <span className={order.profitLoss >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
                                    {formatMoney(order.profitLoss)} ({order.profitLossPct.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-end gap-1.5 pt-2 border-t border-white/[0.05]">
                                {order.status === 'OPEN' && (
                                  <button
                                    title="Close Position"
                                    onClick={() => closeOrder(order)}
                                    className="px-2 py-1 rounded-[4px] bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all flex items-center justify-center border border-white/[0.09] text-[11px]"
                                  >
                                    <CheckCircle size={12} className="mr-1 text-[#22c55e]" />
                                    <span>Close</span>
                                  </button>
                                )}
                                <button
                                  title="Edit Position"
                                  onClick={() => editOrder(order)}
                                  className="p-1 rounded-[4px] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                                >
                                  <Pencil size={12} />
                                </button>
                                {deletingId === order.id ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteOrder(order);
                                      setDeletingId(null);
                                    }}
                                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ef4444] text-white hover:bg-[#ef4444]/90 transition-all"
                                  >
                                    Sure?
                                  </button>
                                ) : (
                                  <button
                                    title="Delete Record"
                                    onClick={() => setDeletingId(order.id)}
                                    className="p-1 rounded-[4px] bg-white/[0.04] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all border border-white/[0.09]"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 pt-2.5 border-t border-white/[0.09]">
                      {group.orders[0].status === 'OPEN' && (
                        <button
                          title="Close Position"
                          onClick={() => closeOrder(group.orders[0])}
                          className="px-2.5 py-1 rounded-[4px] bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all flex items-center justify-center border border-white/[0.09] text-xs font-medium"
                        >
                          <CheckCircle size={13} className="mr-1 text-[#22c55e]" />
                          <span>Close</span>
                        </button>
                      )}
                      <button
                        title="Edit Position"
                        onClick={() => editOrder(group.orders[0])}
                        className="p-1.5 rounded-[4px] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center border border-white/[0.09]"
                      >
                        <Pencil size={13} />
                      </button>
                      {deletingId === group.orders[0].id ? (
                        <button
                          type="button"
                          onClick={() => {
                            deleteOrder(group.orders[0]);
                            setDeletingId(null);
                          }}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-[#ef4444] text-white hover:bg-[#ef4444]/90 transition-all"
                        >
                          Sure?
                        </button>
                      ) : (
                        <button
                          title="Delete Record"
                          onClick={() => setDeletingId(group.orders[0].id)}
                          className="p-1.5 rounded-[4px] bg-white/[0.04] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all flex items-center justify-center border border-white/[0.09]"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <motion.div variants={itemFadeInUp} className="hidden md:block border border-white/[0.09] rounded-md bg-black overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.09] bg-white/[0.02] text-white/30 font-medium">
                <th className="px-6 py-3 font-normal">Ticker</th>
                <th className="px-6 py-3 font-normal">Status</th>
                <th className="px-6 py-3 font-normal">Entry</th>
                <th className="px-6 py-3 font-normal text-right">Target / Stop</th>
                <th className="px-6 py-3 font-normal text-right">Quantity</th>
                <th className="px-6 py-3 font-normal text-right">Current</th>
                <th className="px-6 py-3 font-normal text-right">Mkt Value</th>
                <th className="px-6 py-3 font-normal text-right">P/L</th>
                <th className="px-6 py-3 font-normal text-right w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <DesktopOrdersSkeleton />
              ) : groupedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-white/40 text-xs">
                    No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
                  </td>
                </tr>
              ) : (
                groupedOrders.map((group) => {
                  const isMulti = group.orders.length > 1;
                  const isExpanded = expandedKeys.has(group.key);

                  return (
                    <Fragment key={group.key}>
                      {/* Master / Grouped Row */}
                      <tr 
                        onClick={() => isMulti && toggleExpand(group.key)}
                        className={`transition-colors group ${
                          isMulti 
                            ? 'cursor-pointer hover:bg-white/[0.03]' 
                            : 'hover:bg-white/[0.02]'
                        } ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                      >
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="sm" />
                            <Link 
                              href={`/charts?ticker=${group.tickerSymbol}&timeframe=D`} 
                              className="font-semibold text-white group-hover:text-plt-orange transition-colors flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {group.tickerSymbol}
                            </Link>
                            {isMulti && (
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] border border-white/[0.09] text-white/70 font-mono">
                                  {group.orders.length} Lots
                                </span>
                                <ChevronRight 
                                  size={13} 
                                  className={`text-white/40 group-hover:text-plt-orange transition-transform duration-150 ${isExpanded ? 'rotate-90 text-plt-orange' : ''}`} 
                                />
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 truncate max-w-[200px] mt-0.5 pl-8">{group.companyName}</div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-[4px] px-2 py-0.5 text-[10px] font-medium ${
                              group.status === 'OPEN' ? 'bg-white/[0.06] border border-white/[0.09] text-white' : 'bg-white/[0.02] text-white/40'
                            }`}
                          >
                            {group.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap font-mono">
                          <div className="text-white font-medium">
                            {isMulti ? `Avg ${formatPrice(group.avgEntryPrice)}` : formatPrice(group.avgEntryPrice)}
                          </div>
                          <div className="text-[10px] text-white/40 mt-0.5">
                            {isMulti ? `${group.firstEntryDate} → ${group.lastEntryDate}` : group.orders[0].entryDate}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono">
                          {isMulti ? (
                            <div className="text-white/40 text-[11px]">
                              {group.hasMultipleTargets || group.hasMultipleStops ? 'Multiple' : (group.targetPrice ? formatPrice(group.targetPrice) : '-')}
                            </div>
                          ) : (
                            <>
                              <div className="text-[#22c55e]">{group.orders[0].targetPrice ? formatPrice(group.orders[0].targetPrice) : '-'}</div>
                              <div className="text-[#ef4444] mt-0.5">{group.orders[0].stopPrice ? formatPrice(group.orders[0].stopPrice) : '-'}</div>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-white">
                          {formatQuantity(group.totalQuantity)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-white font-medium">
                          {formatPrice(group.currentPrice)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-white/80 font-medium">
                          {group.status === 'OPEN' ? formatPrice(group.totalMktValue) : '—'}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono">
                          <div className={`font-semibold ${group.totalProfitLoss > 0 ? 'text-[#22c55e]' : group.totalProfitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                            {formatMoney(group.totalProfitLoss)}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${group.totalProfitLossPct > 0 ? 'text-[#22c55e]' : group.totalProfitLossPct < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                            {group.totalProfitLossPct.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                          {isMulti ? (
                            <div className="flex items-center justify-end gap-1.5 text-white/40 group-hover:text-white/80 text-[11px] font-medium transition-colors">
                              <span>{isExpanded ? 'Hide lots' : 'View lots'}</span>
                              <ChevronDown size={13} className={`transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {group.orders[0].status === 'OPEN' && (
                                <button
                                  title="Close Position"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeOrder(group.orders[0]);
                                  }}
                                  className="p-1.5 rounded-[4px] bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                                >
                                  <CheckCircle size={14} className="text-[#22c55e]" />
                                </button>
                              )}
                              <button
                                title="Edit Position"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editOrder(group.orders[0]);
                                }}
                                className="p-1.5 rounded-[4px] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                              >
                                <Pencil size={14} />
                              </button>
                              {deletingId === group.orders[0].id ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteOrder(group.orders[0]);
                                    setDeletingId(null);
                                  }}
                                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ef4444] text-white hover:bg-[#ef4444]/90 transition-all"
                                >
                                  Sure?
                                </button>
                              ) : (
                                <button
                                  title="Delete Record"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(group.orders[0].id);
                                  }}
                                  className="p-1.5 rounded-[4px] bg-white/[0.04] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all border border-white/[0.09]"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Subrows for multiple positions */}
                      {isMulti && isExpanded && (
                        group.orders.map((order, idx) => (
                          <tr key={order.id} className="bg-white/[0.015] hover:bg-white/[0.035] transition-colors border-t border-white/[0.03]">
                            <td className="px-6 py-3 whitespace-nowrap pl-14">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-white/50 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.07]">
                                  Lot #{idx + 1}
                                </span>
                                <span className="text-white/40 text-[11px] font-mono">{order.entryDate}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className="text-[10px] text-white/40 font-medium">
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap font-mono text-white/90">
                              <div>{formatPrice(order.entryPrice)}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right font-mono">
                              <div className="text-[#22c55e]/90">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</div>
                              <div className="text-[#ef4444]/90 text-[10px]">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right font-mono text-white/90">
                              {formatQuantity(order.quantity)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right font-mono text-white/50">
                              {formatPrice(order.currentPrice)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right font-mono text-white/70">
                              {order.status === 'OPEN' ? formatPrice(order.currentPrice * order.quantity) : '—'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right font-mono">
                              <div className={`font-medium ${order.profitLoss > 0 ? 'text-[#22c55e]' : order.profitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                                {formatMoney(order.profitLoss)}
                              </div>
                              <div className={`text-[10px] ${order.profitLossPct > 0 ? 'text-[#22c55e]/80' : order.profitLossPct < 0 ? 'text-[#ef4444]/80' : 'text-white/60'}`}>
                                {order.profitLossPct.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {order.status === 'OPEN' && (
                                  <button
                                    title="Close Position"
                                    onClick={() => closeOrder(order)}
                                    className="p-1 rounded-[4px] bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                                  >
                                    <CheckCircle size={13} className="text-[#22c55e]" />
                                  </button>
                                )}
                                <button
                                  title="Edit Position"
                                  onClick={() => editOrder(order)}
                                  className="p-1 rounded-[4px] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                                >
                                  <Pencil size={13} />
                                </button>
                                {deletingId === order.id ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteOrder(order);
                                      setDeletingId(null);
                                    }}
                                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ef4444] text-white hover:bg-[#ef4444]/90 transition-all"
                                  >
                                    Sure?
                                  </button>
                                ) : (
                                  <button
                                    title="Delete Record"
                                    onClick={() => setDeletingId(order.id)}
                                    className="p-1 rounded-[4px] bg-white/[0.04] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all border border-white/[0.09]"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>
      </div>

      <AddOrderModal 
        isOpen={isAddingOrder} 
        onClose={() => setIsAddingOrder(false)} 
        onSuccess={() => mutate()} 
      />
      
      <EditOrderModal
        isOpen={!!orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSuccess={() => mutate()}
        order={orderToEdit}
      />

      <CloseOrderModal
        isOpen={!!orderToClose}
        onClose={() => setOrderToClose(null)}
        onSuccess={() => mutate()}
        order={orderToClose}
      />
    </motion.div>
  );
}
