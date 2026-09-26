'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Wallet,
  Globe,
  Coins,
  ChevronRight,
  Building2,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import {
  isBrokerageAccount,
  toEgp,
  getAccountCashImpact,
  buildCashTrend,
} from '@/lib/portfolio-finance';
import KPICard, { type KPICardProps } from './KPICard';

interface BanksKPIRailProps {
  accounts?: BankAccount[];
  transactions?: BankTransaction[];
  usdRate?: number;
}

function calculateAccountSparkline(
  account: BankAccount,
  transactions: BankTransaction[]
): {
  points: number[];
  trend: 'up' | 'down' | 'neutral';
  changeText: string;
  changeColorClass: string;
} {
  const currentBalance = Number(account.balance) || 0;

  // Filter transactions involving this account
  const acctTx = transactions
    .filter((t) => t.accountId === account.id || t.toAccountId === account.id)
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  if (acctTx.length === 0) {
    return {
      points: [currentBalance, currentBalance, currentBalance, currentBalance, currentBalance, currentBalance],
      trend: 'neutral',
      changeText: 'Steady',
      changeColorClass: 'text-zinc-400',
    };
  }

  // Calculate net impact for this account
  const getImpact = (t: BankTransaction): number => {
    const amt = Math.abs(Number(t.amount) || 0);
    if (t.accountId === account.id) {
      if (t.type === 'TRANSFER') return -amt;
      return getAccountCashImpact(t.type, amt);
    }
    if (t.toAccountId === account.id) {
      return amt;
    }
    return 0;
  };

  const totalDelta = acctTx.reduce((sum, t) => sum + getImpact(t), 0);
  const startBalance = currentBalance - totalDelta;

  // Build running balance progression
  let running = startBalance;
  const progression: number[] = [startBalance];
  for (const t of acctTx) {
    running += getImpact(t);
    progression.push(running);
  }
  progression[progression.length - 1] = currentBalance;

  // Sample progression down to 8 points if longer
  let samplePoints = progression;
  if (progression.length > 8) {
    samplePoints = [];
    const step = (progression.length - 1) / 7;
    for (let i = 0; i < 8; i++) {
      const idx = Math.min(Math.round(i * step), progression.length - 1);
      samplePoints.push(progression[idx]);
    }
    samplePoints[7] = currentBalance;
  }

  // Determine trend and percentage change
  const delta = currentBalance - startBalance;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  let changeText = 'Steady';
  let changeColorClass = 'text-zinc-400';

  if (Math.abs(delta) < 0.01) {
    trend = 'neutral';
    changeText = 'Steady';
    changeColorClass = 'text-zinc-400';
  } else if (delta > 0) {
    trend = 'up';
    const pct = startBalance > 0 ? (delta / startBalance) * 100 : 100;
    changeText = `+${pct > 999 ? '>999' : pct.toFixed(1)}%`;
    changeColorClass = 'text-profit-num';
  } else {
    trend = 'down';
    const pct = startBalance > 0 ? (Math.abs(delta) / startBalance) * 100 : 100;
    changeText = `-${pct > 999 ? '>999' : pct.toFixed(1)}%`;
    changeColorClass = 'text-loss-num';
  }

  return {
    points: samplePoints,
    trend,
    changeText,
    changeColorClass,
  };
}

