'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ShieldCheck, TrendingUp, Landmark } from 'lucide-react';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;
import NetWorthKPIs from './dashboard/networth/NetWorthKPIs';
import AssetAllocationSection, { type AssetSlice } from './dashboard/networth/AssetAllocationSection';
import InflationRadarChart from './dashboard/networth/InflationRadarChart';
import { type BankAccount, type PositionItem } from '@/types/bank';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ASSET_COLORS = {
  stocks: '#3b82f6', // Blue
  funds: '#8b5cf6',  // Purple
  usdCash: '#10b981',// Emerald
  egpCash: '#f59e0b',// Amber
};

interface DashboardNetWorthViewProps {
  initialAccounts?: BankAccount[];
  openPositions?: PositionItem[];
  usdRate?: number;
  cbeAnnualInflation?: number; // e.g. 14.9 for 14.9%
  usCpiAnnualInflation?: number; // e.g. 2.8 for 2.8%
  initialInflationSeries?: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }>;
}

export default function DashboardNetWorthView({
  initialAccounts = [],
  openPositions = [],
  usdRate = 50.20,
  cbeAnnualInflation = 14.9,
  usCpiAnnualInflation = 2.8,
  initialInflationSeries = [],
}: DashboardNetWorthViewProps) {
  const router = useRouter();

  const { data: accountsData } = useSWR<{ accounts: BankAccount[] }>(
    '/api/banks/accounts',
    fetcher,
    { fallbackData: { accounts: initialAccounts }, refreshInterval: 15000 }
  );

  const accounts = accountsData?.accounts ?? initialAccounts;

  // Currency View Mode: EGP or USD
  const [currencyMode, setCurrencyMode] = useState<'EGP' | 'USD'>('EGP');

  // Asset Value Computations in EGP
  const totalEgpLiquidCash = accounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquidCashRaw = accounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdCashInEgp = totalUsdLiquidCashRaw * usdRate;

  // Split positions into Mutual Funds vs Direct Equities
  const mutualFundSymbols = new Set(['OSOUL', 'CI_QUANT', 'COF']);
  
  let totalEquitiesMarketValue = 0;
  let totalFundsMarketValue = 0;

  for (const pos of openPositions) {
    const val = Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
    if (mutualFundSymbols.has(pos.tickerSymbol.toUpperCase())) {
      totalFundsMarketValue += val;
    } else {
      totalEquitiesMarketValue += val;
    }
  }

  const totalNetWorthEgp = totalEgpLiquidCash + totalUsdCashInEgp + totalEquitiesMarketValue + totalFundsMarketValue;
  const totalNetWorthUsd = usdRate > 0 ? totalNetWorthEgp / usdRate : 0;

  // Normalized Display Values based on currencyMode
  const fxMultiplier = currencyMode === 'USD' ? (1 / usdRate) : 1;
  const displayTotalNetWorth = currencyMode === 'USD' ? totalNetWorthUsd : totalNetWorthEgp;

  // Asset Allocation Slices
  const assetSlices: AssetSlice[] = useMemo(() => {
    const total = totalNetWorthEgp || 1;
    return [
      { name: 'EGX Equities', value: totalEquitiesMarketValue * fxMultiplier, rawEgp: totalEquitiesMarketValue, color: ASSET_COLORS.stocks, percentage: (totalEquitiesMarketValue / total) * 100 },
      { name: 'Mutual Funds (Osoul/Quant)', value: totalFundsMarketValue * fxMultiplier, rawEgp: totalFundsMarketValue, color: ASSET_COLORS.funds, percentage: (totalFundsMarketValue / total) * 100 },
      { name: 'USD Cash Reserves', value: totalUsdCashInEgp * fxMultiplier, rawEgp: totalUsdCashInEgp, color: ASSET_COLORS.usdCash, percentage: (totalUsdCashInEgp / total) * 100 },
      { name: 'EGP Liquid Cash', value: totalEgpLiquidCash * fxMultiplier, rawEgp: totalEgpLiquidCash, color: ASSET_COLORS.egpCash, percentage: (totalEgpLiquidCash / total) * 100 },
    ].filter((s) => s.rawEgp > 0);
  }, [totalNetWorthEgp, totalEquitiesMarketValue, totalFundsMarketValue, totalUsdCashInEgp, totalEgpLiquidCash, fxMultiplier]);

  // Asset-Weighted Multi-Currency Inflation & Purchasing Power Modeling
  const inflationAnalysis = useMemo(() => {
    // 1. Build rate map from historical database series
    const cbeRateMap = new Map<string, number>();
    const usCpiRateMap = new Map<string, number>();
    if (initialInflationSeries && initialInflationSeries.length > 0) {
      for (const s of initialInflationSeries) {
        const cbeVal = parseFloat(s.cbeHeadlineInflation);
        if (!isNaN(cbeVal) && cbeVal > 0) {
          cbeRateMap.set(s.yearMonth, cbeVal);
        }
        if (s.usCpiInflation) {
          const usVal = parseFloat(s.usCpiInflation);
          if (!isNaN(usVal) && usVal > 0) {
            usCpiRateMap.set(s.yearMonth, usVal);
          }
        }
      }
    }

    const latestCbeRate = cbeAnnualInflation > 0 ? cbeAnnualInflation : 14.9;
    const latestUsCpiRate = usCpiAnnualInflation > 0 ? usCpiAnnualInflation : 2.8;

    // Currency weights: EGP portion (EGP Cash + EGX Stocks + Funds) vs USD Cash Reserves
    const totalEgpAssets = totalEgpLiquidCash + totalEquitiesMarketValue + totalFundsMarketValue;
    const totalUsdAssets = totalUsdCashInEgp;
    const totalWealth = totalNetWorthEgp > 0 ? totalNetWorthEgp : 1;

    const wEgp = totalEgpAssets / totalWealth;
    const wUsd = totalUsdAssets / totalWealth;

    const effectiveAnnualRate = (wEgp * latestCbeRate) + (wUsd * latestUsCpiRate);

    const points = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-11

    const nominalAcc = displayTotalNetWorth;

    // Cumulative deflator compounding forward over the 12-month period
    let cumulativeDeflator = 1.0;

    for (let step = 0; step < 12; step++) {
      const monthsAgo = 11 - step;
      const d = new Date(currentYear, currentMonthIdx - monthsAgo, 1);
      const y = d.getFullYear();
      const mNum = String(d.getMonth() + 1).padStart(2, '0');
      const ymKey = `${y}-${mNum}`;
      const monthLabel = monthNames[d.getMonth()];

      const monthCbeRate = cbeRateMap.get(ymKey) ?? latestCbeRate;
      const monthUsRate = usCpiRateMap.get(ymKey) ?? latestUsCpiRate;

      // Currency-weighted blended monthly inflation rate
      const monthBlendedAnnualRate = (wEgp * monthCbeRate) + (wUsd * monthUsRate);
      const monthlyRate = monthBlendedAnnualRate / 100 / 12;

      if (step > 0) {
        cumulativeDeflator *= (1 + monthlyRate);
      }

      const realValue = nominalAcc / cumulativeDeflator;
      const inflationDrag = nominalAcc - realValue;

      points.push({
        month: monthLabel,
        nominal: nominalAcc,
        realValue: realValue,
        inflationDrag: inflationDrag,
      });
    }

    const currentYearDrag = displayTotalNetWorth - (displayTotalNetWorth / cumulativeDeflator);

    return {
      points,
      currentYearDrag,
      headlineRate: latestCbeRate,
      usCpiRate: latestUsCpiRate,
      effectiveRate: Number(effectiveAnnualRate.toFixed(2)),
      wEgp: Number((wEgp * 100).toFixed(1)),
      wUsd: Number((wUsd * 100).toFixed(1)),
    };
  }, [displayTotalNetWorth, totalEgpLiquidCash, totalEquitiesMarketValue, totalFundsMarketValue, totalUsdCashInEgp, totalNetWorthEgp, cbeAnnualInflation, usCpiAnnualInflation, initialInflationSeries]);

  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'net-worth',
    onTabChange: (val) => router.push(`/dashboard?tab=${val}`),
  });

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-tv-base text-tv-text select-none">
      {/* 1. Mobile / Desktop Top Rail */}
      <SubNavTopRail
        activeTab="net-worth"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto p-4 md:p-6 max-w-[1600px] mx-auto space-y-2 pb-28 md:pb-20 touch-pan-y">
        {/* 2. Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-plt-orange" />
            <h1 className="text-lg font-medium tracking-[-0.02em] text-white">
              Net Worth & Inflation
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-white/30 truncate">
            Total wealth aggregation & currency-weighted inflation deflator
          </p>
        </div>

        {/* 3. Top Net Worth KPI Cards */}
        <NetWorthKPIs
          currencyMode={currencyMode}
          onCurrencyChange={setCurrencyMode}
          displayTotalNetWorth={displayTotalNetWorth}
          totalNetWorthEgp={totalNetWorthEgp}
          totalEquitiesMarketValue={totalEquitiesMarketValue}
          totalFundsMarketValue={totalFundsMarketValue}
          totalEgpLiquidCash={totalEgpLiquidCash}
          totalUsdCashInEgp={totalUsdCashInEgp}
          fxMultiplier={fxMultiplier}
          openPositionsCount={openPositions.length}
          connectedAccountsCount={accounts.length}
          currentYearDrag={inflationAnalysis.currentYearDrag}
          cbeAnnualInflation={inflationAnalysis.effectiveRate}
        />

        {/* 4. Asset Allocation & Composition */}
        <AssetAllocationSection
          slices={assetSlices}
          currencyMode={currencyMode}
          usdRate={usdRate}
        />

        {/* 5. Currency-Weighted Inflation Purchasing Power Deflator Radar */}
        <InflationRadarChart
          points={inflationAnalysis.points}
          cbeAnnualInflation={inflationAnalysis.headlineRate}
          usCpiAnnualInflation={inflationAnalysis.usCpiRate}
          effectiveAnnualInflation={inflationAnalysis.effectiveRate}
          wEgpPct={inflationAnalysis.wEgp}
          wUsdPct={inflationAnalysis.wUsd}
          currencyMode={currencyMode}
        />
      </div>
    </div>
  );
}
