'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';

export interface FinancialsHeaderProps {
  symbol: string;
  companyName?: string;
  sector?: string;
  logoUrl?: string | null;
  currency?: string;
  onExportCSV?: () => void;
  onClose: () => void;
  isExporting?: boolean;
}

export default function FinancialsHeader({
  symbol,
  companyName,
  sector,
  logoUrl,
  currency = 'EGP',
  onExportCSV,
  onClose,
  isExporting = false,
}: FinancialsHeaderProps) {
  const { locale } = useTranslation();
  const [imgError, setImgError] = useState(false);

  const cleanSymbol = symbol
    .trim()
    .toUpperCase()
    .replace(/\.CA$/, '')
    .replace(/^EGX:/, '');

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-plt-border-soft bg-plt-base shrink-0 z-20 gap-3 font-sans">
      {/* Left Lockup: Logo / Ticker / Name / Currency */}
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
        {/* Company Logo or 2-letter Avatar */}
        <div className="w-8 h-8 rounded-full bg-plt-hover border border-plt-border-soft overflow-hidden flex items-center justify-center shrink-0">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt={cleanSymbol}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xs font-bold text-plt-text uppercase font-sans">
              {cleanSymbol.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Ticker & Company Name */}
        <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
          <span className="font-sans font-bold text-plt-text text-base shrink-0 tracking-tight">
            {cleanSymbol}
          </span>
          {companyName && (
            <span
              className="text-xs text-plt-muted truncate max-w-[200px] sm:max-w-[320px]"
              title={companyName}
            >
              {companyName}
            </span>
          )}
        </div>

        {/* Currency Badge */}
        <span className="bg-plt-card border border-plt-border-soft text-plt-subtle text-[10px] px-1.5 py-0.5 rounded-none font-sans tabular-nums shrink-0 uppercase">
          {currency}
        </span>

        {/* Sector Pill */}
        {sector && (
          <span className="hidden md:inline-flex bg-plt-hover border border-plt-border-soft text-plt-subtle text-[10px] px-2 py-0.5 rounded-none font-sans shrink-0">
            {sector}
          </span>
        )}
      </div>

      {/* Right Actions: Export CSV + Close Button */}
      <div className="flex items-center gap-2 shrink-0">
        {onExportCSV && (
          <button
            type="button"
            onClick={onExportCSV}
            disabled={isExporting}
            title={locale === 'ar' ? 'تصدير البيانات المالية كملف CSV' : 'Export financials as CSV'}
            className="h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover border border-plt-border-soft transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} className="shrink-0" />
            <span className="hidden xs:inline sm:inline">
              {locale === 'ar' ? 'تصدير CSV' : 'Export CSV'}
            </span>
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          title={locale === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
          aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
          className="h-7 px-2 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover border border-plt-border-soft transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <X size={15} className="shrink-0" />
          <kbd className="hidden sm:inline px-1 py-0.2 rounded text-[9px] text-plt-subtle uppercase font-sans">
            ESC
          </kbd>
        </button>
      </div>
    </div>
  );
}
