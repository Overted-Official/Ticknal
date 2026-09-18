'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { NetWorthTrendPoint } from '@/lib/portfolio-finance';

interface NetWorthKPIsProps {
  currencyMode: 'EGP' | 'USD';
  displayTotalNetWorth: number;
  totalNetWorthEgp: number;
  totalEquitiesMarketValue: number;
  totalFundsMarketValue: number;
  totalEgpLiquidCash: number;
  totalUsdCashInEgp: number;
  brokerageCashInEgp: number;
  brokerageAccountsCount: number;
  fxMultiplier: number;
  openPositionsCount: number;
  connectedAccountsCount: number;
  currentYearDrag: number;
  effectiveAnnualInflation: number;
  trendData: NetWorthTrendPoint[];
}

export default function NetWorthKPIs({
  currencyMode,
  displayTotalNetWorth,
  totalNetWorthEgp,
  totalEquitiesMarketValue,
  totalFundsMarketValue,
  totalEgpLiquidCash,
  totalUsdCashInEgp,
  brokerageCashInEgp,
  brokerageAccountsCount,
  fxMultiplier,
  openPositionsCount,
  connectedAccountsCount,
  currentYearDrag,
  effectiveAnnualInflation,
}: NetWorthKPIsProps) {
  const { isPrivacy } = usePrivacyMode();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const formatCurrency = (val: number) => {
    return `${displaySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`;
  };

  const investedTotal = (totalEquitiesMarketValue + totalFundsMarketValue) * fxMultiplier;
  const liquidCashTotal = (totalEgpLiquidCash + totalUsdCashInEgp) * fxMultiplier;
  const brokerageCashTotal = brokerageCashInEgp * fxMultiplier;
  const dragDisplay = currentYearDrag * fxMultiplier;

  const investedPct = totalNetWorthEgp > 0 ? (((totalEquitiesMarketValue + totalFundsMarketValue) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const cashPct = totalNetWorthEgp > 0 ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const brokeragePct = totalNetWorthEgp > 0 ? ((brokerageCashInEgp / totalNetWorthEgp) * 100).toFixed(1) : '0.0';

  const realPurchasingPower = displayTotalNetWorth - dragDisplay;

  // Filmstrip scroll state management
  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const step = 288; // 272px card + 16px gap
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const handleCardClick = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cards = [
    {
      id: 'net-worth',
      targetId: 'section-wealth-trajectory',
      title: 'Total Net Worth',
      value: isPrivacy ? '••••••••' : formatCurrency(displayTotalNetWorth),
      badgeText: 'Live mark',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      metaText: 'Mark-to-market live',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'real-purchasing-power',
      targetId: 'section-wealth-trajectory',
      title: 'Real Purchasing Power',
      value: isPrivacy ? '••••••••' : formatCurrency(realPurchasingPower),
      badgeText: `-${effectiveAnnualInflation.toFixed(1)}% Defl.`,
      badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      metaText: isPrivacy ? 'Drag: -••••••' : `Drag: -${formatCurrency(dragDisplay)}`,
      metaClass: 'text-amber-400/90',
    },
    {
      id: 'investments',
      targetId: 'section-holdings-allocations',
      title: 'Investments (Equities & Funds)',
      value: isPrivacy ? '••••••••' : formatCurrency(investedTotal),
      badgeText: `${investedPct}% Alloc.`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${openPositionsCount} active holdings`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'liquid-cash',
      targetId: 'section-holdings-allocations',
      title: 'Cash Reserves (Bank + USD)',
      value: isPrivacy ? '••••••••' : formatCurrency(liquidCashTotal),
      badgeText: `${cashPct}% Liquidity`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${connectedAccountsCount} bank account${connectedAccountsCount !== 1 ? 's' : ''}`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'brokerage-cash',
      targetId: 'section-holdings-allocations',
      title: 'Brokerage Cash',
      value: brokerageAccountsCount > 0
        ? (isPrivacy ? '••••••••' : formatCurrency(brokerageCashTotal))
        : 'Not linked',
      badgeText: brokerageAccountsCount > 0 ? `${brokeragePct}% Share` : 'No account',
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: brokerageAccountsCount > 0 ? 'Available trading cash' : 'Add brokerage',
      metaClass: 'text-cold-gray-450',
    },
  ];

  return (
    <div className="w-full space-y-2">
      {/* Navigation bar */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-cold-gray-450 tracking-wide">
          Key Metrics · Click card to jump to section
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            className="p-1 rounded-lg border border-cold-gray-800 bg-transparent text-cold-gray-400 hover:text-white hover:bg-cold-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            className="p-1 rounded-lg border border-cold-gray-800 bg-transparent text-cold-gray-400 hover:text-white hover:bg-cold-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filmstrip track */}
      <div
        ref={trackRef}
        className="tv-filmstrip-track pb-1 pt-0.5 scroll-smooth"
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.targetId)}
            className="tv-kpi-card shrink-0 flex-1 min-w-[272px] max-w-[360px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(card.targetId);
              }
            }}
          >
            {/* Top row: Title + Badge */}
            <div className="flex items-center justify-between gap-2 leading-none">
              <span className="text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
                {card.title}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none ${card.badgeClass}`}>
                {card.badgeText}
              </span>
            </div>

            {/* Bottom row: Value + Meta */}
            <div className="flex items-baseline justify-between gap-2 leading-none">
              <span className="text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight">
                {card.value}
              </span>
              <span className={`text-[11px] truncate max-w-[130px] text-right font-medium leading-none ${card.metaClass}`}>
                {card.metaText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
