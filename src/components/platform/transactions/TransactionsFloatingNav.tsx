'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';

export interface TransactionNavSection {
  id: string;
  label: string;
  shortLabel: string;
}

export const TRANSACTION_SECTIONS: TransactionNavSection[] = [
  { id: 'section-transactions-overview', label: 'Cashflow Overview', shortLabel: 'Overview' },
  { id: 'section-accounts-rail', label: 'Accounts & Liquidity', shortLabel: 'Accounts' },
  { id: 'section-closeout-archive', label: 'Monthly Closeouts', shortLabel: 'Closeouts' },
  { id: 'section-activity-ledger', label: 'Activity Ledger', shortLabel: 'Ledger' },
];

interface TransactionsFloatingNavProps {
  dataTour?: string;
  className?: string;
  hasSummaries?: boolean;
}

export default function TransactionsFloatingNav({
  dataTour = 'transactions-floating-nav',
  className = '',
  hasSummaries = true,
}: TransactionsFloatingNavProps = {}) {
  const { locale } = useTranslation();
  const [activeSection, setActiveSection] = useState<string>('section-transactions-overview');

  const sections = useMemo<TransactionNavSection[]>(() => {
    const list: TransactionNavSection[] = [
      {
        id: 'section-transactions-overview',
        label: locale === 'ar' ? 'نظرة عامة على السيولة' : 'Cashflow Overview',
        shortLabel: locale === 'ar' ? 'نظرة عامة' : 'Overview',
      },
      {
        id: 'section-accounts-rail',
        label: locale === 'ar' ? 'الحسابات والسيولة' : 'Accounts & Liquidity',
        shortLabel: locale === 'ar' ? 'الحسابات' : 'Accounts',
      },
    ];

    if (hasSummaries) {
      list.push({
        id: 'section-closeout-archive',
        label: locale === 'ar' ? 'المراجعات الشهرية' : 'Monthly Closeouts',
        shortLabel: locale === 'ar' ? 'المراجعات' : 'Closeouts',
      });
    }

    list.push({
      id: 'section-activity-ledger',
      label: locale === 'ar' ? 'سجل الحركات' : 'Activity Ledger',
      shortLabel: locale === 'ar' ? 'السجل' : 'Ledger',
    });

    return list;
  }, [locale, hasSummaries]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    // Check if the scroll container is command-surface-page
    const container = document.querySelector('.command-surface-page') as HTMLElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 56;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    } else {
      const top = element.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      for (let i = sections.length - 1; i >= 0; i--) {
        const sectionId = sections[i].id;
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 160) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (sections[0]) {
        setActiveSection(sections[0].id);
      }
    };

    const container = document.querySelector('.command-surface-page');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [sections]);

  return (
    <nav
      aria-label="Transactions Page Sections"
      className={`sticky top-0 z-30 w-full py-2.5 sm:py-3 px-3 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center ${className}`.trim()}
    >
      <div className="w-full max-w-full min-w-0 flex items-center justify-center">
        {/* TradingView Floating Pill Container */}
        <div
          data-tour={dataTour}
          data-name="round-tabs-anchors"
          className="relative pointer-events-auto rounded-full border border-plt-border bg-plt-base/90 backdrop-blur-xl p-1 sm:p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-center max-w-[calc(100vw-24px)] sm:max-w-full"
        >
          <div
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative flex items-center justify-center rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-plt-active text-plt-text shadow-sm ring-1 ring-white/10'
                      : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                  }`}
                >
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="inline sm:hidden">{section.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
