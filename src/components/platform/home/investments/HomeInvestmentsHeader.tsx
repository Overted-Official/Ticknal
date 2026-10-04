'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function HomeInvestmentsHeader() {
  const { t, locale } = useTranslation();
  return (
    <header className="flex items-center justify-between gap-4 select-none pb-1">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-1.5 text-xs md:text-sm font-sans">
        <Link
          href="/home"
          className="text-text-muted font-normal hover:text-text-primary transition-colors"
        >
          {locale === 'ar' ? 'الرئيسية' : 'Home'}
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-semibold text-text-primary">
          {locale === 'ar' ? 'الاستثمارات' : 'Investments'}
        </h1>
      </div>
    </header>
  );
}
