'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { money, STRATEGIES, type StrategyFilter } from './portfolioTypes';

interface PortfolioSummaryHeaderWidgetProps {
  investedValue: number;
  brokerageCash: number;
  hasBrokerage: boolean;
  totalPortfolioValue: number;
  freshSellDisplay: string;
  freshSellCount: number;
  freshOpportunityDisplay: string;
  freshness: number;
  strategy: StrategyFilter;
  isLoadingConsensus: boolean;
  linkedEgpBrokerageCount: number;
}

export default function PortfolioSummaryHeaderWidget({
  investedValue,
  brokerageCash,
  hasBrokerage,
  totalPortfolioValue,
  freshSellDisplay,
  freshSellCount,
  freshOpportunityDisplay,
  freshness,
  strategy,
  isLoadingConsensus,
  linkedEgpBrokerageCount,
}: PortfolioSummaryHeaderWidgetProps) {
  const { isPrivacy } = usePrivacyMode();

  const cards = [
    {
      id: 'invested-value',
      title: 'Invested Value',
      value: isPrivacy ? '••••••••' : money(investedValue),
      badgeText: strategy === 'all' ? 'Multi-Model' : strategy.toUpperCase(),
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: 'Open Holdings',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'brokerage-cash',
      title: 'Brokerage Cash',
      value: isPrivacy ? '••••••••' : hasBrokerage ? money(brokerageCash) : '0.0 £',
      badgeText: hasBrokerage ? `${linkedEgpBrokerageCount} Linked` : 'Not linked',
      badgeClass: hasBrokerage
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      metaText: hasBrokerage ? 'EGP Cash Available' : 'Link Account',
      metaClass: hasBrokerage ? 'text-[#089981]' : 'text-amber-400',
    },
    {
      id: 'total-portfolio',
      title: 'Total Portfolio',
      value: isPrivacy ? '••••••••' : hasBrokerage ? money(totalPortfolioValue) : money(investedValue),
      badgeText: 'Combined',
      badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      metaText: hasBrokerage ? 'Invested + Cash' : 'Cash Excluded',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'fresh-sells',
      title: 'Fresh Sell Signals',
      value: isLoadingConsensus ? 'Analyzing…' : freshSellDisplay,
      badgeText: `${freshness} Sessions`,
      badgeClass: freshSellCount > 0
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: freshSellCount > 0 ? 'Actionable Exits' : 'No Exit Signals',
      metaClass: freshSellCount > 0 ? 'text-[#f23645]' : 'text-[#089981]',
    },
    {
      id: 'fresh-buys',
      title: 'Buy Opportunities',
      value: freshOpportunityDisplay,
      badgeText: 'Unheld',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      metaText: `${freshness} Sessions Window`,
      metaClass: 'text-cold-gray-450',
    },
  ];

  return (
    <div className="w-full min-w-0 relative select-none font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#1e222d] mb-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Portfolio Overview</h3>
          <p className="text-xs text-[#787b86] mt-0.5">Capital, cash reserves, and fresh algorithmic signals</p>
        </div>
        <span className="text-xs text-[#787b86] font-medium">
          {strategy === 'all' ? 'Competing multi-strategy view' : `${STRATEGIES.find((item) => item.id === strategy)?.label} view`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.id} className="tv-kpi-card w-full">
            {/* Row 1: Title (left) + Badge pill (right) */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span
                className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight"
                title={card.title}
              >
                {card.title}
              </span>
              <span className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${card.badgeClass}`}>
                {card.badgeText}
              </span>
            </div>

            {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
                {card.value}
              </span>
              <span className={`text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none ${card.metaClass}`}>
                {card.metaText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
