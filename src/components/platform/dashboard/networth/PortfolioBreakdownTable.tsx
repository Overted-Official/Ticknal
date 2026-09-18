'use client';

import React, { useState } from 'react';
import { ChevronRight } from '@/components/ui/icon-library';
import { type PositionItem, type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type PortfolioCategory = 'ALL' | 'STOCKS' | 'FUNDS' | 'USD_CASH' | 'EGP_CASH' | 'BROKERAGE_CASH';
export type ViewMode = '3-columns' | 'all';

interface PortfolioBreakdownTableProps {
  openPositions: PositionItem[];
  accounts: BankAccount[];
  usdRate: number;
  currencyMode: 'EGP' | 'USD';
  totalNetWorthEgp: number;
  activeFilter?: PortfolioCategory;
  onFilterChange?: (cat: PortfolioCategory) => void;
}

interface ConstituentItem {
  id: string;
  category: 'STOCKS' | 'FUNDS' | 'USD_CASH' | 'EGP_CASH' | 'BROKERAGE_CASH';
  ticker: string;
  companyName: string;
  typeLabel: string;
  quantityOrUnits: string;
  rawEgp: number;
  pnlPct?: number;
  color: string;
  logoUrl?: string | null;
}

export default function PortfolioBreakdownTable({
  openPositions,
  accounts,
  usdRate,
  currencyMode,
  totalNetWorthEgp,
  activeFilter = 'ALL',
  onFilterChange,
}: PortfolioBreakdownTableProps) {
  const [internalFilter, setInternalFilter] = useState<PortfolioCategory>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('3-columns');
  const currentFilter = onFilterChange ? activeFilter : internalFilter;
  const setFilter = onFilterChange || setInternalFilter;

  const { isPrivacy } = usePrivacyMode();
  const fxMultiplier = currencyMode === 'USD' ? (1 / usdRate) : 1;
  const currencyCode = currencyMode === 'USD' ? 'USD' : 'EGP';

  const mutualFundSymbols = new Set(['OSOUL', 'CI_QUANT', 'COF']);
  const isBrokerageAccount = (account: BankAccount) => ['BROKERAGE', 'BROKER_CASH'].includes(account.accountType);

  // Build constituent items
  const items: ConstituentItem[] = [];

  // 1. Equities and Funds
  for (const pos of openPositions) {
    const isFund = mutualFundSymbols.has(pos.tickerSymbol.toUpperCase());
    const valEgp = Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
    const entryVal = Number(pos.quantity) * Number(pos.entryPrice);
    const pnlPct = entryVal > 0 ? ((valEgp - entryVal) / entryVal) * 100 : 0;

    items.push({
      id: `pos-${pos.id || pos.tickerSymbol}`,
      category: isFund ? 'FUNDS' : 'STOCKS',
      ticker: pos.tickerSymbol,
      companyName: pos.companyName || (isFund ? 'Mutual Fund' : 'EGX Stock'),
      typeLabel: isFund ? 'Mutual Fund' : 'EGX Equity',
      quantityOrUnits: `${Number(pos.quantity).toLocaleString()} ${isFund ? 'units' : 'shares'}`,
      rawEgp: valEgp,
      pnlPct: isFund ? undefined : pnlPct,
      color: isFund ? '#9c27b0' : '#448aff',
      logoUrl: pos.logoUrl || null,
    });
  }

  // 2. USD Cash Reserves
  for (const acc of accounts.filter((a) => a.currency === 'USD')) {
    const valEgp = Number(acc.balance) * usdRate;
    const isBrokerage = isBrokerageAccount(acc);
    items.push({
      id: `acc-${acc.id}`,
      category: isBrokerage ? 'BROKERAGE_CASH' : 'USD_CASH',
      ticker: 'USD',
      companyName: acc.accountName || acc.bankName || 'USD Foreign Reserve',
      typeLabel: isBrokerage ? 'Brokerage Cash' : 'USD Cash',
      quantityOrUnits: `$${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      rawEgp: valEgp,
      color: isBrokerage ? '#00bcd4' : '#089981',
      logoUrl: acc.bankLogoUrl || null,
    });
  }

  // 3. EGP Liquid Cash
  for (const acc of accounts.filter((a) => a.currency === 'EGP')) {
    const valEgp = Number(acc.balance);
    const isBrokerage = isBrokerageAccount(acc);
    items.push({
      id: `acc-${acc.id}`,
      category: isBrokerage ? 'BROKERAGE_CASH' : 'EGP_CASH',
      ticker: 'EGP',
      companyName: acc.accountName || acc.bankName || 'EGP Liquid Balance',
      typeLabel: isBrokerage ? 'Brokerage Cash' : 'EGP Cash',
      quantityOrUnits: `${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} £`,
      rawEgp: valEgp,
      color: isBrokerage ? '#00bcd4' : '#ff9800',
      logoUrl: acc.bankLogoUrl || null,
    });
  }

  // Filter items
  const filteredItems = currentFilter === 'ALL'
    ? items
    : items.filter((item) => item.category === currentFilter);

  // 1. Gainers: holdings with pnlPct > 0 sorted descending by % return
  const gainers = [...filteredItems]
    .filter((i) => i.pnlPct !== undefined && i.pnlPct > 0)
    .sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0));

  // 2. Liquid: cash accounts, brokerage cash, mutual funds, or items without pnlPct
  const liquid = [...filteredItems]
    .filter((i) => i.pnlPct === undefined)
    .sort((a, b) => b.rawEgp - a.rawEgp);

  // 3. Losers: holdings with pnlPct <= 0
  const losers = [...filteredItems]
    .filter((i) => i.pnlPct !== undefined && i.pnlPct <= 0)
    .sort((a, b) => (a.pnlPct ?? 0) - (b.pnlPct ?? 0));

  // All sorted by Market Value descending
  const allSortedByVal = [...filteredItems].sort((a, b) => b.rawEgp - a.rawEgp);

  const categories: Array<{ key: PortfolioCategory; label: string }> = [
    { key: 'ALL', label: 'All Holdings' },
    { key: 'STOCKS', label: 'EGX Equities' },
    { key: 'FUNDS', label: 'Mutual Funds' },
    { key: 'USD_CASH', label: 'USD Reserves' },
    { key: 'EGP_CASH', label: 'EGP Cash' },
    { key: 'BROKERAGE_CASH', label: 'Brokerage Cash' },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-start select-none space-y-4 bg-transparent">
      {/* 1. Top Filter Bar: Category Tabs on Left + View Mode Switch on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
        {/* Category Pills (TradingView Top Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                currentFilter === c.key
                  ? 'bg-[#1e222d] text-white border border-[#2a2e39] font-semibold'
                  : 'text-[#868993] hover:text-white font-medium'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: 3 Columns vs All Holdings */}
        <div className="inline-flex p-0.5 rounded-lg bg-[#131722] border border-[#2a2e39]/50 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('3-columns')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === '3-columns'
                ? 'bg-[#2a2e39] text-white shadow-xs'
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
            All Holdings
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-[#787b86] text-xs">
            <span>No constituent assets found for the selected filter.</span>
          </div>
        ) : viewMode === '3-columns' ? (
          /* 3 Columns: Gainers (Col 1), Liquid (Col 2), Losers (Col 3) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* COLUMN 1: GAINERS */}
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
                    No positive return holdings in this category.
                  </div>
                ) : (
                  gainers.slice(0, 8).map((item) => (
                    <HoldingRowItem
                      key={item.id}
                      item={item}
                      fxMultiplier={fxMultiplier}
                      currencyCode={currencyCode}
                      totalNetWorthEgp={totalNetWorthEgp}
                      isPrivacy={isPrivacy}
                    />
                  ))
                )}
              </div>

              {gainers.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    See all stocks with largest daily growth
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 2: LIQUID RESERVES & FUNDS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Liquid reserves & Cash</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {liquid.length} balances
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {liquid.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No liquid reserves or cash balances found.
                  </div>
                ) : (
                  liquid.slice(0, 8).map((item) => (
                    <HoldingRowItem
                      key={item.id}
                      item={item}
                      fxMultiplier={fxMultiplier}
                      currencyCode={currencyCode}
                      totalNetWorthEgp={totalNetWorthEgp}
                      isPrivacy={isPrivacy}
                    />
                  ))
                )}
              </div>

              {liquid.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    See all liquid cash & reserve balances
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 3: LOSERS */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1e222d]">
                <div className="flex items-center gap-1 text-base font-bold text-white group cursor-pointer hover:text-[#2962ff] transition-colors">
                  <span>Stock losers</span>
                  <ChevronRight className="w-4 h-4 text-[#868993] group-hover:text-[#2962ff]" />
                </div>
                <span className="text-[11px] text-[#787b86] font-medium">
                  {losers.length} losers
                </span>
              </div>

              <div className="divide-y divide-[#1e222d]">
                {losers.length === 0 ? (
                  <div className="py-8 text-center text-[#787b86] text-xs">
                    No declining holdings in this portfolio.
                  </div>
                ) : (
                  losers.slice(0, 8).map((item) => (
                    <HoldingRowItem
                      key={item.id}
                      item={item}
                      fxMultiplier={fxMultiplier}
                      currencyCode={currencyCode}
                      totalNetWorthEgp={totalNetWorthEgp}
                      isPrivacy={isPrivacy}
                    />
                  ))
                )}
              </div>

              {losers.length > 0 && (
                <div className="pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-xs font-semibold text-[#2962ff] hover:text-[#5b9cf6] flex items-center gap-1 transition-colors"
                  >
                    See all stocks with daily drop
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single Complete TradingView List */
          <div className="flex flex-col">
            <div className="divide-y divide-[#1e222d]">
              {allSortedByVal.map((item) => (
                <HoldingRowItem
                  key={item.id}
                  item={item}
                  fxMultiplier={fxMultiplier}
                  currencyCode={currencyCode}
                  totalNetWorthEgp={totalNetWorthEgp}
                  isPrivacy={isPrivacy}
                />
              ))}
            </div>

            <div className="pt-3 mt-1 border-t border-[#1e222d]">
              <span className="text-xs text-[#787b86]">
                Showing all {allSortedByVal.length} constituent assets sorted by total market allocation
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sleek TradingView Row Item
 * Replicates the exact visual geometry from TradingView's market mover lists:
 * - Circular avatar (w-8 h-8 rounded-full)
 * - Company name in white on top
 * - Ticker in dark capsule badge underneath + shares/units
 * - Market value in bold white font with currency code (e.g. 3,312.5 EGP)
 * - Weight % underneath
 * - Solid TradingView return pill (green: #089981, red: #f23645)
 */
function HoldingRowItem({
  item,
  fxMultiplier,
  currencyCode,
  totalNetWorthEgp,
  isPrivacy,
}: {
  item: ConstituentItem;
  fxMultiplier: number;
  currencyCode: string;
  totalNetWorthEgp: number;
  isPrivacy: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const displayVal = item.rawEgp * fxMultiplier;
  const weightPct = totalNetWorthEgp > 0 ? (item.rawEgp / totalNetWorthEgp) * 100 : 0;
  const isPositive = item.pnlPct !== undefined && item.pnlPct >= 0;

  // Derive initial letter for avatar fallback
  const initial = item.companyName
    ? item.companyName.trim().charAt(0).toUpperCase()
    : item.ticker.charAt(0).toUpperCase();

  return (
    <div className="py-2.5 px-1 flex items-center justify-between hover:bg-[#1e222d]/30 transition-colors group cursor-pointer border-b border-[#1e222d]">
      {/* Left: Circular Avatar + Stacked Name & Ticker */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        {/* Circular Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#1e222d] border border-white/5 flex items-center justify-center font-bold text-xs text-white/90 shrink-0 overflow-hidden shadow-xs">
          {item.logoUrl && !imgError ? (
            <img
              src={item.logoUrl}
              alt={item.ticker}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Text Stack */}
        <div className="min-w-0">
          {/* Top: Full Company Name */}
          <div className="text-[13px] font-medium text-white truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px] group-hover:text-[#2962ff] transition-colors">
            {item.companyName}
          </div>

          {/* Bottom: Ticker in dark pill + shares */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1e222d] text-[#868993] border border-white/5 uppercase tracking-wider">
              {item.ticker}
            </span>
            <span className="text-[11px] text-[#787b86] font-normal truncate">
              · {item.quantityOrUnits}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Value + Solid Return Pill */}
      <div className="flex items-center gap-3 shrink-0 pl-2">
        {/* Value & Weight */}
        <div className="text-right">
          <div className="text-[13px] font-semibold text-white tabular-nums">
            {isPrivacy ? (
              '••••••••'
            ) : (
              <>
                {displayVal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-[10px] text-[#787b86] font-medium uppercase ml-1">
                  {currencyCode}
                </span>
              </>
            )}
          </div>
          <div className="text-[10px] text-[#787b86] font-medium tabular-nums text-right mt-0.5">
            {weightPct.toFixed(1)}%
          </div>
        </div>

        {/* Solid TradingView Pill Badge */}
        <div className="w-[74px] shrink-0 flex justify-end">
          {item.pnlPct !== undefined ? (
            <div
              className={`w-[72px] py-1 text-center rounded-[6px] text-xs font-bold tabular-nums text-white shadow-xs ${
                isPositive
                  ? 'bg-[#089981]' // TradingView official green
                  : 'bg-[#f23645]' // TradingView official ripe red
              }`}
            >
              {isPositive ? '+' : ''}{item.pnlPct.toFixed(1)}%
            </div>
          ) : (
            <div className="w-[72px] py-1 text-center rounded-[6px] text-xs font-medium tabular-nums text-[#868993] bg-[#1e222d] border border-white/5">
              {item.category === 'BROKERAGE_CASH' ? 'Cash' : item.category === 'FUNDS' ? 'Fund' : 'Liquid'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
