'use client';

import React from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  ShieldCheck,
  Globe,
  Coins,
  AlertTriangle,
} from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import MoneySupplySection from './MoneySupplySection';
import type { SectorsPerformanceResponse } from '@/lib/finance/sectors-math';
import type { FxFairValueResponse } from '@/lib/handlers/fx-fair-value-handler';
import { useTranslation } from '@/lib/i18n';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { HERO_SCENE_FX } from '@/components/landing/hero-scenes/hero-scene-snapshot';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FxDevaluationSectionProps {
  macroData?: SectorsPerformanceResponse;
  isLoading?: boolean;
}

export default function FxDevaluationSection({
  macroData,
  isLoading = false,
}: FxDevaluationSectionProps) {
  const { locale } = useTranslation();
  const isHeroScene = useHeroSceneMode();
  const { data: liveFxData } = useSWR<FxFairValueResponse>(
    isHeroScene ? null : '/api/macro/fx-fair-value',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );
  const fxData = isHeroScene ? HERO_SCENE_FX.data as FxFairValueResponse : liveFxData;

  const officialUsd = fxData?.officialUsd ?? 51.89;
  const compositeFair = fxData?.compositeFairValue ?? 52.68;
  const gapPct = fxData?.managedGapPct ?? 1.52;
  const gapEgp = fxData?.managedGapEgp ?? 0.79;
  const riskScore = fxData?.devaluationRisk?.score ?? 15;
  const riskLabel = fxData?.devaluationRisk?.label ?? 'Low Risk (Managed Crawl)';
  const gdrRate = fxData?.gdrImpliedRate ?? 53.40;
  const gdrSpread = fxData?.gdrSpreadPct ?? 2.92;
  const gdrPrice = fxData?.londonGdrUsd ?? 2.365;
  const nfaSurplus = fxData?.netForeignAssets?.latestSurplusUsd ?? '+$28.418 Billion';

  const kpiCards: KPICardProps[] = [
    {
      id: 'real-egp-fair-value',
      title: locale === 'ar' ? 'القيمة العادلة الحقيقية للجنيه' : 'Real EGP Fair Value',
      icon: DollarSign,
      iconBgClass: 'bg-brand-blue/20 text-brand-blue',
      iconColorClass: 'text-brand-blue',
      value: compositeFair.toFixed(2),
      unit: locale === 'ar' ? 'جنيه عادل' : 'EGP FAIR',
      badgeText: `${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(1)}% ${locale === 'ar' ? 'فجوة' : 'Gap'}`,
      badgeClass: 'bg-brand-blue/15 text-brand-blue border-brand-blue/25',
      changeText: `${locale === 'ar' ? 'الرسمي' : 'Official'} ${officialUsd.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'} (+${gapEgp.toFixed(2)})`,
      changeColorClass: 'text-text-primary',
      metaText: locale === 'ar' ? 'شهادات الإيداع + الذهب + المركزي' : 'Triangulated GDR + Gold + CBE',
    },
    {
      id: 'devaluation-barometer',
      title: locale === 'ar' ? 'مخاطر خفض العملة' : 'Devaluation Risk',
      icon: riskScore < 30 ? ShieldCheck : AlertTriangle,
      iconBgClass: riskScore < 30 ? 'bg-profit-chart/20 text-profit-num' : 'bg-loss-chart/20 text-loss-num',
      iconColorClass: riskScore < 30 ? 'text-profit-num' : 'text-loss-num',
      value: `${riskScore}%`,
      unit: locale === 'ar' ? 'درجة المخاطرة' : 'RISK SCORE',
      badgeText: riskScore < 30
        ? (locale === 'ar' ? 'مخاطر منخفضة (تعويم مدار)' : riskLabel)
        : (locale === 'ar' ? 'مخاطر مرتفعة' : riskLabel),
      badgeClass: riskScore < 30 ? 'bg-profit-chart/15 text-profit-num border-profit-num/25' : 'bg-loss-chart/15 text-loss-num border-loss-num/25',
      changeText: locale === 'ar' ? 'نطاق تعويم مدار (48–52)' : 'Managed Float Corridor (48–52)',
      changeColorClass: 'text-profit-num',
      metaText: locale === 'ar' ? 'احتياطي أصول أجنبية مرتفع' : 'High Foreign Asset Cushion',
    },
    {
      id: 'cib-gdr-arbitrage',
      title: locale === 'ar' ? 'مراجحة شهادات إيداع CIB لندن' : 'CIB London GDR Arbitrage',
      icon: Globe,
      iconBgClass: 'bg-accent-orange/20 text-accent-orange',
      iconColorClass: 'text-accent-orange',
      value: gdrRate.toFixed(2),
      unit: locale === 'ar' ? 'جنيه ضمني' : 'EGP IMPLIED',
      badgeText: `${gdrSpread >= 0 ? '+' : ''}${gdrSpread.toFixed(1)}% ${locale === 'ar' ? 'فارق' : 'Spread'}`,
      badgeClass: 'bg-accent-orange/15 text-accent-orange border-accent-orange/25',
      changeText: `${locale === 'ar' ? 'شهادة لندن' : 'LSE GDR'} $${gdrPrice.toFixed(3)} ${locale === 'ar' ? 'دولار' : 'USD'}`,
      changeColorClass: 'text-text-primary',
      metaText: locale === 'ar' ? 'سعر تصفية المراجحة الخارجية' : 'Offshore Arbitrage Clearing Rate',
    },
    {
      id: 'banking-nfa-buffer',
      title: locale === 'ar' ? 'صافي الأصول الأجنبية للقطاع المصرفي' : 'Banking Net Foreign Assets',
      icon: Coins,
      iconBgClass: 'bg-profit-chart/20 text-profit-num',
      iconColorClass: 'text-profit-num',
      value: locale === 'ar' ? '+28.4$ مليار' : '+$28.4B',
      unit: locale === 'ar' ? 'فائض' : 'SURPLUS',
      badgeText: locale === 'ar' ? 'رقم قياسي تاريخي' : 'All-Time Record',
      badgeClass: 'bg-profit-chart/15 text-profit-num border-profit-num/25',
      changeText: locale === 'ar' ? '+28.418$ مليار (يوليو 2026)' : `${nfaSurplus} (July 2026)`,
      changeColorClass: 'text-profit-num',
      metaText: locale === 'ar' ? 'سيولة البنوك التجارية والبنك المركزي' : 'Commercial + CBE Liquidity',
    },
  ];

  return (
    <section id="fx-devaluation" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">
              {locale === 'ar' ? 'مخاطر العملة وأسعار الصرف' : 'FX & Currency Risk'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-blue/15 text-brand-blue border border-brand-blue/25">
              {isHeroScene ? (locale === 'ar' ? 'لقطة ١٠ أكتوبر' : 'Oct 10 snapshot') : (locale === 'ar' ? 'مؤشرات كلية حية' : 'Live Macro')}
            </span>
          </div>
          <p className="section-subtitle">
            {locale === 'ar'
              ? 'القيمة العادلة المرجحة للجنيه المصري، مقياس مخاطر خفض العملة، مراجحة شهادات إيداع لندن CIB، وسيولة البنك المركزي الموسعة'
              : 'Triangulated EGP shadow fair value, devaluation likelihood barometer, offshore London GDR arbitrage, and CBE broad liquidity'}
          </p>
        </div>
      </div>

      {/* 2. 4-Grid KPI Rails */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 3. Integrated Money Supply (M2 / M1 / M0) Chart */}
      <MoneySupplySection
        macroData={macroData}
        isLoading={isLoading}
      />
    </section>
  );
}
