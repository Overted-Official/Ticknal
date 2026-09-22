'use client';

import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import AddOrderModal from '@/components/platform/AddOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import PositionsHeader from './positions/PositionsHeader';
import PositionsKPIs from './positions/PositionsKPIs';
import PositionsDataTableWidget from './positions/PositionsDataTableWidget';
import PositionsMobileCardWidget from './positions/PositionsMobileCardWidget';
import {
  type OrderRow,
  type GroupedOrder,
  type SortField,
  type SortDirection,
} from './positions/positionsTypes';

export type { OrderRow };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WalletPositionsPageView() {
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
    const costBasis = openOrders.reduce((acc, o) => acc + o.entryPrice * o.quantity, 0);
    const unrealized = openOrders.reduce((acc, o) => acc + o.profitLoss, 0);
    const realized = closedOrders.reduce((acc, o) => acc + o.profitLoss, 0);

    const winningClosed = closedOrders.filter((o) => o.profitLoss > 0).length;
    const winRate = closedOrders.length > 0 ? (winningClosed / closedOrders.length) * 100 : 0;

    return {
      portfolioValue,
      costBasis,
      unrealized,
      realized,
      winRate,
      openCount: openOrders.length,
      closedCount: closedOrders.length,
      winningCount: winningClosed,
      losingCount: closedOrders.length - winningClosed,
    };
  }, [orders]);

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

  const handleExpandAll = () => {
    setExpandedKeys(new Set(sortedGroupedOrders.map((g) => g.key)));
  };

  const handleCollapseAll = () => {
    setExpandedKeys(new Set());
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

  const scrollToTable = () => {
    const el = document.getElementById('section-positions-table');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y select-none custom-scrollbar">
      <div className="app-page page-sections-stack pb-28 md:pb-20">
        {/* Header */}
        <PositionsHeader />

        {/* SECTION 1: Portfolio Performance Overview */}
        <section className="section-container section-viewport-fit space-y-2.5">
          <div className="flex flex-col gap-0.5">
            <h2 className="section-title">Portfolio Performance Overview</h2>
            <p className="section-subtitle">
              Live mark-to-market valuation, open floating return, and historical strategy win rate
            </p>
          </div>

          <PositionsKPIs totals={totals} onScrollToTable={scrollToTable} />
        </section>

        {/* SECTION 2: Tracked Positions & Execution Lots */}
        <section id="section-positions-table" className="section-container section-viewport-fit space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#27272a]">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Tracked Positions & Execution Lots</h2>
              <p className="section-subtitle">
                Comprehensive order management, active market exposure, and trade lifecycle
              </p>
            </div>

            {/* Quick Summary & Lot Controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[#787b86]">
              <span className="font-semibold text-white">{sortedGroupedOrders.length}</span>
              <span>Tickers</span>
              <span className="text-[#50535e]">·</span>
              <span className="font-semibold text-white">{filteredOrders.length}</span>
              <span>Lots</span>

              {sortedGroupedOrders.some((g) => g.orders.length > 1) && (
                <>
                  <span className="text-[#50535e]">·</span>
                  {expandedKeys.size > 0 ? (
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] transition-colors cursor-pointer"
                    >
                      Collapse Lots
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] transition-colors cursor-pointer"
                    >
                      Expand Lots
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile View (Cards) */}
          <PositionsMobileCardWidget
            loading={loading}
            sortedGroupedOrders={sortedGroupedOrders}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddPosition={() => setIsAddingOrder(true)}
            onCloseOrder={closeOrder}
            onEditOrder={editOrder}
            onDeleteOrder={deleteOrder}
            deletingId={deletingId}
            onConfirmDelete={(id) => setDeletingId(id)}
          />

          {/* Desktop View (TradingView Screener Table) */}
          <PositionsDataTableWidget
            loading={loading}
            sortedGroupedOrders={sortedGroupedOrders}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            expandedKeys={expandedKeys}
            onToggleExpand={toggleExpand}
            deletingId={deletingId}
            onConfirmDelete={(id) => setDeletingId(id)}
            onCloseOrder={closeOrder}
            onEditOrder={editOrder}
            onDeleteOrder={deleteOrder}
            onAddPosition={() => setIsAddingOrder(true)}
          />
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
