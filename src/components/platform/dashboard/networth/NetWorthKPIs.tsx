'use client';

import React from 'react';
import { ShieldCheck, Flame } from 'lucide-react';

interface NetWorthKPIsProps {
  currencyMode: 'EGP' | 'USD';
  onCurrencyChange: (mode: 'EGP' | 'USD') => void;
  displayTotalNetWorth: number;
  totalNetWorthEgp: number;
  totalEquitiesMarketValue: number;
  totalFundsMarketValue: number;
  totalEgpLiquidCash: number;
  totalUsdCashInEgp: number;
  fxMultiplier: number;
  openPositionsCount: number;
  connectedAccountsCount: number;
  currentYearDrag: number;
  cbeAnnualInflation: number;
}

export default function NetWorthKPIs({
  currencyMode,
  onCurrencyChange,
  displayTotalNetWorth,
  totalNetWorthEgp,
  totalEquitiesMarketValue,
  totalFundsMarketValue,
  totalEgpLiquidCash,
  totalUsdCashInEgp,
  fxMultiplier,
  openPositionsCount,
  connectedAccountsCount,
  currentYearDrag,
  cbeAnnualInflation,
}: NetWorthKPIsProps) {
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' EGP' : '';

  return (
    <div className="space-y-4">
      {/* Currency Switcher Row */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => onCurrencyChange('EGP')}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
              currencyMode === 'EGP'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            EGP (ج.م)
          </button>
          <button
            type="button"
            onClick={() => onCurrencyChange('USD')}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
              currencyMode === 'USD'
                ? 'bg-sky-500 text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Net Worth */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-black">
          <div className="text-[11px] text-emerald-400/80 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Total Net Worth</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {displaySymbol}
            {displayTotalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {displaySuffix}
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            Mark-to-market liquid + invested assets
          </div>
        </div>

        {/* Card 2: Invested Capital */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Equities & Mutual Funds</span>
            <span className="text-plt-orange font-mono text-xs">
              {totalNetWorthEgp > 0 ? (((totalEquitiesMarketValue + totalFundsMarketValue) / totalNetWorthEgp) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="mt-2 text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
            {displaySymbol}
            {((totalEquitiesMarketValue + totalFundsMarketValue) * fxMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {displaySuffix}
          </div>
          <div className="text-[11px] text-white/35 mt-1">
            {openPositionsCount} active holdings & mutual funds
          </div>
        </div>

        {/* Card 3: Liquid Bank Reserves */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Liquid Bank Cash</span>
            <span className="text-sky-400 font-mono text-xs">
              {totalNetWorthEgp > 0 ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorthEgp) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="mt-2 text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
            {displaySymbol}
            {((totalEgpLiquidCash + totalUsdCashInEgp) * fxMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {displaySuffix}
          </div>
          <div className="text-[11px] text-white/35 mt-1">
            {connectedAccountsCount} connected bank account(s)
          </div>
        </div>

        {/* Card 4: Inflation Drag */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between border-rose-500/20 bg-gradient-to-br from-rose-950/15 to-black">
          <div className="text-[11px] text-rose-400/80 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Inflation Drag (1Y @ {cbeAnnualInflation}%)</span>
            <Flame size={16} className="text-rose-400" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-bold font-mono text-rose-400 tracking-tight">
            -{displaySymbol}
            {currentYearDrag.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            {displaySuffix}
          </div>
          <div className="text-[11px] text-white/40 mt-1">
            Annual unhedged cash purchasing power loss
          </div>
        </div>
      </div>
    </div>
  );
}
