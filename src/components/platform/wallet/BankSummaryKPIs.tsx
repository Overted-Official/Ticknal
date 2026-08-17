'use client';

import React from 'react';
import { Landmark, DollarSign, Building2 } from 'lucide-react';
import { type BankAccount } from '@/types/bank';

interface BankSummaryKPIsProps {
  accounts: BankAccount[];
  usdRate: number;
}

export default function BankSummaryKPIs({ accounts, usdRate }: BankSummaryKPIsProps) {
  const totalEgpLiquid = accounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquid = accounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalCombinedEgp = totalEgpLiquid + totalUsdLiquid * usdRate;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {/* 1. Total Liquid EGP */}
      <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider flex items-center justify-between">
          <span>Total Liquid EGP</span>
          <span className="text-emerald-400 font-mono text-xs">EGP</span>
        </div>
        <div className="mt-2 text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
          {totalEgpLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-white/40 ml-1.5">EGP</span>
        </div>
        <div className="text-[11px] text-white/35 mt-1">
          Across {accounts.filter((a) => a.currency === 'EGP').length} Egyptian pound account(s)
        </div>
      </div>

      {/* 2. Total USD Foreign Reserves */}
      <div className="glass-panel rounded-xl p-4 flex flex-col justify-between">
        <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider flex items-center justify-between">
          <span>Foreign Reserves (USD)</span>
          <span className="text-sky-400 font-mono text-xs">USD</span>
        </div>
        <div className="mt-2 text-xl md:text-2xl font-bold font-mono text-white tracking-tight">
          ${totalUsdLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-white/40 ml-1.5">USD</span>
        </div>
        <div className="text-[11px] text-white/35 mt-1 flex items-center gap-1.5">
          <span>≈ {(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40">@{usdRate.toFixed(2)} FX</span>
        </div>
      </div>

      {/* 3. Combined Liquid Worth */}
      <div className="glass-panel rounded-xl p-4 flex flex-col justify-between border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-black">
        <div className="text-[11px] text-emerald-400/70 font-medium uppercase tracking-wider flex items-center justify-between">
          <span>Combined Liquid Cash</span>
          <Building2 size={15} className="text-emerald-400" />
        </div>
        <div className="mt-2 text-xl md:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          {totalCombinedEgp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-emerald-400/60 ml-1.5">EGP</span>
        </div>
        <div className="text-[11px] text-white/40 mt-1">
          Ready uninvested buying power & savings
        </div>
      </div>
    </div>
  );
}
