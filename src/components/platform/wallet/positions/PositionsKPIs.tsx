'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface PositionsKPIsProps {
  totals: {
    portfolioValue: number;
    costBasis?: number;
    unrealized: number;
    realized: number;
    winRate: number;
    openCount: number;
    closedCount: number;
    winningCount: number;
    losingCount: number;
  };
  onScrollToTable?: () => void;
}

export default function PositionsKPIs({ totals, onScrollToTable }: PositionsKPIsProps) {
  const { isPrivacy } = usePrivacyMode();

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

  const cost = totals.costBasis ?? (totals.portfolioValue - totals.unrealized > 0 ? totals.portfolioValue - totals.unrealized : 0);
  const unrealizedPct = cost > 0 ? (totals.unrealized / cost) * 100 : 0;

  const cards = [
    {
      id: 'portfolio-value',
      title: 'Portfolio Value',
      value: isPrivacy ? '••••••••' : formatMoney(totals.portfolioValue),
      badgeText: `${totals.openCount} Open`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: isPrivacy ? 'Cost: ••••••••' : cost > 0 ? `Cost: ${formatMoney(cost)}` : 'Live valuation',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'unrealized-pl',
      title: 'Unrealized P/L',
      value: isPrivacy
        ? (totals.unrealized >= 0 ? '+••••••••' : '-••••••••')
        : formatMoney(totals.unrealized, true),
      badgeText: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
      badgeClass:
        totals.unrealized > 0
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : totals.unrealized < 0
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${totals.openCount} active position${totals.openCount !== 1 ? 's' : ''}`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'realized-pl',
      title: 'Realized P/L',
      value: isPrivacy
        ? (totals.realized >= 0 ? '+••••••••' : '-••••••••')
        : formatMoney(totals.realized, true),
      badgeText: `${totals.closedCount} Closed`,
      badgeClass:
        totals.realized > 0
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : totals.realized < 0
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${totals.winningCount}W · ${totals.losingCount}L closed`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'win-rate',
      title: 'Strategy Win Rate',
      value: totals.closedCount > 0 ? `${totals.winRate.toFixed(1)}%` : '—',
      badgeText: totals.closedCount > 0 ? `${totals.winningCount}/${totals.closedCount} Won` : 'No trades',
      badgeClass:
        totals.closedCount === 0
          ? 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700'
          : totals.winRate >= 50
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      metaText: totals.closedCount > 0 ? 'Closed trades' : 'No closed trades',
      metaClass: 'text-cold-gray-450',
    },
  ];

  return (
    <div className="w-full select-none">
      {/* Strict 2x2 Grid on Mobile, 4-cards row on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={onScrollToTable}
            className="tv-kpi-card w-full cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onScrollToTable?.();
              }
            }}
          >
            {/* Top row: Title + Badge */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight" title={card.title}>
                {card.title}
              </span>
              <span
                className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${card.badgeClass}`}
              >
                {card.badgeText}
              </span>
            </div>

            {/* Bottom row: Value + Meta */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
                {card.value}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] truncate max-w-[68px] sm:max-w-[130px] text-right font-medium leading-none ${card.metaClass}`}
              >
                {card.metaText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
