'use client';

import React from 'react';
import {
  TrendingUp,
  Trophy,
  Target,
  Shield,
  Compass,
} from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import { useTranslation } from '@/lib/i18n';
import type { SimulationKPIs } from './types';

interface StrategyKPIRailProps {
  kpis: SimulationKPIs;
  benchmarkReturn: number;
  tickerBreadth: { total: number; beating: number };
}

export default function StrategyKPIRail({ kpis, benchmarkReturn, tickerBreadth }: StrategyKPIRailProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const { beating, total } = tickerBreadth;
  const breadthPct = total > 0 ? (beating / total) * 100 : 0;

  const cards: KPICardProps[] = [
    {
      id: 'sim-roi',
      title: isAr ? 'العائد المحاكى' : 'Simulated ROI',
      shortTitle: isAr ? 'العائد' : 'Sim. ROI',
      icon: TrendingUp,
      iconBgClass: kpis.stratRoi >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      value: `${kpis.stratRoi >= 0 ? '+' : ''}${kpis.stratRoi.toFixed(1)}`,
      unit: '%',
      badgeText: isAr ? 'محاكاة' : 'Simulation',
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      changeText: isAr
        ? kpis.stratRoi >= 0 ? 'استراتيجية رابحة' : 'استراتيجية خاسرة'
        : kpis.stratRoi >= 0 ? 'Strategy Profitable' : 'Strategy Loss',
      changeColorClass: kpis.stratRoi >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: isAr ? 'عائد شامل للسوق' : 'market-wide return',
      sparklineTrend: kpis.stratRoi >= 0 ? 'up' : 'down',
      showSparkline: false,
    },
    {
      id: 'alpha-bh',
      title: isAr ? 'ألفا vs شراء واحتفاظ' : 'Alpha vs B&H',
      shortTitle: isAr ? 'ألفا vs B&H' : 'α vs B&H',
      icon: Trophy,
      iconBgClass: kpis.alphaVsBh >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      value: `${kpis.alphaVsBh >= 0 ? '+' : ''}${kpis.alphaVsBh.toFixed(1)}`,
      unit: '%',
      badgeText: isAr
        ? kpis.alphaVsBh >= 0 ? 'أداء متفوق' : 'أداء دون السوق'
        : kpis.alphaVsBh >= 0 ? 'Outperforming' : 'Underperforming',
      badgeClass: kpis.alphaVsBh >= 0
        ? 'text-profit-num font-semibold text-[9px]'
        : 'text-loss-num font-semibold text-[9px]',
      changeText: isAr
        ? kpis.alphaVsBh >= 0 ? 'يتفوق على السوق' : 'يتراجع عن السوق'
        : kpis.alphaVsBh >= 0 ? 'Beating Market' : 'Trailing Market',
      changeColorClass: kpis.alphaVsBh >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: isAr ? `مقابل ${kpis.bhRoi.toFixed(1)}% شراء واحتفاظ` : `vs ${kpis.bhRoi.toFixed(1)}% B&H`,
      sparklineTrend: kpis.alphaVsBh >= 0 ? 'up' : 'down',
      showSparkline: false,
    },
    {
      id: 'alpha-egx',
      title: isAr ? 'ألفا vs إيجي إكس 30' : 'Alpha vs EGX 30',
      shortTitle: isAr ? 'ألفا vs EGX' : 'α vs EGX',
      icon: Target,
      iconBgClass: kpis.alphaVsEgx >= 0 ? 'bg-accent-cyan text-white' : 'bg-loss-chart text-white',
      value: `${kpis.alphaVsEgx >= 0 ? '+' : ''}${kpis.alphaVsEgx.toFixed(1)}`,
      unit: '%',
      badgeText: isAr ? 'تكافؤ المؤشر' : 'Index Parity',
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      changeText: isAr
        ? kpis.alphaVsEgx >= 0 ? 'يتفوق على المؤشر' : 'دون المؤشر'
        : kpis.alphaVsEgx >= 0 ? 'Beating Index' : 'Below Index',
      changeColorClass: kpis.alphaVsEgx >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: isAr ? `مقابل ${benchmarkReturn.toFixed(1)}% إيجي إكس 30` : `vs ${benchmarkReturn.toFixed(1)}% EGX 30`,
      sparklineTrend: kpis.alphaVsEgx >= 0 ? 'up' : 'down',
      showSparkline: false,
    },
    {
      id: 'win-rate',
      title: isAr ? 'نسبة الصفقات الرابحة' : 'Win Rate',
      shortTitle: isAr ? 'نسبة الربح' : 'Win Rate',
      icon: Shield,
      iconBgClass: kpis.winRate >= 50 ? 'bg-profit-num text-white' : 'bg-accent-amber text-white',
      value: kpis.winRate.toFixed(1),
      unit: '%',
      badgeText: isAr ? 'الحالة الحية' : 'Live State',
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      changeText: isAr ? `${kpis.activeLongs} مفتوح` : `${kpis.activeLongs} Open`,
      changeColorClass: 'text-white',
      metaText: isAr ? `${kpis.winningLongs} رابح` : `${kpis.winningLongs} Winning`,
      sparklineTrend: kpis.winRate >= 50 ? 'up' : 'down',
      showSparkline: false,
    },
    {
      id: 'strategy-breadth',
      title: isAr ? 'اتساع الاستراتيجية' : 'Strategy Breadth',
      shortTitle: isAr ? 'الاتساع' : 'Breadth',
      icon: Compass,
      iconBgClass: breadthPct >= 50 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      value: breadthPct.toFixed(0),
      unit: '%',
      badgeText: total > 0 ? (isAr ? `${beating}/${total} سهماً` : `${beating}/${total} Tickers`) : '—',
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      changeText: beating > 0
        ? isAr ? `${beating} تتفوق على B&H` : `${beating} Beat B&H`
        : isAr ? 'لا يوجد تفوق' : 'None Beat B&H',
      changeColorClass: beating > 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: isAr ? 'مشاركة الأسهم' : 'ticker participation',
      sparklineTrend: breadthPct >= 50 ? 'up' : 'down',
      showSparkline: false,
    },
  ];

  return (
    <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:pb-0 font-sans">
      {cards.map((card) => (
        <KPICard
          key={card.id}
          {...card}
          className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
        />
      ))}
    </div>
  );
}
