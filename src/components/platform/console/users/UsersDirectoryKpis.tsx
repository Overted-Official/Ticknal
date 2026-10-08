'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Users, CreditCard, UserCheck, Shield } from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import type { ConsoleUsersPageData } from '@/lib/server/console-queries';

interface UsersDirectoryKpisProps {
  kpis: ConsoleUsersPageData['kpis'];
}

export default function UsersDirectoryKpis({ kpis }: UsersDirectoryKpisProps) {
  const { locale } = useTranslation();

  // Calculate YTD progression change text
  const totalPoints = kpis.ytdProgression?.totalUsers ?? [];
  const startTotal = totalPoints.length > 0 ? totalPoints[0] : 0;
  const endTotal = totalPoints.length > 0 ? totalPoints[totalPoints.length - 1] : kpis.totalUsers;

  let totalChangeText = '+0% YTD';
  if (startTotal > 0) {
    const pct = ((endTotal - startTotal) / startTotal) * 100;
    totalChangeText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% YTD`;
  } else if (endTotal > 0) {
    totalChangeText = `+${endTotal} YTD`;
  }

  const freePct = kpis.totalUsers > 0 ? Math.round((kpis.freeCount / kpis.totalUsers) * 100) : 0;

  const cards: KPICardProps[] = [
    {
      id: 'users-total-accounts',
      targetId: 'section-users-directory',
      title: locale === 'ar' ? 'إجمالي الحسابات' : 'Total Accounts',
      shortTitle: locale === 'ar' ? 'الحسابات' : 'Accounts',
      icon: Users,
      iconBgClass: 'bg-blue-500/20 text-blue-400',
      iconColorClass: 'text-blue-400',
      value: kpis.totalUsers.toLocaleString(),
      badgeText: locale === 'ar' ? 'الملفات' : 'Profiles',
      badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      changeText: totalChangeText,
      changeColorClass: 'text-profit-num',
      metaText: locale === 'ar' ? 'تقدم سنوي' : 'YTD Progression',
      sparklinePoints: totalPoints.length > 1 ? totalPoints : undefined,
      sparklineTrend: 'up',
    },
    {
      id: 'users-paying-subscribers',
      targetId: 'section-users-directory',
      title: locale === 'ar' ? 'المشتركون بالدفع' : 'Paying Subscribers',
      shortTitle: locale === 'ar' ? 'المدفوع' : 'Paying',
      icon: CreditCard,
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
      iconColorClass: 'text-emerald-400',
      value: kpis.paidCount.toLocaleString(),
      badgeText: `${kpis.paidConversionRate}% ${locale === 'ar' ? 'دفع' : 'Paid'}`,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      changeText: `${kpis.paidConversionRate.toFixed(1)}% conversion`,
      changeColorClass: 'text-profit-num',
      metaText:
        locale === 'ar'
          ? `${kpis.annualCount} سنوي`
          : `${kpis.annualCount} Annual Pass${kpis.annualCount === 1 ? '' : 'es'}`,
      sparklinePoints:
        kpis.ytdProgression?.paidUsers && kpis.ytdProgression.paidUsers.length > 1
          ? kpis.ytdProgression.paidUsers
          : undefined,
      sparklineTrend: 'up',
    },
    {
      id: 'users-free-pipeline',
      targetId: 'section-users-directory',
      title: locale === 'ar' ? 'مسار الأعضاء المجاني' : 'Free Members Pipeline',
      shortTitle: locale === 'ar' ? 'مجاني' : 'Free Tier',
      icon: UserCheck,
      iconBgClass: 'bg-white/10 text-zinc-300',
      iconColorClass: 'text-zinc-300',
      value: kpis.freeCount.toLocaleString(),
      badgeText: locale === 'ar' ? 'المسار' : 'Pipeline',
      badgeClass: 'bg-white/10 text-zinc-300 border border-white/10',
      changeText: `${freePct}% of roster`,
      changeColorClass: 'text-zinc-300',
      metaText: locale === 'ar' ? 'غير مدفوع' : 'Unmonetized',
      sparklinePoints:
        kpis.ytdProgression?.freeUsers && kpis.ytdProgression.freeUsers.length > 1
          ? kpis.ytdProgression.freeUsers
          : undefined,
      sparklineTrend: 'neutral',
    },
    {
      id: 'users-privileged-staff',
      targetId: 'section-users-directory',
      title: locale === 'ar' ? 'فريق العمل المتميز' : 'Privileged Staff',
      shortTitle: locale === 'ar' ? 'الموظفون' : 'Staff',
      icon: Shield,
      iconBgClass: 'bg-purple-500/20 text-purple-400',
      iconColorClass: 'text-purple-400',
      value: kpis.adminCount.toString(),
      badgeText: locale === 'ar' ? 'الأمان' : 'Security',
      badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      changeText: `${kpis.adminCount} staff seat${kpis.adminCount === 1 ? '' : 's'}`,
      changeColorClass: 'text-purple-400',
      metaText: locale === 'ar' ? 'فريق الكونسول' : 'Console Staff',
      sparklinePoints:
        kpis.ytdProgression?.adminUsers && kpis.ytdProgression.adminUsers.length > 1
          ? kpis.ytdProgression.adminUsers
          : undefined,
      sparklineTrend: 'neutral',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 select-none">
      {cards.map((card) => (
        <KPICard key={card.id} {...card} />
      ))}
    </div>
  );
}
