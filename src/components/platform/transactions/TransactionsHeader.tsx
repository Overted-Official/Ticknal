'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { TourTriggerButton } from '@/components/ui/tour';
import { Calendar, Plus, Sparkles } from '@/components/ui/icon-library';

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
          {isAr ? 'الأرصدة، السيولة والمراجعة الشهرية' : 'Cash, Balances & Monthly Check-In'}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
        {onOpenCheckIn && (
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
            <span>{isAr ? 'المراجعة الشهرية (90 ثانية)' : 'Monthly Check-In'}</span>
          </button>
        )}

        {onOpenAddAccount && (
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-text-primary transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة حساب' : 'Add Account'}</span>
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
