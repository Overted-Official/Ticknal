'use client';

import React, { useMemo, useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  CheckCircle,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from '@/components/ui/icon-library';
import AddOrderModal from '@/components/platform/AddOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import { DesktopOrdersSkeleton, MobileOrdersSkeleton } from '@/components/platform/OrdersSkeleton';
import { formatUiLabel } from '@/lib/format-ui-label';
import PositionsHeader from './positions/PositionsHeader';
import PositionsKPIs from './positions/PositionsKPIs';

export type OrderRow = {
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
  const sizeClasses = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';

  return (
    <div className={`${sizeClasses} rounded-full bg-plt-card border border-plt-border-soft shrink-0 flex items-center justify-center overflow-hidden`}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image ticker-logo-fill"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold font-mono text-plt-text">
          {symbol.replace('.CA', '').slice(0, 2)}
        </span>
      )}
    </div>
  );
}

export default function WalletPositionsView() {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [orderToClose, setOrderToClose] = useState<OrderRow | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

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
    () =>
      orders.filter((order) => {
        const matchesFilter = filter === 'ALL' ? true : order.status === filter;
        const matchesSearch =
          order.tickerSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.companyName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      }),
    [orders, filter, searchQuery]
  );

  const totals = useMemo(() => {
    const openOrders = orders.filter((o) => o.status === 'OPEN');
    const closedOrders = orders.filter((o) => o.status === 'CLOSED');

    const portfolioValue = openOrders.reduce((acc, o) => acc + o.currentPrice * o.quantity, 0);
    const unrealized = openOrders.reduce((acc, o) => acc + o.profitLoss, 0);
    const realized = closedOrders.reduce((acc, o) => acc + o.profitLoss, 0);

    const winningClosed = closedOrders.filter((o) => o.profitLoss > 0).length;
    const winRate = closedOrders.length > 0 ? (winningClosed / closedOrders.length) * 100 : 0;

    return {
      portfolioValue,
      unrealized,
      realized,
      winRate,
      openCount: openOrders.length,
      closedCount: closedOrders.length,
      winningCount: winningClosed,
      losingCount: closedOrders.length - winningClosed,
    };
  }, [orders]);

  type GroupedOrder = {
    key: string;
    tickerSymbol: string;
    companyName: string;
    sector: string;
    logoUrl?: string | null;
    status: 'OPEN' | 'CLOSED';
    totalQuantity: number;
    avgEntryPrice: number;
    targetPrice: number | null;
    stopPrice: number | null;
    currentPrice: number;
    totalMktValue: number;
    totalProfitLoss: number;
    totalProfitLossPct: number;
    orders: OrderRow[];
    firstEntryDate: string;
    lastEntryDate: string;
  };

  const groupedOrders = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    filteredOrders.forEach((o) => {
      const k = `${o.tickerSymbol}_${o.status}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    });

    const result: GroupedOrder[] = [];
    map.forEach((orderList, key) => {
      const first = orderList[0];
      const totalQuantity = orderList.reduce((acc, o) => acc + o.quantity, 0);
      const totalCostBasis = orderList.reduce((acc, o) => acc + o.entryPrice * o.quantity, 0);
      const avgEntryPrice = totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;
      const totalProfitLoss = orderList.reduce((acc, o) => acc + o.profitLoss, 0);
      const totalMktValue = orderList.reduce((acc, o) => acc + o.currentPrice * o.quantity, 0);
      const totalProfitLossPct = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

      const dates = orderList.map((o) => o.entryDate).sort();
      const firstEntryDate = dates[0];
      const lastEntryDate = dates[dates.length - 1];

      result.push({
        key,
        tickerSymbol: first.tickerSymbol,
        companyName: first.companyName,
        sector: first.sector,
        logoUrl: first.logoUrl,
        status: first.status,
        totalQuantity,
        avgEntryPrice,
        targetPrice: first.targetPrice,
        stopPrice: first.stopPrice,
        currentPrice: first.currentPrice,
        totalMktValue,
        totalProfitLoss,
        totalProfitLossPct,
        orders: orderList,
        firstEntryDate,
        lastEntryDate,
      });
    });

    return result;
  }, [filteredOrders]);

  type SortField = 'ticker' | 'status' | 'entry' | 'target' | 'quantity' | 'current' | 'mktValue' | 'pl';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedGroupedOrders = useMemo(() => {
    if (!sortField) return groupedOrders;

    return [...groupedOrders].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'ticker':
          valA = a.tickerSymbol;
          valB = b.tickerSymbol;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'entry':
          valA = a.avgEntryPrice;
          valB = b.avgEntryPrice;
          break;
        case 'target':
          valA = a.targetPrice ?? 0;
          valB = b.targetPrice ?? 0;
          break;
        case 'quantity':
          valA = a.totalQuantity;
          valB = b.totalQuantity;
          break;
        case 'current':
          valA = a.currentPrice;
          valB = b.currentPrice;
          break;
        case 'mktValue':
          valA = a.totalMktValue;
          valB = b.totalMktValue;
          break;
        case 'pl':
          valA = a.totalProfitLoss;
          valB = b.totalProfitLoss;
          break;
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [groupedOrders, sortField, sortDirection]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  function closeOrder(order: OrderRow) {
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

  const formatPrice = (p: number) =>
    `${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;
  const formatQuantity = (q: number) =>
    Number.isInteger(q)
      ? q.toLocaleString('en-US')
      : q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const formatMoney = (val: number) => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val);
    return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y select-none">
      <div className="app-page page-sections-stack pb-28 md:pb-20">
        {/* Header */}
        <PositionsHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          onAddPosition={() => setIsAddingOrder(true)}
        />

        {/* SECTION 1: Portfolio Performance Overview */}
        <section className="section-container section-viewport-fit">
          <div className="flex flex-col gap-0.5">
            <h2 className="section-title">Portfolio Performance Overview</h2>
            <p className="section-subtitle">Live mark-to-market valuation, open floating return, and historical win rate</p>
          </div>

          <PositionsKPIs totals={totals} />
        </section>

        {/* SECTION 2: Tracked Positions & Execution Lots */}
        <section className="section-container section-viewport-fit">
          <div className="flex flex-col gap-0.5">
            <h2 className="section-title">Tracked Positions & Execution Lots</h2>
            <p className="section-subtitle">Comprehensive order management, active market exposure, and trade lifecycle</p>
          </div>

          {/* Positions Grouped Table Card */}
          <div className="card-widget flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Mobile View (Cards) */}
            <div className="md:hidden flex flex-col space-y-3">
              {loading ? (
                <MobileOrdersSkeleton />
              ) : sortedGroupedOrders.length === 0 ? (
                <div className="p-10 text-center text-plt-muted text-xs font-sans">
                  No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
                </div>
              ) : (
                sortedGroupedOrders.map((group) => {
                  const isMulti = group.orders.length > 1;
                  const isExpanded = expandedKeys.has(group.key);

                  return (
                    <div key={group.key} className="bg-plt-card border border-plt-border-soft rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start border-b border-plt-border-soft pb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/invest?ticker=${group.tickerSymbol}&view=chart&timeframe=D`}
                                className="font-bold text-plt-text hover:text-white text-xs font-sans"
                              >
                                {group.tickerSymbol.replace('.CA', '')}
                              </Link>
                              {isMulti && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-plt-hover text-plt-muted border border-plt-border-soft">
                                  {group.orders.length} Lots
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-plt-muted truncate max-w-44 leading-tight mt-0.5 font-sans">
                              {group.companyName}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`badge font-sans ${
                            group.status === 'OPEN'
                              ? 'badge-profit'
                              : 'badge-muted'
                          }`}
                        >
                          {formatUiLabel(group.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                        <div>
                          <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">
                            {isMulti ? 'Avg Entry' : 'Entry'}
                          </span>
                          <span className="text-plt-text font-semibold font-sans">{formatPrice(group.avgEntryPrice)}</span>
                          <span className="text-plt-muted text-[10px] block font-sans">
                            {isMulti ? `${group.firstEntryDate} → ${group.lastEntryDate}` : group.orders[0].entryDate}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">Current</span>
                          <span className="text-plt-text font-semibold font-sans">{formatPrice(group.currentPrice)}</span>
                          <span className="text-plt-muted text-[10px] block font-sans">Qty: {formatQuantity(group.totalQuantity)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-plt-border-soft pt-2 font-sans">
                        <div>
                          <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">Mkt Value</span>
                          <span className="text-plt-text font-semibold font-sans">
                            {group.status === 'OPEN' ? formatPrice(group.totalMktValue) : '—'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">Total P/L</span>
                          <span
                            className={`font-semibold font-sans ${
                              group.totalProfitLoss > 0
                                ? 'text-plt-profit'
                                : group.totalProfitLoss < 0
                                ? 'text-plt-risk'
                                : 'text-plt-muted'
                            }`}
                          >
                            {formatMoney(group.totalProfitLoss)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View (Borderless Table) */}
            <div className="hidden md:block flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
                <thead className="sticky top-0 z-10 bg-plt-surface border-b border-plt-border-soft text-[11px] font-semibold text-plt-muted font-sans uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5 cursor-pointer select-none first:rounded-l-lg" onClick={() => handleSort('ticker')}>
                      <div className="flex items-center gap-1.5">
                        <span>Ticker</span>
                        {sortField === 'ticker' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('entry')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Avg Entry</span>
                        {sortField === 'entry' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('target')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Target / Stop</span>
                        {sortField === 'target' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('quantity')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Total Qty</span>
                        {sortField === 'quantity' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('current')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Current</span>
                        {sortField === 'current' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('mktValue')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Mkt Value</span>
                        {sortField === 'mktValue' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('pl')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Total P/L</span>
                        {sortField === 'pl' ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <DesktopOrdersSkeleton />
                  ) : sortedGroupedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-plt-muted text-xs font-sans">
                        No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
                      </td>
                    </tr>
                  ) : (
                    sortedGroupedOrders.map((group) => {
                      const isMulti = group.orders.length > 1;
                      const isExpanded = expandedKeys.has(group.key);

                      return (
                        <Fragment key={group.key}>
                          <tr className="hover:bg-plt-hover/60 transition-colors group">
                            <td className="py-2.5 px-3.5 first:rounded-l-xl">
                              <div className="flex items-center gap-2.5">
                                {isMulti ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(group.key)}
                                    className="p-1 text-plt-muted hover:text-plt-text transition-colors cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                ) : (
                                  <div className="w-5" />
                                )}
                                <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="sm" />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/invest?ticker=${group.tickerSymbol}&view=chart&timeframe=D`}
                                      className="font-bold text-plt-text hover:text-white text-xs font-sans"
                                    >
                                      {group.tickerSymbol.replace('.CA', '')}
                                    </Link>
                                    {isMulti && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-sans bg-plt-hover text-plt-muted border border-plt-border-soft">
                                        {group.orders.length} Lots
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-plt-muted truncate max-w-40 font-sans">{group.companyName}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3.5">
                              <span
                                className={`badge font-sans ${
                                  group.status === 'OPEN'
                                    ? 'badge-profit'
                                    : 'badge-muted'
                                }`}
                              >
                                {formatUiLabel(group.status)}
                              </span>
                            </td>

                            <td className="py-2.5 px-3.5 text-right tabular-nums">
                              <div className="text-plt-text font-semibold font-sans">{formatPrice(group.avgEntryPrice)}</div>
                              <div className="text-[10px] text-plt-muted font-sans">
                                {isMulti ? `${group.firstEntryDate} → ${group.lastEntryDate}` : group.orders[0].entryDate}
                              </div>
                            </td>

                            <td className="py-2.5 px-3.5 text-right tabular-nums">
                              <div className="text-plt-profit font-sans text-xs">
                                {group.targetPrice ? formatPrice(group.targetPrice) : '—'}
                              </div>
                              <div className="text-plt-risk text-[10px] font-sans">
                                {group.stopPrice ? formatPrice(group.stopPrice) : '—'}
                              </div>
                            </td>

                            <td className="py-2.5 px-3.5 text-right tabular-nums text-plt-text font-sans text-xs font-semibold">
                              {formatQuantity(group.totalQuantity)}
                            </td>

                            <td className="py-2.5 px-3.5 text-right tabular-nums text-plt-text font-sans text-xs font-semibold">
                              {formatPrice(group.currentPrice)}
                            </td>

                            <td className="py-2.5 px-3.5 text-right tabular-nums text-plt-text font-sans text-xs font-semibold">
                              {group.status === 'OPEN' ? formatPrice(group.totalMktValue) : '—'}
                            </td>

                            <td className={`py-2.5 px-3.5 text-right tabular-nums font-sans text-xs font-semibold ${
                              group.totalProfitLoss > 0 ? 'text-plt-profit' : group.totalProfitLoss < 0 ? 'text-plt-risk' : 'text-plt-muted'
                            }`}>
                              <div>{formatMoney(group.totalProfitLoss)}</div>
                              <div className="text-[10px] opacity-80">{group.totalProfitLossPct > 0 ? '+' : ''}{group.totalProfitLossPct.toFixed(2)}%</div>
                            </td>

                            <td className="py-2.5 px-3.5 text-right last:rounded-r-xl">
                              {!isMulti && (
                                <div className="flex items-center justify-end gap-1">
                                  {group.orders[0].status === 'OPEN' && (
                                    <button
                                      type="button"
                                      onClick={() => closeOrder(group.orders[0])}
                                      className="p-1.5 rounded-lg bg-plt-hover hover:bg-plt-profit/20 text-plt-muted hover:text-plt-profit transition-all cursor-pointer"
                                      title="Close Position"
                                    >
                                      <CheckCircle size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => editOrder(group.orders[0])}
                                    className="p-1.5 rounded-lg bg-plt-hover hover:bg-plt-hover text-plt-muted hover:text-plt-text transition-all cursor-pointer"
                                    title="Edit Position"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (deletingId === group.orders[0].id) {
                                        deleteOrder(group.orders[0]);
                                        setDeletingId(null);
                                      } else {
                                        setDeletingId(group.orders[0].id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-plt-hover hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk transition-all cursor-pointer"
                                    title="Delete Position"
                                  >
                                    {deletingId === group.orders[0].id ? (
                                      <span className="text-[10px] text-plt-risk font-bold">Sure?</span>
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Individual Lots */}
                          {isMulti && isExpanded && group.orders.map((subOrder) => (
                            <tr key={subOrder.id} className="hover:bg-plt-hover/40 transition-colors text-plt-muted text-[11px]">
                              <td className="py-2 pl-12 pr-3.5 first:rounded-l-lg">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-plt-border-soft" />
                                  <span>Lot #{subOrder.id}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-[9px] uppercase font-semibold text-plt-muted">
                                  {subOrder.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                                {formatPrice(subOrder.entryPrice)}
                                <div className="text-[9px] text-plt-muted">{subOrder.entryDate}</div>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums">
                                <div className="text-plt-profit text-[10px]">
                                  {subOrder.targetPrice ? formatPrice(subOrder.targetPrice) : '—'}
                                </div>
                                <div className="text-plt-risk text-[9px]">
                                  {subOrder.stopPrice ? formatPrice(subOrder.stopPrice) : '—'}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                                {formatQuantity(subOrder.quantity)}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                                {formatPrice(subOrder.currentPrice)}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                                {subOrder.status === 'OPEN' ? formatPrice(subOrder.currentPrice * subOrder.quantity) : '—'}
                              </td>
                              <td className={`py-2 px-3 text-right tabular-nums font-semibold ${
                                subOrder.profitLoss > 0 ? 'text-plt-profit' : subOrder.profitLoss < 0 ? 'text-plt-risk' : 'text-plt-muted'
                              }`}>
                                {formatMoney(subOrder.profitLoss)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {subOrder.status === 'OPEN' && (
                                    <button
                                      type="button"
                                      onClick={() => closeOrder(subOrder)}
                                      className="p-1 rounded bg-plt-hover hover:bg-plt-profit/20 text-plt-muted hover:text-plt-profit transition-all cursor-pointer"
                                      title="Close Position"
                                    >
                                      <CheckCircle size={12} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => editOrder(subOrder)}
                                    className="p-1 rounded bg-plt-hover hover:bg-plt-hover text-plt-muted hover:text-plt-text transition-all cursor-pointer"
                                    title="Edit Position"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (deletingId === subOrder.id) {
                                        deleteOrder(subOrder);
                                        setDeletingId(null);
                                      } else {
                                        setDeletingId(subOrder.id);
                                      }
                                    }}
                                    className="p-1 rounded bg-white/[0.04] hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk transition-all cursor-pointer"
                                    title="Delete Position"
                                  >
                                    {deletingId === subOrder.id ? (
                                      <span className="text-[9px] text-plt-risk font-bold">Sure?</span>
                                    ) : (
                                      <Trash2 size={12} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Modals */}
      <AddOrderModal
        isOpen={isAddingOrder}
        onClose={() => setIsAddingOrder(false)}
        onSuccess={() => {
          mutate();
          setIsAddingOrder(false);
        }}
      />

      <CloseOrderModal
        isOpen={!!orderToClose}
        order={orderToClose}
        onClose={() => setOrderToClose(null)}
        onSuccess={() => {
          mutate();
          setOrderToClose(null);
        }}
      />

      <EditOrderModal
        isOpen={!!orderToEdit}
        order={orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSuccess={() => {
          mutate();
          setOrderToEdit(null);
        }}
      />
    </div>
  );
}