export default function BanksKPIRail({
  accounts = [],
  transactions = [],
  usdRate = 50.20,
}: BanksKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const INITIAL_ACCOUNTS_LIMIT = 4;

  const cashAccounts = useMemo(() => accounts.filter((a) => !isBrokerageAccount(a)), [accounts]);
  const brokerageAccounts = useMemo(() => accounts.filter(isBrokerageAccount), [accounts]);

  const totalEgpLiquid = useMemo(
    () =>
      cashAccounts
        .filter((a) => a.currency === 'EGP')
        .reduce((sum, a) => sum + Number(a.balance || 0), 0),
    [cashAccounts]
  );

  const totalUsdLiquid = useMemo(
    () =>
      cashAccounts
        .filter((a) => a.currency === 'USD')
        .reduce((sum, a) => sum + Number(a.balance || 0), 0),
    [cashAccounts]
  );

  const totalBrokerageCashEgp = useMemo(
    () =>
      brokerageAccounts.reduce(
        (sum, a) => sum + toEgp(Number(a.balance) || 0, a.currency, usdRate),
        0
      ),
    [brokerageAccounts, usdRate]
  );

  const totalCombinedEgp = useMemo(
    () =>
      accounts.reduce(
        (sum, a) => sum + toEgp(Number(a.balance) || 0, a.currency, usdRate),
        0
      ),
    [accounts, usdRate]
  );

  const egpPct = totalCombinedEgp > 0 ? ((totalEgpLiquid / totalCombinedEgp) * 100).toFixed(0) : '0';
  const usdPct =
    totalCombinedEgp > 0 ? (((totalUsdLiquid * usdRate) / totalCombinedEgp) * 100).toFixed(0) : '0';
  const brokeragePct =
    totalCombinedEgp > 0 ? ((totalBrokerageCashEgp / totalCombinedEgp) * 100).toFixed(0) : '0';

  const formatMoney = (value: number, currency: string = '£'): string => {
    if (isPrivacy) return `•••••• ${currency}`;
    if (value === 0) return `0.0 ${currency}`;
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted} ${currency}`;
  };

  // Build monthly cash trend for macro cards
  const cashTrend = useMemo(
    () => buildCashTrend(accounts, transactions, usdRate, 6),
    [accounts, transactions, usdRate]
  );

  const totalCashPoints = useMemo(() => cashTrend.map((p) => p.totalEgp), [cashTrend]);
  const bankCashPoints = useMemo(() => cashTrend.map((p) => p.bankCashEgp), [cashTrend]);
  const usdCashPoints = useMemo(() => cashTrend.map((p) => p.usdCash), [cashTrend]);
  const brokerageCashPoints = useMemo(() => cashTrend.map((p) => p.brokerageCashEgp), [cashTrend]);

  const macroCards: KPICardProps[] = [
    {
      id: 'total-liquid-cash',
      title: 'Total Liquid Cash',
      shortTitle: 'Total Cash',
      icon: Coins,
      iconBgClass: 'bg-brand-blue text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalCombinedEgp, '£'),
      badgeText: `${accounts.length} Accounts`,
      badgeClass: 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10',
      metaText: 'Bank + Brokerage combined',
      sparklinePoints: totalCashPoints.length > 1 ? totalCashPoints : undefined,
      sparklineTrend: 'up',
      href: '/wallet?tab=banks',
    },
    {
      id: 'bank-cash-egp',
      title: 'Bank Cash (EGP)',
      shortTitle: 'EGP Cash',
      icon: Landmark,
      iconBgClass: 'bg-profit-num text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalEgpLiquid, '£'),
      badgeText: `${egpPct}% of Total`,
      badgeClass: 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10',
      metaText: `${cashAccounts.filter((a) => a.currency === 'EGP').length} commercial accounts`,
      sparklinePoints: bankCashPoints.length > 1 ? bankCashPoints : undefined,
      sparklineTrend: 'up',
      href: '/wallet?tab=banks',
    },
    {
      id: 'foreign-reserves-usd',
      title: 'Foreign Reserves (USD)',
      shortTitle: 'USD Reserves',
      icon: Globe,
      iconBgClass: 'bg-accent-cyan text-white',
      value: isPrivacy
        ? '••••••••'
        : `$${totalUsdLiquid.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      badgeText: `${usdPct}% FX Hedge`,
      badgeClass: 'text-emerald-400 font-medium text-[9px] bg-emerald-500/10 border border-emerald-500/20',
      metaText: `≈ ${(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} £`,
      sparklinePoints: usdCashPoints.length > 1 ? usdCashPoints : undefined,
      sparklineTrend: 'neutral',
      href: '/wallet?tab=banks',
    },
    {
      id: 'brokerage-cash-powder',
      title: 'Brokerage Cash',
      shortTitle: 'Brokerage',
      icon: Wallet,
      iconBgClass: 'bg-accent-amber text-white',
      value: isPrivacy
        ? '••••••••'
        : brokerageAccounts.length > 0
        ? formatMoney(totalBrokerageCashEgp, '£')
        : '0.0 £',
      badgeText: brokerageAccounts.length > 0 ? `${brokeragePct}% of Total` : 'None',
      badgeClass: 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10',
      metaText: brokerageAccounts.length > 0 ? `${brokerageAccounts.length} trading accounts` : 'No brokerage',
      sparklinePoints: brokerageCashPoints.length > 1 ? brokerageCashPoints : undefined,
      sparklineTrend: brokerageAccounts.length > 0 ? 'up' : 'neutral',
      href: '/wallet?tab=banks',
    },
  ];

  // Sort accounts descending by total EGP value
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const valB = toEgp(Number(b.balance) || 0, b.currency, usdRate);
      const valA = toEgp(Number(a.balance) || 0, a.currency, usdRate);
      return valB - valA;
    });
  }, [accounts, usdRate]);

  // Pre-calculate sparklines and props for account KPI cards
  const accountCards: KPICardProps[] = useMemo(() => {
    return sortedAccounts.map((account, index) => {
      const nativeBalance = Number(account.balance) || 0;
      const egpBalance = toEgp(nativeBalance, account.currency, usdRate);
      const sharePct =
        totalCombinedEgp > 0 ? ((egpBalance / totalCombinedEgp) * 100).toFixed(1) : '0';
      const isBroker = isBrokerageAccount(account);
      const curr = account.currency || 'EGP';
      const isUsd = curr === 'USD';

      const typeLabel = account.accountType
        ? account.accountType
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : isBroker
        ? 'Brokerage'
        : 'Checking';

      const sparkline = calculateAccountSparkline(account, transactions);

      const formattedValue = isPrivacy
        ? '••••••••'
        : isUsd
        ? `$${nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
        : nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

      const unit = isPrivacy || isUsd ? undefined : '£';

      const metaText = isPrivacy
        ? '••••••'
        : isUsd
        ? `≈ ${egpBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} £ (${sharePct}%)`
        : `${sharePct}% of cash`;

      const badgeClass = isUsd
        ? 'text-emerald-400 font-medium text-[9px] bg-emerald-500/10 border border-emerald-500/20'
        : isBroker
        ? 'text-amber-400 font-medium text-[9px] bg-amber-500/10 border border-amber-500/20'
        : 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10';

      const isDesktopHidden = !showAllAccounts && index >= INITIAL_ACCOUNTS_LIMIT;

      return {
        id: `account-${account.id}`,
        title: account.accountName || account.bankName || `Account #${account.id}`,
        shortTitle: account.bankName || account.accountName || 'Account',
        icon: isBroker ? Wallet : Building2,
        logoUrl: account.bankLogoUrl,
        iconBgClass: isBroker
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-surface-active text-text-primary border border-border-subtle',
        iconColorClass: isBroker ? 'text-amber-400' : 'text-zinc-200',
        value: formattedValue,
        unit,
        badgeText: `${curr} • ${typeLabel}`,
        badgeClass,
        metaText,
        metaClass: 'text-zinc-500',
        sparklinePoints: sparkline.points,
        sparklineTrend: sparkline.trend,
        changeText: isPrivacy ? '•••' : sparkline.changeText,
        changeColorClass: sparkline.changeColorClass,
        href: '/wallet?tab=banks',
        className: `shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start cursor-pointer ${
          isDesktopHidden ? 'lg:hidden' : ''
        }`,
      };
    });
  }, [sortedAccounts, transactions, usdRate, totalCombinedEgp, isPrivacy, showAllAccounts]);

  return (
    <div className="w-full space-y-3 sm:space-y-4 select-none">
      {/* 1. Macro Liquidity Cards Rail (Sidescrolling on mobile, 4-col grid on desktop) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
        {macroCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 2. Individual Bank & Brokerage Accounts Section Header */}
      <div className="flex items-center justify-between pt-1 pb-0.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary font-sans">
            Connected Institutions &amp; Balances
          </span>
          <span className="badge-count">
            {sortedAccounts.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {sortedAccounts.length > INITIAL_ACCOUNTS_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllAccounts((prev) => !prev)}
              className="hidden lg:inline-flex text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer select-none"
            >
              {showAllAccounts
                ? `Show top ${INITIAL_ACCOUNTS_LIMIT}`
                : `Show all (${sortedAccounts.length})`}
            </button>
          )}
          <Link
            href="/wallet?tab=banks"
            className="text-[11px] font-semibold text-brand-blue hover:text-brand-blue-light inline-flex items-center gap-0.5 transition-colors"
          >
            <span>Manage in Wallet</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 3. Individual Account Cards Rail / Grid (Sidescrolling on phone, 4-col grid on desktop) */}
      {sortedAccounts.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-border-subtle bg-surface-raised/40 text-center text-xs text-text-muted font-sans">
          No bank or brokerage accounts connected yet.{' '}
          <Link href="/wallet?tab=banks" className="text-brand-blue hover:underline ml-1">
            Connect an account
          </Link>
        </div>
      ) : (
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
          {accountCards.map((card) => (
            <KPICard key={card.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
