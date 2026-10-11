'use client';

import { ArrowRight, Calendar, Eye, Lock, ShieldCheck } from '@/components/ui/icon-library';

import type { BacktestMode } from './strategy-backtest-model';

interface BacktestScopeControlsProps {
  readonly mode: BacktestMode;
  readonly locale: 'en' | 'ar';
  readonly customStart: string;
  readonly customEnd: string;
  readonly buildEnd: string;
  readonly unseenRevealed: boolean;
  readonly canRun: boolean;
  readonly onModeChange: (mode: BacktestMode) => void;
  readonly onCustomStartChange: (value: string) => void;
  readonly onCustomEndChange: (value: string) => void;
  readonly onBuildEndChange: (value: string) => void;
  readonly onRevealUnseen: () => void;
}

const MODES: readonly BacktestMode[] = ['all', 'custom', 'holdout'];

export default function BacktestScopeControls({
  mode,
  locale,
  customStart,
  customEnd,
  buildEnd,
  unseenRevealed,
  canRun,
  onModeChange,
  onCustomStartChange,
  onCustomEndChange,
  onBuildEndChange,
  onRevealUnseen,
}: BacktestScopeControlsProps) {
  const isAr = locale === 'ar';
  const label = (item: BacktestMode) => ({
    all: isAr ? 'كل التاريخ' : 'All history',
    custom: isAr ? 'اختر تواريخ' : 'Choose dates',
    holdout: isAr ? 'ابنِ ثم تحقق' : 'Build & verify',
  }[item]);
  const description = (item: BacktestMode) => ({
    all: isAr ? 'اختبر القواعد على كل البيانات المتاحة.' : 'Test the rules across every available market date.',
    custom: isAr ? 'ركز على فترة سوق محددة.' : 'Focus the test on a specific market period.',
    holdout: isAr ? 'ابنِ القواعد أولاً، ثم اختبرها على بيانات لم ترها.' : 'Build the rules first, then reveal how they behave on unseen data.',
  }[item]);

  return (
    <div className="mt-4 border-b border-white/10 pb-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black p-1" role="group" aria-label={isAr ? 'نطاق الاختبار' : 'Backtest scope'}>
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onModeChange(item)}
            aria-pressed={mode === item}
            className={`min-h-10 rounded-lg px-2 text-[10px] font-semibold transition-colors sm:text-[11px] ${
              mode === item ? 'bg-white/[0.08] text-white shadow-xs' : 'text-plt-muted hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            {label(item)}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-5 text-plt-muted">{description(mode)}</p>

      {mode === 'all' && (
        <div className="mt-3 flex items-center gap-2 border-l-2 border-white/20 py-1 ps-3 text-[11px] text-white/70 rtl:border-l-0 rtl:border-r-2">
          <Calendar size={13} className="shrink-0 text-plt-muted" />
          {isAr ? 'من أول جلسة متاحة حتى أحدث جلسة.' : 'Earliest available session through the latest session.'}
        </div>
      )}

      {mode === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-2 animate-in fade-in duration-150">
          <label>
            <span className="mb-1 block text-[9px] font-medium uppercase tracking-[0.08em] text-plt-muted">{isAr ? 'من' : 'From'}</span>
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(event) => onCustomStartChange(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 font-sans text-[11px] tabular-nums text-white [color-scheme:dark] outline-none focus:border-white/30"
            />
          </label>
          <label>
            <span className="mb-1 block text-[9px] font-medium uppercase tracking-[0.08em] text-plt-muted">{isAr ? 'إلى' : 'To'}</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(event) => onCustomEndChange(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 font-sans text-[11px] tabular-nums text-white [color-scheme:dark] outline-none focus:border-white/30"
            />
          </label>
        </div>
      )}

      {mode === 'holdout' && (
        <div className="mt-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white">
                <Lock size={12} className="text-plt-profit" />
                {isAr ? 'فترة البناء' : 'Build period'}
              </div>
              <p className="mt-1 text-[9px] leading-4 text-plt-muted">{isAr ? 'اضبط القواعد باستخدام هذه النتائج فقط.' : 'Tune rules using only these results.'}</p>
              <label className="mt-2 block">
                <span className="sr-only">{isAr ? 'نهاية فترة البناء' : 'Build period end'}</span>
                <input
                  type="date"
                  value={buildEnd}
                  onChange={(event) => onBuildEndChange(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 font-sans text-[10px] tabular-nums text-white [color-scheme:dark] outline-none focus:border-white/30"
                />
              </label>
            </div>

            <div className="flex items-center text-plt-muted rtl:rotate-180"><ArrowRight size={14} /></div>

            <div className={`rounded-xl border p-3.5 bg-white/[0.02] ${unseenRevealed ? 'border-brand-blue/50' : 'border-white/10'}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white">
                {unseenRevealed ? <ShieldCheck size={12} className="text-brand-blue" /> : <Eye size={12} className="text-plt-muted" />}
                {isAr ? 'الفترة غير المرئية' : 'Unseen period'}
              </div>
              <p className="mt-1 text-[9px] leading-4 text-plt-muted">
                {unseenRevealed
                  ? (isAr ? 'النتائج معروضة الآن للمقارنة.' : 'Results are now revealed for comparison.')
                  : (isAr ? 'تبقى النتائج مخفية حتى تثبيت القواعد.' : 'Results stay hidden until the rules are locked.')}
              </p>
              <p className="mt-4 text-[10px] tabular-nums text-white/70">{isAr ? 'بعد تاريخ البناء ← الأحدث' : 'After build date → latest'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRevealUnseen}
            disabled={!canRun || unseenRevealed}
            className={`mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
              unseenRevealed
                ? 'border-brand-blue/40 text-brand-blue'
                : canRun
                  ? 'border-white/20 text-white hover:bg-white/[0.04]'
                  : 'cursor-not-allowed border-white/10 text-plt-muted'
            }`}
          >
            {unseenRevealed ? <ShieldCheck size={14} /> : <Eye size={14} />}
            {unseenRevealed
              ? (isAr ? 'تم عرض النتائج غير المرئية' : 'Unseen results revealed')
              : (isAr ? 'اختبر الفترة غير المرئية' : 'Test unseen period')}
          </button>
          {!canRun && (
            <p className="mt-2 text-center text-[10px] text-plt-muted">
              {isAr ? 'أضف قاعدة شراء وقاعدة بيع أولاً.' : 'Add at least one buy rule and one sell rule first.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
