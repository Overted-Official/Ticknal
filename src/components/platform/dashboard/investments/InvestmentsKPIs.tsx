'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type OrderStats } from './investmentsTypes';

interface InvestmentsKPIsProps {
  orderStats: OrderStats;
  activeAlertCount?: number;
}

export default function InvestmentsKPIs({
  orderStats,
}: InvestmentsKPIsProps) {
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

  const handleCardClick = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- Row 1: Primary Financials (4 Cards) ---
  const unrealizedPct =
    orderStats.openCostBasis > 0
      ? (orderStats.unrealized / orderStats.openCostBasis) * 100
      : 0;

  const totalGain = orderStats.unrealized + orderStats.realized;
  const totalRoi = orderStats.totalRoi;

  const row1Cards = [
    {
      id: 'portfolio-value',
      targetId: 'section-capital-allocation',
      title: 'Portfolio Value',
      value: isPrivacy ? '••••••••' : formatMoney(orderStats.openMarketValue),
      badgeText: `${orderStats.openOrders.length} Holdings`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: isPrivacy ? 'Cost: ••••••••' : `Cost: ${formatMoney(orderStats.openCostBasis)}`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'unrealized-gain',
      targetId: 'section-active-positions',
      title: 'Unrealized Gain',
      value: isPrivacy
        ? (orderStats.unrealized >= 0 ? '+••••••••' : '-••••••••')
        : formatMoney(orderStats.unrealized, true),
      badgeText: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
      badgeClass:
        orderStats.unrealized > 0
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : orderStats.unrealized < 0
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${orderStats.openWinning}W · ${orderStats.openLosing}L active`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'realized-gain',
      targetId: 'section-monthly-progression',
      title: 'Realized Gain',
      value: isPrivacy
        ? (orderStats.realized >= 0 ? '+••••••••' : '-••••••••')
        : formatMoney(orderStats.realized, true),
      badgeText: `${orderStats.closedCount} Closed`,
      badgeClass:
        orderStats.realized > 0
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : orderStats.realized < 0
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${orderStats.closedWinning}W · ${orderStats.closedLosing}L closed`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'total-gain',
      targetId: 'section-monthly-progression',
      title: 'Total Gain',
      value: isPrivacy
        ? (totalGain >= 0 ? '+••••••••' : '-••••••••')
        : formatMoney(totalGain, true),
      badgeText: `${totalRoi >= 0 ? '+' : ''}${totalRoi.toFixed(1)}% ROI`,
      badgeClass:
        totalGain > 0
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : totalGain < 0
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: 'Unrealized + Realized',
      metaClass: 'text-cold-gray-450',
    },
  ];

  // --- Row 2: Trading & Risk Metrics (5 Cards) ---
  const hasClosedTrades = orderStats.closedCount > 0;
  const winRate = orderStats.winRate;
  const displayWinRate = hasClosedTrades && winRate !== null ? `${winRate.toFixed(1)}%` : '—';
  const winRateBadge =
    !hasClosedTrades || winRate === null
      ? 'No data'
      : winRate >= 60
      ? 'Optimal'
      : winRate >= 50
      ? 'Positive'
      : 'Active';
  const winRateBadgeClass =
    !hasClosedTrades || winRate === null
      ? 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700'
      : winRate >= 50
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

  const avgBars = orderStats.avgBarsPerTrade !== null ? Math.round(orderStats.avgBarsPerTrade) : null;
  const displayAvgBars = avgBars !== null ? `${avgBars} bars` : '—';
  const avgBarsBadge =
    avgBars !== null
      ? avgBars > 20
        ? 'Position'
        : avgBars > 5
        ? 'Swing'
        : 'Intraday'
      : 'No data';

  let avgGain: number | null = null;
  let avgGainMeta = 'Completed trades';
  if (orderStats.closedCount > 0) {
    avgGain = orderStats.realized / orderStats.closedCount;
    avgGainMeta = `${orderStats.closedCount} closed trades`;
  } else if (orderStats.openOrders.length > 0) {
    avgGain = orderStats.unrealized / orderStats.openOrders.length;
    avgGainMeta = `${orderStats.openOrders.length} active holdings`;
  }
  const displayAvgGain = avgGain !== null ? formatMoney(avgGain, true) : '—';
  const avgGainBadge =
    avgGain !== null
      ? avgGain > 0
        ? 'Profit'
        : avgGain < 0
        ? 'Loss'
        : 'Even'
      : 'No trades';
  const avgGainBadgeClass =
    avgGain !== null
      ? avgGain > 0
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : avgGain < 0
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700'
      : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700';

  const mae = orderStats.avgAdverseExcursion;
  const displayMae = mae !== null ? `-${Math.abs(mae).toFixed(1)}%` : '—';
  const maeBadge =
    mae === null
      ? 'No data'
      : Math.abs(mae) < 2.5
      ? 'Low Risk'
      : 'Moderate';
  const maeBadgeClass =
    mae === null
      ? 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700'
      : Math.abs(mae) < 2.5
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

  const mdd = orderStats.maxDrawdownPct;
  const displayMdd = mdd !== null ? `-${Math.abs(mdd).toFixed(1)}%` : '—';
  const mddBadge =
    mdd === null
      ? 'No data'
      : Math.abs(mdd) <= 5
      ? 'Controlled'
      : 'Elevated';
  const mddBadgeClass =
    mdd === null
      ? 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700'
      : Math.abs(mdd) <= 5
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

  const row2Cards = [
    {
      id: 'win-rate',
      targetId: 'section-active-positions',
      title: 'Win Rate',
      value: displayWinRate,
      badgeText: winRateBadge,
      badgeClass: winRateBadgeClass,
      metaText: hasClosedTrades
        ? `${orderStats.closedWinning}W · ${orderStats.closedLosing}L closed`
        : 'Closed trades required',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'avg-bars',
      targetId: 'section-active-positions',
      title: 'Avg. Bars / Trade',
      shortTitle: 'Avg. Bars',
      value: displayAvgBars,
      badgeText: avgBarsBadge,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: avgBars !== null ? 'Trading bars' : 'Market bars required',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'avg-gain',
      targetId: 'section-active-positions',
      title: 'Avg. Gain / Trade',
      shortTitle: 'Avg. Gain',
      value: isPrivacy && avgGain !== null
        ? (avgGain >= 0 ? '+••••••••' : '-••••••••')
        : displayAvgGain,
      badgeText: avgGainBadge,
      badgeClass: avgGainBadgeClass,
      metaText: avgGainMeta,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'max-adverse-excursion',
      targetId: 'section-active-positions',
      title: 'Portfolio Max Adverse Excursion',
      shortTitle: 'Max Adverse Excursion',
      value: displayMae,
      badgeText: maeBadge,
      badgeClass: maeBadgeClass,
      metaText: 'Average worst move',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'max-drawdown',
      targetId: 'section-monthly-progression',
      title: 'Portfolio Max Drawdown',
      shortTitle: 'Max Drawdown',
      value: displayMdd,
      badgeText: mddBadge,
      badgeClass: mddBadgeClass,
      metaText: 'Equity peak → trough',
      metaClass: 'text-cold-gray-450',
    },
  ];

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 select-none">
      {/* Row 1: Primary Financials (2x2 on phone, 4 on lg) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {row1Cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.targetId)}
            className="tv-kpi-card w-full"
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

      {/* Row 2: Trading & Risk Metrics (2-column grid on phone, 3 on md, 5 on lg) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {row2Cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.targetId)}
            className={`tv-kpi-card w-full ${card.id === 'max-drawdown' ? 'col-span-2 md:col-span-1' : ''}`}
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
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight" title={card.title}>
                {card.shortTitle ? (
                  <>
                    <span className="sm:hidden">{card.shortTitle}</span>
                    <span className="hidden sm:inline">{card.title}</span>
                  </>
                ) : (
                  card.title
                )}
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
                className={`text-[10px] sm:text-[11px] truncate max-w-[68px] sm:max-w-[120px] text-right font-medium leading-none ${card.metaClass}`}
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
