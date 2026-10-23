'use client';

import React from 'react';
import { useSafeLocale } from '../useSafeLocale';
import { Award, Check, X } from '@/components/ui/icon-library';
import type { CompanyFinancialStatement } from '../types';
import { getPiotroskiRating } from '../formatters';

export interface PiotroskiScoreCardProps {
  score: number | null | undefined;
  statements?: CompanyFinancialStatement[];
}

interface ChecklistItem {
  id: string;
  titleEn: string;
  titleAr: string;
  passed: boolean;
}

interface Pillar {
  id: string;
  titleEn: string;
  titleAr: string;
  maxPoints: number;
  items: ChecklistItem[];
}

export default function PiotroskiScoreCard({
  score: propScore,
  statements,
}: PiotroskiScoreCardProps) {
  const locale = useSafeLocale();

  // Evaluate checklist items from latest 2 annual statements
  const annual = (statements || [])
    .filter((s) => s.periodType?.toUpperCase() === 'ANNUAL')
    .sort((a, b) => b.fiscalYear - a.fiscalYear);

  const current = annual[0];
  const prior = annual[1];

  // 1. ROA > 0
  const passRoa = current?.netIncome != null ? current.netIncome > 0 : true;

  // 2. CFO > 0
  const curCfo = current?.operatingCashFlow ?? current?.freeCashFlow;
  const passCfo = curCfo != null ? curCfo > 0 : true;

  // 3. ΔROA > 0
  let passDeltaRoa = true;
  if (
    current?.totalAssets &&
    prior?.totalAssets &&
    current.totalAssets > 0 &&
    prior.totalAssets > 0
  ) {
    const roaCur = (current.netIncome ?? 0) / current.totalAssets;
    const roaPri = (prior.netIncome ?? 0) / prior.totalAssets;
    passDeltaRoa = roaCur > roaPri;
  }

  // 4. CFO > Net Income (Quality of Earnings)
  const passAccrual =
    curCfo != null && current?.netIncome != null
      ? curCfo > current.netIncome
      : true;

  // 5. ΔLeverage < 0
  let passLeverage = true;
  if (
    current?.totalAssets &&
    prior?.totalAssets &&
    current.totalAssets > 0 &&
    prior.totalAssets > 0
  ) {
    const levCur = (current.totalDebt ?? 0) / current.totalAssets;
    const levPri = (prior.totalDebt ?? 0) / prior.totalAssets;
    passLeverage = levCur <= levPri;
  }

  // 6. ΔLiquidity >= 0
  let passLiquidity = true;
  if (
    current?.totalLiabilities &&
    prior?.totalLiabilities &&
    current.totalLiabilities > 0 &&
    prior.totalLiabilities > 0
  ) {
    const liqCur = (current.totalAssets ?? 0) / current.totalLiabilities;
    const liqPri = (prior.totalAssets ?? 0) / prior.totalLiabilities;
    passLiquidity = liqCur >= liqPri;
  }

  // 7. No dilution
  let passDilution = true;
  if (current?.epsDiluted != null && prior?.epsDiluted != null) {
    passDilution = current.epsDiluted >= prior.epsDiluted;
  }

  // 8. ΔGross Margin > 0
  let passMargin = true;
  if (
    current?.totalRevenue &&
    prior?.totalRevenue &&
    current.totalRevenue > 0 &&
    prior.totalRevenue > 0
  ) {
    const gmCur =
      (current.grossProfit ?? current.operatingIncome ?? current.netIncome ?? 0) /
      current.totalRevenue;
    const gmPri =
      (prior.grossProfit ?? prior.operatingIncome ?? prior.netIncome ?? 0) /
      prior.totalRevenue;
    passMargin = gmCur > gmPri;
  }

  // 9. ΔAsset Turnover > 0
  let passTurnover = true;
  if (
    current?.totalAssets &&
    prior?.totalAssets &&
    current.totalAssets > 0 &&
    prior.totalAssets > 0
  ) {
    const toCur = (current.totalRevenue ?? 0) / current.totalAssets;
    const toPri = (prior.totalRevenue ?? 0) / prior.totalAssets;
    passTurnover = toCur > toPri;
  }

  const pillars: Pillar[] = [
    {
      id: 'profitability',
      titleEn: 'Profitability',
      titleAr: 'الربحية وجودة الأرباح',
      maxPoints: 4,
      items: [
        {
          id: 'pos-roa',
          titleEn: 'Positive Net Income / ROA',
          titleAr: 'صافي ربح ومردود إيجابي على الأصول',
          passed: passRoa,
        },
        {
          id: 'pos-cfo',
          titleEn: 'Positive Operating Cash Flow',
          titleAr: 'تدفقات نقدية تشغيلية إيجابية',
          passed: passCfo,
        },
        {
          id: 'inc-roa',
          titleEn: 'Higher ROA vs Prior Year',
          titleAr: 'نمو العائد على الأصول عن العام السابق',
          passed: passDeltaRoa,
        },
        {
          id: 'cfo-gt-ni',
          titleEn: 'Operating Cash Flow > Net Income',
          titleAr: 'التدفق التشغيلي أعلى من صافي الدخل',
          passed: passAccrual,
        },
      ],
    },
    {
      id: 'leverage',
      titleEn: 'Leverage & Liquidity',
      titleAr: 'الرفع المالي والسيولة النقدية',
      maxPoints: 3,
      items: [
        {
          id: 'dec-debt',
          titleEn: 'Lower or Stable Debt / Assets',
          titleAr: 'انخفاض نسبة الديون للأصول أو ثباتها',
          passed: passLeverage,
        },
        {
          id: 'inc-liq',
          titleEn: 'Higher Solvency / Liquidity Ratio',
          titleAr: 'تحسن نسبة التغطية والسيولة العامة',
          passed: passLiquidity,
        },
        {
          id: 'no-dilution',
          titleEn: 'No Share Dilution (Stable EPS)',
          titleAr: 'عدم تخفيض حصة السهم (ثبات ربحية السهم)',
          passed: passDilution,
        },
      ],
    },
    {
      id: 'efficiency',
      titleEn: 'Operating Efficiency',
      titleAr: 'الكفاءة التشغيلية وهوامش الربح',
      maxPoints: 2,
      items: [
        {
          id: 'inc-margin',
          titleEn: 'Higher Gross / Operating Margin',
          titleAr: 'ارتفاع هامش الربح الإجمالي/التشغيلي',
          passed: passMargin,
        },
        {
          id: 'inc-turnover',
          titleEn: 'Higher Asset Turnover Ratio',
          titleAr: 'تحسن معدل دوران الأصول التشغيلية',
          passed: passTurnover,
        },
      ],
    },
  ];

  // Computed total points from checklist
  const computedPoints = pillars.reduce(
    (sum, p) => sum + p.items.filter((i) => i.passed).length,
    0
  );

  // Authoritative score from valuation or fallback to computed points
  const score = propScore != null ? propScore : (annual.length > 0 ? computedPoints : null);
  const rating = getPiotroskiRating(score);

  return (
    <div
      data-testid="piotroski-score-card"
      className="bg-plt-card border border-plt-border-soft p-4 sm:p-5 rounded-none font-sans flex flex-col justify-between"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-plt-border-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-plt-hover border border-plt-border-soft text-plt-text rounded-none">
              <Award size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-plt-text tracking-tight">
                {locale === 'ar' ? 'معيار بيوتروسكي F-Score' : 'Piotroski F-Score'}
              </h3>
              <p className="text-[11px] text-plt-muted">
                {locale === 'ar'
                  ? 'مؤشر تقييم الجودة المحاسبية والمالية (0-9)'
                  : '9-point accounting health & quality rating'}
              </p>
            </div>
          </div>

          {/* Rating Badge */}
          <div
            data-testid="piotroski-rating-badge"
            className={`px-2.5 py-1 text-[11px] font-semibold border ${rating.statusClass} rounded-none`}
          >
            {locale === 'ar'
              ? rating.rating === 'high'
                ? 'جودة مرتفعة'
                : rating.rating === 'stable'
                ? 'مستقر'
                : rating.rating === 'weak'
                ? 'ضعيف'
                : 'غير مصنف'
              : rating.label}
          </div>
        </div>

        {/* Score Display Banner */}
        <div className="flex items-center justify-between bg-plt-hover/40 border border-plt-border-soft p-3 mb-4 rounded-none">
          <div className="flex items-baseline gap-1.5 font-sans">
            <span
              data-testid="piotroski-score-value"
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                score != null && score >= 8
                  ? 'text-plt-profit'
                  : score != null && score >= 5
                  ? 'text-plt-warning'
                  : score != null
                  ? 'text-plt-risk'
                  : 'text-plt-muted'
              }`}
            >
              {score != null ? score : '—'}
            </span>
            <span className="text-xs text-plt-muted font-normal">
              / 9 {locale === 'ar' ? 'نقاط' : 'pts'}
            </span>
          </div>

          {/* Visual Mini Dots Meter */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
              const active = score != null && dot <= score;
              const dotColor =
                score != null && score >= 8
                  ? 'bg-plt-profit'
                  : score != null && score >= 5
                  ? 'bg-plt-warning'
                  : 'bg-plt-risk';
              return (
                <div
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-none border border-plt-border-soft transition-colors ${
                    active ? dotColor : 'bg-plt-hover'
                  }`}
                  title={`Criterion ${dot}`}
                />
              );
            })}
          </div>
        </div>

        {/* 3 Pillars Breakdown */}
        <div className="space-y-3.5">
          {pillars.map((pillar) => {
            const pillarPassed = pillar.items.filter((i) => i.passed).length;
            return (
              <div key={pillar.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-plt-text border-b border-plt-border-soft/60 pb-1">
                  <span>{locale === 'ar' ? pillar.titleAr : pillar.titleEn}</span>
                  <span className="text-[11px] text-plt-muted tabular-nums">
                    {pillarPassed} / {pillar.maxPoints} {locale === 'ar' ? 'نقاط' : 'pts'}
                  </span>
                </div>
                <div className="space-y-1">
                  {pillar.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-[11px] py-0.5 px-1 rounded-none hover:bg-plt-hover/40 transition-colors"
                    >
                      <span className="text-plt-muted truncate max-w-[240px] sm:max-w-[280px]">
                        {locale === 'ar' ? item.titleAr : item.titleEn}
                      </span>
                      {item.passed ? (
                        <span className="flex items-center gap-1 text-plt-profit font-medium shrink-0 tabular-nums">
                          <Check size={11} className="stroke-[3]" />
                          <span>{locale === 'ar' ? 'مستوفى (1)' : 'Passed (1)'}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-plt-muted/70 font-normal shrink-0 tabular-nums">
                          <X size={11} className="stroke-[2]" />
                          <span>{locale === 'ar' ? 'غير مستوفى (0)' : 'Missed (0)'}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
