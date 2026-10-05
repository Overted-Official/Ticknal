import type { CanonicalChartVisual } from '@/indicators/canonical/types';

interface CanonicalMetricsDockProps {
  readonly visuals: readonly CanonicalChartVisual[];
  readonly locale: 'en' | 'ar';
}

export default function CanonicalMetricsDock({ visuals, locale }: CanonicalMetricsDockProps) {
  if (visuals.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-px border-y border-white/10 bg-transparent font-sans sm:grid-cols-4">
      {visuals.map((visual) => (
        <div key={visual.id} className="bg-black px-3 py-2">
          <div className="truncate text-[10px] uppercase tracking-wide text-white/45">{visual.indicatorName[locale]} · {visual.outputLabel}</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-white">{visual.latestValue === null ? '—' : String(visual.latestValue)}</div>
        </div>
      ))}
    </div>
  );
}
