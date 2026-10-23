'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import type { FinancialsDrawerProps, FinancialsTab, PeriodFrequency } from './types';
import { useCompanyFundamentals } from './useCompanyFundamentals';
import FinancialsHeader from './FinancialsHeader';
import FinancialsTabBar from './FinancialsTabBar';
import { exportStatementsToCSV } from './export-csv';

export default function FinancialsDrawer({
  isOpen,
  onClose,
  symbol,
  companyName,
  sector,
  logoUrl,
  currency = 'EGP',
}: FinancialsDrawerProps) {
  const { locale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<FinancialsTab>('overview');
  const [frequency, setFrequency] = useState<PeriodFrequency>('annual');

  const { data, isLoading, error, mutate } = useCompanyFundamentals(isOpen ? symbol : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key press to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleExportCSV = () => {
    exportStatementsToCSV(symbol, data?.statements, frequency);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end overflow-hidden select-none font-sans">
          {/* Backdrop */}
          <motion.div
            key="financials-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            aria-label="Close financials drawer overlay"
          />

          {/* Drawer Sheet */}
          <motion.div
            key="financials-sheet"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 340,
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[85vw] md:w-[75vw] lg:w-[70vw] max-w-[1300px] h-full bg-plt-base border-l border-plt-border-soft rounded-none shadow-2xl flex flex-col font-sans select-none overflow-hidden"
          >
            {/* Header */}
            <FinancialsHeader
              symbol={symbol}
              companyName={companyName}
              sector={sector}
              logoUrl={logoUrl}
              currency={currency}
              onExportCSV={data?.statements ? handleExportCSV : undefined}
              onClose={onClose}
            />

            {/* Tab Bar */}
            <FinancialsTabBar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
            />

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-plt-base flex flex-col">
              {isLoading ? (
                /* Loading Skeleton */
                <div
                  data-testid="financials-loading-skeleton"
                  className="p-4 sm:p-6 md:p-8 space-y-6 animate-pulse"
                >
                  {/* Top KPI Cards Skeleton */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-24 bg-plt-card border border-plt-border-soft rounded-none p-4 flex flex-col justify-between"
                      >
                        <div className="h-3 w-20 bg-plt-hover rounded" />
                        <div className="h-6 w-28 bg-plt-hover rounded" />
                        <div className="h-2 w-16 bg-plt-hover rounded" />
                      </div>
                    ))}
                  </div>

                  {/* Valuation & Chart Skeleton */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-72 bg-plt-card border border-plt-border-soft rounded-none p-4">
                      <div className="h-4 w-32 bg-plt-hover rounded mb-4" />
                      <div className="h-56 bg-plt-hover/50 rounded" />
                    </div>
                    <div className="h-72 bg-plt-card border border-plt-border-soft rounded-none p-4 space-y-4">
                      <div className="h-4 w-28 bg-plt-hover rounded" />
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center py-1">
                          <div className="h-3 w-20 bg-plt-hover rounded" />
                          <div className="h-3 w-16 bg-plt-hover rounded" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table Skeleton */}
                  <div className="h-64 bg-plt-card border border-plt-border-soft rounded-none p-4 space-y-3">
                    <div className="h-4 w-36 bg-plt-hover rounded mb-2" />
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-9 bg-plt-hover/40 rounded w-full" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                /* Error Alert */
                <div
                  data-testid="financials-error-alert"
                  className="p-6 sm:p-8 flex flex-col items-center justify-center flex-1 text-center my-auto"
                >
                  <div className="w-12 h-12 rounded-full bg-plt-risk-soft border border-plt-risk-border flex items-center justify-center mb-4">
                    <AlertCircle size={22} className="text-plt-risk" />
                  </div>
                  <h3 className="text-sm font-semibold text-plt-text mb-1">
                    {locale === 'ar' ? 'فشل تحميل البيانات المالية' : 'Failed to Load Financials'}
                  </h3>
                  <p className="text-xs text-plt-muted max-w-md mb-5">
                    {error?.message ||
                      (locale === 'ar'
                        ? 'حدث خطأ أثناء جلب القوائم والنسب المالية للشركة. يرجى المحاولة مرة أخرى.'
                        : 'An error occurred while fetching company statements and valuation metrics. Please try again.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => mutate()}
                    className="h-8 px-4 rounded-md text-xs font-medium bg-plt-active text-plt-text hover:bg-plt-hover border border-plt-border-soft transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={12} className="shrink-0" />
                    <span>{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                  </button>
                </div>
              ) : (
                /* Tab Content */
                <div className="flex-1 flex flex-col min-h-0">
                  {activeTab === 'overview' && (
                    <div
                      data-testid="financials-tab-overview"
                      className="flex-1 p-4 sm:p-6 md:p-8 space-y-6"
                    >
                      {/* Overview & Valuation Slot for Task 4 */}
                    </div>
                  )}

                  {activeTab === 'statements' && (
                    <div
                      data-testid="financials-tab-statements"
                      className="flex-1 p-4 sm:p-6 md:p-8 space-y-6"
                    >
                      {/* Statements Table Slot for Task 5 */}
                    </div>
                  )}

                  {activeTab === 'ratios' && (
                    <div
                      data-testid="financials-tab-ratios"
                      className="flex-1 p-4 sm:p-6 md:p-8 space-y-6"
                    >
                      {/* Ratios & DuPont Analysis Slot for Task 5 */}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
