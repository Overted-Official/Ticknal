'use client';

import React, { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  TrendingUp,
  Landmark,
  Wallet,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankTransaction, type MonthlyCashflowSummary } from '@/types/bank';
import { toEgp } from '@/lib/portfolio-finance';
import { useTranslation } from '@/lib/i18n';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import { type ClosedTradeItem, type LedgerPeriod, type TransactionsTimeframe } from './types';

interface TransactionsKPIRailProps {
  transactions?: BankTransaction[];
  closedTrades?: ClosedTradeItem[];
  usdRate?: number;
  timeframe?: TransactionsTimeframe | LedgerPeriod;
  overviewView?: 'all' | 'banking' | 'investments';
  totalLiquidEgp?: number;
  latestSummary?: MonthlyCashflowSummary | null;
  accountsCount?: number;
}

export default function TransactionsKPIRail({
  transactions = [],
  closedTrades = [],
  usdRate = 50.20,
  overviewView = 'all',
  totalLiquidEgp,
  latestSummary,
  accountsCount,
}: TransactionsKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const currencySymbol = isAr ? 'ج.م' : '£';

  const formatNumber = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) return '••••••';
    if (value === 0) return '0.0';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted}`;
  };

  const metrics = useMemo(() => {
    let totalInflows = 0;
    let inflowCount = 0;
    let totalOutflows = 0;
    let outflowCount = 0;

    // Monthly buckets for sparklines
    const monthlyInflows = new Map<string, number>();
    const monthlyOutflows = new Map<string, number>();

    for (const t of transactions) {
      const amtEgp = toEgp(Math.abs(Number(t.amount) || 0), t.currency, usdRate);
      const ym = String(t.transactionDate || '').slice(0, 7);

      if (['INCOME', 'DEPOSIT', 'INTEREST', 'BROKER_WITHDRAWAL'].includes(t.type)) {
        totalInflows += amtEgp;
        inflowCount++;
        monthlyInflows.set(ym, (monthlyInflows.get(ym) ?? 0) + amtEgp);
      } else if (['EXPENSE', 'WITHDRAWAL', 'BROKER_INJECTION'].includes(t.type)) {
        totalOutflows += amtEgp;
        outflowCount++;
        monthlyOutflows.set(ym, (monthlyOutflows.get(ym) ?? 0) + amtEgp);
      }
    }

    const netCashflow = totalInflows - totalOutflows;
    const savingsRate = totalInflows > 0 ? (netCashflow / totalInflows) * 100 : 0;

    // Trades metrics
    let totalRealizedPnl = 0;
    let winningTrades = 0;
    for (const trade of closedTrades) {
      totalRealizedPnl += trade.profitLoss;
      if (trade.profitLoss > 0) winningTrades++;
    }
    const tradeWinRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : null;

    // Sparklines
    const sortedMonths = Array.from(new Set([...monthlyInflows.keys(), ...monthlyOutflows.keys()])).sort();
    const inflowSpark = sortedMonths.map((ym) => monthlyInflows.get(ym) ?? 0);
    const outflowSpark = sortedMonths.map((ym) => monthlyOutflows.get(ym) ?? 0);
    const netFlowSpark = sortedMonths.map((ym) => (monthlyInflows.get(ym) ?? 0) - (monthlyOutflows.get(ym) ?? 0));

    let runningPnl = 0;
    const tradeSpark = closedTrades.map((t) => {
      runningPnl += t.profitLoss;
      return runningPnl;
    });

    return {
      totalInflows,
      inflowCount,
      totalOutflows,
      outflowCount,
      netCashflow,
      savingsRate,
      totalRealizedPnl,
      closedTradeCount: closedTrades.length,
      tradeWinRate,
      inflowSpark: inflowSpark.length > 1 ? inflowSpark : [10, 15, 12, 18, 22, 28],
      outflowSpark: outflowSpark.length > 1 ? outflowSpark : [18, 14, 16, 20, 15, 12],
      netFlowSpark: netFlowSpark.length > 1 ? netFlowSpark : [5, 12, 8, 14, 19, 24],
      tradeSpark: tradeSpark.length > 1 ? tradeSpark : [0, 50, 40, 90, 120, 150],
    };
  }, [transactions, closedTrades, usdRate]);

  // Dynamic titles and labels based on overviewView
  const inflowsConfig = {
    title:
      overviewView === 'banking'
        ? isAr
          ? 'التدفقات التشغيلية'
          : 'Operating Inflows'
        : overviewView === 'investments'
        ? isAr
          ? 'رأس المال المودع'
          : 'Capital Injected'
        : isAr
        ? 'إجمالي التدفقات الواردة'
        : 'Total Inflows',
    shortTitle:
      overviewView === 'investments'
        ? isAr
          ? 'المودع'
          : 'Injected'
        : isAr
        ? 'الوارد'
        : 'Inflows',
    badgeText:
      overviewView === 'investments'
        ? isAr
          ? `${metrics.inflowCount} إيداع`
          : `${metrics.inflowCount} additions`
        : isAr
        ? `${metrics.inflowCount} إيداع`
        : `${metrics.inflowCount} deposits`,
    metaText:
      overviewView === 'banking'
        ? isAr
          ? 'الراتب والدخل'
          : 'salary & income'
        : overviewView === 'investments'
        ? isAr
          ? 'إيداعات التداول'
          : 'brokerage deposits'
        : isAr
        ? 'مقبوضات'
        : 'received',
  };

  const outflowsConfig = {
    title:
      overviewView === 'banking'
        ? isAr
          ? 'مصاريف المعيشة'
          : 'Living Expenses'
        : overviewView === 'investments'
        ? isAr
          ? 'رأس المال المسحوب'
          : 'Capital Withdrawn'
        : isAr
        ? 'إجمالي التدفقات الخارجة'
        : 'Total Outflows',
    shortTitle:
      overviewView === 'banking'
        ? isAr
          ? 'المصاريف'
          : 'Living Out'
        : overviewView === 'investments'
        ? isAr
          ? 'المسحوب'
          : 'Withdrawn'
        : isAr
        ? 'الخارج'
        : 'Outflows',
    badgeText:
      overviewView === 'investments'
        ? isAr
          ? `${metrics.outflowCount} سحب`
          : `${metrics.outflowCount} redemptions`
        : isAr
        ? `${metrics.outflowCount} مصروف`
        : `${metrics.outflowCount} expenses`,
    metaText:
      overviewView === 'banking'
        ? isAr
          ? 'الفواتير والمعيشة'
          : 'bills & lifestyle'
        : overviewView === 'investments'
        ? isAr
          ? 'رأس مال مسترجع'
          : 'returned capital'
        : isAr
        ? 'مدفوعات'
        : 'spent',
  };

  const netFlowConfig = {
    title:
      overviewView === 'banking'
        ? isAr
          ? 'صافي فائض المعيشة'
          : 'Net Living Surplus'
        : overviewView === 'investments'
        ? isAr
          ? 'صافي تدفق رأس المال'
          : 'Net Capital Flow'
        : isAr
        ? 'صافي التدفق النقدي'
        : 'Net Cash Flow',
    shortTitle:
      overviewView === 'banking'
        ? isAr
          ? 'صافي الفائض'
          : 'Net Surplus'
        : overviewView === 'investments'
        ? isAr
          ? 'صافي المودع'
          : 'Net Injected'
        : isAr
        ? 'صافي التدفق'
        : 'Net Flow',
    metaText:
      overviewView === 'banking'
        ? isAr
          ? 'نقد محتجز'
          : 'retained cash'
        : overviewView === 'investments'
        ? isAr
          ? 'صافي مخصص'
          : 'net allocated'
        : isAr
        ? 'فائض نقد'
        : 'net surplus',
  };

  const hasLiquidCashKpi = typeof totalLiquidEgp === 'number';

  const cards: KPICardProps[] = hasLiquidCashKpi
    ? [
        {
          id: 'kpi-total-liquid',
          targetId: 'section-accounts-rail',
          title: isAr ? 'إجمالي السيولة النقدية' : 'Total Liquid Cash',
          shortTitle: isAr ? 'السيولة' : 'Liquid Cash',
          icon: Landmark,
          iconBgClass: 'bg-brand-blue text-white',
          iconColorClass: 'text-white',
          value: formatNumber(totalLiquidEgp),
          unit: currencySymbol,
          badgeText: accountsCount
            ? isAr
              ? `${accountsCount} حسابات`
              : `${accountsCount} accounts`
            : isAr
            ? 'سيولة نشطة'
            : 'Active cash',
          badgeClass: 'text-brand-blue font-medium text-[9px] bg-brand-blue/10 px-1.5 py-0.5 rounded',
          changeText: isAr ? 'أرصدة مجمعة' : 'Consolidated',
          changeColorClass: 'text-text-muted',
          metaText: isAr ? 'بنوك ومحافظ' : 'banks & wallets',
          sparklinePoints: metrics.inflowSpark,
          sparklineTrend: 'up',
        },
        {
          id: 'kpi-monthly-burn',
          targetId: 'section-closeout-archive',
          title: isAr ? 'المصروف الشهري المحسوب' : 'Monthly Calculated Burn',
          shortTitle: isAr ? 'المصروف' : 'Burn',
          icon: ArrowUpRight,
          iconBgClass: 'bg-loss-chart text-white',
          iconColorClass: 'text-white',
          value: latestSummary?.calculatedSpendEgp != null
            ? formatNumber(Number(latestSummary.calculatedSpendEgp))
            : '—',
          unit: latestSummary?.calculatedSpendEgp != null ? currencySymbol : '',
          badgeText: latestSummary?.yearMonth
            ? isAr
              ? `شهر ${latestSummary.yearMonth}`
              : latestSummary.yearMonth
            : isAr
            ? 'في انتظار المراجعة'
            : 'Check-In Ready',
          badgeClass: latestSummary
            ? 'text-loss-num font-medium text-[9px] bg-loss-chart/10 px-1.5 py-0.5 rounded'
            : 'text-brand-blue font-medium text-[9px] bg-brand-blue/10 px-1.5 py-0.5 rounded',
          changeText: latestSummary
            ? isAr
              ? 'مراجعة شهرية'
              : 'Monthly check-in'
            : isAr
            ? 'تحديث الأرصدة'
            : 'Update Balances',
          changeColorClass: latestSummary ? 'text-loss-num' : 'text-brand-blue',
          metaText: latestSummary
            ? isAr
              ? 'صافي الحرق'
              : 'net burn'
            : isAr
            ? 'حدّث الأرصدة لحساب المصروف'
            : 'Update balances to derive spend',
          sparklinePoints: metrics.outflowSpark,
          sparklineTrend: 'down',
        },
        {
          id: 'kpi-savings-rate-burn',
          targetId: 'section-closeout-archive',
          title: isAr ? 'معدل الادخار' : 'Savings Rate',
          shortTitle: isAr ? 'معدل الادخار' : 'Savings Rate',
          icon: Scale,
          iconBgClass:
            (Number(latestSummary?.savingsRatePct) || 0) >= 0
              ? 'bg-profit-num text-white'
              : 'bg-loss-chart text-white',
          iconColorClass: 'text-white',
          value: isPrivacy
            ? '••••••'
            : latestSummary?.savingsRatePct != null
            ? `${Number(latestSummary.savingsRatePct).toFixed(1)}`
            : '—',
          unit: latestSummary?.savingsRatePct != null ? '%' : '',
          badgeText: latestSummary?.totalIncome != null
            ? isAr
              ? `دخل ${formatNumber(Number(latestSummary.totalIncome))} ${currencySymbol}`
              : `inflow ${formatNumber(Number(latestSummary.totalIncome))} ${currencySymbol}`
            : isAr
            ? 'غير محسوب بعد'
            : 'Pending Check-In',
          badgeClass:
            latestSummary != null
              ? (Number(latestSummary.savingsRatePct) || 0) >= 0
                ? 'text-profit-num font-medium text-[9px] bg-profit-num/10 px-1.5 py-0.5 rounded'
                : 'text-loss-num font-medium text-[9px] bg-loss-chart/10 px-1.5 py-0.5 rounded'
              : 'text-text-muted font-medium text-[9px] bg-white/5 px-1.5 py-0.5 rounded',
          changeText: latestSummary?.savingsRatePct != null
            ? `${Number(latestSummary.savingsRatePct) >= 0 ? '+' : ''}${Number(latestSummary.savingsRatePct).toFixed(1)}%`
            : '—',
          changeColorClass:
            (Number(latestSummary?.savingsRatePct) || 0) >= 0
              ? 'text-profit-num'
              : 'text-loss-num',
          metaText: latestSummary
            ? isAr
              ? 'محتجز من الدخل'
              : 'retained from inflow'
            : isAr
            ? 'يُحسب بعد إدخال الدخل'
            : 'computed from income',
          sparklinePoints: metrics.netFlowSpark,
          sparklineTrend:
            (Number(latestSummary?.savingsRatePct) || 0) >= 0
              ? 'up'
              : 'down',
        },
        overviewView === 'investments'
          ? {
              id: 'kpi-capital-traded',
              targetId: 'section-activity-ledger',
              title: isAr ? 'أرباح/خسائر التداول المحققة' : 'Trading Realized P/L',
              shortTitle: isAr ? 'أرباح التداول' : 'Trading P/L',
              icon: TrendingUp,
              iconBgClass:
                metrics.totalRealizedPnl >= 0 ? 'bg-brand-blue text-white' : 'bg-loss-chart text-white',
              iconColorClass: 'text-white',
              value: formatNumber(metrics.totalRealizedPnl, true),
              unit: currencySymbol,
              badgeText:
                metrics.tradeWinRate !== null
                  ? isAr
                    ? `${metrics.tradeWinRate.toFixed(0)}% صفقات رابحة`
                    : `${metrics.tradeWinRate.toFixed(0)}% win`
                  : isAr
                  ? `${metrics.closedTradeCount} صفقة`
                  : `${metrics.closedTradeCount} trades`,
              badgeClass: 'text-plt-muted font-medium text-[9px] bg-plt-hover px-1.5 py-0.5 rounded',
              changeText: isAr ? `${metrics.closedTradeCount} مغلقة` : `${metrics.closedTradeCount} closed`,
              changeColorClass: 'text-plt-muted',
              metaText: isAr ? 'محقق' : 'realized',
              sparklinePoints: metrics.tradeSpark,
              sparklineTrend: metrics.totalRealizedPnl >= 0 ? 'up' : 'down',
            }
          : {
              id: 'kpi-net-cashflow',
              targetId: 'section-activity-ledger',
              title: netFlowConfig.title,
              shortTitle: netFlowConfig.shortTitle,
              icon: Scale,
              iconBgClass: metrics.netCashflow >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
              iconColorClass: 'text-white',
              value: formatNumber(metrics.netCashflow, true),
              unit: currencySymbol,
              badgeText:
                metrics.savingsRate > 0
                  ? isAr
                    ? `ادخار ${metrics.savingsRate.toFixed(1)}%`
                    : `${metrics.savingsRate.toFixed(1)}% saved`
                  : isAr
                  ? 'عجز'
                  : 'Deficit',
              badgeClass:
                metrics.netCashflow >= 0
                  ? 'text-profit-num font-medium text-[9px] bg-profit-num/10 px-1.5 py-0.5 rounded'
                  : 'text-loss-num font-medium text-[9px] bg-loss-chart/10 px-1.5 py-0.5 rounded',
              changeText: `${metrics.savingsRate >= 0 ? '+' : ''}${metrics.savingsRate.toFixed(1)}%`,
              changeColorClass: metrics.netCashflow >= 0 ? 'text-profit-num' : 'text-loss-num',
              metaText: netFlowConfig.metaText,
              sparklinePoints: metrics.netFlowSpark,
              sparklineTrend: metrics.netCashflow >= 0 ? 'up' : 'down',
            },
      ]
    : [
        {
          id: 'kpi-total-inflows',
          targetId: 'section-activity-ledger',
          title: inflowsConfig.title,
          shortTitle: inflowsConfig.shortTitle,
          icon: ArrowDownLeft,
          iconBgClass: 'bg-profit-num text-white',
          iconColorClass: 'text-white',
          value: formatNumber(metrics.totalInflows),
          unit: currencySymbol,
          badgeText: inflowsConfig.badgeText,
          badgeClass: 'text-profit-num font-medium text-[9px] bg-profit-num/10 px-1.5 py-0.5 rounded',
          changeText: isAr ? `+${metrics.inflowCount} حركة` : `+${metrics.inflowCount} in`,
          changeColorClass: 'text-profit-num',
          metaText: inflowsConfig.metaText,
          sparklinePoints: metrics.inflowSpark,
          sparklineTrend: 'up',
        },
        {
          id: 'kpi-total-outflows',
      targetId: 'section-activity-ledger',
      title: outflowsConfig.title,
      shortTitle: outflowsConfig.shortTitle,
      icon: ArrowUpRight,
      iconBgClass: 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(metrics.totalOutflows),
      unit: currencySymbol,
      badgeText: outflowsConfig.badgeText,
      badgeClass: 'text-loss-num font-medium text-[9px] bg-loss-chart/10 px-1.5 py-0.5 rounded',
      changeText: isAr ? `-${metrics.outflowCount} حركة` : `-${metrics.outflowCount} out`,
      changeColorClass: 'text-loss-num',
      metaText: outflowsConfig.metaText,
      sparklinePoints: metrics.outflowSpark,
      sparklineTrend: 'down',
    },
    {
      id: 'kpi-net-cashflow',
      targetId: 'section-activity-ledger',
      title: netFlowConfig.title,
      shortTitle: netFlowConfig.shortTitle,
      icon: Scale,
      iconBgClass: metrics.netCashflow >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(metrics.netCashflow, true),
      unit: currencySymbol,
      badgeText:
        metrics.savingsRate > 0
          ? isAr
            ? `ادخار ${metrics.savingsRate.toFixed(1)}%`
            : `${metrics.savingsRate.toFixed(1)}% saved`
          : isAr
          ? 'عجز'
          : 'Deficit',
      badgeClass: metrics.netCashflow >= 0
        ? 'text-profit-num font-medium text-[9px] bg-profit-num/10 px-1.5 py-0.5 rounded'
        : 'text-loss-num font-medium text-[9px] bg-loss-chart/10 px-1.5 py-0.5 rounded',
      changeText: `${metrics.savingsRate >= 0 ? '+' : ''}${metrics.savingsRate.toFixed(1)}%`,
      changeColorClass: metrics.netCashflow >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: netFlowConfig.metaText,
      sparklinePoints: metrics.netFlowSpark,
      sparklineTrend: metrics.netCashflow >= 0 ? 'up' : 'down',
    },
    overviewView === 'banking'
      ? {
          id: 'kpi-savings-rate',
          targetId: 'section-activity-ledger',
          title: isAr ? 'معدل الادخار' : 'Savings Rate',
          shortTitle: isAr ? 'معدل الادخار' : 'Savings Rate',
          icon: Scale,
          iconBgClass: metrics.savingsRate >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
          iconColorClass: 'text-white',
          value: isPrivacy ? '••••••' : `${metrics.savingsRate.toFixed(1)}`,
          unit: '%',
          badgeText:
            metrics.savingsRate > 0
              ? `${formatNumber(metrics.netCashflow, true)} ${currencySymbol}`
              : isAr
              ? 'عجز'
              : 'Deficit',
          badgeClass: metrics.savingsRate >= 0
            ? 'text-profit-num font-medium text-[9px] bg-profit-num/10 px-1.5 py-0.5 rounded'
            : 'text-loss-num font-medium text-[9px] bg-loss-chart/10 px-1.5 py-0.5 rounded',
          changeText: `${metrics.savingsRate >= 0 ? '+' : ''}${metrics.savingsRate.toFixed(1)}%`,
          changeColorClass: metrics.savingsRate >= 0 ? 'text-profit-num' : 'text-loss-num',
          metaText: isAr ? 'محتجز / الدخل' : 'retained / income',
          sparklinePoints: metrics.netFlowSpark,
          sparklineTrend: metrics.savingsRate >= 0 ? 'up' : 'down',
        }
      : {
          id: 'kpi-capital-traded',
          targetId: 'section-activity-ledger',
          title: isAr ? 'أرباح/خسائر التداول المحققة' : 'Trading Realized P/L',
          shortTitle: isAr ? 'أرباح التداول' : 'Trading P/L',
          icon: TrendingUp,
          iconBgClass: metrics.totalRealizedPnl >= 0 ? 'bg-brand-blue text-white' : 'bg-loss-chart text-white',
          iconColorClass: 'text-white',
          value: formatNumber(metrics.totalRealizedPnl, true),
          unit: currencySymbol,
          badgeText:
            metrics.tradeWinRate !== null
              ? isAr
                ? `${metrics.tradeWinRate.toFixed(0)}% صفقات رابحة`
                : `${metrics.tradeWinRate.toFixed(0)}% win`
              : isAr
              ? `${metrics.closedTradeCount} صفقة`
              : `${metrics.closedTradeCount} trades`,
          badgeClass: 'text-plt-muted font-medium text-[9px] bg-plt-hover px-1.5 py-0.5 rounded',
          changeText: isAr ? `${metrics.closedTradeCount} مغلقة` : `${metrics.closedTradeCount} closed`,
          changeColorClass: 'text-plt-muted',
          metaText: isAr ? 'محقق' : 'realized',
          sparklinePoints: metrics.tradeSpark,
          sparklineTrend: metrics.totalRealizedPnl >= 0 ? 'up' : 'down',
        },
  ];

  return (
    <div className="w-full select-none">
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
        {cards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
          />
        ))}
      </div>
    </div>
  );
}
