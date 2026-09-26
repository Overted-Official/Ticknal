'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, ChevronUp, Plus } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type HomeInvestmentOrder } from '../homeInvestmentsTypes';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import PositionRowItem from './PositionRowItem';
import TickerPositionsDrawer from './TickerPositionsDrawer';
import CloseOrderModal from '@/components/platform/CloseOrderModal';

interface MyPositionsSectionProps {
  orders: HomeInvestmentOrder[];
  totalMarketValue: number;
  exitSignals?: Opportunity[];
}

export default function MyPositionsSection({
  orders = [],
  totalMarketValue = 0,
  exitSignals = [],
}: MyPositionsSectionProps) {
  const router = useRouter();
  const { isPrivacy } = usePrivacyMode();

  const [activeTickerOrder, setActiveTickerOrder] = useState<HomeInvestmentOrder | null>(null);
  const [orderToClose, setOrderToClose] = useState<{
    id: number;
    tickerSymbol: string;
    quantity: number;
    currentPrice: number;
  } | null>(null);

  const handleTickerClick = (order: HomeInvestmentOrder) => {
    setActiveTickerOrder(order);
  };

  const handleSellClick = (order: {
    id: number;
    tickerSymbol: string;
    quantity: number;
    currentPrice: number;
  }) => {
    setOrderToClose({
      id: order.id,
      tickerSymbol: order.tickerSymbol,
      quantity: order.quantity,
      currentPrice: order.currentPrice,
    });
  };

  const handleCloseSuccess = () => {
    setActiveTickerOrder(null);
    router.refresh();
  };

  // Format currency with privacy masking support
  const formatMoney = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) {
      if (value === 0) return '•••••• £';
      const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
      return `${sign}•••••• £`;
    }
    if (value === 0) return '0.0 £';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted} £`;
  };

  // Map exit signals by symbol for fast lookup
  const exitSignalsMap = useMemo(() => {
    const map = new Map<string, Opportunity>();
    for (const sig of exitSignals) {
      const sym = sig.symbol.replace('.CA', '').trim().toUpperCase();
      map.set(sym, sig);
    }
    return map;
  }, [exitSignals]);

  // Gainers: open orders with profitLoss > 0, sorted descending by profitLossPct
  const gainers = useMemo(() => {
    return [...orders]
      .filter((o) => o.profitLoss > 0)
      .sort((a, b) => b.profitLossPct - a.profitLossPct);
  }, [orders]);

  // Losers: open orders with profitLoss <= 0, sorted ascending by profitLossPct
  const losers = useMemo(() => {
    return [...orders]
      .filter((o) => o.profitLoss <= 0)
      .sort((a, b) => a.profitLossPct - b.profitLossPct);
  }, [orders]);

  const [showAllGainers, setShowAllGainers] = useState(false);
  const [showAllLosers, setShowAllLosers] = useState(false);
  const INITIAL_ROWS = 5;

  const visibleGainers = showAllGainers ? gainers : gainers.slice(0, INITIAL_ROWS);
  const visibleLosers = showAllLosers ? losers : losers.slice(0, INITIAL_ROWS);

  return (
    <section id="section-my-positions" className="section-container section-viewport-fit space-y-4 relative">
      {/* Anchor alias for KPI card scroll targets */}
      <span id="section-active-positions" className="sr-only pointer-events-none absolute -top-24" />

      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="section-title">My Positions</h2>
            <span className="badge-count">
              {orders.length}
            </span>
          </div>
          <p className="section-subtitle">
            Live open market holdings segmented by performance and risk triggers
          </p>
        </div>

        {/* Right side: Total Value + Add Position Button */}
        <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto shrink-0">
          <div className="text-xs text-text-muted">
            Total Market Value:{' '}
            <span className="text-text-primary font-semibold">
              {formatMoney(totalMarketValue)}
            </span>
          </div>

          <Link
            href="/charts"
            className="btn-primary-cta"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </Link>
        </div>
      </div>

      {/* 2. Main 2-Column Content: Stock Gainers (Left) and Stock Losers (Right) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
        {orders.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs">
            <span>No active holdings currently in portfolio.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* COLUMN 1: STOCK GAINERS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
                <div className="flex items-center gap-1 text-base font-bold text-text-primary">
                  <span>Stock gainers</span>
                </div>
                <span className="text-[11px] text-text-muted font-medium">
                  {gainers.length} gainers
                </span>
              </div>

              <div className="divide-y divide-border-subtle/70">
                {gainers.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No positive return positions currently.
                  </div>
                ) : (
                  visibleGainers.map((order) => (
                    <PositionRowItem
                      key={order.id}
                      order={order}
                      totalMarketValue={totalMarketValue}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      exitSignal={exitSignalsMap.get(
                        order.tickerSymbol.replace('.CA', '').trim().toUpperCase()
                      )}
                      onTickerClick={handleTickerClick}
                      onSellClick={handleSellClick}
                    />
                  ))
                )}
              </div>

              {gainers.length > INITIAL_ROWS && (
                <button
                  type="button"
                  onClick={() => setShowAllGainers((prev) => !prev)}
                  className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-surface-raised hover:bg-surface-hover-raised text-text-muted hover:text-text-primary border border-border-subtle text-xs font-medium font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <span>{showAllGainers ? 'Show top 5 gainers' : `Show all ${gainers.length} gainers`}</span>
                  {showAllGainers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* COLUMN 2: STOCK LOSERS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
                <div className="flex items-center gap-1 text-base font-bold text-text-primary">
                  <span>Stock losers</span>
                </div>
                <span className="text-[11px] text-text-muted font-medium">
                  {losers.length} holdings
                </span>
              </div>

              <div className="divide-y divide-border-subtle/70">
                {losers.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No declining positions currently.
                  </div>
                ) : (
                  visibleLosers.map((order) => (
                    <PositionRowItem
                      key={order.id}
                      order={order}
                      totalMarketValue={totalMarketValue}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      exitSignal={exitSignalsMap.get(
                        order.tickerSymbol.replace('.CA', '').trim().toUpperCase()
                      )}
                      onTickerClick={handleTickerClick}
                      onSellClick={handleSellClick}
                    />
                  ))
                )}
              </div>

              {losers.length > INITIAL_ROWS && (
                <button
                  type="button"
                  onClick={() => setShowAllLosers((prev) => !prev)}
                  className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-surface-raised hover:bg-surface-hover-raised text-text-muted hover:text-text-primary border border-border-subtle text-xs font-medium font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <span>{showAllLosers ? 'Show top 5 losers' : `Show all ${losers.length} holdings`}</span>
                  {showAllLosers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section Footer: View full transactions log link + total count */}
        {orders.length > 0 && (
          <div className="pt-3 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border-subtle/60">
            <Link
              href="/wallet?tab=positions"
              className="text-xs font-semibold text-brand-blue hover:text-brand-blue-light inline-flex items-center gap-1 transition-colors"
            >
              View positions transactions log
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-[11px] text-text-muted">
              Showing {visibleGainers.length + visibleLosers.length} of {orders.length} total holdings
            </span>
          </div>
        )}
      </div>

      {/* Ticker Positions & Orders Slide-over Drawer */}
      <TickerPositionsDrawer
        isOpen={!!activeTickerOrder}
        onClose={() => setActiveTickerOrder(null)}
        order={activeTickerOrder}
        onPositionsChanged={handleCloseSuccess}
      />

      {/* Close/Sell Order Modal */}
      <CloseOrderModal
        isOpen={!!orderToClose}
        onClose={() => setOrderToClose(null)}
        onSuccess={handleCloseSuccess}
        order={orderToClose}
      />
    </section>
  );
}
