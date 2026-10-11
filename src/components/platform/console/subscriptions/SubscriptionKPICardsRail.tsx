'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Coins,
  Calendar,
} from '@/components/ui/icon-library';
import KPICard, {
  type KPICardProps,
} from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';

interface SubscriptionKPICardsRailProps {
  kpis: ConsoleSubscriptionsPageData['kpis'];
}

export default function SubscriptionKPICardsRail({
  kpis,
}: SubscriptionKPICardsRailProps) {
  const { locale } = useTranslation();
  const { isPrivacy } = usePrivacyMode();

  // 1. MRR YTD Delta Calculation
  const mrrPts = kpis.ytdProgression?.mrr ?? [];
  const startMrr = mrrPts.length > 0 ? mrrPts[0] : 0;
  const endMrr = mrrPts.length > 0 ? mrrPts[mrrPts.length - 1] : kpis.mrr;
  let mrrChangeText = '+0% YTD';
  if (startMrr > 0) {
    const diff = ((endMrr - startMrr) / startMrr) * 100;
    mrrChangeText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% YTD`;
  } else if (endMrr > 0) {
    mrrChangeText = `+EGP ${endMrr.toLocaleString()} YTD`;
  }

  // 2. ARR YTD Delta Calculation
  const arrPts = kpis.ytdProgression?.arr ?? [];
  const startArr = arrPts.length > 0 ? arrPts[0] : 0;
  const endArr = arrPts.length > 0 ? arrPts[arrPts.length - 1] : kpis.arr;
  let arrChangeText = '+0% YTD';
  if (startArr > 0) {
    const diff = ((endArr - startArr) / startArr) * 100;
    arrChangeText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% YTD`;
  } else if (endArr > 0) {
    arrChangeText = `+EGP ${endArr.toLocaleString()} YTD`;
  }

  // 3. Paid Seats YTD Delta Calculation
  const seatsPts = kpis.ytdProgression?.activePaidSeats ?? [];
  const startSeats = seatsPts.length > 0 ? seatsPts[0] : 0;
  const endSeats = seatsPts.length > 0 ? seatsPts[seatsPts.length - 1] : kpis.activePaidSeats;
  let seatsChangeText = '+0 seats';
  if (startSeats > 0) {
    const diff = ((endSeats - startSeats) / startSeats) * 100;
    seatsChangeText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% YTD`;
  } else if (endSeats > 0) {
    seatsChangeText = `+${endSeats} YTD`;
  }

  // 4. ARPU YTD Points
  const arpuPts = kpis.ytdProgression?.arpuPaid ?? [];

  // 5. Annual Seats Points
  const annualPts = kpis.ytdProgression?.annualSeats ?? [];

  const cards: KPICardProps[] = [
    {
      id: 'subs-mrr',
      targetId: 'section-subs-overview',
      title:
        locale === 'ar'
          ? 'الإيرادات الشهرية'
          : 'Monthly MRR',
      shortTitle: 'MRR',
      icon: TrendingUp,
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
      iconColorClass: 'text-emerald-400',
      value: isPrivacy ? '••••••••' : `EGP ${kpis.mrr.toLocaleString()}`,
      badgeText: 'Live Calc',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      changeText: mrrChangeText,
      changeColorClass: 'text-profit-num',
      metaText: locale === 'ar' ? 'تقدم سنوي' : 'YTD Run',
      sparklinePoints: mrrPts.length > 1 ? mrrPts : undefined,
      sparklineTrend: endMrr >= startMrr ? 'up' : 'down',
    },
    {
      id: 'subs-arr',
      targetId: 'section-subs-overview',
      title:
        locale === 'ar'
          ? 'التشغيل السنوي'
          : 'Annual Run-Rate',
      shortTitle: 'ARR',
      icon: DollarSign,
      iconBgClass: 'bg-blue-500/20 text-blue-400',
      iconColorClass: 'text-blue-400',
      value: isPrivacy ? '••••••••' : `EGP ${kpis.arr.toLocaleString()}`,
      badgeText: 'ARR',
      badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      changeText: arrChangeText,
      changeColorClass: 'text-profit-num',
      metaText: locale === 'ar' ? '12x سنوي' : '12x Multiplier',
      sparklinePoints: arrPts.length > 1 ? arrPts : undefined,
      sparklineTrend: endArr >= startArr ? 'up' : 'down',
    },
    {
      id: 'subs-paying-subscribers',
      targetId: 'section-subs-ledger',
      title:
        locale === 'ar'
          ? 'المشتركون بالدفع'
          : 'Paid Subscribers',
      shortTitle: locale === 'ar' ? 'المدفوع' : 'Paying',
      icon: CreditCard,
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
      iconColorClass: 'text-emerald-400',
      value: kpis.activePaidSeats.toLocaleString(),
      badgeText: `${kpis.activePaidSeats} ${locale === 'ar' ? 'مقعد' : 'Seats'}`,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      changeText: seatsChangeText,
      changeColorClass: 'text-profit-num',
      metaText: locale === 'ar' ? 'تراخيص مدفوعة' : 'Active Licenses',
      sparklinePoints: seatsPts.length > 1 ? seatsPts : undefined,
      sparklineTrend: endSeats >= startSeats ? 'up' : 'down',
    },
    {
      id: 'subs-paid-arpu',
      targetId: 'section-subs-metrics',
      title:
        locale === 'ar'
          ? 'متوسط العائد لكل مستخدم'
          : 'Paid ARPU',
      shortTitle: 'ARPU',
      icon: Coins,
      iconBgClass: 'bg-white/10 text-zinc-300',
      iconColorClass: 'text-zinc-300',
      value: isPrivacy ? '••••' : `EGP ${kpis.arpuPaid.toLocaleString()}`,
      badgeText: '/ Seat',
      badgeClass: 'bg-white/10 text-zinc-300 border border-white/10',
      changeText: `EGP ${kpis.arpuPaid} / mo`,
      changeColorClass: 'text-zinc-300',
      metaText: locale === 'ar' ? 'متوسط العائد' : 'Average Yield',
      sparklinePoints: arpuPts.length > 1 ? arpuPts : undefined,
      sparklineTrend: 'neutral',
    },
    {
      id: 'subs-annual-mix',
      targetId: 'section-subs-plans',
      title:
        locale === 'ar'
          ? 'مزيج الاشتراكات السنوية'
          : 'Annual Lock Mix',
      shortTitle: locale === 'ar' ? 'السنوي' : 'Annual',
      icon: Calendar,
      iconBgClass: 'bg-purple-500/20 text-purple-400',
      iconColorClass: 'text-purple-400',
      value: `${kpis.annualMixPct}%`,
      badgeText: `${kpis.annualSeats} ${locale === 'ar' ? 'مقعد' : 'Seats'}`,
      badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      changeText: `${kpis.annualSeats} annual seat${kpis.annualSeats === 1 ? '' : 's'}`,
      changeColorClass: 'text-purple-400',
      metaText: locale === 'ar' ? 'دفع مسبق 12 شهر' : '12-Mo Prepaid',
      sparklinePoints: annualPts.length > 1 ? annualPts : undefined,
      sparklineTrend: 'up',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 select-none">
      {cards.map((card) => (
        <KPICard key={card.id} {...card} />
      ))}
    </div>
  );
}
