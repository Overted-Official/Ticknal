'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;
import NetWorthHeader from './dashboard/networth/NetWorthHeader';
import NetWorthKPIs from './dashboard/networth/NetWorthKPIs';
import WealthGrowthChartCard from './dashboard/networth/WealthGrowthChartCard';
import PortfolioSplitCard from './dashboard/networth/PortfolioSplitCard';
import PortfolioBreakdownTable, { type PortfolioCategory } from './dashboard/networth/PortfolioBreakdownTable';
import InflationRadarChart from './dashboard/networth/InflationRadarChart';
import { type AssetSlice } from './dashboard/networth/AssetAllocationSection';
import { type BankAccount, type PositionItem } from '@/types/bank';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ASSET_COLORS = {
  stocks: 'var(--plt-info)',
  funds: 'var(--plt-violet)',
  usdCash: 'var(--plt-profit)',
  egpCash: 'var(--plt-warning)',
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
      const yearShort = String(y).slice(-2);
      const axisLabel = (d.getMonth() === 0 || step === 0 || step === 11)
        ? `${monthLabel} '${yearShort}`
        : monthLabel;
      const fullDate = `${monthLabel} ${y}`;

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
        month: axisLabel,
        fullDate,
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

  // Interactive Portfolio Category Filter
  const [selectedCategory, setSelectedCategory] = useState<PortfolioCategory>('ALL');

  const sliceToCategoryMap: Record<string, PortfolioCategory> = {
    'EGX Equities': 'STOCKS',
    'Mutual Funds (Osoul/Quant)': 'FUNDS',
    'USD Cash Reserves': 'USD_CASH',
    'EGP Liquid Cash': 'EGP_CASH',
  };

  const categoryToSliceMap: Record<PortfolioCategory, string | undefined> = {
    STOCKS: 'EGX Equities',
    FUNDS: 'Mutual Funds (Osoul/Quant)',
    USD_CASH: 'USD Cash Reserves',
    EGP_CASH: 'EGP Liquid Cash',
    ALL: undefined,
  };

  const investedTotal = (totalEquitiesMarketValue + totalFundsMarketValue) * fxMultiplier;
  const liquidCashTotal = (totalEgpLiquidCash + totalUsdCashInEgp) * fxMultiplier;
  const dragDisplay = inflationAnalysis.currentYearDrag * fxMultiplier;
  const realPurchasingPower = displayTotalNetWorth - dragDisplay;

  const investedPct = totalNetWorthEgp > 0 ? (((totalEquitiesMarketValue + totalFundsMarketValue) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const cashPct = totalNetWorthEgp > 0 ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';

  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'net-worth',
    onTabChange: (val) => router.push(`/dashboard?tab=${val}`),
  });

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-tv-base text-tv-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="net-worth"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header */}
          <NetWorthHeader
            currencyMode={currencyMode}
            onCurrencyModeChange={setCurrencyMode}
          />

          {/* SECTION 1: Net Worth Overview (5 Cards: 2 in Row 1, 3 in Row 2) */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Net Worth Overview</h2>
              <p className="section-subtitle">Aggregated wealth balance, asset allocation split, and purchasing power capacity</p>
            </div>

            <NetWorthKPIs
              currencyMode={currencyMode}
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
          </section>

          {/* SECTION 2: Wealth Growth Trajectory */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Wealth Growth Trajectory</h2>
              <p className="section-subtitle">12-Month nominal net worth progression compared against inflation-deflated purchasing power</p>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <WealthGrowthChartCard
                slices={assetSlices}
                currencyMode={currencyMode}
                usdRate={usdRate}
                cbeAnnualInflation={cbeAnnualInflation}
                usCpiAnnualInflation={usCpiAnnualInflation}
                initialInflationSeries={initialInflationSeries}
              />
            </div>
          </section>

          {/* SECTION 3: Portfolio Components & Allocation */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Portfolio Components & Allocation</h2>
              <p className="section-subtitle">Interactive asset class distribution and constituent holdings breakdown</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-stretch flex-1 min-h-0 w-full">
              <div className="lg:col-span-4 flex flex-col w-full">
                <PortfolioSplitCard
                  slices={assetSlices}
                  currencyMode={currencyMode}
                  selectedSliceName={categoryToSliceMap[selectedCategory]}
                  onSelectSlice={(name) => {
                    setSelectedCategory(name === 'ALL' ? 'ALL' : (sliceToCategoryMap[name] || 'ALL'));
                  }}
                />
              </div>
              <div className="lg:col-span-8 flex flex-col">
                <PortfolioBreakdownTable
                  openPositions={openPositions}
                  accounts={accounts}
                  usdRate={usdRate}
                  currencyMode={currencyMode}
                  totalNetWorthEgp={totalNetWorthEgp}
                  activeFilter={selectedCategory}
                  onFilterChange={setSelectedCategory}
                />
              </div>
            </div>
          </section>

          {/* SECTION 4: Inflation & Purchasing Power Impact */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Inflation & Purchasing Power Impact</h2>
              <p className="section-subtitle">Multi-currency asset-weighted inflation deflator model and purchasing power radar</p>
            </div>

            <InflationRadarChart
              points={inflationAnalysis.points}
              cbeAnnualInflation={inflationAnalysis.headlineRate}
              usCpiAnnualInflation={inflationAnalysis.usCpiRate}
              effectiveAnnualInflation={inflationAnalysis.effectiveRate}
              wEgpPct={inflationAnalysis.wEgp}
              wUsdPct={inflationAnalysis.wUsd}
              currencyMode={currencyMode}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
