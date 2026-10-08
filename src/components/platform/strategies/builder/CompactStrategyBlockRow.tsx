'use client';

import { AlertTriangle, Info, SlidersHorizontal, Trash2 } from '@/components/ui/icon-library';

export type StrategyBlockTone = 'input' | 'calculation' | 'buy' | 'state' | 'sell' | 'neutral';

const TONE_COLOR: Readonly<Record<StrategyBlockTone, string>> = {
  input: '#2962ff',
  calculation: '#8b5cf6',
  buy: '#089981',
  state: '#787b86',
  sell: '#f23645',
  neutral: '#787b86',
};

interface CompactStrategyBlockRowProps {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly tone: StrategyBlockTone;
  readonly readOnly: boolean;
  readonly selected: boolean;
  readonly validationMessage?: string;
  readonly onInspect: () => void;
  readonly onConfigure?: () => void;
  readonly onRemove?: () => void;
}

export default function CompactStrategyBlockRow({
  id,
  name,
  summary,
  tone,
  readOnly,
  selected,
  validationMessage,
  onInspect,
  onConfigure,
  onRemove,
}: CompactStrategyBlockRowProps) {
  return (
    <div
      id={id}
      className={`border bg-black ${selected ? 'border-white/30' : 'border-white/10'}`}
      style={{ borderInlineStartColor: TONE_COLOR[tone] }}
    >
      <div className="flex min-h-12 items-center gap-2 px-2.5 py-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TONE_COLOR[tone] }} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">{name}</span>
        <span className="hidden min-w-0 flex-[1.4] truncate text-[10px] text-[#787b86] sm:block">{summary}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onInspect}
            className="flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-[#787b86] transition-colors hover:border-white/25 hover:text-white"
            aria-label={`Learn about ${name}`}
          >
            <Info size={13} />
          </button>
          {!readOnly && onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              className="flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-[#787b86] transition-colors hover:border-white/25 hover:text-white"
              aria-label={`Configure ${name}`}
            >
              <SlidersHorizontal size={13} />
            </button>
          )}
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex min-h-9 min-w-9 items-center justify-center border border-white/10 text-[#787b86] transition-colors hover:border-[#f23645]/40 hover:text-[#f23645]"
              aria-label={`Remove ${name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      {validationMessage && (
        <div className="flex items-center gap-1.5 border-t border-[#f23645]/25 px-2.5 py-1.5 text-[9px] text-[#f23645]">
          <AlertTriangle size={11} aria-label="Needs attention" />
          <span>{validationMessage}</span>
        </div>
      )}
    </div>
  );
}
