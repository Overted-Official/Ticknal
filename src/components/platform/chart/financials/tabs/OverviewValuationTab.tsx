'use client';

import React, { useMemo } from 'react';
import { useSafeLocale } from '../useSafeLocale';
import type { CompanyValuationMetric, CompanyFinancialStatement } from '../types';
import ValuationMultiplesGrid from '../components/ValuationMultiplesGrid';
import PiotroskiScoreCard from '../components/PiotroskiScoreCard';
import AltmanZScoreCard from '../components/AltmanZScoreCard';
import FiveYearTrendBars from '../components/FiveYearTrendBars';

export interface OverviewValuationTabProps {
  valuation?: CompanyValuationMetric | null;
  statements?: {
    annual: CompanyFinancialStatement[];
    quarterly: CompanyFinancialStatement[];
  };
  currency?: string;
  symbol?: string;
}

export default function OverviewValuationTab({
  valuation,
  statements,
  currency = 'EGP',
  symbol,
}: OverviewValuationTabProps) {
  const locale = useSafeLocale();

  const annualStatements = useMemo(() => {
    return [...(statements?.annual ?? [])].sort(
      (a, b) => (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0)
    );
  }, [statements?.annual]);
  const latestAnnual = annualStatements[0];

  const hasAnyData =
    Boolean(valuation) ||
    annualStatements.length > 0 ||
    (statements?.quarterly && statements.quarterly.length > 0);

  if (!hasAnyData) {
    return (
      <div
        data-testid="overview-no-data"
        className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] border border-plt-border-soft bg-plt-card rounded-none"
      >
        <p className="text-sm font-semibold text-plt-text mb-1">
          {locale === 'ar'
            ? `لا تتوفر بيانات مالية لرمز ${symbol || ''}`
            : `No financial data available for ${symbol || 'this company'}`}
        </p>
        <p className="text-xs text-plt-muted max-w-md">
          {locale === 'ar'
            ? 'لم يتم إدراج قوائم مالية مدققة أو مضاعفات تقييم لهذه الشركة حتى الآن.'
            : 'Audited financial statements and valuation multiples have not been populated for this ticker yet.'}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="overview-valuation-tab"
      className="space-y-6 font-sans text-plt-text select-none"
    >
      {/* 1. Valuation & KPI Multiples Grid */}
      <section aria-label="Valuation Multiples">
        <ValuationMultiplesGrid valuation={valuation} currency={currency} />
      </section>

      {/* 2. Quality & Solvency Dual Cards */}
      <section
        aria-label="Quality and Solvency Health"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Piotroski F-Score Card */}
        <PiotroskiScoreCard
          score={valuation?.piotroskiFScore}
          statements={annualStatements}
        />

        {/* Altman Z''-Score Card */}
        <AltmanZScoreCard
          score={valuation?.altmanZScore}
          statement={latestAnnual}
          marketCap={valuation?.marketCap}
        />
      </section>

      {/* 3. 5-Year Mini Performance Trend */}
      <section aria-label="Historical Performance Trend">
        <FiveYearTrendBars
          statements={annualStatements}
          currency={currency}
        />
      </section>
    </div>
  );
}
