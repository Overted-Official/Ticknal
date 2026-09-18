'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowRight, TrendingUp, AlertTriangle } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type DashboardOrder } from './investmentsTypes';
import { type Opportunity } from '@/components/platform/OpportunityTable';

export type PositionsViewMode = '3-columns' | 'all' | 'signals';
export type PositionsFilter = 'ALL' | 'GAINERS' | 'LOSERS' | 'BUYS' | 'EXITS';

interface ActivePositionsBreakdownTableProps {
  orders: DashboardOrder[];
  totalMarketValue: number;
  buyOpportunities: Opportunity[];
  exitSignals: Opportunity[];
  isLoadingBuyOpportunities?: boolean;
}

export default function ActivePositionsBreakdownTable({
  orders = [],
  totalMarketValue = 0,
  buyOpportunities = [],
  exitSignals = [],
  isLoadingBuyOpportunities = false,
}: ActivePositionsBreakdownTableProps) {
  const { isPrivacy } = usePrivacyMode();
  const [viewMode, setViewMode] = useState<PositionsViewMode>('3-columns');
  const [activeFilter, setActiveFilter] = useState<PositionsFilter>('ALL');

  // Format currency
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

  const formatPrice = (value: number): string => {
    if (isPrivacy) return '•••••• £';
    return `${Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} £`;
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

  // Losers & Exits: Combines losers with any order that has an active exit signal
  const losersAndExits = useMemo(() => {
    const items = [...orders].filter((o) => {
      const cleanSym = o.tickerSymbol.replace('.CA', '').trim().toUpperCase();
      const hasExit = exitSignalsMap.has(cleanSym);
      return o.profitLoss <= 0 || hasExit;
    });

    // Sort: Orders with active exit signals first, then by profitLossPct ascending
    return items.sort((a, b) => {
      const aExit = exitSignalsMap.has(a.tickerSymbol.replace('.CA', '').trim().toUpperCase());
      const bExit = exitSignalsMap.has(b.tickerSymbol.replace('.CA', '').trim().toUpperCase());
      if (aExit && !bExit) return -1;
      if (!aExit && bExit) return 1;
      return a.profitLossPct - b.profitLossPct;
    });
  }, [orders, exitSignalsMap]);

  // Filtered orders for 'all' view
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') {
      return [...orders].sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity));
    }
    if (activeFilter === 'GAINERS') {
      return gainers;
    }
    if (activeFilter === 'LOSERS') {
      return losers;
    }
    return [...orders].sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity));
  }, [orders, activeFilter, gainers, losers]);

  const filterTabs: Array<{ key: PositionsFilter; label: string }> = [
    { key: 'ALL', label: `All Holdings (${orders.length})` },
    { key: 'GAINERS', label: `🟢 Gainers (${gainers.length})` },
    { key: 'LOSERS', label: `🔴 Losers (${losers.length})` },
    { key: 'BUYS', label: `⚡ Buy Signals (${buyOpportunities.length})` },
    { key: 'EXITS', label: `⚠️ Exit Alerts (${exitSignals.length})` },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-start select-none space-y-4 bg-transparent">
      {/* 1. Top Control Bar: Category Filters on Left + View Mode Switch on Right (Matches PortfolioBreakdownTable) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setActiveFilter(f.key);
                if (f.key === 'BUYS' || f.key === 'EXITS') {
                  setViewMode('signals');
                } else if (viewMode === 'signals') {
                  setViewMode('3-columns');
                }
              }}
              className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                activeFilter === f.key
                  ? 'bg-[#1e222d] text-white border border-[#2a2e39] font-semibold'
                  : 'text-[#868993] hover:text-white font-medium'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View Mode Switcher + All Positions Link */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="inline-flex p-0.5 rounded-lg bg-[#18181b] border border-[#27272a]">
            <button
              type="button"
              onClick={() => setViewMode('3-columns')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === '3-columns'
                  ? 'bg-[#27272a] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              3 Columns
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'all'
                  ? 'bg-[#2a2e39] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              All Positions
            </button>
            <button
              type="button"
              onClick={() => setViewMode('signals')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'signals'
                  ? 'bg-[#2a2e39] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              Signals Feed ({buyOpportunities.length + exitSignals.length})
            </button>
          </div>

          <Link
            href="/positions"
            className="hidden md:inline-flex text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] items-center gap-1 transition-colors pl-2"
          >
            Manage Positions →
          </Link>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {orders.length === 0 && buyOpportunities.length === 0 && exitSignals.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-[#787b86] text-xs">
            <span>No active holdings or market signals available</span>
          </div>
        ) : viewMode === '3-columns' ? (
          /* 3 COLUMNS: Stock Gainers (Col 1), Live Buy Signals (Col 2), Losers & Exit Alerts (Col 3) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* COLUMN 1: STOCK GAINERS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Stock gainers</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {gainers.length} gainers
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {gainers.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No positive return positions currently.
                  </div>
                ) : (
                  gainers.slice(0, 8).map((order) => (
                    <PositionRowItem
                      key={order.id}
                      order={order}
                      totalMarketValue={totalMarketValue}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      exitSignal={exitSignalsMap.get(order.tickerSymbol.replace('.CA', '').trim().toUpperCase())}
                    />
                  ))
                )}
              </div>

              {gainers.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('GAINERS');
                      setViewMode('all');
                    }}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    See all stocks with largest unrealized gains
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 2: LIVE BUY SIGNALS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Live Buy Signals</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {isLoadingBuyOpportunities ? 'Scanning...' : `${buyOpportunities.length} triggers`}
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {buyOpportunities.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    {isLoadingBuyOpportunities ? 'Scanning live market opportunities...' : 'No active buy triggers in recent bars.'}
                  </div>
                ) : (
                  buyOpportunities.slice(0, 8).map((opp) => (
                    <SignalRowItem
                      key={`${opp.symbol}-${opp.strategyId}`}
                      opp={opp}
                      formatPrice={formatPrice}
                    />
                  ))
                )}
              </div>

              {buyOpportunities.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('BUYS');
                      setViewMode('signals');
                    }}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    See all live algorithmic buy opportunities
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 3: STOCK LOSERS & EXIT ALERTS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Stock losers & Exit Alerts</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {losersAndExits.length} holdings
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {losersAndExits.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No declining positions or exit risk alerts.
                  </div>
                ) : (
                  losersAndExits.slice(0, 8).map((order) => (
                    <PositionRowItem
                      key={order.id}
                      order={order}
                      totalMarketValue={totalMarketValue}
                      formatMoney={formatMoney}
                      isPrivacy={isPrivacy}
                      exitSignal={exitSignalsMap.get(order.tickerSymbol.replace('.CA', '').trim().toUpperCase())}
                    />
                  ))
                )}
              </div>

              {losersAndExits.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('LOSERS');
                      setViewMode('all');
                    }}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    See all declining positions and exit alerts
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'all' ? (
          /* SINGLE COMPLETE TRADINGVIEW LIST (ALL OPEN POSITIONS) */
          <div className="flex flex-col">
            <div className="divide-y divide-[#1e222d]">
              {filteredOrders.length === 0 ? (
                <div className="py-8 text-center text-[#787b86] text-xs">
                  No positions found for this category filter.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <PositionRowItem
                    key={order.id}
                    order={order}
                    totalMarketValue={totalMarketValue}
                    formatMoney={formatMoney}
                    isPrivacy={isPrivacy}
                    exitSignal={exitSignalsMap.get(order.tickerSymbol.replace('.CA', '').trim().toUpperCase())}
                    showDetails
                  />
                ))
              )}
            </div>
            <div className="pt-3 mt-1 border-t border-[#1e222d] flex items-center justify-between">
              <span className="text-xs text-[#787b86]">
                Showing {filteredOrders.length} active positions ranked by total portfolio allocation
              </span>
              <Link href="/positions" className="text-xs text-[#2962ff] hover:text-[#5b9cf6] font-semibold">
                Open Full Position Manager →
              </Link>
            </div>
          </div>
        ) : (
          /* VIEW 3: SIGNALS FEED */
          <div className="space-y-4">
            {/* Active Exit Alerts for Current Portfolio */}
            {exitSignals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <AlertTriangle size={14} />
                  <span>Exit & Risk Management Triggers on Active Holdings ({exitSignals.length})</span>
                </div>
                <div className="divide-y divide-[#1e222d] rounded-xl border border-rose-500/20 bg-rose-500/5 p-2">
                  {exitSignals.map((sig) => (
                    <SignalRowItem
                      key={`exit-${sig.symbol}-${sig.strategyId}`}
                      opp={sig}
                      formatPrice={formatPrice}
                      isExit
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Live Buy Opportunities */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#787b86]">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#089981]" />
                  <span>Algorithmic Buy Opportunities Scan</span>
                </div>
                <span className="font-mono text-white font-medium">{buyOpportunities.length} Candidates</span>
              </div>

              {buyOpportunities.length === 0 ? (
                <div className="py-8 text-center text-[#787b86] text-xs">
                  {isLoadingBuyOpportunities ? 'Scanning market opportunities...' : 'No active buy triggers right now.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {buyOpportunities.map((opp) => (
                    <Link
                      key={`opp-${opp.symbol}-${opp.strategyId}`}
                      href={`/invest?ticker=${opp.symbol}&view=chart&timeframe=D`}
                      className="p-3 rounded-xl border border-[#27272a] bg-[#121214] hover:border-[#3f3f46] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#1e222d] border border-white/5 flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {opp.symbol.replace('.CA', '').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white group-hover:text-[#2962ff] transition-colors">
                              {opp.symbol.replace('.CA', '')}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2962ff]/15 text-[#2962ff] font-semibold">
                              {opp.strategyShortName || 'PSI'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#787b86] truncate">
                            {opp.sector || 'Equities'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-mono text-xs font-semibold text-white">
                            {opp.signal.price.toFixed(2)} £
                          </div>
                          <div className="text-[10px] text-[#089981] font-semibold">
                            {opp.signal.signal}
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-[#787b86] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sleek TradingView Row Item for Open Positions
 * Matches the geometry of HoldingRowItem from PortfolioBreakdownTable:
 * - Circular avatar (w-8 h-8 rounded-full)
 * - Company name in white on top
 * - Ticker in dark capsule badge underneath + shares count
 * - Market value in bold white font with currency code (e.g. 142,500.0 EGP)
 * - Weight % underneath
 * - Solid TradingView return pill (green: #089981, red: #f23645) or SELL trigger
 */
function PositionRowItem({
  order,
  totalMarketValue,
  formatMoney,
  isPrivacy,
  exitSignal,
  showDetails = false,
}: {
  order: DashboardOrder;
  totalMarketValue: number;
  formatMoney: (val: number, showSign?: boolean) => string;
  isPrivacy: boolean;
  exitSignal?: Opportunity;
  showDetails?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const positionVal = order.currentPrice * order.quantity;
  const weightPct = totalMarketValue > 0 ? (positionVal / totalMarketValue) * 100 : 0;
  const isPositive = order.profitLoss >= 0;
  const cleanSymbol = order.tickerSymbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  return (
    <Link
      href={`/invest?ticker=${order.tickerSymbol}&view=chart&timeframe=D`}
      className={`py-2.5 px-1 flex items-center justify-between hover:bg-[#1e222d]/30 transition-colors group cursor-pointer border-b border-[#1e222d] ${
        exitSignal ? 'bg-rose-500/[0.03]' : ''
      }`}
    >
      {/* Left: Circular Avatar + Stacked Name & Ticker */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
          exitSignal
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : isPositive
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-[#1e222d] text-white/90 border-white/5'
        }`}>
          {order.logoUrl && !imgError ? (
            <img
              src={order.logoUrl}
              alt={order.tickerSymbol}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-white truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px] group-hover:text-[#2962ff] transition-colors">
              {order.companyName || cleanSymbol}
            </span>
            {exitSignal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
                SELL
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1e222d] text-[#868993] border border-white/5 uppercase tracking-wider">
              {cleanSymbol}
            </span>
            <span className="text-[11px] text-[#787b86] font-normal truncate">
              · {order.quantity.toLocaleString()} shares
              {showDetails ? ` @ ${order.entryPrice.toFixed(2)} £` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Value + Solid Return Pill */}
      <div className="flex items-center gap-3 shrink-0 pl-2">
        <div className="text-right">
          <div className="text-[13px] font-semibold text-white tabular-nums">
            {formatMoney(positionVal)}
          </div>
          <div className="text-[10px] text-[#787b86] font-medium tabular-nums text-right mt-0.5">
            {weightPct.toFixed(1)}%
            {showDetails && (
              <span className="ml-1 text-[10px] text-[#868993]">
                ({formatMoney(order.profitLoss, true)})
              </span>
            )}
          </div>
        </div>

        {/* Solid TradingView Return Pill Badge */}
        <div className="w-[74px] shrink-0 flex justify-end">
          {exitSignal ? (
            <div className="w-[72px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white bg-[#f23645] shadow-xs flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>EXIT</span>
            </div>
          ) : (
            <div
              className={`w-[72px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white shadow-xs ${
                isPositive ? 'bg-[#089981]' : 'bg-[#f23645]'
              }`}
            >
              {isPositive ? '+' : ''}{order.profitLossPct.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Sleek TradingView Row Item for Signal Opportunities
 */
function SignalRowItem({
  opp,
  formatPrice,
  isExit = false,
}: {
  opp: Opportunity;
  formatPrice: (p: number) => string;
  isExit?: boolean;
}) {
  const cleanSymbol = opp.symbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  return (
    <Link
      href={`/invest?ticker=${opp.symbol}&view=chart&timeframe=D`}
      className="py-2.5 px-1 flex items-center justify-between hover:bg-[#1e222d]/30 transition-colors group cursor-pointer border-b border-[#1e222d]"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
          isExit
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : 'bg-[#2962ff]/15 text-[#2962ff] border-[#2962ff]/30'
        }`}>
          <span>{initial}</span>
        </div>

        <div className="min-w-0">
          <div className="text-[13px] font-medium text-white truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px] group-hover:text-[#2962ff] transition-colors">
            {opp.symbol}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1e222d] text-[#868993] border border-white/5 uppercase tracking-wider">
              {opp.strategyShortName || 'PSI'}
            </span>
            <span className="text-[11px] text-[#787b86] font-normal truncate">
              · {opp.sector || 'Equities'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pl-2">
        <div className="text-right">
          <div className="text-[13px] font-semibold text-white tabular-nums">
            {formatPrice(opp.signal.price)}
          </div>
          <div className="text-[10px] text-[#787b86] font-medium tabular-nums text-right mt-0.5">
            Signal Entry
          </div>
        </div>

        <div className="w-[74px] shrink-0 flex justify-end">
          <div
            className={`w-[72px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white shadow-xs ${
              isExit ? 'bg-[#f23645]' : 'bg-[#089981]'
            }`}
          >
            {isExit ? 'SELL' : 'BUY'}
          </div>
        </div>
      </div>
    </Link>
  );
}
