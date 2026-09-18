'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Landmark,
  Wallet,
} from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { maskAccountNumber } from '@/lib/masking';

export interface BrokerageSummaryItem {
  account: BankAccount;
  positions: {
    accountId?: number | null;
    tickerSymbol: string;
    quantity?: number;
    currentPrice?: number;
  }[];
  symbols: string[];
  investedValue: number;
}

interface BrokerageHoldingsWidgetProps {
  summaries: BrokerageSummaryItem[];
  usdRate?: number;
}

export default function BrokerageHoldingsWidget({
  summaries,
  usdRate = 50.20,
}: BrokerageHoldingsWidgetProps) {
  const { isPrivacy } = usePrivacyMode();

  if (!summaries || summaries.length === 0) {
    return null;
  }

  const formatMoney = (val: number, currency: string = 'EGP'): string => {
    if (isPrivacy) {
      return `•••••• ${currency === 'USD' ? '$' : '£'}`;
    }
    const formatted = val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currency === 'USD' ? '$' : ''}${formatted}${currency !== 'USD' ? ' £' : ''}`;
  };

  const totalInvestedAll = summaries.reduce((sum, s) => {
    const rate = s.account.currency === 'USD' ? usdRate : 1;
    return sum + s.investedValue * rate;
  }, 0);

  const totalPositionsCount = summaries.reduce((sum, s) => sum + s.positions.length, 0);

  return (
    <div className="w-full flex flex-col bg-[#000000] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl select-none mt-3">
      {/* 1. Widget Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-[#141414] border-b border-[#2e2e2e]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              Invested Holdings by Brokerage
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1f1f1f] border border-[#3d3d3d] text-[#8c8c8c] font-mono">
              {summaries.length} {summaries.length === 1 ? 'Broker' : 'Brokers'} · {totalPositionsCount} Lots
            </span>
          </div>
          <p className="text-[11px] text-[#8c8c8c]">
            Active market exposure and trading equity linked directly to brokerage cash accounts
          </p>
        </div>

        {/* Quick Link to Positions Tab */}
        <Link
          href="/wallet?tab=positions"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1f1f1f] hover:bg-[#2e2e2e] border border-[#3d3d3d] text-white hover:text-white transition-all shadow-xs cursor-pointer shrink-0 group"
          title="Open Tracked Positions Screener"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#2962ff] group-hover:scale-110 transition-transform" />
          <span>View Stock Positions</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#8c8c8c] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 2. Desktop Screener Table */}
      <div className="hidden sm:block w-full min-w-0 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#000000] border-b border-[#2e2e2e] text-[#8c8c8c] font-normal text-[11px]">
            <tr className="h-[42px]">
              <th className="py-1 px-4 min-w-[200px]">Brokerage Account</th>
              <th className="py-1 px-3 text-right min-w-[130px]">Available Cash</th>
              <th className="py-1 px-3 text-center min-w-[100px]">Execution Lots</th>
              <th className="py-1 px-3 min-w-[200px]">Active Symbols</th>
              <th className="py-1 px-4 text-right min-w-[140px]">Invested Market Value</th>
              <th className="py-1 px-4 text-right min-w-[140px]">Total Brokerage NAV</th>
              <th className="py-1 px-3 text-right min-w-[90px]">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1f1f1f]">
            {summaries.map(({ account, positions, symbols, investedValue }) => {
              const cashBal = Number(account.balance) || 0;
              const totalNav = cashBal + investedValue;
              const displayedSymbols = symbols.slice(0, 4);
              const remainingSymbolsCount = symbols.length - displayedSymbols.length;

              return (
                <tr
                  key={account.id}
                  className="h-[52px] hover:bg-[#1f1f1f]/80 transition-colors select-none group"
                >
                  {/* Brokerage & Account */}
                  <td className="py-2 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1f1f1f] border border-[#2e2e2e] flex items-center justify-center shrink-0 overflow-hidden relative shadow-xs">
                        {account.bankLogoUrl ? (
                          <Image
                            src={account.bankLogoUrl}
                            alt={account.bankName || account.accountName}
                            width={32}
                            height={32}
                            className="w-full h-full object-contain p-1 rounded-full"
                            unoptimized
                          />
                        ) : (
                          <Landmark size={15} className="text-[#8c8c8c]" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white truncate max-w-[160px]">
                            {account.accountName || account.customBankName || account.bankName || 'Brokerage Account'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#2962ff]/15 text-[#5b9cf6] border border-[#2962ff]/30 shrink-0">
                            {account.currency}
                          </span>
                        </div>
                        {account.accountNumber && (
                          <span className="text-[10px] text-[#707070] font-mono mt-0.5">
                            {maskAccountNumber(account.accountNumber)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Available Cash */}
                  <td className="py-2 px-3 text-right font-mono text-xs font-semibold whitespace-nowrap text-[#d1d4dc]">
                    {formatMoney(cashBal, account.currency)}
                  </td>

                  {/* Positions / Lots Count */}
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-[#1f1f1f] border border-[#3d3d3d] text-white">
                      {positions.length} lots
                    </span>
                  </td>

                  {/* Active Symbols */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 flex-wrap max-w-xs">
                      {displayedSymbols.map((sym) => (
                        <span
                          key={sym}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] border border-[#2e2e2e] text-white"
                        >
                          {sym.replace('.CA', '')}
                        </span>
                      ))}
                      {remainingSymbolsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#8c8c8c] bg-[#141414] border border-[#2e2e2e]">
                          +{remainingSymbolsCount}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Invested Market Value */}
                  <td className="py-2 px-4 text-right font-mono text-xs font-bold text-[#22ab94] whitespace-nowrap">
                    {formatMoney(investedValue, account.currency)}
                  </td>

                  {/* Total Brokerage NAV */}
                  <td className="py-2 px-4 text-right font-mono text-xs font-bold text-white whitespace-nowrap">
                    {formatMoney(totalNav, account.currency)}
                  </td>

                  {/* Action Link */}
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <Link
                      href="/wallet?tab=positions"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2962ff] hover:text-[#5b9cf6] transition-colors cursor-pointer"
                    >
                      <span>Lots</span>
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Mobile Cards View (< 640px) */}
      <div className="block sm:hidden divide-y divide-[#1f1f1f]">
        {summaries.map(({ account, positions, symbols, investedValue }) => {
          const cashBal = Number(account.balance) || 0;
          const totalNav = cashBal + investedValue;
          const cleanName = account.accountName || account.customBankName || account.bankName || 'Brokerage';

          return (
            <Link
              key={account.id}
              href="/wallet?tab=positions"
              className="p-3.5 flex flex-col gap-2.5 hover:bg-[#1f1f1f] active:bg-[#2e2e2e] transition-colors cursor-pointer select-none"
            >
              {/* Top row: Indicator + Logo + Name + Total NAV */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-6 rounded-[2px] bg-[#2962ff] shrink-0" />
                  <div className="w-8 h-8 rounded-full bg-[#1f1f1f] border border-[#2e2e2e] flex items-center justify-center shrink-0 overflow-hidden relative">
                    {account.bankLogoUrl ? (
                      <Image
                        src={account.bankLogoUrl}
                        alt={cleanName}
                        width={32}
                        height={32}
                        className="w-full h-full object-contain p-1 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <Landmark size={15} className="text-[#8c8c8c]" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-semibold text-white truncate">
                      {cleanName}
                    </span>
                    <span className="text-[10px] text-[#8c8c8c] font-mono mt-0.5">
                      {positions.length} lots · {symbols.length} tickers
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-mono text-[#8c8c8c]">Total NAV</div>
                  <div className="text-sm font-bold font-mono text-white">
                    {formatMoney(totalNav, account.currency)}
                  </div>
                </div>
              </div>

              {/* Bottom row: Breakdown pills + Chevron */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1f1f1f] text-[11px]">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[#707070] mr-1">Invested:</span>
                    <span className="font-mono font-semibold text-[#22ab94]">
                      {formatMoney(investedValue, account.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#707070] mr-1">Cash:</span>
                    <span className="font-mono text-[#d1d4dc]">
                      {formatMoney(cashBal, account.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#2962ff]">
                  <span>View</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
