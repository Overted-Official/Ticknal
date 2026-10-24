'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { TourTriggerButton } from '@/components/ui/tour';
import { Plus } from '@/components/ui/icon-library';

interface TransactionsHeaderProps {
  onStartTour?: () => void;
  onOpenCheckIn?: () => void;
  onOpenAddAccount?: () => void;
}

export default function TransactionsHeader({
  onStartTour,
  onOpenCheckIn,
  onOpenAddAccount,
}: TransactionsHeaderProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none pb-2 font-sans">
      {/* Left: Breadcrumb & Title */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/home"
            className="text-text-muted font-normal hover:text-text-primary transition-colors"
          >
            {isAr ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-text-secondary font-medium">
            {isAr ? 'الأرصدة والسيولة' : 'Cash & Balances'}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
          {isAr ? 'الأرصدة، السيولة وتحديثات الحسابات' : 'Cash, Balances & Monthly Updates'}
        </h1>
      </div>

      {/* Right: Actions aligned with platform design system */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
        {onOpenCheckIn && (
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="btn-primary-cta"
            title={isAr ? 'تحديث أرصدة الحسابات الشهرية' : 'Update monthly account balances'}
          >
            <span>{isAr ? 'تحديث الأرصدة' : 'Balance Update'}</span>
          </button>
        )}

        {onOpenAddAccount && (
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="filter-control-btn"
          >
            <span>{isAr ? 'إضافة حساب' : 'Add Account'}</span>
            <Plus className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}

        {onStartTour && (
          <div className="flex items-center">
            <TourTriggerButton onClick={onStartTour} />
          </div>
        )}
      </div>
    </header>
  );
}
