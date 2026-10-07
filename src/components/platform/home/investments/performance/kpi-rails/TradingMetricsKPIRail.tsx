'use client';

import React from 'react';
import {
  Trophy,
  Clock,
  BarChart3,
  AlertTriangle,
  Shield,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useTranslation } from '@/lib/i18n';
import IndexPillRail from './IndexPillRail';
import { type IndexPillProps } from './IndexPill';
import { type OrderStats } from '../../homeInvestmentsTypes';

interface TradingMetricsKPIRailProps {
  orderStats: OrderStats;
}

export default function TradingMetricsKPIRail({ orderStats }: TradingMetricsKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();
  const { locale } = useTranslation();

  const formatNumber = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) return '••••••';
    if (value === 0) return '0.0';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted}`;
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasClosedTrades = orderStats.closedCount > 0;
  const winRate = orderStats.winRate;
  const displayWinRate = hasClosedTrades && winRate !== null ? `${winRate.toFixed(1)}` : '—';

  const avgDays = orderStats.avgBarsPerTrade !== null ? Math.round(orderStats.avgBarsPerTrade) : null;
  const displayAvgDays = avgDays !== null ? `${avgDays}` : '—';

  let avgGain: number | null = null;
  if (orderStats.closedCount > 0) {
    avgGain = orderStats.realized / orderStats.closedCount;
  } else if (orderStats.openOrders.length > 0) {
    avgGain = orderStats.unrealized / orderStats.openOrders.length;
  }
  const displayAvgGain = avgGain !== null ? formatNumber(avgGain, true) : '—';

  const mae = orderStats.avgAdverseExcursion;
  const displayMae = mae !== null ? `-${Math.abs(mae).toFixed(1)}` : '—';

  const mdd = orderStats.maxDrawdownPct;
  const displayMdd = mdd !== null ? `-${Math.abs(mdd).toFixed(1)}` : '—';

  const pills: IndexPillProps[] = [
    {
      id: 'win-rate',
      icon: Trophy,
      iconClass: (winRate ?? 0) >= 50 ? 'text-profit-num' : 'text-amber-500',
      title: locale === 'ar' ? 'نسبة النجاح' : 'Win Rate',
      value: displayWinRate,
      unit: winRate !== null ? '%' : '',
      onClick: () => scrollTo('section-my-positions'),
    },
    {
      id: 'avg-days',
      icon: Clock,
      iconClass: 'text-accent-cyan',
      title: locale === 'ar' ? 'متوسط الأيام لكل صفقة' : 'Avg. Days per Trade',
      value: displayAvgDays,
      unit: avgDays !== null ? (locale === 'ar' ? 'يوم' : 'DAYS') : '',
      onClick: () => scrollTo('section-my-positions'),
    },
    {
      id: 'avg-gain',
      icon: BarChart3,
      iconClass: (avgGain ?? 0) >= 0 ? 'text-profit-num' : 'text-loss-num',
      title: locale === 'ar' ? 'متوسط الربح' : 'Avg. Gain',
      value: isPrivacy && avgGain !== null ? '••••••' : displayAvgGain,
      unit: locale === 'ar' ? 'ج.م' : '£',
      onClick: () => scrollTo('section-my-positions'),
    },
    {
      id: 'max-adverse-excursion',
      icon: AlertTriangle,
      iconClass: 'text-rose-400',
      title: locale === 'ar' ? 'مخاطر MAE' : 'MAE Risk',
      value: displayMae,
      unit: mae !== null ? '%' : '',
      onClick: () => scrollTo('section-my-positions'),
    },
    {
      id: 'max-drawdown',
      icon: Shield,
      iconClass: 'text-rose-400',
      title: locale === 'ar' ? 'أقصى تراجع' : 'Max Drawdown',
      value: displayMdd,
      unit: mdd !== null ? '%' : '',
      onClick: () => scrollTo('section-monthly-progression'),
    },
  ];

  return <IndexPillRail items={pills} />;
}
