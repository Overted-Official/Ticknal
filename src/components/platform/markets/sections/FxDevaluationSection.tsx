'use client';

import React from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Sparkles,
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

  // 7. Kronos 10D Clearing Trajectory
  const kronosData = fxData?.kronosForecast;
  const projectedFairValue10D = kronosData?.projectedFairValue10D ?? Number((compositeFair * 1.004).toFixed(2));
  const expectedDriftPct = kronosData?.expectedDriftPct ?? 0.4;
  const corridor80 = kronosData?.corridor80 ?? {
    lower: Number((projectedFairValue10D * 0.985).toFixed(2)),
    upper: Number((projectedFairValue10D * 1.015).toFixed(2)),
  };
  const trajectoryVerdictLabel = isAr
    ? (kronosData?.trajectoryVerdictLabelAr ?? 'نطاق مستقر (تذبذب محدود)')
    : (kronosData?.trajectoryVerdictLabel ?? 'Stable Range (Low Drift)');
  const kronosConfidence = kronosData?.confidenceScore ?? 84;
  const kronosSparklinePoints = kronosData?.predictions?.map((p) => p.fairValue);

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
      sparklinePoints: sparklines?.compositeFair && sparklines.compositeFair.length > 1 ? sparklines.compositeFair : defaultSparkline.map((v) => v * 1.012),
      sparklineTrend: 'up',
      showSparkline: true,
      isLoading,
    },

    // CARD 3: Devaluation Pressure Index (with 0 to 100 pressure bar)
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
      showSparkline: false,
      customBottomContent: (
        <div className="space-y-1 w-full">
          <div className="h-1.5 sm:h-2 w-full rounded-full overflow-hidden flex bg-white/10">
            <div
              style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
              className={`h-full transition-all duration-500 rounded-full ${
                riskScore < 35
                  ? 'bg-emerald-500'
                  : riskScore < 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="flex items-center justify-between text-[8.5px] xs:text-[9px] sm:text-[10px] tabular-nums font-medium text-neutral-400 leading-none">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      ),
      isLoading,
    },

    // CARD 4: AI 10D Prediction
    {
      id: 'ai-10d-prediction',
      title: isAr ? 'توقع الذكاء الاصطناعي (10 جلسات)' : 'AI 10D Prediction',
      shortTitle: isAr ? 'توقع 10D' : 'AI 10D',
      icon: Sparkles,
      iconBgClass: 'bg-brand-purple/20 text-brand-purple',
      iconColorClass: 'text-brand-purple',
      value: projectedFairValue10D.toFixed(2),
      unit: isAr ? 'ج.م متوقع' : 'EGP 10D',
      changeText: `${expectedDriftPct >= 0 ? '+' : ''}${expectedDriftPct.toFixed(1)}% (${trajectoryVerdictLabel})`,
      changeColorClass: Math.abs(expectedDriftPct) <= 1.5 ? 'text-profit-num' : 'text-accent-orange',
      sparklinePoints: kronosSparklinePoints && kronosSparklinePoints.length > 1 ? kronosSparklinePoints : [compositeFair, compositeFair * 1.002, compositeFair * 1.004, projectedFairValue10D],
      sparklineTrend: expectedDriftPct >= 0 ? 'up' : 'down',
      showSparkline: true,
      targetId: 'fx-comparison-chart',
      isLoading,
    },
  ];

  const detailedProxyMetrics = [
    {
      id: 'usdt-rate',
      title: isAr ? 'دولار USDT (P2P بينانس)' : 'USDT P2P Rate',
      value: `${usdtRate.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}`,
      colorClass: 'text-plt-text',
    },
    {
      id: 'usdt-spread',
      title: isAr ? 'علاوة تداول USDT' : 'USDT Premium',
      value: `${usdtSpread >= 0 ? '+' : ''}${usdtSpread.toFixed(2)}%`,
      colorClass: usdtSpread >= 0 ? 'text-profit-num' : 'text-loss-num',
    },
    {
      id: 'sagha-rate',
      title: isAr ? 'دولار الصاغة (عيار 24)' : 'Sagha Gold (24k Implied)',
      value: `${goldRate.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}`,
      colorClass: 'text-plt-text',
    },
    {
      id: 'sagha-spread',
      title: isAr ? 'فارق تسعير الصاغة' : 'Sagha Gold Spread',
      value: `${goldSpread >= 0 ? '+' : ''}${goldSpread.toFixed(2)}%`,
      colorClass: goldSpread >= 0 ? 'text-profit-num' : 'text-loss-num',
    },
    {
      id: 'gdr-rate',
      title: isAr ? 'دولار CIB (بورصة لندن)' : 'Offshore CIB (London GDR)',
      value: `${gdrRate.toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}`,
      colorClass: 'text-plt-text',
    },
    {
      id: 'gdr-spread',
      title: isAr ? 'فارق شهادات لندن' : 'Offshore GDR Spread',
      value: `${gdrSpread >= 0 ? '+' : ''}${gdrSpread.toFixed(2)}%`,
      colorClass: gdrSpread >= 0 ? 'text-profit-num' : 'text-loss-num',
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
              ? 'تثليث القيمة العادلة المرجحة لحظياً عبر P2P والصاغة ولندن، مع دمج صافي تدفقات الأموال الساخنة وتوقعات مسار التصفية بالذكاء الاصطناعي'
              : 'Real-time triangulated EGP fair value across P2P USDT, Sagha gold, and London GDR, integrated with Hot Money debt flows and AI forward clearing trajectory'}
          </p>
        </div>
      </div>

      {/* 2. Top 4 Core Institutional KPI Cards */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-2.5 lg:overflow-visible lg:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            isLoading={isLoading}
            className="shrink-0 w-[145px] xs:w-[155px] sm:w-[175px] md:w-[195px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 3. Detailed Analytics Strip */}
      <div className="pt-3 border-t border-plt-border-soft space-y-2.5">
        <h4 className="text-xs font-semibold text-plt-subtle tracking-tight">
          {isAr ? 'التحليلات التفصيلية' : 'Detailed Analytics'}
        </h4>
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-5 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0 w-full">
          {detailedProxyMetrics.map((m) => (
            <div
              key={m.id}
              className="shrink-0 snap-start flex flex-col gap-1 min-w-[105px] xs:min-w-[115px] sm:min-w-0"
            >
              <span className="text-[11px] sm:text-xs text-plt-muted font-medium tracking-tight truncate">
                {m.title}
              </span>
              <span
                className={`text-sm sm:text-[15px] font-bold tabular-nums tracking-tight truncate ${m.colorClass || 'text-plt-text'}`}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Official USD vs. Shadow Proxies Historical Comparison Chart */}
      <FxComparisonChartSection
        fxData={fxData}
        isLoading={isLoading}
      />

      {/* 5. Integrated Money Supply (M2 / M1 / M0) Chart */}
      <MoneySupplySection
        macroData={macroData}
        isLoading={isLoading}
      />
    </section>
  );
}
