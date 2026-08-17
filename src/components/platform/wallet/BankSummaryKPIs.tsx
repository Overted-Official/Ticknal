'use client';

import React from 'react';
import { type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface BankSummaryKPIsProps {
  accounts: BankAccount[];
  usdRate: number;
}

export default function BankSummaryKPIs({ accounts, usdRate }: BankSummaryKPIsProps) {
  const { isPrivacy } = usePrivacyMode();

  const totalEgpLiquid = accounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquid = accounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalCombinedEgp = totalEgpLiquid + totalUsdLiquid * usdRate;
  const egpCount = accounts.filter((a) => a.currency === 'EGP').length;

  return (
    <div className="border border-white/[0.09] rounded-md bg-black divide-y md:divide-y-0 md:divide-x divide-white/[0.06] grid grid-cols-1 md:grid-cols-3 overflow-hidden">
      {/* 1. Combined Liquid Cash */}
      <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
        <div className="text-[11px] text-white/40 font-medium">Combined Liquid Cash</div>
        <div>
          <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">
            {isPrivacy ? (
              <span className="tracking-wider">****** EGP</span>
            ) : (
              `${totalCombinedEgp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
            )}
          </div>
          <div className="mt-1 text-[11px] text-white/30 font-mono">
            Ready uninvested buying power & savings
          </div>
        </div>
      </div>

      {/* 2. Total Liquid EGP */}
      <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
        <div className="text-[11px] text-white/40 font-medium">Total Liquid EGP</div>
        <div>
          <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">
            {isPrivacy ? (
              <span className="tracking-wider">****** EGP</span>
            ) : (
              `${totalEgpLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
            )}
          </div>
          <div className="mt-1 text-[11px] text-white/30 font-mono">
            Across {egpCount} Egyptian pound account{egpCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* 3. Foreign Reserves (USD) */}
      <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
        <div className="text-[11px] text-white/40 font-medium">Foreign Reserves (USD)</div>
        <div>
          <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">
            {isPrivacy ? (
              <span className="tracking-wider">****** USD</span>
            ) : (
              `$${totalUsdLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
            )}
          </div>
          <div className="mt-1 text-[11px] text-white/30 font-mono flex items-center gap-1.5">
            {isPrivacy ? (
              <span>≈ ****** EGP</span>
            ) : (
              <span>≈ {(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP</span>
            )}
            <span className="text-white/20">·</span>
            <span>@{usdRate.toFixed(2)} FX</span>
          </div>
        </div>
      </div>
    </div>
  );
}
