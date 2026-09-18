'use client';

import React from 'react';
import { type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type CashTrendPoint, isBrokerageAccount, toEgp } from '@/lib/portfolio-finance';

interface BankSummaryKPIsProps {
  accounts: BankAccount[];
  usdRate: number;
  cashTrend?: CashTrendPoint[];
  onScrollToSection?: () => void;
}

export default function BankSummaryKPIs({
  accounts,
  usdRate,
  onScrollToSection,
}: BankSummaryKPIsProps) {
  const { isPrivacy } = usePrivacyMode();
  const cashAccounts = accounts.filter((account) => !isBrokerageAccount(account));
  const brokerageAccounts = accounts.filter(isBrokerageAccount);

  const totalEgpLiquid = cashAccounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquid = cashAccounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalBrokerageCashEgp = brokerageAccounts.reduce(
    (sum, a) => sum + toEgp(Number(a.balance) || 0, a.currency, usdRate),
    0,
  );
  const totalCombinedEgp = accounts.reduce(
    (sum, account) => sum + toEgp(Number(account.balance) || 0, account.currency, usdRate),
    0,
  );
  const egpCount = cashAccounts.filter((a) => a.currency === 'EGP').length;
  const usdCount = cashAccounts.filter((a) => a.currency === 'USD').length;
  const brokerageCount = brokerageAccounts.length;

  const egpPct = totalCombinedEgp > 0 ? ((totalEgpLiquid / totalCombinedEgp) * 100).toFixed(0) : '0';
  const usdPct = totalCombinedEgp > 0 ? (((totalUsdLiquid * usdRate) / totalCombinedEgp) * 100).toFixed(0) : '0';
  const brokeragePct = totalCombinedEgp > 0 ? ((totalBrokerageCashEgp / totalCombinedEgp) * 100).toFixed(0) : '0';

  const formatMoney = (value: number, currency: string = '£'): string => {
    if (isPrivacy) {
      if (value === 0) return `•••••• ${currency}`;
      return `•••••• ${currency}`;
    }
    if (value === 0) return `0.0 ${currency}`;
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted} ${currency}`;
  };

  const cards = [
    {
      id: 'total-cash',
      title: 'Total Liquid Cash',
      value: isPrivacy ? '••••••••' : formatMoney(totalCombinedEgp, '£'),
      badgeText: `${accounts.length} Account${accounts.length !== 1 ? 's' : ''}`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: 'Bank + Brokerage',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'bank-cash',
      title: 'Bank Cash (EGP)',
      value: isPrivacy ? '••••••••' : formatMoney(totalEgpLiquid, '£'),
      badgeText: `${egpPct}% of Total`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `${egpCount} account${egpCount !== 1 ? 's' : ''}`,
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'brokerage-cash',
      title: 'Brokerage Cash',
      value: isPrivacy
        ? '••••••••'
        : brokerageCount > 0
        ? formatMoney(totalBrokerageCashEgp, '£')
        : '0.0 £',
      badgeText: brokerageCount > 0 ? `${brokeragePct}% of Total` : 'None',
      badgeClass:
        brokerageCount > 0
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: brokerageCount > 0 ? `${brokerageCount} trading acc` : 'No brokerage',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'usd-cash',
      title: 'Foreign Reserves',
      value: isPrivacy ? '••••••••' : `$${totalUsdLiquid.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      badgeText: `${usdPct}% FX Hedge`,
      badgeClass:
        totalUsdLiquid > 0
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: `≈ ${(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} £`,
      metaClass: 'text-cold-gray-450',
    },
  ];

  return (
    <div className="w-full select-none">
      {/* Strict 2x2 Grid on Mobile, 4-cards row on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={onScrollToSection}
            className="tv-kpi-card w-full cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onScrollToSection?.();
              }
            }}
          >
            {/* Top row: Title + Badge */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span
                className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight"
                title={card.title}
              >
                {card.title}
              </span>
              <span
                className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${card.badgeClass}`}
              >
                {card.badgeText}
              </span>
            </div>

            {/* Bottom row: Value + Meta */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
                {card.value}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] truncate max-w-[68px] sm:max-w-[130px] text-right font-medium leading-none ${card.metaClass}`}
              >
                {card.metaText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
