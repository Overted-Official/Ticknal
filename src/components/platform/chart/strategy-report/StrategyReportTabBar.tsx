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
}

export default function StrategyReportTabBar({
  activeTab,
  onSelectTab,
  tradesCount,
  reportLoading,
}: StrategyReportTabBarProps) {
  const { locale } = useTranslation();

  return (
    <div className="h-11 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-black font-sans">
      <div className="flex items-center gap-6 h-full">
        <button
          type="button"
          onClick={() => onSelectTab('performance')}
          className={`h-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative ${
            activeTab === 'performance'
              ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <TrendingUp size={13} />
          <span>{locale === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('trades')}
          className={`h-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative ${
            activeTab === 'trades'
              ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <BarChart2 size={13} />
          <span>{locale === 'ar' ? 'سجل الصفقات' : 'List of Trades'}</span>
          <span className="text-[10px] tabular-nums text-white/50 px-1.5 py-0.2 rounded-full bg-white/10">
            {tradesCount}
          </span>
        </button>
      </div>

      {/* Loading indicator */}
      {reportLoading && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
          <InlineSpinner className="h-3 w-3" label="Updating backtest" />
          <span>{locale === 'ar' ? 'جاري تحديث الاختبار التاريخي...' : 'Updating backtest…'}</span>
        </div>
      )}
    </div>
  );
}
