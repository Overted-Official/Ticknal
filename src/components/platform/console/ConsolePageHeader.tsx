'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface ConsolePageHeaderProps {
  pageTitle: string;
  rightAction?: React.ReactNode;
}

export default function ConsolePageHeader({ pageTitle, rightAction }: ConsolePageHeaderProps) {
  const { locale } = useTranslation();

  return (
    <header className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4 shrink-0 bg-plt-base select-none">
      {/* Left: Breadcrumb matching HomeInvestmentsHeader & MarketsPageHeader */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-sans">
        <Link
          href="/console/users"
          className="text-text-muted font-normal hover:text-text-primary transition-colors cursor-pointer"
        >
          {locale === 'ar' ? 'لوحة التحكم' : 'Console'}
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-semibold text-text-primary">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Optional action or status pill */}
      <div className="flex items-center gap-2.5">
        {rightAction ? (
          rightAction
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="leading-none">Admin</span>
          </div>
        )}
      </div>
    </header>
  );
}
