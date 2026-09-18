'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

import NetWorthHeader from './networth/NetWorthHeader';
import NetWorthKPIs from './networth/NetWorthKPIs';
import PortfolioSplitCard from './networth/PortfolioSplitCard';
import PortfolioBreakdownTable, { type PortfolioCategory } from './networth/PortfolioBreakdownTable';
import InflationRadarChart from './networth/InflationRadarChart';
import { type AssetSlice } from './networth/AssetAllocationSection';
import { type BankAccount, type PositionItem } from '@/types/bank';
import { isBrokerageAccount, recentMonthKeys, toEgp } from '@/lib/portfolio-finance';
import type { NetWorthHistoryPoint, NetWorthTrendPoint } from '@/lib/portfolio-finance';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ASSET_COLORS = {
  stocks: '#2962ff',        // TradingView Blue 500
  funds: '#9c27b0',         // Grapes Purple 500
  brokerageCash: '#00bcd4', // Sky Blue 500
  usdCash: '#089981',       // Minty Green 500
  egpCash: '#ff9800',       // Tan Orange 500
};

interface DashboardNetworthPageViewProps {
  initialAccounts?: BankAccount[];
  openPositions?: PositionItem[];
  netWorthHistory?: NetWorthHistoryPoint[];
  usdRate?: number;
  cbeAnnualInflation?: number; // e.g. 14.9 for 14.9%
  usCpiAnnualInflation?: number; // e.g. 2.8 for 2.8%
  initialInflationSeries?: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }>;
}

