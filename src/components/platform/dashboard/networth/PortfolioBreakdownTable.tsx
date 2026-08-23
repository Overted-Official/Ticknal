'use client';

import React, { useState } from 'react';
import { type PositionItem, type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type PortfolioCategory = 'ALL' | 'STOCKS' | 'FUNDS' | 'USD_CASH' | 'EGP_CASH';

interface PortfolioBreakdownTableProps {
  openPositions: PositionItem[];
  accounts: BankAccount[];
  usdRate: number;
  currencyMode: 'EGP' | 'USD';
  totalNetWorthEgp: number;
  activeFilter?: PortfolioCategory;
  onFilterChange?: (cat: PortfolioCategory) => void;
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
  const currentFilter = onFilterChange ? activeFilter : internalFilter;
  const setFilter = onFilterChange || setInternalFilter;

  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';
  const fxMultiplier = currencyMode === 'USD' ? (1 / usdRate) : 1;

  const formatCurrency = (val: number) => {
    return `${displaySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${displaySuffix}`;
  };

  const mutualFundSymbols = new Set(['OSOUL', 'CI_QUANT', 'COF']);

  // Build unified constituent items
  const items: Array<{
    id: string;
    category: 'STOCKS' | 'FUNDS' | 'USD_CASH' | 'EGP_CASH';
    title: string;
    subtitle: string;
    typeLabel: string;
    quantityOrUnits: string;
    rawEgp: number;
    pnlPct?: number;
    color: string;
    logoUrl?: string | null;
  }> = [];

  // 1. Equities and Funds
  for (const pos of openPositions) {
    const isFund = mutualFundSymbols.has(pos.tickerSymbol.toUpperCase());
    const valEgp = Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
    const entryVal = Number(pos.quantity) * Number(pos.entryPrice);
    const pnlPct = entryVal > 0 ? ((valEgp - entryVal) / entryVal) * 100 : 0;

    items.push({
      id: `pos-${pos.id || pos.tickerSymbol}`,
      category: isFund ? 'FUNDS' : 'STOCKS',
      title: pos.tickerSymbol,
      subtitle: pos.companyName || (isFund ? 'Mutual Fund' : 'EGX Stock'),
      typeLabel: isFund ? 'Mutual Fund' : 'EGX Equity',
      quantityOrUnits: `${Number(pos.quantity).toLocaleString()} ${isFund ? 'units' : 'shares'}`,
      rawEgp: valEgp,
      pnlPct: isFund ? undefined : pnlPct,
      color: isFund ? 'var(--plt-violet)' : 'var(--plt-info)',
      logoUrl: pos.logoUrl || null,
    });
  }

  // 2. USD Cash Reserves
  for (const acc of accounts.filter((a) => a.currency === 'USD')) {
    const valEgp = Number(acc.balance) * usdRate;
    items.push({
      id: `acc-${acc.id}`,
      category: 'USD_CASH',
      title: acc.bankName || 'Bank Account',
      subtitle: acc.accountName || 'USD Foreign Reserve',
      typeLabel: 'USD Cash',
      quantityOrUnits: `$${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rawEgp: valEgp,
      color: 'var(--plt-profit)',
      logoUrl: acc.bankLogoUrl || null,
    });
  }

  // 3. EGP Liquid Cash
  for (const acc of accounts.filter((a) => a.currency === 'EGP')) {
    const valEgp = Number(acc.balance);
    items.push({
      id: `acc-${acc.id}`,
      category: 'EGP_CASH',
      title: acc.bankName || 'Bank Account',
      subtitle: acc.accountName || 'EGP Liquid Balance',
      typeLabel: 'EGP Cash',
      quantityOrUnits: `${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`,
      rawEgp: valEgp,
      color: 'var(--plt-warning)',
      logoUrl: acc.bankLogoUrl || null,
    });
  }

  // Sort items by rawEgp descending
  items.sort((a, b) => b.rawEgp - a.rawEgp);

  // Filter items
  const filteredItems = currentFilter === 'ALL'
    ? items
    : items.filter((item) => item.category === currentFilter);

  const categories: Array<{ key: PortfolioCategory; label: string }> = [
    { key: 'ALL', label: 'All Holdings' },
    { key: 'STOCKS', label: 'EGX Equities' },
    { key: 'FUNDS', label: 'Mutual Funds' },
    { key: 'USD_CASH', label: 'USD Reserves' },
    { key: 'EGP_CASH', label: 'EGP Cash' },
  ];

  return (
    <div className="card-widget h-full flex flex-col justify-start select-none space-y-3">
      {/* 1. Header with Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="widget-title">Constituent Assets & Holdings</h3>
          <p className="widget-subtitle mt-0.5">
            Detailed breakdown of assets in your portfolio ({filteredItems.length} items)
          </p>
        </div>

        {/* Filter Pills */}
        <div className="pill-switch overflow-x-auto max-w-full">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`pill-switch-btn text-[11px] whitespace-nowrap ${
                currentFilter === c.key ? 'pill-switch-btn-active' : ''
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Borderless Holdings Table */}
      <div className="overflow-y-auto overflow-x-auto h-[380px] custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-plt-muted font-sans text-xs">
            <span>No constituent assets found for the selected category.</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans border-separate border-spacing-y-1">
            <thead className="sticky top-0 bg-plt-base z-10">
              <tr className="text-plt-muted text-[10px] font-semibold uppercase tracking-wider">
                <th className="py-2 px-3">Asset / Institution</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 text-right">Holding Qty</th>
                <th className="py-2 px-3 text-right">Market Value</th>
                <th className="py-2 px-3 text-right">Weight</th>
                <th className="py-2 px-3 text-right">Return / Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const displayVal = item.rawEgp * fxMultiplier;
                const weightPct = totalNetWorthEgp > 0 ? (item.rawEgp / totalNetWorthEgp) * 100 : 0;

                return (
                  <tr key={item.id} className="hover:bg-plt-hover/50 transition-colors group">
                    {/* Asset Name + Logo */}
                    <td className="py-2 px-3 rounded-l-xl">
                      <div className="flex items-center gap-2.5">
                        <AssetLogo logoUrl={item.logoUrl} title={item.title} color={item.color} />
                        <div className="min-w-0">
                          <div className="font-semibold text-plt-text tracking-wide">{item.title}</div>
                          <div className="text-[10px] text-plt-muted truncate max-w-[150px] sm:max-w-xs">{item.subtitle}</div>
                        </div>
                      </div>
                    </td>

                    {/* Asset Type */}
                    <td className="py-2 px-3 text-plt-muted text-[11px]">
                      {item.typeLabel}
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3 text-right tabular-nums text-plt-text font-medium">
                      {item.quantityOrUnits}
                    </td>

                    {/* Market Value */}
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-plt-text">
                      {isPrivacy ? '******' : formatCurrency(displayVal)}
                    </td>

                    {/* Weight % */}
                    <td className="py-2 px-3 text-right tabular-nums text-plt-muted">
                      {weightPct.toFixed(1)}%
                    </td>

                    {/* PnL or Status */}
                    <td className="py-2 px-3 text-right tabular-nums font-semibold rounded-r-xl">
                      {item.pnlPct !== undefined ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.pnlPct >= 0
                            ? 'text-plt-profit bg-plt-profit/10'
                            : 'text-plt-risk bg-plt-risk/10'
                        }`}>
                          {item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-normal text-plt-muted bg-plt-hover/60">
                          Liquid
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AssetLogo({
  logoUrl,
  title,
  color,
}: {
  logoUrl?: string | null;
  title: string;
  color: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className="w-7 h-7 rounded-lg bg-plt-card/90 border border-plt-border-soft flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-xs">
        <img
          src={logoUrl}
          alt={title}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Monogram Fallback Badge
  const monogram = title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'AST';
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[9px] shrink-0 bg-plt-card/90 border border-plt-border-soft shadow-xs select-none"
      style={{ color }}
    >
      {monogram}
    </div>
  );
}
