'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  BookOpen,
  Calculator,
  CheckCircle2,
  LineChart,
  Sliders,
  TrendingUp,
  X,
} from '@/components/ui/icon-library';

import AdvancedNodeEditor from './AdvancedNodeEditor';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import {
  getInspectorName,
  isInspectorReadOnly,
  type StrategyInspectorChange,
  type StrategyInspectorTab,
  type StrategyInspectorTarget,
} from './strategy-inspector-model';
import type { StrategyBuilderIndicatorOption, StrategyRuleOperator } from './strategy-builder-model';
import { getIndicatorGuide, RSI_GUIDE, OHLC_GUIDE } from './indicator-guides';
import IndicatorVisualizerChart from './IndicatorVisualizerChart';

interface StrategyBlockInspectorProps {
  readonly target: StrategyInspectorTarget;
  readonly tab: StrategyInspectorTab;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly onTabChange: (tab: StrategyInspectorTab) => void;
  readonly onChange: (change: StrategyInspectorChange) => void;
  readonly onClose: () => void;
}

const OPERATORS: readonly StrategyRuleOperator[] = ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'];

export default function StrategyBlockInspector({
  target,
  tab,
  nodes,
  indicators,
  locale,
  onTabChange,
  onChange,
  onClose,
}: StrategyBlockInspectorProps) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isAr = locale === 'ar';
  const rawName = getInspectorName(target, locale);
  const readOnly = isInspectorReadOnly(target);

  // Key or identifier for loading guide data
  const targetId = target.kind === 'advanced-node' ? target.node.id : target.rule.id;
  const initialGuideId =
    target.kind === 'advanced-node'
      ? target.node.id
      : target.indicator?.id ?? target.rule.indicatorId;

  // Active guide selection within the drawer (allows toggling to RSI explicitly)
  const [activeGuideId, setActiveGuideId] = useState<string>(initialGuideId || 'rsi');
  const guide = getIndicatorGuide(activeGuideId);

  // Available tabs
  const tabs: readonly StrategyInspectorTab[] = readOnly
    ? ['learn', 'visualizer', 'formula', 'signals', 'output']
    : ['configure', 'learn', 'visualizer', 'formula', 'signals', 'output'];

  const activeTab: StrategyInspectorTab = tabs.includes(tab) ? tab : 'learn';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previous?.focus();
    };
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={`${rawName} guide`}
    >
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Drawer Sheet (Pure Black, sharp edges, docked right, elevated z-[100]) */}
      <aside
        ref={dialogRef}
        className="relative z-10 w-full max-w-xl md:max-w-2xl h-full flex flex-col bg-black text-white border-s border-white/10 rounded-none shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <header className="shrink-0 border-b border-white/10 bg-black/95 px-5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/25">
                  <span className="w-1 h-1 rounded-full bg-brand-blue" />
                  {isAr ? guide.category.ar : guide.category.en}
                </span>
                <span className="text-[10px] text-white/40 tabular-nums font-normal">
                  {guide.scale}
                </span>
              </div>
              <h3 className="mt-1.5 truncate text-base sm:text-lg font-bold tracking-tight text-white">
                {isAr ? guide.name.ar : guide.name.en}
              </h3>
              <p className="mt-0.5 text-[11px] text-plt-muted truncate">
                {guide.author} · {guide.year}
              </p>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white cursor-pointer"
              aria-label={isAr ? 'إغلاق الدليل' : 'Close guide'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Guide Switcher Chips */}
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/[0.06] overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40 shrink-0">
              {isAr ? 'نماذج الأدلة:' : 'Featured Guides:'}
            </span>
            <button
              type="button"
              onClick={() => setActiveGuideId('rsi')}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                activeGuideId === 'rsi'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/10'
              }`}
            >
              {isAr ? 'مؤشر RSI (دليل كامل)' : 'Relative Strength Index (RSI)'}
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideId('typhon-market-data')}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                activeGuideId === 'typhon-market-data'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/10'
              }`}
            >
              {isAr ? 'بيانات OHLC' : 'OHLC Price History'}
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav
          className="shrink-0 flex overflow-x-auto border-b border-white/10 bg-white/[0.01] px-4 gap-1 no-scrollbar"
          aria-label={isAr ? 'أقسام الدليل' : 'Guide sections'}
        >
          {tabs.map((candidate) => {
            const isActive = activeTab === candidate;
            const labels: Record<StrategyInspectorTab, { en: string; ar: string }> = {
              learn: { en: 'Guide & Theory', ar: 'الدليل والنظرية' },
              visualizer: { en: 'Interactive Chart', ar: 'المخطط التفاعلي' },
              formula: { en: 'Formulas & Math', ar: 'المعادلات والحساب' },
              signals: { en: 'Setups & Signals', ar: 'إشارات واستراتيجيات' },
              configure: { en: 'Configure Rule', ar: 'إعداد القاعدة' },
              output: { en: 'Output Data', ar: 'مخرجات البيانات' },
              usage: { en: 'Used By', ar: 'مستخدم في' },
            };

            const icons: Record<StrategyInspectorTab, React.ReactNode> = {
              learn: <BookOpen size={12} />,
              visualizer: <LineChart size={12} />,
              formula: <Calculator size={12} />,
              signals: <TrendingUp size={12} />,
              configure: <Sliders size={12} />,
              output: <CheckCircle2 size={12} />,
              usage: <CheckCircle2 size={12} />,
            };

            return (
              <button
                key={candidate}
                type="button"
                onClick={() => onTabChange(candidate)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-brand-blue text-white'
                    : 'border-transparent text-plt-muted hover:text-white hover:border-white/20'
                }`}
              >
                {icons[candidate]}
                <span>{isAr ? labels[candidate].ar : labels[candidate].en}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer Body Content */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: GUIDE & THEORY */}
          {activeTab === 'learn' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Executive Summary */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                  {isAr ? 'نظرة عامة على المؤشر' : 'Executive Overview'}
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
                  {isAr ? guide.summary.ar : guide.summary.en}
                </p>
              </div>

              {/* Core Concept */}
              <div className="rounded-xl border border-white/10 bg-black p-4 space-y-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {isAr ? 'المفهوم الأساسي وديناميكية السوق' : 'Core Mechanism & Market Dynamics'}
                </span>
                <p className="text-xs leading-relaxed text-neutral-300">
                  {isAr ? guide.coreConcept.ar : guide.coreConcept.en}
                </p>
              </div>

              {/* Key Zones & Interpretation */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {isAr ? 'المناطق الهيكلية وتفسير المستويات' : 'Key Levels & Regime Zones'}
                  </h4>
                  <span className="text-[10px] text-white/40 tabular-nums">
                    {guide.keyZones.length} {isAr ? 'مناطق' : 'zones'}
                  </span>
                </div>

                <div className="grid gap-2.5">
                  {guide.keyZones.map((zone) => {
                    const toneBorder =
                      zone.tone === 'profit'
                        ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                        : zone.tone === 'risk'
                        ? 'border-red-500/30 bg-red-500/[0.04]'
                        : 'border-white/10 bg-white/[0.02]';

                    const toneBadge =
                      zone.tone === 'profit'
                        ? 'text-emerald-400 bg-emerald-500/15'
                        : zone.tone === 'risk'
                        ? 'text-red-400 bg-red-500/15'
                        : 'text-blue-400 bg-blue-500/15';

                    return (
                      <div
                        key={zone.range}
                        className={`rounded-lg border p-3 flex flex-col gap-1.5 ${toneBorder}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-white">
                            {isAr ? zone.name.ar : zone.name.en}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tabular-nums ${toneBadge}`}
                          >
                            {zone.range}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          {isAr ? zone.description.ar : zone.description.en}
                        </p>
                        <div className="mt-1 pt-1.5 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] text-white/50">
                          <span className="font-semibold text-white/70">{isAr ? 'الإجراء المقترح:' : 'Recommended Action:'}</span>
                          <span className="text-white/90">{isAr ? zone.action.ar : zone.action.en}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Egyptian Exchange (EGX) Best Practices */}
              {guide.egxBestPractices.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      {isAr ? 'أفضل الممارسات في البورصة المصرية (EGX)' : 'Egyptian Exchange (EGX) Best Practices'}
                    </h4>
                  </div>
                  <ul className="space-y-2 text-[11px] text-neutral-300">
                    {guide.egxBestPractices.map((practice, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-white/40 shrink-0 mt-0.5">•</span>
                        <span>{isAr ? practice.ar : practice.en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Pitfalls to Avoid */}
              {guide.commonPitfalls.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={13} className="text-red-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      {isAr ? 'أخطاء شائعة يجب تجنبها' : 'Common Pitfalls to Avoid'}
                    </h4>
                  </div>
                  <ul className="space-y-2 text-[11px] text-neutral-300">
                    {guide.commonPitfalls.map((pitfall, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-red-400/60 shrink-0 mt-0.5">•</span>
                        <span>{isAr ? pitfall.ar : pitfall.en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE VISUALIZER CHART */}
          {activeTab === 'visualizer' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr ? 'الرسم البياني التفاعلي المتزامن' : 'Synchronized Multi-Pane Visualizer'}
                </h4>
                <p className="mt-0.5 text-[11px] text-plt-muted">
                  {isAr
                    ? 'حرك المؤشر عبر الشموع السعرية لمعاينة سلوك المؤشر بدقة عند نقاط الشراء وجني الأرباح والانفراج السلبي.'
                    : 'Hover across the price candles to inspect exact RSI behavior, oversold crossovers, and divergence markers.'}
                </p>
              </div>

              {/* Embedded Chart */}
              <IndicatorVisualizerChart indicatorId={guide.id} locale={locale} />

              {/* Chart Legend & Signal Explanations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-2.5">
                  <span className="font-bold text-emerald-400 block">{isAr ? 'إشارة الشراء (Buy)' : 'Buy Signal (Crossover)'}</span>
                  <p className="mt-1 text-white/70 text-[10px]">
                    {isAr
                      ? 'اختراق RSI لمستوى 30 صعوداً بعد انتهاء الضغط البيعي يؤكد بدء موجة الارتداد.'
                      : 'RSI crossing back ABOVE 30 confirms that capitulation selling has ceased.'}
                  </p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-2.5">
                  <span className="font-bold text-red-400 block">{isAr ? 'إشارة الخروج (Exit)' : 'Exit Signal (Overbought)'}</span>
                  <p className="mt-1 text-white/70 text-[10px]">
                    {isAr
                      ? 'كسر RSI لمستوى 70 هبوطاً بعد بلوغ ذروة الشراء ينذر بجني أرباح وشيك.'
                      : 'RSI crossing back BELOW 70 signals momentum rollover and secures gains.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMULAS & MATH */}
          {activeTab === 'formula' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr ? 'المعادلات الرياضية وطريقة الحساب' : 'Mathematical Formulation & Steps'}
                </h4>
                <p className="mt-0.5 text-[11px] text-plt-muted">
                  {isAr
                    ? 'خطوات الحساب الرياضي الدقيق المطبقة في محرك Ticknal الكمي.'
                    : 'Step-by-step quantitative calculation executed by Ticknal backtesting engine.'}
                </p>
              </div>

              <div className="space-y-3">
                {guide.formulas.map((formula) => (
                  <div
                    key={formula.step}
                    className="rounded-xl border border-white/10 bg-black p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {isAr ? formula.title.ar : formula.title.en}
                      </span>
                      <span className="text-[10px] text-white/40 font-semibold tabular-nums">
                        {isAr ? `خطوة ${formula.step}` : `Step ${formula.step}`}
                      </span>
                    </div>

                    {/* Math Block */}
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-center overflow-x-auto font-sans">
                      <code className="text-xs sm:text-sm font-semibold text-brand-blue tracking-wider tabular-nums">
                        {formula.math}
                      </code>
                    </div>

                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      {isAr ? formula.explanation.ar : formula.explanation.en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SETUPS & SIGNALS */}
          {activeTab === 'signals' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr ? 'إشارات وقواعد التداول المنهجية' : 'Systematic Trading Setups'}
                </h4>
                <p className="mt-0.5 text-[11px] text-plt-muted">
                  {isAr
                    ? 'قواعد تداول جاهزة للتطبيق مباشرة في منشئ استراتيجيات Ticknal.'
                    : 'Production-grade rules ready to author directly in Ticknal Strategy Studio.'}
                </p>
              </div>

              <div className="space-y-3">
                {guide.setups.map((setup, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-black p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white">
                        {isAr ? setup.title.ar : setup.title.en}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          setup.type === 'Buy'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {setup.type}
                      </span>
                    </div>

                    {/* Trigger Code */}
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-white/50">{isAr ? 'القاعدة في المنشئ:' : 'Studio Rule:'}</span>
                      <span className="font-semibold text-xs text-white tabular-nums">{setup.rule}</span>
                    </div>

                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      {isAr ? setup.logic.ar : setup.logic.en}
                    </p>

                    <div className="mt-1 pt-2 border-t border-white/[0.06] text-[10px] text-white/50 flex items-center gap-1.5">
                      <span className="font-semibold text-white/70">{isAr ? 'إحصائية الأداء:' : 'Benchmark note:'}</span>
                      <span className="text-neutral-300">{setup.benchmarkPerformance}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divergence Table */}
              {guide.divergences.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {isAr ? 'أنماط الانفراج الفني (Divergences)' : 'Divergence Reversal Patterns'}
                  </h4>

                  <div className="grid gap-2">
                    {guide.divergences.map((div, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1.5 text-[11px]"
                      >
                        <span className="font-bold text-white block">
                          {isAr ? div.title.ar : div.title.en}
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                          <div className="bg-black/60 rounded p-1.5 border border-white/[0.06]">
                            <span className="text-white/40 block">{isAr ? 'حركة السعر:' : 'Price Action:'}</span>
                            <span className="font-semibold text-white">{isAr ? div.priceAction.ar : div.priceAction.en}</span>
                          </div>
                          <div className="bg-black/60 rounded p-1.5 border border-white/[0.06]">
                            <span className="text-white/40 block">{isAr ? 'سلوك RSI:' : 'RSI Behavior:'}</span>
                            <span className="font-semibold text-white">{isAr ? div.indicatorAction.ar : div.indicatorAction.en}</span>
                          </div>
                        </div>
                        <p className="text-neutral-300 text-[10px] pt-1 leading-relaxed">
                          {isAr ? div.interpretation.ar : div.interpretation.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CONFIGURE RULE (For live editing rules in strategy) */}
          {activeTab === 'configure' && target.kind === 'simple-rule' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr ? 'تعديل معلمات القاعدة' : 'Configure Strategy Rule'}
                </h4>
                <p className="mt-0.5 text-[11px] text-plt-muted">
                  {isAr
                    ? 'عدّل فترة الحساب وشرط المقارنة ومستوى التفعيل لهذه القاعدة مباشرة.'
                    : 'Adjust period window, conditional operator, and trigger threshold.'}
                </p>
              </div>

              <div className="space-y-3.5 rounded-xl border border-white/10 bg-black p-4">
                <label className="block text-[11px] font-semibold text-plt-muted">
                  {isAr ? 'فترة الحساب (Period)' : 'Calculation Period (Bars)'}
                  <input
                    type="number"
                    min="1"
                    value={target.rule.period}
                    onChange={(event) =>
                      onChange({
                        kind: 'simple-rule',
                        changes: { period: Math.max(1, Number(event.target.value) || 1) },
                      })
                    }
                    className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 font-sans text-xs tabular-nums text-white outline-none focus:border-brand-blue"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-plt-muted">
                  {isAr ? 'شرط المقارنة (Condition)' : 'Trigger Condition'}
                  <select
                    value={target.rule.operator}
                    onChange={(event) =>
                      onChange({
                        kind: 'simple-rule',
                        changes: { operator: event.target.value as StrategyRuleOperator },
                      })
                    }
                    className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 font-sans text-xs text-white outline-none focus:border-brand-blue"
                  >
                    {OPERATORS.map((operator) => (
                      <option key={operator} value={operator}>
                        {operator.replace(/([A-Z])/g, ' $1')}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-plt-muted">
                  {isAr ? 'مستوى التفعيل (Threshold Value)' : 'Threshold Level Value'}
                  <input
                    type="number"
                    value={target.rule.value}
                    onChange={(event) =>
                      onChange({
                        kind: 'simple-rule',
                        changes: { value: Number(event.target.value) || 0 },
                      })
                    }
                    className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 font-sans text-xs tabular-nums text-white outline-none focus:border-brand-blue"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'configure' && target.kind === 'advanced-node' && !readOnly && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <AdvancedNodeEditor
                node={target.node}
                nodes={nodes}
                indicators={indicators}
                locale={locale}
                onChange={(changes) => onChange({ kind: 'advanced-node', changes })}
              />
            </div>
          )}

          {/* TAB 6: OUTPUT DATA */}
          {activeTab === 'output' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {isAr ? 'مخرجات هذا العنصر' : 'Available Outputs & Series'}
                </h4>
                <p className="mt-0.5 text-[11px] text-plt-muted">
                  {isAr
                    ? 'البيانات المنبعثة من هذا العنصر والتي يمكن استهلاكها في الحسابات اللاحقة.'
                    : 'Data emitted by this block to subsequent downstream strategy components.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-plt-muted">
                    {isAr ? 'اسم مخرج البيانات' : 'Output Identifier'}
                  </span>
                  <strong className="mt-1.5 block font-semibold text-white text-sm">
                    {target.kind === 'simple-rule'
                      ? `${target.side}_${target.indicator?.id ?? 'rsi'}`
                      : target.node.outputName || target.node.customName || target.node.title[locale]}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-plt-muted">
                    {isAr ? 'قيمة نموذجية حالية' : 'Live Sample Output'}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold tabular-nums text-brand-blue">
                      {guide.id === 'rsi' ? '61.40' : '71.50 EGP'}
                    </span>
                    <span className="text-[10px] text-plt-muted">
                      {isAr ? 'محسوبة على سعر الإغلاق الأخير' : 'Evaluated on latest close bar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Sticky Footer */}
        <footer className="shrink-0 flex items-center justify-between border-t border-white/10 bg-black/95 px-5 py-3 text-xs">
          <div className="flex items-center gap-2 text-white/50 text-[11px]">
            <BookOpen size={13} />
            <span>{isAr ? 'توثيق كمي معتمد في منصة Ticknal' : 'Verified Ticknal Quantitative Guide'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/30 transition-colors text-xs font-semibold cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
