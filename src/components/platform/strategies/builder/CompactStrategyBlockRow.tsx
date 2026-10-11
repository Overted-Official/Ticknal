'use client';

import {
  AlertTriangle,
  Info,
  Settings,
  X,
} from '@/components/ui/icon-library';

export type StrategyBlockTone = 'input' | 'calculation' | 'buy' | 'state' | 'sell' | 'neutral';

const TONE_COLOR: Readonly<Record<StrategyBlockTone, string>> = {
  input: 'var(--color-tv-blue-500)',
  calculation: 'var(--plt-violet)',
  buy: 'var(--plt-profit)',
  state: 'var(--color-cold-gray-500)',
  sell: 'var(--plt-risk)',
  neutral: 'var(--color-cold-gray-500)',
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
      className={`group/row relative rounded-lg border transition-all duration-150 ${
        selected
          ? 'border-white/40 bg-white/[0.08] ring-1 ring-white/20 shadow-md'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
      }`}
      style={{ borderInlineStartWidth: '3px', borderInlineStartColor: TONE_COLOR[tone] }}
    >
      <div className="flex min-h-8 items-center justify-between gap-2 px-3 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-xs font-semibold tracking-tight text-white/95 leading-tight group-hover/row:text-white">
            {name}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!readOnly && onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
              aria-label={`Configure ${name}`}
            >
              <Settings size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={onInspect}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
            aria-label={`Learn about ${name}`}
          >
            <Info size={12} />
          </button>
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 transition-all hover:border-plt-risk/30 hover:bg-plt-risk/10 hover:text-plt-risk"
              aria-label={`Remove ${name}`}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      {validationMessage && (
        <div className="flex items-center gap-1.5 border-t border-plt-risk/20 bg-plt-risk/5 px-2.5 py-1 font-sans text-[9px] text-plt-risk rounded-b-lg">
          <AlertTriangle size={11} aria-label="Needs attention" />
          <span>{validationMessage}</span>
        </div>
      )}
    </div>
  );
}
