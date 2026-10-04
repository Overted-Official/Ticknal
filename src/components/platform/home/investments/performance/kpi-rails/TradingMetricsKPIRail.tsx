'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useTranslation } from '@/lib/i18n';
import { Trophy, Clock, BarChart3, AlertTriangle, Shield } from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from './KPICard';
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

  const hasClosedTrades = orderStats.closedCount > 0;
  const winRate = orderStats.winRate;
  const displayWinRate = hasClosedTrades && winRate !== null ? `${winRate.toFixed(1)}` : '—';
  const winRateBadge =
    !hasClosedTrades || winRate === null
      ? (locale === 'ar' ? 'لا توجد بيانات' : 'No data')
      : winRate >= 60
      ? (locale === 'ar' ? 'ممتاز' : 'Optimal')
      : winRate >= 50
      ? (locale === 'ar' ? 'إيجابي' : 'Positive')
      : (locale === 'ar' ? 'نشط' : 'Active');

  const avgBars = orderStats.avgBarsPerTrade !== null ? Math.round(orderStats.avgBarsPerTrade) : null;
  const displayAvgBars = avgBars !== null ? `${avgBars}` : '—';
  const avgBarsBadge =
    avgBars !== null
      ? avgBars > 20
        ? (locale === 'ar' ? 'استثماري' : 'Position')
        : avgBars > 5
        ? (locale === 'ar' ? 'متوسط المدى' : 'Swing')
        : (locale === 'ar' ? 'يومي' : 'Intraday')
      : (locale === 'ar' ? 'لا توجد بيانات' : 'No data');

  let avgGain: number | null = null;
  if (orderStats.closedCount > 0) {
    avgGain = orderStats.realized / orderStats.closedCount;
  } else if (orderStats.openOrders.length > 0) {
    avgGain = orderStats.unrealized / orderStats.openOrders.length;
  }
  const displayAvgGain = avgGain !== null ? formatNumber(avgGain, true) : '—';
  const avgGainBadge =
    avgGain !== null
      ? avgGain > 0
        ? (locale === 'ar' ? 'ربح' : 'Profit')
        : avgGain < 0
        ? (locale === 'ar' ? 'خسارة' : 'Loss')
        : (locale === 'ar' ? 'تعادل' : 'Even')
      : (locale === 'ar' ? 'لا توجد صفقات' : 'No trades');

  const mae = orderStats.avgAdverseExcursion;
  const displayMae = mae !== null ? `-${Math.abs(mae).toFixed(1)}` : '—';
  const maeBadge =
    mae === null
      ? (locale === 'ar' ? 'لا توجد بيانات' : 'No data')
      : Math.abs(mae) < 2.5
      ? (locale === 'ar' ? 'مخاطرة منخفضة' : 'Low Risk')
      : (locale === 'ar' ? 'متوسطة' : 'Moderate');

  const mdd = orderStats.maxDrawdownPct;
  const displayMdd = mdd !== null ? `-${Math.abs(mdd).toFixed(1)}` : '—';
  const mddBadge =
    mdd === null
      ? (locale === 'ar' ? 'لا توجد بيانات' : 'No data')
      : Math.abs(mdd) <= 5
      ? (locale === 'ar' ? 'مضبوط' : 'Controlled')
      : (locale === 'ar' ? 'مرتفع' : 'Elevated');

  const cards: KPICardProps[] = [
    {
      id: 'win-rate',
      targetId: 'section-active-positions',
      title: locale === 'ar' ? 'نسبة النجاح' : 'Win Rate',
      icon: Trophy,
      iconBgClass: (winRate ?? 0) >= 50 ? 'bg-profit-num text-white' : 'bg-accent-amber text-white',
      iconColorClass: 'text-white',
      value: displayWinRate,
      unit: winRate !== null ? '%' : '',
      changeText: winRateBadge,
      changeColorClass: (winRate ?? 0) >= 50 ? 'text-profit-num' : 'text-accent-amber',
      metaText: hasClosedTrades
        ? (locale === 'ar' ? `${orderStats.closedWinning} رابحة · ${orderStats.closedLosing} خاسرة` : `${orderStats.closedWinning}W · ${orderStats.closedLosing}L`)
        : (locale === 'ar' ? 'لا توجد صفقات مغلقة' : 'no closed trades'),
      sparklineTrend: (winRate ?? 0) >= 50 ? 'up' : 'down',
    },
    {
      id: 'avg-bars',
      targetId: 'section-active-positions',
      title: locale === 'ar' ? 'متوسط الفترات' : 'Avg. Bars',
      shortTitle: locale === 'ar' ? 'الفترات' : 'Avg. Bars',
      icon: Clock,
      iconBgClass: 'bg-accent-cyan text-white',
      iconColorClass: 'text-white',
      value: displayAvgBars,
      unit: avgBars !== null ? (locale === 'ar' ? 'شمعة' : 'BARS') : '',
      changeText: avgBarsBadge,
      changeColorClass: 'text-accent-cyan',
      metaText: locale === 'ar' ? 'مدة الاحتفاظ' : 'hold time',
      sparklineTrend: 'neutral',
    },
    {
      id: 'avg-gain',
      targetId: 'section-active-positions',
      title: locale === 'ar' ? 'متوسط الربح' : 'Avg. Gain',
      shortTitle: locale === 'ar' ? 'متوسط الربح' : 'Avg. Gain',
      icon: BarChart3,
      iconBgClass: (avgGain ?? 0) >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: isPrivacy && avgGain !== null ? '••••••' : displayAvgGain,
      unit: locale === 'ar' ? 'ج.م' : '£',
      changeText: avgGainBadge,
      changeColorClass: (avgGain ?? 0) >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? 'لكل صفقة' : 'per trade',
      sparklineTrend: (avgGain ?? 0) >= 0 ? 'up' : 'down',
    },
    {
      id: 'max-adverse-excursion',
      targetId: 'section-active-positions',
      title: locale === 'ar' ? 'مخاطر MAE' : 'MAE Risk',
      shortTitle: locale === 'ar' ? 'مخاطر MAE' : 'MAE Risk',
      icon: AlertTriangle,
      iconBgClass: 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: displayMae,
      unit: '%',
      changeText: maeBadge,
      changeColorClass: 'text-loss-num',
      metaText: locale === 'ar' ? 'أسوأ حركة' : 'worst move',
      sparklineTrend: 'down',
    },
    {
      id: 'max-drawdown',
      targetId: 'section-monthly-progression',
      title: locale === 'ar' ? 'أقصى تراجع' : 'Max Drawdown',
      shortTitle: locale === 'ar' ? 'أقصى تراجع' : 'Max Drawdown',
      icon: Shield,
      iconBgClass: 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: displayMdd,
      unit: '%',
      changeText: mddBadge,
      changeColorClass: 'text-loss-num',
      metaText: locale === 'ar' ? 'من القمة للقاع' : 'peak→trough',
      sparklineTrend: 'down',
    },
  ];

  return (
    <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 md:grid md:grid-cols-3 lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:pb-0">
      {cards.map((card) => (
        <KPICard
          key={card.id}
          {...card}
          className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] md:w-full snap-start"
        />
      ))}
    </div>
  );
}
