'use client';

import { X } from '@/components/ui/icon-library';
import type { CanonicalChartVisual } from '@/indicators/canonical/types';

interface CanonicalMarketDrawerProps {
  readonly visuals: readonly CanonicalChartVisual[];
  readonly locale: 'en' | 'ar';
  readonly onClose: () => void;
}

export default function CanonicalMarketDrawer({ visuals, locale, onClose }: CanonicalMarketDrawerProps) {
  if (visuals.length === 0) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md rounded-none border-l border-white/10 bg-black font-sans text-white">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <span className="font-semibold">{locale === 'ar' ? 'مؤشرات السوق' : 'Market indicators'}</span>
        <button type="button" onClick={onClose} className="p-2 text-white/60 hover:text-white" aria-label="Close market indicators"><X size={16} /></button>
      </header>
      <div className="divide-y divide-white/[0.06]">
        {visuals.map((visual) => (
          <div key={visual.id} className="flex items-center justify-between px-4 py-3">
            <div><div className="text-sm font-medium">{visual.indicatorName[locale]}</div><div className="text-xs text-white/45">{visual.outputLabel}</div></div>
            <span className="tabular-nums text-sm">{visual.latestValue === null ? '—' : String(visual.latestValue)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
