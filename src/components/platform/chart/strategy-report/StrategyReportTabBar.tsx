'use client';

import React from 'react';
import { TrendingUp, BarChart2 } from '@/components/ui/icon-library';
import type { StrategyReportTab } from './types';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { useTranslation } from '@/lib/i18n';

interface StrategyReportTabBarProps {
  activeTab: StrategyReportTab;
  onSelectTab: (tab: StrategyReportTab) => void;
  tradesCount: number;
  reportLoading: boolean;
  hasProprietaryAccess?: boolean;
  isStaff?: boolean;
}

export default function StrategyReportTabBar({
  activeTab,
  onSelectTab,
  tradesCount,
  reportLoading,
  hasProprietaryAccess = false,
  isStaff = false,
}: StrategyReportTabBarProps) {
  const { locale } = useTranslation();

  return (
    <div className="h-11 px-4 sm:px-6 flex items-center justify-between border-b border-plt-border shrink-0 bg-plt-base font-sans overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-6 h-full shrink-0">
        <button
          type="button"
          onClick={() => onSelectTab('performance')}
          className={`h-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'performance'
              ? 'text-plt-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-plt-text'
              : 'text-plt-muted hover:text-plt-text'
          }`}
        >
          <TrendingUp size={13} />
          <span className="hidden sm:inline">{locale === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}</span>
          <span className="sm:hidden">{locale === 'ar' ? 'الأداء' : 'Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('trades')}
          className={`h-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'trades'
              ? 'text-plt-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-plt-text'
              : 'text-plt-muted hover:text-plt-text'
          }`}
        >
          <BarChart2 size={13} />
          <span className="hidden sm:inline">{locale === 'ar' ? 'سجل الصفقات' : 'List of Trades'}</span>
          <span className="sm:hidden">{locale === 'ar' ? 'الصفقات' : 'Trades'}</span>
          <span className="text-[10px] tabular-nums text-plt-muted px-1.5 py-0.2 rounded-full bg-plt-hover">
            {tradesCount}
          </span>
        </button>

        {(hasProprietaryAccess || isStaff) && (
          <button
            type="button"
            onClick={() => onSelectTab('turbo')}
            className={`h-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative shrink-0 ${
              activeTab === 'turbo'
                ? 'text-plt-warning after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-plt-warning'
                : 'text-plt-muted hover:text-plt-warning'
            }`}
          >
            <span className="text-plt-warning text-xs">★</span>
            <span className="hidden sm:inline">{locale === 'ar' ? 'تيربو (مدير المحفظة)' : 'Turbo (Portfolio)'}</span>
            <span className="sm:hidden">{locale === 'ar' ? 'تيربو' : 'Turbo'}</span>
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {reportLoading && (
        <div className="flex items-center gap-1.5 text-[11px] text-plt-muted shrink-0 pl-4">
          <InlineSpinner className="h-3 w-3" label="Updating backtest" />
          <span>{locale === 'ar' ? 'جاري تحديث الاختبار التاريخي...' : 'Updating backtest…'}</span>
        </div>
      )}
    </div>
  );
}
