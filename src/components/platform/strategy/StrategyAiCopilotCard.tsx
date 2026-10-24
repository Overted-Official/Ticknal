'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Layers,
  Activity,
  ArrowUpRight,
  Gauge,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { cn } from '@/lib/utils';
import {
  computeKronosSignalAdvisory,
  type KronosForecastPoint,
  type KronosStrategyAdvisory,
} from '@/lib/strategies/ai-copilot/kronos-strategy-advisory';

interface StrategyAiCopilotCardProps {
  symbol: string;
  triggerPrice: number | null;
  signalAction: 'BUY' | 'HOLD' | 'SELL';
  avgBarsHeld?: number;
  chartData?: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  currencySymbol?: string;
  onOverlayForecast?: (predictions: KronosForecastPoint[]) => void;
}

export default function StrategyAiCopilotCard({
  symbol,
  triggerPrice,
  signalAction,
  avgBarsHeld = 8,
  chartData = [],
  currencySymbol = 'EGP',
  onOverlayForecast,
}: StrategyAiCopilotCardProps) {
  const { locale } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState<KronosStrategyAdvisory | null>(null);
  const [rawPredictions, setRawPredictions] = useState<KronosForecastPoint[]>([]);
  const [hasOverlaid, setHasOverlaid] = useState(false);

  // Dynamic holding horizon matching each ticker's strategy (up to 60 sessions)
  const horizonDays = Math.max(3, Math.min(Math.round(avgBarsHeld || 8), 60));
  const displayCurrency = currencySymbol === 'EGP' && locale === 'ar' ? 'ج.م' : currencySymbol;

  useEffect(() => {
    if (!triggerPrice || triggerPrice <= 0 || !chartData || chartData.length < 30) {
      setAdvisory(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const historySlice = chartData.slice(-120);

    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: symbol.replace('.CA', ''),
        history: historySlice,
        predictDays: horizonDays,
        sampleCount: 3,
        temperature: 0.6,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isCancelled || !json?.predictions || !Array.isArray(json.predictions)) {
          return;
        }
        setRawPredictions(json.predictions);
        const computed = computeKronosSignalAdvisory(
          json.predictions,
          triggerPrice,
          signalAction,
          horizonDays
        );
        setAdvisory(computed);
      })
      .catch((err) => {
        if (!isCancelled) console.error('Error in AI Copilot inference:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol, triggerPrice, signalAction, horizonDays, chartData]);

  const handleOverlayClick = () => {
    if (rawPredictions.length === 0) return;
    if (onOverlayForecast) {
      onOverlayForecast(rawPredictions);
    } else {
      window.dispatchEvent(
        new CustomEvent('ticknal:overlay-ai-forecast', {
          detail: { predictions: rawPredictions },
        })
      );
    }
    setHasOverlaid(true);
  };

  if (!triggerPrice || triggerPrice <= 0) {
    return null;
  }

  const isReturnPositive = (advisory?.expectedReturnPercent ?? 0) >= 0;

  return (
    <div className="w-full bg-black border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 select-none font-sans transition-all hover:border-white/20">
      {/* Hidden SVG Definition for Platform Blue/Purple Gradient */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="copilot-sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      {/* 1. Header with Gradient Icon (no border/bleed), Title, Horizon & Risk Badge */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Gradient Icon without border or background box */}
          <Sparkles className="w-5 h-5 shrink-0" color="url(#copilot-sparkle-grad)" />

          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white tracking-tight truncate">
              {locale === 'ar' ? 'مساعد التداول الذكي (Kronos)' : 'AI Strategy Copilot'}
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">
              {locale === 'ar'
                ? `تقييم المسار المتوقع خلال أفق الصفقة (${horizonDays} جلسة تداول)`
                : `Trajectory evaluation over holding horizon (${horizonDays} sessions)`}
            </p>
          </div>
        </div>

        {/* Top-Right: Dynamic Risk Badge (Low Risk / Medium Risk / High Risk) */}
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
            <InlineSpinner className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] hidden sm:inline">
              {locale === 'ar' ? 'جار التحليل...' : 'Analyzing...'}
            </span>
          </div>
        ) : advisory ? (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight border select-none shrink-0',
              advisory.riskLevel === 'LOW_RISK' &&
                'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
              advisory.riskLevel === 'MEDIUM_RISK' &&
                'bg-amber-500/10 border-amber-500/25 text-amber-400',
              advisory.riskLevel === 'HIGH_RISK' &&
                'bg-rose-500/10 border-rose-500/25 text-rose-400'
            )}
          >
            {advisory.riskLevel === 'LOW_RISK' && <TrendingUp className="w-3.5 h-3.5" />}
            {advisory.riskLevel === 'MEDIUM_RISK' && <Activity className="w-3.5 h-3.5" />}
            {advisory.riskLevel === 'HIGH_RISK' && <ShieldAlert className="w-3.5 h-3.5" />}
            <span>
              {locale === 'ar'
                ? advisory.riskLevel === 'LOW_RISK'
                  ? 'مخاطرة منخفضة'
                  : advisory.riskLevel === 'MEDIUM_RISK'
                  ? 'مخاطرة متوسطة'
                  : 'مخاطرة مرتفعة'
                : advisory.riskLevel === 'LOW_RISK'
                ? 'Low Risk'
                : advisory.riskLevel === 'MEDIUM_RISK'
                ? 'Medium Risk'
                : 'High Risk'}
            </span>
          </div>
        ) : null}
      </div>

      {/* 2. Four Core Advisory Cards (2x2 Grid) */}
      {advisory ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Expected Return */}
          <div className="rounded-xl border border-white/[0.08] bg-black p-3 sm:p-3.5 space-y-1 transition-colors hover:border-white/15">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {locale === 'ar' ? 'العائد المتوقع' : 'Expected Return'}
              </span>
              {isReturnPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div
              className={cn(
                'text-lg sm:text-xl font-bold tracking-tight tabular-nums',
                isReturnPositive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isReturnPositive ? '+' : ''}
              {advisory.expectedReturnPercent.toFixed(2)}%
            </div>
            <p className="text-[11px] text-zinc-400 truncate tabular-nums">
              {locale === 'ar' ? 'المستهدف: ' : 'Target: '}
              <span className="text-zinc-300 font-medium">
                {advisory.expectedFinalPrice.toFixed(2)} {displayCurrency}
              </span>
            </p>
          </div>

          {/* Card 2: Max Adverse Excursion (MAE) */}
          <div className="rounded-xl border border-white/[0.08] bg-black p-3 sm:p-3.5 space-y-1 transition-colors hover:border-white/15">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {locale === 'ar' ? 'أقصى هبوط (MAE)' : 'Max Adverse Exc.'}
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div
              className={cn(
                'text-lg sm:text-xl font-bold tracking-tight tabular-nums',
                advisory.maxAdverseExcursionPercent === 0
                  ? 'text-emerald-400'
                  : advisory.maxAdverseExcursionPercent > -6
                  ? 'text-amber-400'
                  : 'text-rose-400'
              )}
            >
              {advisory.maxAdverseExcursionPercent.toFixed(2)}%
            </div>
            <p className="text-[11px] text-zinc-400 truncate tabular-nums">
              {locale === 'ar' ? 'القاع: ' : 'Trough: '}
              <span className="text-zinc-300 font-medium">
                {advisory.maxAdverseTroughPrice.toFixed(2)} {displayCurrency}
              </span>
            </p>
          </div>

          {/* Card 3: Forecasted Price Range at Horizon */}
          <div className="rounded-xl border border-white/[0.08] bg-black p-3 sm:p-3.5 space-y-1 transition-colors hover:border-white/15">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {locale === 'ar' ? 'نطاق السعر المتوقع' : 'Forecasted Range'}
              </span>
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-sm sm:text-base font-semibold text-white tracking-tight tabular-nums truncate">
              {advisory.priceRangeAtHorizon.minPrice.toFixed(2)} -{' '}
              {advisory.priceRangeAtHorizon.maxPrice.toFixed(2)}
            </div>
            <p className="text-[11px] text-zinc-400 truncate tabular-nums">
              {locale === 'ar'
                ? `في نهاية الجلسة ${advisory.holdingHorizonBars}`
                : `End of session ${advisory.holdingHorizonBars}`}
            </p>
          </div>

          {/* Card 4: Model Confidence Rate */}
          <div className="rounded-xl border border-white/[0.08] bg-black p-3 sm:p-3.5 space-y-1 transition-colors hover:border-white/15">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {locale === 'ar' ? 'نسبة ثقة النموذج' : 'Confidence Rate'}
              </span>
              <Gauge className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div
              className={cn(
                'text-lg sm:text-xl font-bold tracking-tight tabular-nums',
                advisory.confidenceScore >= 80
                  ? 'text-sky-400'
                  : advisory.confidenceScore >= 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              )}
            >
              {advisory.confidenceScore}%
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {locale === 'ar'
                ? advisory.confidenceScore >= 80
                  ? 'تقارب مسارات مرتفع'
                  : 'تباين مسارات معتدل'
                : advisory.confidenceScore >= 80
                ? 'High MC Convergence'
                : 'Moderate MC Spread'}
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <InlineSpinner className="w-5 h-5 text-blue-400" />
          <span className="text-xs">
            {locale === 'ar'
              ? 'جارِ حساب توقعات المسار عبر نموذج Kronos...'
              : 'Synthesizing trajectory forecast via Kronos...'}
          </span>
        </div>
      ) : null}

      {/* 3. Action: Overlay on Chart Button */}
      {advisory && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleOverlayClick}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {hasOverlaid
                ? locale === 'ar'
                  ? 'تم تحديث التوقعات على الرسم البياني'
                  : 'Forecast Updated on Chart'
                : locale === 'ar'
                ? 'عرض توقعات الذكاء الاصطناعي على الرسم البياني'
                : 'Overlay AI Forecast on Chart'}
            </span>
          </button>
        </div>
      )}

      {/* 4. Footer Advisory Disclaimer */}
      <div className="pt-0.5 text-center">
        <p className="text-[10px] text-zinc-400 leading-normal">
          {locale === 'ar'
            ? 'وظائف المساعد الذكي تعمل كطبقة استرشادية بحتة، وتبقى قواعد تنفيذ الاستراتيجية الكمية هي المرجعية الأساسية.'
            : 'AI copilot functions strictly as an advisory overlay; quantitative strategy execution rules remain authoritative.'}
        </p>
      </div>
    </div>
  );
}
