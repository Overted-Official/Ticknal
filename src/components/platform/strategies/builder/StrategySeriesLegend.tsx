'use client';

import type { StrategyVisualizationLegendItem } from './strategy-visualization-model';

export interface StrategySeriesLegendProps {
  readonly legendItems: readonly StrategyVisualizationLegendItem[];
  readonly focusedBlockId: string | null;
  readonly locale: 'en' | 'ar';
  readonly onFocusBlock: (blockId: string) => void;
}

export default function StrategySeriesLegend({
  legendItems,
  focusedBlockId,
  locale,
  onFocusBlock,
}: StrategySeriesLegendProps) {
  const isAr = locale === 'ar';

  return (
    <div
      className="mt-4 rounded-xl border border-white/10 bg-black p-3.5"
      aria-label={isAr ? 'دليل الكتل والسلاسل' : 'Series and blocks legend'}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-plt-muted">
          {isAr ? 'الكتل والسلاسل المربوطة (انقر للتركيز)' : 'Mapped Blocks & Series (Click to focus)'}
        </span>
        {focusedBlockId && (
          <button
            type="button"
            onClick={() => onFocusBlock('')}
            className="font-sans text-[9px] text-plt-muted hover:text-white"
          >
            {isAr ? 'إلغاء التحديد' : 'Clear focus'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {legendItems.map((item) => {
          const isFocused = focusedBlockId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onFocusBlock(item.id)}
              aria-pressed={isFocused}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-xs transition-colors ${
                isFocused
                  ? 'border-white/40 bg-plt-active text-white ring-1 ring-white/20'
                  : 'border-white/10 bg-black text-white/70 hover:border-white/25 hover:text-white'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-semibold">{item.name}</span>
              <span className="text-[10px] text-plt-muted group-hover:text-white/60">
                ({item.sourceBlockTitle})
              </span>
              {isFocused && (
                <span className="ms-1 rounded-full border border-white/20 bg-plt-active px-2 py-0.5 text-[8px] uppercase tracking-wider text-white">
                  {isAr ? 'محدد' : 'Focused'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
