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
  buildAccountYtdBalanceTrend,
  buildYtdCashTrend,
} from '@/lib/portfolio-finance';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import { useTranslation } from '@/lib/i18n';
import AccountBalanceHistoryDrawer from '@/components/platform/wallet/AccountBalanceHistoryDrawer';
import KPICard, { type KPICardProps } from './KPICard';

interface BanksKPIRailProps {
  accounts?: BankAccount[];
  transactions?: BankTransaction[];
  usdRate?: number;
  onAccountsUpdated?: () => void | Promise<void>;
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
  const rawPoints = buildAccountYtdBalanceTrend(account, transactions, 8);
  const points = rawPoints.length > 1 ? rawPoints : [currentBalance, currentBalance];
  const startBalance = points[0] ?? currentBalance;
  const endingBalance = points[points.length - 1] ?? currentBalance;
  const delta = endingBalance - startBalance;
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
    points,
    trend,
    changeText,
    changeColorClass,
  };
}

function getSparklineTrend(points: number[]): 'up' | 'down' | 'neutral' {
  if (points.length < 2) return 'neutral';
  const delta = points[points.length - 1] - points[0];
  return Math.abs(delta) < 0.01 ? 'neutral' : delta > 0 ? 'up' : 'down';
}

export default function BanksKPIRail({
  accounts = [],
  transactions = [],
  usdRate = 50.20,
  onAccountsUpdated,
}: BanksKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();
  const { locale } = useTranslation();
  const currencySymbol = locale === 'ar' ? 'ج.م' : '£';
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const INITIAL_ACCOUNTS_LIMIT = 4;

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const realAccounts = useMemo(() => accounts.filter((a) => !isVirtualAccount(a)), [accounts]);
  const cashAccounts = useMemo(() => realAccounts.filter((a) => !isBrokerageAccount(a)), [realAccounts]);
  const brokerageAccounts = useMemo(() => realAccounts.filter(isBrokerageAccount), [realAccounts]);

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
      realAccounts.reduce(
        (sum, a) => sum + toEgp(Number(a.balance) || 0, a.currency, usdRate),
        0
      ),
    [realAccounts, usdRate]
  );

  const egpPct = totalCombinedEgp > 0 ? ((totalEgpLiquid / totalCombinedEgp) * 100).toFixed(0) : '0';
  const usdPct =
    totalCombinedEgp > 0 ? (((totalUsdLiquid * usdRate) / totalCombinedEgp) * 100).toFixed(0) : '0';
  const brokeragePct =
    totalCombinedEgp > 0 ? ((totalBrokerageCashEgp / totalCombinedEgp) * 100).toFixed(0) : '0';

  const formatMoney = (value: number, curr?: string): string => {
    const c = curr ?? currencySymbol;
    if (isPrivacy) return `•••••• ${c}`;
    if (value === 0) return `0.0 ${c}`;
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted} ${c}`;
  };

  // Build month-end cash balances from January through the current month.
  const cashTrend = useMemo(
    () => buildYtdCashTrend(accounts, transactions, usdRate),
    [accounts, transactions, usdRate]
  );

  const totalCashPoints = useMemo(() => cashTrend.map((p) => p.totalEgp), [cashTrend]);
  const bankCashPoints = useMemo(() => cashTrend.map((p) => p.bankCashEgp), [cashTrend]);
  const usdCashPoints = useMemo(() => cashTrend.map((p) => p.usdCash), [cashTrend]);
  const brokerageCashPoints = useMemo(() => cashTrend.map((p) => p.brokerageCashEgp), [cashTrend]);

  const macroCards: KPICardProps[] = [
    {
      id: 'total-liquid-cash',
      title: locale === 'ar' ? 'إجمالي السيولة النقدية' : 'Total Liquid Cash',
      shortTitle: locale === 'ar' ? 'إجمالي النقد' : 'Total Cash',
      icon: Coins,
      iconBgClass: 'bg-brand-blue text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalCombinedEgp),
      badgeText: locale === 'ar' ? `${accounts.length} حسابات` : `${accounts.length} Accounts`,
      badgeClass: 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10',
      metaText: locale === 'ar' ? 'البنوك والوساطة مجتمعة' : 'Bank + Brokerage combined',
      sparklinePoints: totalCashPoints.length > 1 ? totalCashPoints : undefined,
      sparklineTrend: getSparklineTrend(totalCashPoints),
      href: '/wallet?tab=banks',
    },
    {
      id: 'bank-cash-egp',
      title: locale === 'ar' ? 'النقد البنكي (جنيه)' : 'Bank Cash (EGP)',
      shortTitle: locale === 'ar' ? 'نقد بالجنيه' : 'EGP Cash',
      icon: Landmark,
      iconBgClass: 'bg-profit-num text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalEgpLiquid),
      badgeText: locale === 'ar' ? `${egpPct}% من الإجمالي` : `${egpPct}% of Total`,
      badgeClass: 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10',
      metaText:
        locale === 'ar'
          ? `${cashAccounts.filter((a) => a.currency === 'EGP').length} حسابات تجارية`
          : `${cashAccounts.filter((a) => a.currency === 'EGP').length} commercial accounts`,
      sparklinePoints: bankCashPoints.length > 1 ? bankCashPoints : undefined,
      sparklineTrend: getSparklineTrend(bankCashPoints),
      href: '/wallet?tab=banks',
    },
    {
      id: 'foreign-reserves-usd',
      title: locale === 'ar' ? 'احتياطي العملات (دولار)' : 'Foreign Reserves (USD)',
      shortTitle: locale === 'ar' ? 'احتياطي الدولار' : 'USD Reserves',
      icon: Globe,
      iconBgClass: 'bg-accent-cyan text-white',
      value: isPrivacy
        ? '••••••••'
        : `$${totalUsdLiquid.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      badgeText: locale === 'ar' ? `${usdPct}% تحوط بالعملة` : `${usdPct}% FX Hedge`,
      badgeClass: 'text-emerald-400 font-medium text-[9px] bg-emerald-500/10 border border-emerald-500/20',
      metaText:
        locale === 'ar'
          ? `≈ ${(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} ج.م`
          : `≈ ${(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} £`,
      sparklinePoints: usdCashPoints.length > 1 ? usdCashPoints : undefined,
      sparklineTrend: getSparklineTrend(usdCashPoints),
      href: '/wallet?tab=banks',
    },
    {
      id: 'brokerage-cash-powder',
      title: locale === 'ar' ? 'سيولة الوساطة النقدية' : 'Brokerage Cash',
      shortTitle: locale === 'ar' ? 'الوساطة' : 'Brokerage',
      icon: Wallet,
      iconBgClass: 'bg-accent-amber text-white',
      value: isPrivacy
        ? '••••••••'
        : brokerageAccounts.length > 0
        ? formatMoney(totalBrokerageCashEgp)
        : `0.0 ${currencySymbol}`,
      badgeText:
        brokerageAccounts.length > 0
          ? (locale === 'ar' ? `${brokeragePct}% من الإجمالي` : `${brokeragePct}% of Total`)
          : (locale === 'ar' ? 'لا يوجد' : 'None'),
      badgeClass: 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10',
      metaText:
        brokerageAccounts.length > 0
          ? (locale === 'ar' ? `${brokerageAccounts.length} حسابات تداول` : `${brokerageAccounts.length} trading accounts`)
          : (locale === 'ar' ? 'لا توجد حسابات' : 'No brokerage'),
      sparklinePoints: brokerageCashPoints.length > 1 ? brokerageCashPoints : undefined,
      sparklineTrend: brokerageAccounts.length > 0 ? getSparklineTrend(brokerageCashPoints) : 'neutral',
      href: '/wallet?tab=banks',
    },
  ];

  // Sort accounts descending by total EGP value
  const sortedAccounts = useMemo(() => {
    return [...realAccounts].sort((a, b) => {
      const valB = toEgp(Number(b.balance) || 0, b.currency, usdRate);
      const valA = toEgp(Number(a.balance) || 0, a.currency, usdRate);
      return valB - valA;
    });
  }, [realAccounts, usdRate]);

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
        ? (locale === 'ar'
            ? account.accountType.toUpperCase().includes('BROKER') || account.accountType.toUpperCase().includes('TRAD')
              ? 'وساطة'
              : account.accountType.toUpperCase().includes('SAVING')
              ? 'توفير'
              : account.accountType.toUpperCase().includes('CD') || account.accountType.toUpperCase().includes('DEPOSIT')
              ? 'شهادة ادخار'
              : 'جاري'
            : account.accountType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()))
        : isBroker
        ? (locale === 'ar' ? 'وساطة' : 'Brokerage')
        : (locale === 'ar' ? 'جاري' : 'Checking');

      const sparkline = calculateAccountSparkline(account, transactions);

      const formattedValue = isPrivacy
        ? '••••••••'
        : isUsd
        ? `$${nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
        : nativeBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

      const unit = isPrivacy || isUsd ? undefined : currencySymbol;

      const metaText = isPrivacy
        ? '••••••'
        : isUsd
        ? (locale === 'ar'
            ? `≈ ${egpBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} ج.م (${sharePct}%)`
            : `≈ ${egpBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} £ (${sharePct}%)`)
        : (locale === 'ar' ? `${sharePct}% من النقد` : `${sharePct}% of cash`);

      const badgeClass = isUsd
        ? 'text-emerald-400 font-medium text-[9px] bg-emerald-500/10 border border-emerald-500/20'
        : isBroker
        ? 'text-amber-400 font-medium text-[9px] bg-amber-500/10 border border-amber-500/20'
        : 'text-zinc-400 font-medium text-[9px] bg-white/[0.04] border border-white/10';

      const isDesktopHidden = !showAllAccounts && index >= INITIAL_ACCOUNTS_LIMIT;

      return {
        id: `account-${account.id}`,
        title: account.accountName || account.bankName || (locale === 'ar' ? `حساب #${account.id}` : `Account #${account.id}`),
        shortTitle: account.bankName || account.accountName || (locale === 'ar' ? 'حساب' : 'Account'),
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
        changeText: isPrivacy ? '•••' : (locale === 'ar' && sparkline.changeText === 'Steady' ? 'مستقر' : sparkline.changeText),
        changeColorClass: sparkline.changeColorClass,
        onClick: () => setSelectedAccountId(account.id),
        className: `shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start cursor-pointer ${
          isDesktopHidden ? 'lg:hidden' : ''
        }`,
      };
    });
  }, [sortedAccounts, transactions, usdRate, totalCombinedEgp, isPrivacy, showAllAccounts, locale, currencySymbol]);

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
            {locale === 'ar' ? 'المؤسسات والأرصدة المتصلة' : 'Connected Institutions & Balances'}
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
                ? (locale === 'ar' ? `عرض أعلى ${INITIAL_ACCOUNTS_LIMIT}` : `Show top ${INITIAL_ACCOUNTS_LIMIT}`)
                : (locale === 'ar' ? `عرض الكل (${sortedAccounts.length})` : `Show all (${sortedAccounts.length})`)}
            </button>
          )}
          <Link
            href="/wallet?tab=banks"
            className="text-[11px] font-semibold text-brand-blue hover:text-brand-blue-light inline-flex items-center gap-0.5 transition-colors"
          >
            <span>{locale === 'ar' ? 'الإدارة في المحفظة' : 'Manage in Wallet'}</span>
            <ChevronRight className={`w-3 h-3 ${locale === 'ar' ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>

      {/* 3. Individual Account Cards Rail / Grid (Sidescrolling on phone, 4-col grid on desktop) */}
      {sortedAccounts.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-border-subtle bg-surface-raised/40 text-center text-xs text-text-muted font-sans">
          {locale === 'ar'
            ? 'لم يتم ربط أي حسابات بنكية أو وساطة حتى الآن.'
            : 'No bank or brokerage accounts connected yet.'}{' '}
          <Link href="/wallet?tab=banks" className="text-brand-blue hover:underline ml-1">
            {locale === 'ar' ? 'ربط حساب' : 'Connect an account'}
          </Link>
        </div>
      ) : (
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
          {accountCards.map((card) => (
            <KPICard key={card.id} {...card} />
          ))}
        </div>
      )}
      <AccountBalanceHistoryDrawer
        account={selectedAccount}
        isOpen={selectedAccount !== null}
        onClose={() => setSelectedAccountId(null)}
        onSaved={onAccountsUpdated}
      />
    </div>
  );
}
