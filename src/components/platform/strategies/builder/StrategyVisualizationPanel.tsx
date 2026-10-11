'use client';

import { useMemo } from 'react';
import type { StrategyVisualizationModel } from './strategy-visualization-model';
import StrategyTickerSearchSelect from './StrategyTickerSearchSelect';
import UnifiedStrategyChart from './UnifiedStrategyChart';

interface StrategyVisualizationPanelProps {
  readonly model: StrategyVisualizationModel | null;
  readonly ticker: string;
  readonly focusedBlockId: string | null;
  readonly locale: 'en' | 'ar';
  readonly onTickerChange: (ticker: string) => void;
  readonly onFocusBlock: (blockId: string) => void;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

export default function StrategyVisualizationPanel({
  model,
  ticker,
  focusedBlockId,
  locale,
  onTickerChange,
  onFocusBlock,
  onBack,
  onContinue,
}: StrategyVisualizationPanelProps) {
  const isAr = locale === 'ar';

  const visiblePoints = useMemo(() => {
    if (!model) return [];
    return model.points;
  }, [model]);

  const visibleMarkers = useMemo(() => {
    if (!model) return [];
    return model.markers;
  }, [model]);

  const visiblePanes = useMemo(() => {
    if (!model) return [];
    return model.panes;
  }, [model]);

  if (!model) {
    return (
      <section className="rounded-2xl border border-white/10 bg-black p-4 sm:p-6 lg:p-7 shadow-sm" aria-label={isAr ? 'تصور الاستراتيجية' : 'Strategy visualization'}>
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-plt-border px-6 py-12 text-center">
          <h2 className="font-sans text-base font-semibold text-white">
            {isAr ? 'الاستراتيجية غير مكتملة' : 'Complete the strategy first'}
          </h2>
          <p className="mt-2 max-w-md font-sans text-xs leading-5 text-plt-muted">
            {isAr
              ? 'أضف قاعدة شراء واحدة وقاعدة بيع واحدة على الأقل لرؤية الاستراتيجية على الرسم البياني.'
              : 'Add at least one Buy rule and one Sell rule to see the strategy on a chart.'}
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-5 min-h-11 rounded-xl border border-plt-border px-5 font-sans text-xs font-semibold text-white transition-colors hover:bg-plt-hover"
            >
              {isAr ? 'العودة إلى البناء' : 'Return to Build'}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black p-0" aria-label={isAr ? 'تصور الاستراتيجية' : 'Strategy visualization'}>
      {/* Ticker Search-Select row */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <StrategyTickerSearchSelect
          value={ticker}
          onChange={onTickerChange}
          locale={locale}
        />
      </div>

      {/* Unified Multi-Pane Strategy Chart (Price on top with signals, full-width indicator panes below) */}
      <UnifiedStrategyChart
        ticker={ticker}
        points={visiblePoints}
        markers={visibleMarkers}
        panes={visiblePanes}
        chartType="candlestick"
        focusedBlockId={focusedBlockId}
        locale={locale}
        onFocusBlock={onFocusBlock}
      />

      {/* Navigation Footer */}
      {(onBack || onContinue) && (
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-plt-border pt-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 rounded-xl border border-plt-border px-5 font-sans text-xs font-semibold text-white transition-colors hover:bg-plt-hover"
            >
              {isAr ? 'العودة إلى البناء' : 'Return to Build'}
            </button>
          )}
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="min-h-11 rounded-xl bg-white px-5 font-sans text-xs font-semibold text-black transition-colors hover:bg-white/90"
            >
              {isAr ? 'المتابعة إلى الاختبار' : 'Continue to Backtest'}
            </button>
          )}
        </footer>
      )}
    </section>
  );
}
