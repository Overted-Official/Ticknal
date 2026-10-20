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
  ArrowRightLeft,
} from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import MoneySupplySection from './MoneySupplySection';
import FxComparisonChartSection from './FxComparisonChartSection';
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
  const officialUsd = fxData?.officialUsd ?? 53.92;
  const atr14 = fxData?.atr14 ?? 0.25;
  const volatilityLabel = fxData?.volatilityLabel ?? (isAr ? 'تذبذب طبيعي' : 'Active Two-Way Float');

  // 2. Real Composite Fair Value (Triangulated across USDT, GDR, Sagha Gold, CBE)
  const compositeFair = fxData?.compositeFairValue ?? 54.41;
  const gapPct = fxData?.managedGapPct ?? 0.91;
  const gapEgp = fxData?.managedGapEgp ?? 0.49;

  // 3. Real-Time USDT / EGP P2P Proxy
  const usdtRate = fxData?.usdtRate ?? 54.45;
  const usdtSpread = fxData?.usdtSpreadPct ?? 0.98;

  // 4. Local Sagha Gold Bullion Proxy
  const goldRate = fxData?.goldImpliedRate ?? 53.35;
  const goldSpread = fxData?.goldSpreadPct ?? -1.06;
  const gold24k = fxData?.saghaGold24k ?? 7171.5;

  // 5. Offshore CIB London GDR Proxy
  const gdrRate = fxData?.gdrImpliedRate ?? 55.42;
  const gdrSpread = fxData?.gdrSpreadPct ?? 2.78;

  // 6. Algorithmic Devaluation Risk Index
  const riskScore = fxData?.devaluationRisk?.score ?? 16;
  const riskLabel = fxData?.devaluationRisk?.label ?? (isAr ? 'مخاطر منخفضة (تذبذب طبيعي)' : 'Low Risk (Organic Float)');
  const atrCompressionRatio = fxData?.atrCompressionRatio ?? 0.96;

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
      changeText: isAr ? volatilityLabel : (fxData?.volatilityLabel || 'Active Two-Way Float'),
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
      metaText: isAr ? 'تثليث رباعي (P2P+LSE+ذهب)' : '4-Way Triangulated',
      sparklinePoints: sparklines?.compositeFair && sparklines.compositeFair.length > 1 ? sparklines.compositeFair : defaultSparkline.map((v) => v * 1.012),
      sparklineTrend: 'up',
      showSparkline: true,
      isLoading,
    },

    // CARD 3: Real-Time USDT / EGP P2P
    {
      id: 'usdt-egp-p2p-proxy',
      title: isAr ? 'دولار التيذر (تداولات P2P)' : 'P2P USDT Proxy',
      shortTitle: isAr ? 'تيذر P2P' : 'USDT P2P',
      icon: ArrowRightLeft,
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
      iconColorClass: 'text-emerald-400',
      value: usdtRate.toFixed(2),
      unit: isAr ? 'ج.م تيذر' : 'EGP USDT',
      changeText: `${usdtSpread >= 0 ? '+' : ''}${usdtSpread.toFixed(1)}% ${isAr ? 'فارق' : 'Spread'}`,
      changeColorClass: 'text-plt-text',
      metaText: isAr ? 'بينانس + باي بيت' : 'Binance + Bybit',
      sparklinePoints: sparklines?.usdtRate && sparklines.usdtRate.length > 1 ? sparklines.usdtRate : defaultSparkline.map((v) => v * 1.01),
      sparklineTrend: 'up',
      showSparkline: true,
      isLoading,
    },

    // CARD 4: Local Gold Proxy
    {
      id: 'local-gold-sagha-proxy',
      title: isAr ? 'دولار الصاغة (الذهب المحلي)' : 'Sagha Gold Proxy',
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
      sparklineTrend: goldSpread >= 0 ? 'up' : 'down',
      showSparkline: true,
      isLoading,
    },

    // CARD 5: Offshore CIB London GDR Proxy
    {
      id: 'cib-london-gdr-proxy',
      title: isAr ? 'دولار CIB لندن (الأسهم)' : 'Offshore CIB Proxy',
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

    // CARD 6: Algorithmic Devaluation Risk Index
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
          </div>
          <p className="section-subtitle text-plt-muted">
            {isAr
              ? 'القيمة العادلة المرجحة من واقع تداولات P2P للتيذر، ودولار الصاغة من الذهب، ودولار CIB لندن، ومؤشر ضغط خفض العملة القائم على تذبذب ATR'
              : 'Triangulated EGP shadow fair value across P2P USDT, Sagha gold, and London CIB equity arbitrage, with ATR-weighted devaluation pressure index'}
          </p>
        </div>
      </div>

      {/* 2. 6-Card Responsive Layout: 1 Grid on Desktop (6 cols), Side-Scrollable Snap Rail on Mobile/Tablet */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 lg:grid lg:grid-cols-6 lg:gap-2.5 lg:overflow-visible lg:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            isLoading={isLoading}
            className="shrink-0 w-[132px] xs:w-[140px] sm:w-[170px] md:w-[185px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 3. Official USD vs. Shadow Proxies Historical Comparison Chart */}
      <FxComparisonChartSection
        fxData={fxData}
        isLoading={isLoading}
      />

      {/* 4. Integrated Money Supply (M2 / M1 / M0) Chart */}
      <MoneySupplySection
        macroData={macroData}
        isLoading={isLoading}
      />
    </section>
  );
}