export default function DashboardNetworthPageView({
  initialAccounts = [],
  openPositions = [],
  netWorthHistory = [],
  usdRate = 50.20,
  cbeAnnualInflation = 14.9,
  usCpiAnnualInflation = 2.8,
  initialInflationSeries = [],
}: DashboardNetworthPageViewProps) {
  const router = useRouter();

  const { data: accountsData } = useSWR<{ accounts: BankAccount[] }>(
    '/api/banks/accounts',
    fetcher,
    { fallbackData: { accounts: initialAccounts }, refreshInterval: 15000 }
  );

  const accounts = accountsData?.accounts ?? initialAccounts;

  // Currency View Mode: EGP or USD
  const [currencyMode, setCurrencyMode] = useState<'EGP' | 'USD'>('EGP');

  // Asset Value Computations in EGP. Brokerage cash is kept separate from
  // ordinary bank liquidity so trading cash is not labelled as bank cash.
  const brokerageAccounts = accounts.filter(isBrokerageAccount);
  const cashAccounts = accounts.filter((account) => !isBrokerageAccount(account));

  const totalEgpLiquidCash = cashAccounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquidCashRaw = cashAccounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdCashInEgp = toEgp(totalUsdLiquidCashRaw, 'USD', usdRate);
  const totalBrokerageCashInEgp = brokerageAccounts.reduce(
    (sum, account) => sum + toEgp(Number(account.balance) || 0, account.currency, usdRate),
    0,
  );

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

  const totalNetWorthEgp = totalEgpLiquidCash + totalUsdCashInEgp + totalBrokerageCashInEgp + totalEquitiesMarketValue + totalFundsMarketValue;
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
      { name: 'Brokerage Cash', value: totalBrokerageCashInEgp * fxMultiplier, rawEgp: totalBrokerageCashInEgp, color: ASSET_COLORS.brokerageCash, percentage: (totalBrokerageCashInEgp / total) * 100 },
      { name: 'USD Cash Reserves', value: totalUsdCashInEgp * fxMultiplier, rawEgp: totalUsdCashInEgp, color: ASSET_COLORS.usdCash, percentage: (totalUsdCashInEgp / total) * 100 },
      { name: 'EGP Liquid Cash', value: totalEgpLiquidCash * fxMultiplier, rawEgp: totalEgpLiquidCash, color: ASSET_COLORS.egpCash, percentage: (totalEgpLiquidCash / total) * 100 },
    ].filter((s) => s.rawEgp > 0);
  }, [totalNetWorthEgp, totalEquitiesMarketValue, totalFundsMarketValue, totalBrokerageCashInEgp, totalUsdCashInEgp, totalEgpLiquidCash, fxMultiplier]);

  // Asset-weighted inflation assumptions. The current allocation determines
  // the blend, while the historical monthly series determines the timeline.
  const inflationAnalysis = useMemo(() => {
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
    const totalEgpAssets = totalEgpLiquidCash + totalBrokerageCashInEgp + totalEquitiesMarketValue + totalFundsMarketValue;
    const totalUsdAssets = totalUsdCashInEgp;
    const totalWealth = totalNetWorthEgp > 0 ? totalNetWorthEgp : 1;

    const wEgp = totalEgpAssets / totalWealth;
    const wUsd = totalUsdAssets / totalWealth;

    const effectiveAnnualRate = (wEgp * latestCbeRate) + (wUsd * latestUsCpiRate);

    const monthlyRate = (yearMonth: string) => {
      const monthCbeRate = cbeRateMap.get(yearMonth) ?? latestCbeRate;
      const monthUsRate = usCpiRateMap.get(yearMonth) ?? latestUsCpiRate;
      return ((wEgp * monthCbeRate) + (wUsd * monthUsRate)) / 100 / 12;
    };

    // Twelve complete monthly inflation factors are used for the one-year
    // purchasing-power card. Keep this in EGP so currency conversion happens
    // exactly once at the display boundary.
    const trailingDeflator = recentMonthKeys(12)
      .reduce((factor, yearMonth) => factor * (1 + monthlyRate(yearMonth)), 1);
    const currentYearDragEgp = totalNetWorthEgp - (totalNetWorthEgp / trailingDeflator);

    return {
      cbeRateMap,
      usCpiRateMap,
      currentYearDragEgp,
      headlineRate: latestCbeRate,
      usCpiRate: latestUsCpiRate,
      effectiveRate: Number(effectiveAnnualRate.toFixed(2)),
      wEgp: Number((wEgp * 100).toFixed(1)),
      wUsd: Number((wUsd * 100).toFixed(1)),
      wEgpFraction: wEgp,
      wUsdFraction: wUsd,
    };
  }, [totalEgpLiquidCash, totalBrokerageCashInEgp, totalEquitiesMarketValue, totalFundsMarketValue, totalUsdCashInEgp, totalNetWorthEgp, cbeAnnualInflation, usCpiAnnualInflation, initialInflationSeries]);

  // Interactive Portfolio Category Filter
  const [selectedCategory, setSelectedCategory] = useState<PortfolioCategory>('ALL');

  const sliceToCategoryMap: Record<string, PortfolioCategory> = {
    'EGX Equities': 'STOCKS',
    'Mutual Funds (Osoul/Quant)': 'FUNDS',
    'USD Cash Reserves': 'USD_CASH',
    'EGP Liquid Cash': 'EGP_CASH',
    'Brokerage Cash': 'BROKERAGE_CASH',
  };

  const categoryToSliceMap: Record<PortfolioCategory, string | undefined> = {
    STOCKS: 'EGX Equities',
    FUNDS: 'Mutual Funds (Osoul/Quant)',
    USD_CASH: 'USD Cash Reserves',
    EGP_CASH: 'EGP Liquid Cash',
    BROKERAGE_CASH: 'Brokerage Cash',
    ALL: undefined,
  };

  const investedTotal = (totalEquitiesMarketValue + totalFundsMarketValue) * fxMultiplier;
  const liquidCashTotal = (totalEgpLiquidCash + totalUsdCashInEgp) * fxMultiplier;
  const dragDisplay = inflationAnalysis.currentYearDragEgp * fxMultiplier;
  const realPurchasingPower = displayTotalNetWorth - dragDisplay;

  const investedPct = totalNetWorthEgp > 0 ? (((totalEquitiesMarketValue + totalFundsMarketValue) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const cashPct = totalNetWorthEgp > 0 ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';

  const netWorthTrend = useMemo<NetWorthTrendPoint[]>(() => {
    if (netWorthHistory.length < 2) return [];

    const monthlyRate = (yearMonth: string) => {
      const cbeRate = inflationAnalysis.cbeRateMap.get(yearMonth) ?? inflationAnalysis.headlineRate;
      const usRate = inflationAnalysis.usCpiRateMap.get(yearMonth) ?? inflationAnalysis.usCpiRate;
      return Math.max(0, (inflationAnalysis.wEgpFraction * cbeRate) + (inflationAnalysis.wUsdFraction * usRate)) / 100 / 12;
    };
    const deflators = new Array(netWorthHistory.length).fill(1) as number[];
    for (let index = netWorthHistory.length - 2; index >= 0; index -= 1) {
      deflators[index] = deflators[index + 1] * (1 + monthlyRate(netWorthHistory[index + 1].yearMonth));
    }

    return netWorthHistory.map((point, index) => {
      const nominal = point.nominalEgp * fxMultiplier;
      const real = (point.nominalEgp / deflators[index]) * fxMultiplier;
      return {
        month: point.month,
        fullDate: point.yearMonth,
        nominal,
        real,
        drag: nominal - real,
        invested: point.investedEgp * fxMultiplier,
        cash: point.cashEgp * fxMultiplier,
        brokerageCash: point.brokerageCashEgp * fxMultiplier,
      };
    });
  }, [netWorthHistory, fxMultiplier, inflationAnalysis]);

  const inflationPoints = useMemo(() => (
    netWorthTrend.map((point) => ({
      month: point.month,
      fullDate: point.fullDate,
      nominal: point.nominal,
      realValue: point.real,
      inflationDrag: point.drag,
    }))
  ), [netWorthTrend]);

  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'net-worth',
    onTabChange: (val) => router.push(`/dashboard?tab=${val}`),
  });

  return (
    <div className="command-surface-page flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-plt-base text-plt-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="net-worth"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header & Section 1: Overview */}
          <div className="flex flex-col gap-3 md:gap-4">
            <NetWorthHeader
              currencyMode={currencyMode}
              onCurrencyModeChange={setCurrencyMode}
            />

            {/* SECTION 1: Overview */}
            <section id="section-networth-overview" className="section-container section-viewport-fit">
              <div className="flex flex-col gap-0.5">
                <h2 className="section-title">Overview</h2>
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
              brokerageCashInEgp={totalBrokerageCashInEgp}
              brokerageAccountsCount={brokerageAccounts.length}
              fxMultiplier={fxMultiplier}
              openPositionsCount={openPositions.length}
              connectedAccountsCount={cashAccounts.length}
              currentYearDrag={inflationAnalysis.currentYearDragEgp}
              effectiveAnnualInflation={inflationAnalysis.effectiveRate}
              trendData={netWorthTrend}
            />
          </section>
        </div>

          {/* SECTION 2: Wealth Growth & Inflation Effect */}
          <section id="section-wealth-trajectory" className="section-container section-viewport-fit">
            <div id="section-inflation-impact" className="sr-only" />
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Wealth Growth & Inflation Effect</h2>
              <p className="section-subtitle">Recorded net worth trajectory and capital appreciation, benchmarked against currency-weighted inflation and real purchasing power</p>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <InflationRadarChart
                points={inflationPoints}
                cbeAnnualInflation={inflationAnalysis.headlineRate}
                usCpiAnnualInflation={inflationAnalysis.usCpiRate}
                effectiveAnnualInflation={inflationAnalysis.effectiveRate}
                wEgpPct={inflationAnalysis.wEgp}
                wUsdPct={inflationAnalysis.wUsd}
                currencyMode={currencyMode}
                usdRate={usdRate}
              />
            </div>
          </section>

          {/* SECTION 3: Portfolio Distribution */}
          <section id="section-portfolio-distribution" className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Portfolio Distribution</h2>
              <p className="section-subtitle">Asset class distribution, sector concentration, and currency exposure breakdown</p>
            </div>

            <div className="flex-1 min-h-0 w-full">
              <PortfolioSplitCard
                slices={assetSlices}
                currencyMode={currencyMode}
                selectedSliceName={categoryToSliceMap[selectedCategory]}
                onSelectSlice={(name) => {
                  setSelectedCategory(name === 'ALL' ? 'ALL' : (sliceToCategoryMap[name] || 'ALL'));
                }}
                openPositions={openPositions}
                accounts={accounts}
                usdRate={usdRate}
                totalNetWorthEgp={totalNetWorthEgp}
              />
            </div>
          </section>

          {/* SECTION 4: Holdings & Allocations */}
          <section id="section-holdings-allocations" className="section-container section-viewport-fit">
            <div id="section-portfolio-components" className="sr-only" />
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Holdings & Allocations</h2>
              <p className="section-subtitle">Constituent asset performance across gainers, liquid reserves, and losers</p>
            </div>

            <div className="flex-1 min-h-0 w-full">
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
          </section>
        </div>
      </div>
    </div>
  );
}
