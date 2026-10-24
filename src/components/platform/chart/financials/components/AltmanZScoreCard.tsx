'use client';

import React from 'react';
import { useSafeLocale } from '../useSafeLocale';
import { ShieldCheck, ShieldAlert, AlertTriangle } from '@/components/ui/icon-library';
import type { CompanyFinancialStatement } from '../types';
import { getAltmanZone, formatPercent, formatMultiple } from '../formatters';

export interface AltmanZScoreCardProps {
  score: number | null | undefined;
  statement?: CompanyFinancialStatement;
  marketCap?: number | null;
}

export default function AltmanZScoreCard({
  score,
  statement,
  marketCap,
}: AltmanZScoreCardProps) {
  const locale = useSafeLocale();
  const zoneInfo = getAltmanZone(score);

  // Micro-metrics calculation for EM Altman Z''-Score
  // Z = 6.56*X1 + 3.26*X2 + 6.72*X3 + 1.05*X4
  const assets = statement?.totalAssets && statement.totalAssets > 0 ? statement.totalAssets : null;
  const cash = statement?.cashAndEquivalents ?? 0;
  const workingCapital = (statement as any)?.workingCapital ?? cash;
  const x1 = assets ? workingCapital / assets : null;

  const re = (statement as any)?.retainedEarnings ?? statement?.netIncome ?? 0;
  const x2 = assets ? re / assets : null;

  const ebitda = statement?.ebitda ?? statement?.operatingIncome ?? statement?.netIncome ?? 0;
  const x3 = assets ? ebitda / assets : null;

  const debt = statement?.totalDebt ?? statement?.totalLiabilities ?? 0;
  const equity = statement?.totalEquity ?? marketCap ?? 0;
  const x4 = debt > 0 ? equity / debt : equity > 0 ? 10 : null;

  // Horizontal meter percentage calculation
  // Zones: Distress (0 to 1.1) -> 0% to 28%
  //        Grey (1.1 to 2.6)   -> 28% to 60%
  //        Safe (> 2.6 to 6.0) -> 60% to 100%
  let needlePositionPct: number | null = null;
  if (score != null && !Number.isNaN(score)) {
    if (score < 0) {
      needlePositionPct = 3;
    } else if (score <= 1.1) {
      // 0 .. 1.1 maps to 3% .. 28%
      needlePositionPct = 3 + (score / 1.1) * 25;
    } else if (score <= 2.6) {
      // 1.1 .. 2.6 maps to 28% .. 60%
      needlePositionPct = 28 + ((score - 1.1) / (2.6 - 1.1)) * 32;
    } else {
      // 2.6 .. 6.0 maps to 60% .. 97%
      const normalizedSafe = Math.min(score, 6.0);
      needlePositionPct = 60 + ((normalizedSafe - 2.6) / (6.0 - 2.6)) * 37;
    }
  }

  const ZoneIcon =
    zoneInfo.zone === 'safe'
      ? ShieldCheck
      : zoneInfo.zone === 'grey'
      ? AlertTriangle
      : ShieldAlert;

  return (
    <div
      data-testid="altman-z-score-card"
      className="bg-plt-card border border-plt-border-soft p-4 sm:p-5 rounded-none font-sans flex flex-col justify-between"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-plt-border-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-plt-hover border border-plt-border-soft text-plt-text rounded-none">
              <ZoneIcon size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-plt-text tracking-tight">
                {locale === 'ar' ? 'معيار ألتمان للسلامة Z-Score' : 'Altman Z-Score'}
              </h3>
              <p className="text-[11px] text-plt-muted">
                {locale === 'ar'
                  ? 'نموذج الأسواق الناشئة لقياس مخاطر التعثر المالي'
                  : "Emerging markets Z''-Score solvency & distress gauge"}
              </p>
            </div>
          </div>

          {/* Zone Badge */}
          <div
            data-testid="altman-zone-badge"
            className={`px-2.5 py-1 text-[11px] font-semibold border ${zoneInfo.statusClass} rounded-none`}
          >
            {locale === 'ar'
              ? zoneInfo.zone === 'safe'
                ? 'منطقة الأمان'
                : zoneInfo.zone === 'grey'
                ? 'المنطقة الرمادية'
                : zoneInfo.zone === 'distress'
                ? 'منطقة التعثر'
                : 'غير مصنف'
              : zoneInfo.label}
          </div>
        </div>

        {/* Score Display Banner */}
        <div className="flex items-center justify-between bg-plt-hover border border-plt-border-soft p-3 mb-4 rounded-none">
          <div className="flex items-baseline gap-2 font-sans">
            <span
              data-testid="altman-score-value"
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                zoneInfo.zone === 'safe'
                  ? 'text-plt-profit'
                  : zoneInfo.zone === 'grey'
                  ? 'text-plt-warning'
                  : score != null
                  ? 'text-plt-risk'
                  : 'text-plt-muted'
              }`}
            >
              {score != null ? score.toFixed(2) : '—'}
            </span>
            <span className="text-xs text-plt-muted font-normal">
              {locale === 'ar' ? 'مؤشر الملاءة المالية' : 'Solvency Index'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-plt-muted block">
              {locale === 'ar' ? 'تقييم المخاطر:' : 'Risk Evaluation:'}
            </span>
            <span
              className={`text-xs font-semibold ${
                zoneInfo.zone === 'safe'
                  ? 'text-plt-profit'
                  : zoneInfo.zone === 'grey'
                  ? 'text-plt-warning'
                  : score != null
                  ? 'text-plt-risk'
                  : 'text-plt-muted'
              }`}
            >
              {zoneInfo.desc}
            </span>
          </div>
        </div>

        {/* Visual Horizontal Zone Gauge */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-[10px] text-plt-muted uppercase tracking-wider font-medium">
            <span>{locale === 'ar' ? 'مقياس نطاقات السلامة' : 'Zone Spectrum'}</span>
            <span>Z = 6.56X₁ + 3.26X₂ + 6.72X₃ + 1.05X₄</span>
          </div>

          {/* Bar container */}
          <div className="relative w-full h-3 bg-plt-base border border-plt-border-soft rounded-none overflow-hidden flex">
            {/* Distress Zone (< 1.1) */}
            <div
              className="h-full bg-plt-risk-soft border-r border-plt-risk-border"
              style={{ width: '28%' }}
              title="Distress Zone (Z < 1.1)"
            />
            {/* Grey Zone (1.1 - 2.6) */}
            <div
              className="h-full bg-plt-warning-soft border-r border-plt-warning-border"
              style={{ width: '32%' }}
              title="Grey Zone (1.1 <= Z <= 2.6)"
            />
            {/* Safe Zone (> 2.6) */}
            <div
              className="h-full bg-plt-profit-soft"
              style={{ width: '40%' }}
              title="Safe Zone (Z > 2.6)"
            />

            {/* Score Needle Pointer */}
            {needlePositionPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-plt-accent shadow-sm transition-all duration-300"
                style={{ left: `${needlePositionPct}%` }}
                title={`Z-Score: ${score?.toFixed(2)}`}
              />
            )}
          </div>

          {/* Scale Threshold Labels */}
          <div className="flex items-center justify-between text-[10px] font-sans tabular-nums text-plt-muted">
            <span className="text-plt-risk">
              {locale === 'ar' ? 'التعثر (< 1.1)' : 'Distress (< 1.1)'}
            </span>
            <span className="text-plt-warning text-center">
              {locale === 'ar' ? 'الحذر (1.1 - 2.6)' : 'Grey (1.1 - 2.6)'}
            </span>
            <span className="text-plt-profit text-right">
              {locale === 'ar' ? 'الأمان (> 2.6)' : 'Safe (> 2.6)'}
            </span>
          </div>
        </div>

        {/* Micro-Metrics Breakdown */}
        <div className="border-t border-plt-border-soft pt-3">
          <div className="text-[11px] font-semibold text-plt-text uppercase tracking-wider mb-2">
            {locale === 'ar' ? 'العوامل المحددة لمؤشر ألتمان' : 'Component Variables'}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-plt-card border border-plt-border-soft rounded-none">
              <div className="text-[10px] text-plt-muted truncate">
                X₁: {locale === 'ar' ? 'رأس المال العامل / الأصول' : 'Working Capital / Assets'}
              </div>
              <div className="font-bold text-plt-text tabular-nums mt-0.5">
                {x1 != null ? formatPercent(x1 * 100) : '—'}
              </div>
            </div>

            <div className="p-2 bg-plt-card border border-plt-border-soft rounded-none">
              <div className="text-[10px] text-plt-muted truncate">
                X₂: {locale === 'ar' ? 'الأرباح المحتجزة / الأصول' : 'Retained Earnings / Assets'}
              </div>
              <div className="font-bold text-plt-text tabular-nums mt-0.5">
                {x2 != null ? formatPercent(x2 * 100) : '—'}
              </div>
            </div>

            <div className="p-2 bg-plt-card border border-plt-border-soft rounded-none">
              <div className="text-[10px] text-plt-muted truncate">
                X₃: {locale === 'ar' ? 'الأرباح التشغيلية / الأصول' : 'Operating Profit / Assets'}
              </div>
              <div className="font-bold text-plt-text tabular-nums mt-0.5">
                {x3 != null ? formatPercent(x3 * 100) : '—'}
              </div>
            </div>

            <div className="p-2 bg-plt-card border border-plt-border-soft rounded-none">
              <div className="text-[10px] text-plt-muted truncate">
                X₄: {locale === 'ar' ? 'حقوق الملكية / الديون' : 'Equity / Total Debt'}
              </div>
              <div className="font-bold text-plt-text tabular-nums mt-0.5">
                {x4 != null ? formatMultiple(x4) : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
