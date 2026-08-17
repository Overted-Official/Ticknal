'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ShieldCheck, TrendingUp, Landmark } from 'lucide-react';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import NetWorthKPIs from './dashboard/networth/NetWorthKPIs';
import AssetAllocationSection, { type AssetSlice } from './dashboard/networth/AssetAllocationSection';
import InflationRadarChart from './dashboard/networth/InflationRadarChart';
import { type BankAccount, type PositionItem } from '@/types/bank';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ASSET_COLORS = {
  stocks: '#22c55e',      // Green - Equities
  funds: '#ff640d',       // Orange - Mutual Funds (Osoul / Quant)
  usdCash: '#38bdf8',     // Sky Blue - USD Foreign Reserves
  egpCash: '#a855f7',     // Purple - EGP Liquid Cash
};

interface DashboardNetWorthViewProps {
  initialAccounts?: BankAccount[];
  openPositions?: PositionItem[];
  usdRate?: number;
  cbeAnnualInflation?: number; // e.g. 15.0 for 15%
}

export default function DashboardNetWorthView({
  initialAccounts = [],
  openPositions = [],
  usdRate = 50.20,
  cbeAnnualInflation = 15.0,
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

  // Inflation & Purchasing Power Modeling
  const inflationAnalysis = useMemo(() => {
    const monthlyInflationRate = cbeAnnualInflation / 100 / 12;
    const points = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();

    const nominalAcc = displayTotalNetWorth;

    for (let i = 11; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      const monthLabel = monthNames[mIdx];
      
      const compoundedDeflator = Math.pow(1 + monthlyInflationRate, i);
      const realValue = nominalAcc / compoundedDeflator;
      const inflationDrag = nominalAcc - realValue;

      points.push({
        month: monthLabel,
        nominal: nominalAcc,
        realValue: realValue,
        inflationDrag: inflationDrag,
      });
    }

    const currentYearDrag = displayTotalNetWorth - (displayTotalNetWorth / (1 + cbeAnnualInflation / 100));

    return {
      points,
      currentYearDrag,
      headlineRate: cbeAnnualInflation,
    };
  }, [displayTotalNetWorth, cbeAnnualInflation]);

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto bg-tv-base text-tv-text select-none">
      {/* 1. Mobile / Desktop Top Rail */}
      <SubNavTopRail
        activeTab="net-worth"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
        ]}
      />

      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {/* 2. Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="text-emerald-400" size={24} />
            Total Net Worth & Inflation Intelligence
          </h1>
          <p className="text-xs md:text-sm text-white/40 mt-1">
            Mark-to-market total wealth aggregation, currency conversions, and CBE purchasing power deflator.
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
          cbeAnnualInflation={cbeAnnualInflation}
        />

        {/* 4. Asset Allocation & Composition */}
        <AssetAllocationSection
          slices={assetSlices}
          currencyMode={currencyMode}
          usdRate={usdRate}
        />

        {/* 5. CBE Inflation Purchasing Power Deflator Radar */}
        <InflationRadarChart
          points={inflationAnalysis.points}
          cbeAnnualInflation={cbeAnnualInflation}
          currencyMode={currencyMode}
        />
      </div>
    </div>
  );
}
