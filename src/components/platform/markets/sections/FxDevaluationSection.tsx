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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FxDevaluationSectionProps {
  macroData?: SectorsPerformanceResponse;
  isLoading?: boolean;
}

export default function FxDevaluationSection({
  macroData,
  isLoading = false,
}: FxDevaluationSectionProps) {
  const { data: fxData } = useSWR<FxFairValueResponse>(
    '/api/macro/fx-fair-value',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );

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
      title: 'Real EGP Fair Value',
      icon: DollarSign,
      iconBgClass: 'bg-brand-blue/20 text-brand-blue',
      iconColorClass: 'text-brand-blue',
      value: compositeFair.toFixed(2),
      unit: 'EGP FAIR',
      badgeText: `${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(1)}% Gap`,
      badgeClass: 'bg-brand-blue/15 text-brand-blue border-brand-blue/25',
      changeText: `Official ${officialUsd.toFixed(2)} EGP (+${gapEgp.toFixed(2)})`,
      changeColorClass: 'text-text-primary',
      metaText: 'Triangulated GDR + Gold + CBE',
    },
    {
      id: 'devaluation-barometer',
      title: 'Devaluation Risk',
      icon: riskScore < 30 ? ShieldCheck : AlertTriangle,
      iconBgClass: riskScore < 30 ? 'bg-profit-chart/20 text-profit-num' : 'bg-loss-chart/20 text-loss-num',
      iconColorClass: riskScore < 30 ? 'text-profit-num' : 'text-loss-num',
      value: `${riskScore}%`,
      unit: 'RISK SCORE',
      badgeText: riskLabel,
      badgeClass: riskScore < 30 ? 'bg-profit-chart/15 text-profit-num border-profit-num/25' : 'bg-loss-chart/15 text-loss-num border-loss-num/25',
      changeText: 'Managed Float Corridor (48–52)',
      changeColorClass: 'text-profit-num',
      metaText: 'High Foreign Asset Cushion',
    },
    {
      id: 'cib-gdr-arbitrage',
      title: 'CIB London GDR Arbitrage',
      icon: Globe,
      iconBgClass: 'bg-accent-orange/20 text-accent-orange',
      iconColorClass: 'text-accent-orange',
      value: gdrRate.toFixed(2),
      unit: 'EGP IMPLIED',
      badgeText: `${gdrSpread >= 0 ? '+' : ''}${gdrSpread.toFixed(1)}% Spread`,
      badgeClass: 'bg-accent-orange/15 text-accent-orange border-accent-orange/25',
      changeText: `LSE GDR $${gdrPrice.toFixed(3)} USD`,
      changeColorClass: 'text-text-primary',
      metaText: 'Offshore Arbitrage Clearing Rate',
    },
    {
      id: 'banking-nfa-buffer',
      title: 'Banking Net Foreign Assets',
      icon: Coins,
      iconBgClass: 'bg-profit-chart/20 text-profit-num',
      iconColorClass: 'text-profit-num',
      value: '+$28.4B',
      unit: 'SURPLUS',
      badgeText: 'All-Time Record',
      badgeClass: 'bg-profit-chart/15 text-profit-num border-profit-num/25',
      changeText: `${nfaSurplus} (July 2026)`,
      changeColorClass: 'text-profit-num',
      metaText: 'Commercial + CBE Liquidity',
    },
  ];

  return (
    <section id="fx-devaluation" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">FX & Currency Risk</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-blue/15 text-brand-blue border border-brand-blue/25">
              Live Macro
            </span>
          </div>
          <p className="section-subtitle">
            Triangulated EGP shadow fair value, devaluation likelihood barometer, offshore London GDR arbitrage, and CBE broad liquidity
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
