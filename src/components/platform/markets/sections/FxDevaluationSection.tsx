'use client';

import React from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  ShieldCheck,
  Globe,
  Coins,
  AlertTriangle,
  TrendingUp,
  Activity,
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
  const isAr = locale === 'ar';

  const { data: liveFxData } = useSWR<FxFairValueResponse>(
    isHeroScene ? null : '/api/macro/fx-fair-value',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );
  const fxData = isHeroScene ? (HERO_SCENE_FX.data as unknown as FxFairValueResponse) : liveFxData;

  // 1. Official Spot
  const officialUsd = fxData?.officialUsd ?? 52.60;
  const atr14 = fxData?.atr14 ?? 0.20;
  const volatilityLabel = fxData?.volatilityLabel ?? (isAr ? 'تعويم مدار' : 'Controlled Crawl');

  // 2. Real Composite Fair Value
  const compositeFair = fxData?.compositeFairValue ?? 53.25;
  const gapPct = fxData?.managedGapPct ?? 1.24;
  const gapEgp = fxData?.managedGapEgp ?? 0.65;

  // 3. Local Gold Proxy ("دولار الصاغة")
  const goldRate = fxData?.goldImpliedRate ?? 52.83;
  const goldSpread = fxData?.goldSpreadPct ?? 0.44;
  const gold24k = fxData?.saghaGold24k ?? 7062.75;
  const spotOunce = fxData?.comexGoldUsd ?? 4158.53;

  // 4. Offshore CIB London GDR Proxy ("دولار CIB")
  const gdrRate = fxData?.gdrImpliedRate ?? 53.78;
  const gdrSpread = fxData?.gdrSpreadPct ?? 2.24;
  const cairoComi = fxData?.cairoComi ?? 127.20;
  const gdrPrice = fxData?.londonGdrUsd ?? 2.365;

  // 5. Algorithmic Devaluation Risk Index
  const riskScore = fxData?.devaluationRisk?.score ?? 24;
  const riskLabel = fxData?.devaluationRisk?.label ?? (isAr ? 'مخاطر منخفضة (تعويم مدار)' : 'Low Risk (Controlled Crawl)');
  const atrCompressionRatio = fxData?.atrCompressionRatio ?? 0.74;

  // Sparklines
  const sparklines = fxData?.sparklines;
  const defaultSparkline = [52.1, 52.2, 52.25, 52.3, 52.35, 52.4, 52.45, 52.5, 52.55, 52.6];

  const kpiCards: KPICardProps[] = [
    // CARD 1: Official USD / EGP
    {
      id: 'official-usdegp-rate',
      title: isAr ? 'سعر الدولار الرسمي' : 'Official USD / EGP',
      shortTitle: isAr ? 'الرسمي' : 'Official',
      icon: DollarSign,
      iconBgClass: 'bg-brand-blue/20 text-brand-blue',
      iconColorClass: 'text-brand-blue',
      value: officialUsd.toFixed(2),
      unit: isAr ? 'ج.م رسمي' : 'EGP SPOT',
      changeText: isAr ? volatilityLabel : (fxData?.volatilityLabel || 'Controlled Crawl'),
      changeColorClass: 'text-plt-text',
      metaText: isAr ? `ATR: ${atr14.toFixed(2)} ج.م` : `ATR: ${atr14.toFixed(2)} EGP`,
      sparklinePoints: sparklines?.officialUsd && sparklines.officialUsd.length > 1 ? sparklines.officialUsd : defaultSparkline,
      sparklineTrend: 'neutral',
      showSparkline: true,
      isLoading,
    },

    // CARD 2: Real EGP Fair Value
    {
      id: 'real-egp-fair-value',
      title: isAr ? 'القيمة العادلة الحقيقية' : 'Real EGP Fair Value',
      shortTitle: isAr ? 'العادل' : 'Fair Value',
      icon: TrendingUp,
      iconBgClass: 'bg-profit-chart/20 text-profit-num',
      iconColorClass: 'text-profit-num',
      value: compositeFair.toFixed(2),
      unit: isAr ? 'ج.م عادل' : 'EGP FAIR',
      changeText: `${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(1)}% (${gapEgp >= 0 ? '+' : ''}${gapEgp.toFixed(2)})`,
      changeColorClass: 'text-profit-num',
      metaText: isAr ? 'الصاغة + CIB' : 'Triangulated',
      sparklinePoints: sparklines?.compositeFair && sparklines.compositeFair.length > 1 ? sparklines.compositeFair : defaultSparkline.map((v) => v * 1.012),
      sparklineTrend: 'up',
      showSparkline: true,
      isLoading,
    },

    // CARD 3: Local Gold Proxy ("دولار الصاغة")
    {
      id: 'local-gold-sagha-proxy',
      title: isAr ? 'دولار الصاغة (الذهب المحلي)' : 'Sagha Gold Proxy ("دولار الصاغة")',
      shortTitle: isAr ? 'الصاغة' : 'Sagha Gold',
      icon: Coins,
      iconBgClass: 'bg-accent-gold/20 text-accent-gold',
      iconColorClass: 'text-accent-gold',
      value: goldRate.toFixed(2),
      unit: isAr ? 'ج.م صاغة' : 'EGP SAGHA',
      changeText: `${goldSpread >= 0 ? '+' : ''}${goldSpread.toFixed(1)}% ${isAr ? 'فارق' : 'Spread'}`,
      changeColorClass: 'text-plt-text',
      metaText: isAr ? `عيار 24: ${gold24k.toLocaleString()} ج.م` : `24k: ${gold24k.toLocaleString()} EGP`,
      sparklinePoints: sparklines?.goldImplied && sparklines.goldImplied.length > 1 ? sparklines.goldImplied : defaultSparkline.map((v) => v * 1.004),
      sparklineTrend: 'up',
      showSparkline: true,
      isLoading,
    },

    // CARD 4: Offshore CIB London GDR Proxy ("دولار CIB")
    {
      id: 'cib-london-gdr-proxy',
      title: isAr ? 'دولار CIB لندن (الأسهم)' : 'Offshore CIB Proxy ("دولار CIB")',
      shortTitle: isAr ? 'CIB لندن' : 'CIB London',
      icon: Globe,
      iconBgClass: 'bg-accent-orange/20 text-accent-orange',
      iconColorClass: 'text-accent-orange',
      value: gdrRate.toFixed(2),
      unit: isAr ? 'ج.م CIB' : 'EGP CIB',
      changeText: `${gdrSpread >= 0 ? '+' : ''}${gdrSpread.toFixed(1)}% ${isAr ? 'فارق' : 'Spread'}`,
      changeColorClass: 'text-plt-text',
      metaText: isAr ? 'مراجحة LSE' : 'LSE Arbitrage',
      sparklinePoints: sparklines?.gdrImplied && sparklines.gdrImplied.length > 1 ? sparklines.gdrImplied : defaultSparkline.map((v) => v * 1.022),
      sparklineTrend: 'up',
      showSparkline: true,
      isLoading,
    },

    // CARD 5: Algorithmic Devaluation Risk Index
    {
      id: 'devaluation-risk-meter',
      title: isAr ? 'مؤشر ضغط التعويم' : 'Devaluation Pressure Index',
      shortTitle: isAr ? 'التعويم' : 'Deval Risk',
      icon: riskScore < 35 ? ShieldCheck : AlertTriangle,
      iconBgClass: riskScore < 35 ? 'bg-profit-chart/20 text-profit-num' : riskScore < 60 ? 'bg-accent-orange/20 text-accent-orange' : 'bg-loss-chart/20 text-loss-num',
      iconColorClass: riskScore < 35 ? 'text-profit-num' : riskScore < 60 ? 'text-accent-orange' : 'text-loss-num',
      value: `${riskScore}%`,
      unit: isAr ? 'درجة الخطر' : 'RISK SCORE',
      changeText: riskLabel,
      changeColorClass: riskScore < 35 ? 'text-profit-num' : riskScore < 60 ? 'text-accent-orange' : 'text-loss-num',
      metaText: atrCompressionRatio < 0.40 ? (isAr ? 'تثبيت مصطنع' : 'Compressed Peg') : (isAr ? 'تذبذب طبيعي' : 'Organic Float'),
      sparklinePoints: sparklines?.devaluationRisk && sparklines.devaluationRisk.length > 1 ? sparklines.devaluationRisk : [18, 19, 21, 20, 22, 23, 24, 25, 24, riskScore],
      sparklineTrend: riskScore < 35 ? 'neutral' : 'down',
      showSparkline: true,
      isLoading,
    },
  ];

  return (
    <section id="fx-devaluation" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-plt-border-soft">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title text-plt-text">
              {isAr ? 'مخاطر العملة وأسعار الصرف' : 'FX & Currency Risk'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-blue/15 text-brand-blue border border-brand-blue/25">
              {isHeroScene ? (isAr ? 'لقطة ١٠ أكتوبر' : 'Oct 10 snapshot') : (isAr ? 'مؤشرات كلية حية' : 'Live Macro')}
            </span>
          </div>
          <p className="section-subtitle text-plt-muted">
            {isAr
              ? 'القيمة العادلة المرجحة، دولار الصاغة من الذهب المحلي، دولار CIB لندن، ومؤشر ضغط خفض العملة القائم على تذبذب ATR'
              : 'Triangulated EGP shadow fair value, Sagha gold proxy, London CIB equity arbitrage, and ATR-weighted devaluation pressure index'}
          </p>
        </div>
      </div>

      {/* 2. 5-Card Responsive Layout: 1 Grid on Desktop, Side-Scrollable Snap Rail on Phone (2 cards + half of 3rd) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 lg:grid lg:grid-cols-5 lg:gap-2.5 lg:overflow-visible lg:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            isLoading={isLoading}
            className="shrink-0 w-[132px] xs:w-[140px] sm:w-[170px] md:w-[185px] lg:w-full snap-start"
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
