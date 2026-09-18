'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Landmark,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from '@/components/ui/icon-library';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { getAccountCashImpact, isBrokerageAccount, toEgp } from '@/lib/portfolio-finance';
import { maskAccountNumber } from '@/lib/masking';

export type Timeframe = '30D' | '90D' | 'YTD' | 'ALL';

export interface BankAccountsScreenerWidgetProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  usdRate?: number;
}

interface ProcessedAccountRow {
  account: BankAccount;
  nativeBalance: number;
  egpBalance: number;
  sharePercentage: number;
  inflows: number;
  outflows: number;
  netChange: number;
  startingBalance: number;
  growthPct: number;
  sparklinePoints: number[];
  sparklineColor: 'profit' | 'loss' | 'neutral';
  isDormant: boolean;
}

interface BankGroup {
  bankKey: string;
  bankName: string;
  logoUrl?: string | null;
  isBrokerage: boolean;
  totalEgpBalance: number;
  totalSharePercentage: number;
  totalNetGrowthEgp: number;
  totalGrowthPct: number;
  accounts: ProcessedAccountRow[];
}

export default function BankAccountsScreenerWidget({
  accounts,
  transactions,
  usdRate = 50.20,
}: BankAccountsScreenerWidgetProps) {
  const { isPrivacy } = usePrivacyMode();
  const [timeframe, setTimeframe] = useState<Timeframe>('30D');
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
  const [activeDrawerAccount, setActiveDrawerAccount] = useState<ProcessedAccountRow | null>(null);

  // Timeframe boundary date
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (timeframe === '30D') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    if (timeframe === '90D') {
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
    if (timeframe === 'YTD') {
      return new Date(now.getFullYear(), 0, 1);
    }
    return new Date(0); // ALL
  }, [timeframe]);

  // Aggregate total liquid portfolio value (in EGP)
  const totalCombinedEgp = useMemo(() => {
    return accounts.reduce(
      (sum, acc) => sum + toEgp(Number(acc.balance) || 0, acc.currency, usdRate),
      0
    );
  }, [accounts, usdRate]);

  // Process all accounts into grouped banks
  const bankGroups = useMemo<BankGroup[]>(() => {
    const nowTime = Date.now();
    const startTime = cutoffDate.getTime();
    const duration = Math.max(1, nowTime - startTime);
    const NUM_SLICES = 16;

    // 1. Process individual account rows
    const processedAccounts: ProcessedAccountRow[] = accounts.map((account) => {
      const nativeBalance = Number(account.balance) || 0;
      const egpBalance = toEgp(nativeBalance, account.currency, usdRate);
      const sharePercentage = totalCombinedEgp > 0 ? (egpBalance / totalCombinedEgp) * 100 : 0;

      // Filter transactions matching this account
      const relevantTxs = transactions.filter((t) => {
        return t.accountId === account.id || t.toAccountId === account.id;
      });

      // Filter within the timeframe
      const periodTxs = relevantTxs.filter((t) => {
        const txDate = new Date(t.transactionDate).getTime();
        return txDate >= startTime;
      });

      periodTxs.sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

      let inflows = 0;
      let outflows = 0;
      let netChange = 0;

      for (const tx of periodTxs) {
        const amt = Number(tx.amount) || 0;
        let impact = 0;

        if (tx.toAccountId === account.id) {
          impact = amt;
        } else if (tx.accountId === account.id) {
          if (tx.type === 'TRANSFER') {
            impact = -amt;
          } else {
            impact = getAccountCashImpact(tx.type, amt);
          }
        }

        if (impact > 0) inflows += impact;
        if (impact < 0) outflows += Math.abs(impact);
        netChange += impact;
      }

      const startingBalance = nativeBalance - netChange;
      let growthPct = 0;
      if (startingBalance > 0) {
        growthPct = (netChange / startingBalance) * 100;
      } else if (netChange > 0) {
        growthPct = 100;
      }

      // Generate sparkline points
      const sparklinePoints: number[] = [];
      let runningBal = startingBalance;
      let txIdx = 0;

      for (let i = 0; i < NUM_SLICES; i++) {
        const sliceTime = startTime + (duration * i) / (NUM_SLICES - 1);

        while (txIdx < periodTxs.length && new Date(periodTxs[txIdx].transactionDate).getTime() <= sliceTime) {
          const tx = periodTxs[txIdx];
          const amt = Number(tx.amount) || 0;
          let impact = 0;
          if (tx.toAccountId === account.id) {
            impact = amt;
          } else if (tx.accountId === account.id) {
            if (tx.type === 'TRANSFER') impact = -amt;
            else impact = getAccountCashImpact(tx.type, amt);
          }
          runningBal += impact;
          txIdx++;
        }

        sparklinePoints.push(runningBal);
      }

      sparklinePoints[NUM_SLICES - 1] = nativeBalance;

      const isDormant = periodTxs.length === 0;
      let sparklineColor: 'profit' | 'loss' | 'neutral' = 'neutral';
      if (netChange > 0.01) sparklineColor = 'profit';
      else if (netChange < -0.01) sparklineColor = 'loss';

      return {
        account,
        nativeBalance,
        egpBalance,
        sharePercentage,
        inflows,
        outflows,
        netChange,
        startingBalance,
        growthPct,
        sparklinePoints,
        sparklineColor,
        isDormant,
      };
    });

    // 2. Group by Bank Institution
    const groupsMap = new Map<string, BankGroup>();

    for (const row of processedAccounts) {
      const { account } = row;
      const isBroker = isBrokerageAccount(account);
      const bankName = isBroker
        ? (account.bankName || account.customBankName || 'Brokerage')
        : (account.bankName || account.customBankName || 'Bank');
      const bankKey = `${isBroker ? 'broker' : 'bank'}-${account.bankId ?? bankName}`;

      if (!groupsMap.has(bankKey)) {
        groupsMap.set(bankKey, {
          bankKey,
          bankName,
          logoUrl: account.bankLogoUrl,
          isBrokerage: isBroker,
          totalEgpBalance: 0,
          totalSharePercentage: 0,
          totalNetGrowthEgp: 0,
          totalGrowthPct: 0,
          accounts: [],
        });
      }

      const group = groupsMap.get(bankKey)!;
      group.accounts.push(row);
      group.totalEgpBalance += row.egpBalance;
      group.totalSharePercentage += row.sharePercentage;

      const egpGrowth = toEgp(row.netChange, account.currency, usdRate);
      group.totalNetGrowthEgp += egpGrowth;

      if (!group.logoUrl && account.bankLogoUrl) {
        group.logoUrl = account.bankLogoUrl;
      }
    }

    // Sort accounts within each group, and compute group growth %
    const result: BankGroup[] = [];
    for (const group of groupsMap.values()) {
      group.accounts.sort((a, b) => b.egpBalance - a.egpBalance);

      const groupStartingEgp = group.totalEgpBalance - group.totalNetGrowthEgp;
      group.totalGrowthPct = groupStartingEgp > 0
        ? (group.totalNetGrowthEgp / groupStartingEgp) * 100
        : (group.totalNetGrowthEgp > 0 ? 100 : 0);

      result.push(group);
    }

    // Sort banks by total balance descending
    return result.sort((a, b) => b.totalEgpBalance - a.totalEgpBalance);
  }, [accounts, transactions, usdRate, cutoffDate, totalCombinedEgp]);

  // Overall combined period stats
  const totalNetGrowthEgp = useMemo(() => {
    return bankGroups.reduce((sum, g) => sum + g.totalNetGrowthEgp, 0);
  }, [bankGroups]);

  const totalStartingEgp = totalCombinedEgp - totalNetGrowthEgp;
  const totalGrowthPct = totalStartingEgp > 0 ? (totalNetGrowthEgp / totalStartingEgp) * 100 : 0;

  // Toggle bank expansion (default open)
  const isBankExpanded = (key: string) => expandedBanks[key] !== false;

  const toggleBank = (key: string) => {
    setExpandedBanks((prev) => ({
      ...prev,
      [key]: !isBankExpanded(key),
    }));
  };

  const allExpanded = bankGroups.every((g) => isBankExpanded(g.bankKey));

  const toggleAll = () => {
    const nextState = !allExpanded;
    const update: Record<string, boolean> = {};
    for (const g of bankGroups) {
      update[g.bankKey] = nextState;
    }
    setExpandedBanks(update);
  };

  // Format currency helper
  const formatMoney = (val: number, currency: string = 'EGP'): string => {
    if (isPrivacy) {
      return `•••••• ${currency === 'USD' ? '$' : '£'}`;
    }
    const formatted = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    return `${prefix}${currency === 'USD' ? '$' : ''}${formatted}${currency !== 'USD' ? ' £' : ''}`;
  };

  return (
    <div className="w-full flex flex-col bg-transparent select-none mt-2">
      {/* 1. Header Toolbar (Clean, minimal, no grey box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c1c1c]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Bank Accounts &amp; Liquidity Screener
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#141414] border border-[#262626] text-[#8c8c8c] font-mono">
              {bankGroups.length} {bankGroups.length === 1 ? 'Bank' : 'Banks'} · {accounts.length} Accounts
            </span>
          </div>
          <p className="text-[11px] text-[#787b86]">
            Holdings grouped by institution with period growth and balance trajectory
          </p>
        </div>

        {/* Right: Expand/Collapse All + Timeframe Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] font-medium text-[#787b86] hover:text-white px-2 py-1 transition-colors cursor-pointer"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>

          <div className="flex items-center p-0.5 rounded-lg bg-[#0d0d0d] border border-[#222222]">
            {(['30D', '90D', 'YTD', 'ALL'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#2962ff] text-white shadow-xs font-bold'
                    : 'text-[#787b86] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Desktop Screener Table */}
      <div className="hidden md:block w-full min-w-0 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#000000] border-b border-[#1c1c1c] text-[#787b86] font-normal text-[11px]">
            <tr className="h-[40px]">
              <th className="py-1 px-3 min-w-[240px]">Institution / Account</th>
              <th className="py-1 px-3 text-center min-w-[70px]">Currency</th>
              <th className="py-1 px-3 text-right min-w-[140px]">Current Balance</th>
              <th className="py-1 px-3 min-w-[120px]">Portfolio Share</th>
              <th className="py-1 px-3 text-right min-w-[150px]">Growth ({timeframe})</th>
              <th className="py-1 px-3 text-center min-w-[110px]">Trajectory ({timeframe})</th>
              <th className="py-1 px-3 min-w-[120px]">Cash Velocity</th>
              <th className="py-1 px-2 text-center min-w-[40px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171717] bg-transparent">
            {bankGroups.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-[#787b86]">
                  No connected bank or brokerage accounts found.
                </td>
              </tr>
            ) : (
              bankGroups.map((group) => {
                const expanded = isBankExpanded(group.bankKey);
                const isGroupProfit = group.totalNetGrowthEgp > 0.01;
                const isGroupLoss = group.totalNetGrowthEgp < -0.01;

                return (
                  <React.Fragment key={group.bankKey}>
                    {/* Bank Group Header Row */}
                    <tr
                      onClick={() => toggleBank(group.bankKey)}
                      className="h-[46px] bg-[#070707] hover:bg-[#0f0f0f] border-b border-[#1c1c1c] transition-colors cursor-pointer select-none"
                    >
                      {/* Left: Chevron + Bank Logo + Name */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="p-0.5 text-[#787b86]">
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                expanded ? 'rotate-0 text-white' : '-rotate-90'
                              }`}
                            />
                          </span>

                          <div className="w-6 h-6 rounded-md bg-[#141414] border border-[#222222] flex items-center justify-center overflow-hidden shrink-0">
                            {group.logoUrl ? (
                              <Image
                                src={group.logoUrl}
                                alt={group.bankName}
                                width={18}
                                height={18}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <Landmark className="w-3.5 h-3.5 text-[#787b86]" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-white tracking-tight truncate">
                              {group.bankName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#141414] text-[#8c8c8c] border border-[#222222] font-mono">
                              {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Currency Col */}
                      <td className="py-2 px-3 text-center text-[#555] font-mono text-[10px]">
                        —
                      </td>

                      {/* Total Bank Balance */}
                      <td className="py-2 px-3 text-right">
                        <span className="text-xs font-mono font-bold text-white tracking-tight">
                          {formatMoney(group.totalEgpBalance, 'EGP')}
                        </span>
                      </td>

                      {/* Total Bank Share % */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-1 w-full max-w-[110px]">
                          <span className="text-[11px] font-mono text-white font-semibold">
                            {group.totalSharePercentage.toFixed(1)}%
                          </span>
                          <div className="w-full h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#2962ff] transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, group.totalSharePercentage))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Group Growth */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
                              isGroupProfit ? 'text-[#089981]' : isGroupLoss ? 'text-[#f23645]' : 'text-[#787b86]'
                            }`}
                          >
                            {isGroupProfit && <ArrowUpRight className="w-3 h-3" />}
                            {isGroupLoss && <ArrowDownRight className="w-3 h-3" />}
                            {isGroupProfit ? '+' : ''}
                            {formatMoney(group.totalNetGrowthEgp, 'EGP')}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              isGroupProfit
                                ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/30'
                                : isGroupLoss
                                ? 'bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30'
                                : 'text-[#787b86]'
                            }`}
                          >
                            {group.totalGrowthPct >= 0 ? '+' : ''}
                            {group.totalGrowthPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Trajectory placeholder for group */}
                      <td className="py-2 px-3 text-center text-[#444] text-[10px] font-mono">
                        —
                      </td>

                      {/* Velocity placeholder */}
                      <td className="py-2 px-3 text-center text-[#444] text-[10px] font-mono">
                        —
                      </td>

                      {/* Action */}
                      <td className="py-2 px-2 text-center text-[#666]">
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform duration-150 inline-block ${
                            expanded ? 'rotate-90' : ''
                          }`}
                        />
                      </td>
                    </tr>

                    {/* Sub-Rows for each account under this bank */}
                    {expanded &&
                      group.accounts.map((row) => {
                        const { account } = row;
                        const isProfit = row.netChange > 0.01;
                        const isLoss = row.netChange < -0.01;
                        const totalVol = row.inflows + row.outflows;
                        const inflowRatio = totalVol > 0 ? (row.inflows / totalVol) * 100 : 50;
                        const cleanAccountNum = maskAccountNumber(account.accountNumber);

                        return (
                          <tr
                            key={account.id}
                            className="h-[48px] hover:bg-[#0d0d0d] border-b border-[#141414] transition-colors group cursor-default"
                          >
                            {/* Indented Account Nickname */}
                            <td className="py-2 pl-9 pr-3">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]/60 shrink-0" />
                                  <span className="text-xs font-semibold text-white group-hover:text-[#2962ff] transition-colors truncate max-w-[200px]">
                                    {account.accountName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-[#787b86] pl-3.5">
                                  <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-[#121212] border border-[#222222] text-[#8c8c8c]">
                                    {account.accountType.replace(/_/g, ' ')}
                                  </span>
                                  {cleanAccountNum !== '—' && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono">{cleanAccountNum}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Currency */}
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#121212] border border-[#222222] text-[#8c8c8c]">
                                {account.currency}
                              </span>
                            </td>

                            {/* Balance */}
                            <td className="py-2 px-3 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-mono font-bold text-white tracking-tight">
                                  {formatMoney(row.nativeBalance, account.currency)}
                                </span>
                                {account.currency === 'USD' && (
                                  <span className="text-[10px] font-mono text-[#787b86]">
                                    ≈ {formatMoney(row.egpBalance, 'EGP')}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Share % */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-1 w-full max-w-[110px]">
                                <span className="text-[11px] font-mono text-[#a3a3a3] font-medium">
                                  {row.sharePercentage.toFixed(1)}%
                                </span>
                                <div className="w-full h-1 rounded-full bg-[#171717] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#2962ff]/80 transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.max(0, row.sharePercentage))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Period Growth */}
                            <td className="py-2 px-3 text-right">
                              {row.isDormant ? (
                                <span className="text-[11px] font-mono text-[#787b86]">Flat (0.00)</span>
                              ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
                                      isProfit ? 'text-[#089981]' : isLoss ? 'text-[#f23645]' : 'text-[#787b86]'
                                    }`}
                                  >
                                    {isProfit && <ArrowUpRight className="w-3 h-3" />}
                                    {isLoss && <ArrowDownRight className="w-3 h-3" />}
                                    {isProfit ? '+' : ''}
                                    {formatMoney(row.netChange, account.currency)}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                                      isProfit
                                        ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/30'
                                        : isLoss
                                        ? 'bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30'
                                        : 'text-[#787b86]'
                                    }`}
                                  >
                                    {row.growthPct >= 0 ? '+' : ''}
                                    {row.growthPct.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Sparkline */}
                            <td className="py-2 px-3">
                              <div className="flex justify-center">
                                <MiniSparkline
                                  points={row.sparklinePoints}
                                  color={row.sparklineColor}
                                  width={84}
                                  height={26}
                                />
                              </div>
                            </td>

                            {/* Cash Velocity (In vs Out) */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-1 w-full max-w-[110px]">
                                <div className="flex items-center justify-between text-[9px] font-mono text-[#787b86]">
                                  <span className="text-[#089981]">In: {inflowRatio.toFixed(0)}%</span>
                                  <span className="text-[#f23645]">Out: {(100 - inflowRatio).toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#171717] overflow-hidden flex">
                                  <div
                                    className="bg-[#089981] h-full transition-all"
                                    style={{ width: `${inflowRatio}%` }}
                                  />
                                  <div
                                    className="bg-[#f23645] h-full transition-all"
                                    style={{ width: `${100 - inflowRatio}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Action Button */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setActiveDrawerAccount(row)}
                                className="p-1 rounded-md text-[#787b86] hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                                title="View account breakdown"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Screener Summary Footer (Minimal clean line, no grey box) */}
          {bankGroups.length > 0 && (
            <tfoot className="bg-transparent border-t border-[#262626] text-xs">
              <tr className="h-[46px] font-semibold text-white">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#787b86] text-[11px] uppercase tracking-wider">Total Liquidity:</span>
                    <span className="font-mono text-white font-bold">{formatMoney(totalCombinedEgp, 'EGP')}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-center text-[#787b86] text-[11px]">EGP Eq.</td>
                <td className="py-2 px-3 text-right font-mono font-bold">
                  {formatMoney(totalCombinedEgp, 'EGP')}
                </td>
                <td className="py-2 px-3 text-[#787b86] font-mono text-[11px]">100.0%</td>
                <td className="py-2 px-3 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-mono font-bold ${
                        totalNetGrowthEgp >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                      }`}
                    >
                      {totalNetGrowthEgp >= 0 ? '+' : ''}
                      {formatMoney(totalNetGrowthEgp, 'EGP')}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        totalGrowthPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                      }`}
                    >
                      ({totalGrowthPct >= 0 ? '+' : ''}
                      {totalGrowthPct.toFixed(1)}%)
                    </span>
                  </div>
                </td>
                <td colSpan={3} className="py-2 px-3 text-right">
                  <Link
                    href="/wallet?tab=transactions"
                    className="inline-flex items-center gap-1.5 text-xs text-[#2962ff] hover:underline font-semibold cursor-pointer"
                  >
                    <span>Open Transaction Ledger</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 3. Mobile Screener Rows (< 768px, Grouped by Bank) */}
      <div className="md:hidden divide-y divide-[#171717] bg-transparent">
        {bankGroups.map((group) => {
          const expanded = isBankExpanded(group.bankKey);
          const isGroupProfit = group.totalNetGrowthEgp > 0.01;
          const isGroupLoss = group.totalNetGrowthEgp < -0.01;

          return (
            <div key={group.bankKey} className="flex flex-col border-b border-[#1c1c1c]">
              {/* Bank Header Card */}
              <div
                onClick={() => toggleBank(group.bankKey)}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] hover:bg-[#111111] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center shrink-0">
                    {group.logoUrl ? (
                      <Image
                        src={group.logoUrl}
                        alt={group.bankName}
                        width={20}
                        height={20}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <Landmark className="w-4 h-4 text-[#787b86]" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {group.bankName}
                    </span>
                    <span className="text-[10px] text-[#787b86] font-mono">
                      {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'} · {group.totalSharePercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white block">
                      {formatMoney(group.totalEgpBalance, 'EGP')}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isGroupProfit ? 'text-[#089981]' : isGroupLoss ? 'text-[#f23645]' : 'text-[#787b86]'
                      }`}
                    >
                      {group.totalGrowthPct >= 0 ? '+' : ''}
                      {group.totalGrowthPct.toFixed(1)}%
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#787b86] transition-transform duration-150 ${
                      expanded ? 'rotate-0 text-white' : '-rotate-90'
                    }`}
                  />
                </div>
              </div>

              {/* Bank Accounts List */}
              {expanded && (
                <div className="divide-y divide-[#141414] bg-[#030303] pl-3">
                  {group.accounts.map((row) => {
                    const { account } = row;
                    const isProfit = row.netChange > 0.01;
                    const isLoss = row.netChange < -0.01;

                    return (
                      <div
                        key={account.id}
                        onClick={() => setActiveDrawerAccount(row)}
                        className="flex items-center justify-between py-3 pr-3 hover:bg-[#0c0c0c] transition-colors cursor-pointer active:bg-[#141414]"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                            {account.accountName}
                          </span>
                          <span className="text-[10px] uppercase text-[#787b86] font-mono mt-0.5">
                            {account.accountType.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="hidden xs:flex shrink-0 px-2">
                          <MiniSparkline
                            points={row.sparklinePoints}
                            color={row.sparklineColor}
                            width={56}
                            height={20}
                          />
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs font-mono font-bold text-white tracking-tight">
                            {formatMoney(row.nativeBalance, account.currency)}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-1 py-0.2 rounded mt-0.5 ${
                              isProfit
                                ? 'bg-[#089981]/15 text-[#089981] border border-[#089981]/30'
                                : isLoss
                                ? 'bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30'
                                : 'text-[#787b86]'
                            }`}
                          >
                            {row.growthPct >= 0 ? '+' : ''}
                            {row.growthPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Slide-Up Account Detail Drawer */}
      {activeDrawerAccount && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setActiveDrawerAccount(null)}
        >
          <div
            className="w-full sm:max-w-md bg-[#0e0e0e] border border-[#222222] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center shrink-0">
                  {activeDrawerAccount.account.bankLogoUrl ? (
                    <Image
                      src={activeDrawerAccount.account.bankLogoUrl}
                      alt="Bank"
                      width={24}
                      height={24}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <Landmark className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {activeDrawerAccount.account.accountName}
                  </h4>
                  <p className="text-xs text-[#787b86]">
                    {activeDrawerAccount.account.bankName || activeDrawerAccount.account.customBankName || 'Bank'} ·{' '}
                    <span className="uppercase text-[10px] px-1 py-0.2 rounded bg-[#1a1a1a] text-[#8c8c8c]">
                      {activeDrawerAccount.account.accountType.replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDrawerAccount(null)}
                className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balances & Growth Breakdown */}
            <div className="grid grid-cols-2 gap-2 bg-[#000000] p-3 rounded-xl border border-[#1f1f1f]">
              <div>
                <span className="text-[10px] text-[#787b86] uppercase tracking-wider block">Current Balance</span>
                <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                  {formatMoney(activeDrawerAccount.nativeBalance, activeDrawerAccount.account.currency)}
                </span>
                {activeDrawerAccount.account.currency === 'USD' && (
                  <span className="text-[10px] font-mono text-[#787b86] block">
                    ≈ {formatMoney(activeDrawerAccount.egpBalance, 'EGP')}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#787b86] uppercase tracking-wider block">
                  {timeframe} Net Growth
                </span>
                <span
                  className={`text-sm font-mono font-bold mt-0.5 block ${
                    activeDrawerAccount.netChange >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                  }`}
                >
                  {activeDrawerAccount.netChange >= 0 ? '+' : ''}
                  {formatMoney(activeDrawerAccount.netChange, activeDrawerAccount.account.currency)}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold ${
                    activeDrawerAccount.growthPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                  }`}
                >
                  ({activeDrawerAccount.growthPct >= 0 ? '+' : ''}
                  {activeDrawerAccount.growthPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Sparkline Card */}
            <div className="bg-[#000000] p-3 rounded-xl border border-[#1f1f1f] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#787b86]">
                <span>{timeframe} Balance Trajectory</span>
                <span className="font-mono text-[10px] text-white">
                  Share: {activeDrawerAccount.sharePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-16 flex items-center justify-center pt-1">
                <MiniSparkline
                  points={activeDrawerAccount.sparklinePoints}
                  color={activeDrawerAccount.sparklineColor}
                  width={340}
                  height={54}
                />
              </div>
            </div>

            {/* Inflow vs Outflow Cash Velocity */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-[#000000] border border-[#1f1f1f]">
                <div className="flex items-center gap-1 text-[10px] text-[#089981] font-semibold uppercase">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Period Inflows</span>
                </div>
                <span className="text-xs font-mono font-bold text-white mt-1 block">
                  {formatMoney(activeDrawerAccount.inflows, activeDrawerAccount.account.currency)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#000000] border border-[#1f1f1f]">
                <div className="flex items-center gap-1 text-[10px] text-[#f23645] font-semibold uppercase">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Period Outflows</span>
                </div>
                <span className="text-xs font-mono font-bold text-white mt-1 block">
                  {formatMoney(activeDrawerAccount.outflows, activeDrawerAccount.account.currency)}
                </span>
              </div>
            </div>

            {/* Action CTA */}
            <Link
              href="/wallet?tab=transactions"
              className="w-full py-2.5 px-4 rounded-xl bg-[#2962ff] hover:bg-[#1e54e4] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-1"
            >
              <span>View In Transaction Ledger</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight inline SVG sparkline generator
 */
function MiniSparkline({
  points,
  color,
  width,
  height,
}: {
  points: number[];
  color: 'profit' | 'loss' | 'neutral';
  width: number;
  height: number;
}) {
  if (!points || points.length < 2) {
    return <div className="w-[84px] h-[26px] bg-[#1a1a1a]/30 rounded-xs" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;

  const padTop = 3;
  const padBottom = 3;
  const plotHeight = height - padTop - padBottom;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = range === 0 ? height / 2 : padTop + plotHeight - ((p - min) / range) * plotHeight;
    return { x, y };
  });

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const strokeColor = color === 'profit' ? '#089981' : color === 'loss' ? '#f23645' : '#787b86';
  const fillStart = color === 'profit' ? 'rgba(8, 153, 129, 0.22)' : color === 'loss' ? 'rgba(242, 54, 69, 0.22)' : 'rgba(120, 123, 134, 0.12)';
  const gradId = `spark-grad-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillStart} />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
