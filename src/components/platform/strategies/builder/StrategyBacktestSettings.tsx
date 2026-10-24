'use client';

import { useState } from 'react';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import { parseBacktestAssumptions } from './strategy-backtest-assumptions';

export default function StrategyBacktestSettings({ assumptions, program, locale, onChange }: {
  readonly assumptions: BacktestAssumptions;
  readonly program: ExecutableStrategyProgram;
  readonly locale: 'en' | 'ar';
  readonly onChange: (value: BacktestAssumptions) => void;
}) {
  const isAr = locale === 'ar';
  const lockedFee = program.schemaVersion === 2 ? program.execution?.feeBps : undefined;
  const effectiveFee = lockedFee ?? assumptions.feeBps;
  const [capitalInput, setCapitalInput] = useState(String(assumptions.initialCapital));
  const [feeInput, setFeeInput] = useState(String(effectiveFee));
  const [error, setError] = useState(false);
  const apply = () => {
    const parsed = parseBacktestAssumptions(capitalInput, String(lockedFee ?? feeInput));
    if (!parsed) { setError(true); return; }
    setError(false);
    onChange(parsed);
  };
  return <form className="border-b border-plt-border px-3 py-3" onSubmit={(event) => { event.preventDefault(); apply(); }} aria-label={isAr ? 'إعدادات الاختبار الخلفي' : 'Backtest assumptions'}>
    <div className="flex items-center justify-between gap-2"><h3 className="text-[11px] font-semibold text-plt-text">{isAr ? 'افتراضات الاختبار' : 'Backtest assumptions'}</h3><button type="button" className="text-[10px] text-tv-blue-400 hover:underline" onClick={() => { setCapitalInput('1000'); setFeeInput(String(lockedFee ?? 0)); setError(false); onChange({ initialCapital: 1000, feeBps: lockedFee ?? 0 }); }}>{isAr ? 'مطابقة التقرير' : 'Match Chart Report'}</button></div>
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="min-w-[125px] flex-1 text-[10px] text-plt-muted">{isAr ? 'رأس المال الابتدائي (جنيه)' : 'Initial capital (EGP)'}<input className="input-token mt-1 tabular-nums" type="number" inputMode="decimal" min="0.01" max="1000000000000" step="any" value={capitalInput} onChange={(event) => setCapitalInput(event.target.value)} /></label>
      <label className="min-w-[125px] flex-1 text-[10px] text-plt-muted">{isAr ? 'العمولة لكل جانب (نقطة)' : 'Fee per side (bps)'}<input className="input-token mt-1 tabular-nums" type="number" inputMode="decimal" min="0" max="1000" step="any" value={lockedFee ?? feeInput} disabled={lockedFee !== undefined} onChange={(event) => setFeeInput(event.target.value)} /></label>
      <button type="submit" className="btn-token btn-compact btn-secondary">{isAr ? 'تطبيق' : 'Apply'}</button>
    </div>
    {lockedFee !== undefined && <p className="mt-2 text-[10px] text-plt-muted">{isAr ? 'العمولة مثبتة في إعدادات تنفيذ الاستراتيجية.' : 'Fee is fixed by this strategy’s execution settings.'}</p>}
    {error && <p role="alert" className="mt-2 text-[10px] text-plt-risk">{isAr ? 'أدخل رأس مال موجباً وعمولة من ٠ إلى ١٠٠٠.' : 'Enter positive capital and a fee from 0 to 1,000 bps.'}</p>}
  </form>;
}
