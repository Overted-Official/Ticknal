'use client';

import React from 'react';
import { Activity, FileText, Scale } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import type { FinancialsTab } from './types';

export interface FinancialsTabBarProps {
  activeTab: FinancialsTab;
  onSelectTab: (tab: FinancialsTab) => void;
}

export default function FinancialsTabBar({
  activeTab,
  onSelectTab,
}: FinancialsTabBarProps) {
  const { locale } = useTranslation();

  const tabs: Array<{
    id: FinancialsTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'overview',
      label: locale === 'ar' ? 'نظرة عامة والتقييم' : 'Overview & Valuation',
      icon: <Activity size={13} className="shrink-0" />,
    },
    {
      id: 'statements',
      label: locale === 'ar' ? 'القوائم المالية' : 'Financial Statements',
      icon: <FileText size={13} className="shrink-0" />,
    },
    {
      id: 'ratios',
      label: locale === 'ar' ? 'النسب والمؤشرات المالية' : 'Financial Ratios',
      icon: <Scale size={13} className="shrink-0" />,
    },
  ];

  return (
    <div className="flex items-center gap-6 px-4 sm:px-6 bg-plt-base border-b border-plt-border-soft shrink-0 text-xs font-sans overflow-x-auto no-scrollbar select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            data-testid={`financials-tab-${tab.id}-btn`}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 -mb-px transition-colors cursor-pointer shrink-0 text-xs font-sans ${
              isActive
                ? 'text-plt-text border-plt-accent font-medium'
                : 'text-plt-muted hover:text-plt-text border-transparent hover:border-plt-border-soft'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
