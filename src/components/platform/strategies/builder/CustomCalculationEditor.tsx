'use client';

import type { AdvancedStrategyNode } from './advanced-strategy-model';
import type { FormulaRegister } from '../../../../lib/strategies/formula-engine';
import StudioSelect from './StudioSelect';

const INPUT = 'input-token w-full min-w-0 font-sans text-xs font-medium';
const LABEL = 'mb-1.5 block font-sans text-xs font-medium text-plt-muted';
export function readCalculationRows(value: string | undefined): FormulaRegister[] {
  try { const rows: unknown = JSON.parse(value ?? '[]'); return Array.isArray(rows) ? rows.filter((row): row is FormulaRegister => row && typeof row === 'object' && typeof row.key === 'string' && typeof row.expression === 'string') : []; } catch { return []; }
}
export function readCalculationAliases(value: string | undefined): string[] {
  try { const rows: unknown = JSON.parse(value ?? '[]'); return Array.isArray(rows) ? rows.filter((row): row is string => typeof row === 'string') : []; } catch { return []; }
}
export function renameCalculationResult(rows: readonly FormulaRegister[], outputKey: string | undefined, index: number, name: string) {
  return { rows: rows.map((row, position) => position === index ? { ...row, key: name } : row), outputKey: outputKey === rows[index]?.key ? name : outputKey };
}
export default function CustomCalculationEditor({ node, nodes, locale, onChange }: {
  readonly node: AdvancedStrategyNode;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly locale: 'en' | 'ar';
  readonly onChange: (changes: Partial<Pick<AdvancedStrategyNode, 'connections' | 'parameters'>>) => void;
}) {
  const isAr = locale === 'ar';
  const parameters = node.parameters ?? {};
  const rows = readCalculationRows(parameters.registers);
  const aliases = readCalculationAliases(parameters.aliases);
  const update = (key: string, value: string) => onChange({ parameters: { ...parameters, [key]: value } });
  const updateRows = (next: readonly FormulaRegister[], outputKey = parameters.outputKey) => onChange({ parameters: { ...parameters, registers: JSON.stringify(next), outputKey: next.some((row) => row.key === outputKey) ? outputKey : next.at(-1)?.key ?? '' } });
  if (node.templateId === 'formula-output') {
    const source = nodes.find((candidate) => candidate.id === node.connections?.[0]);
    return <label><span className={LABEL}>{isAr ? 'النتيجة المسماة' : 'Named result'}</span><StudioSelect value={parameters.outputKey ?? ''} onValueChange={(value) => update('outputKey', value)} ariaLabel={isAr ? 'النتيجة المسماة' : 'Named result'}>
      <option value="">{isAr ? 'اختر نتيجة' : 'Choose a result'}</option>
      {readCalculationRows(source?.parameters?.registers).map((row) => <option key={row.key} value={row.key}>{row.key}</option>)}
    </StudioSelect></label>;
  }
  const moveSource = (index: number, direction: -1 | 1) => {
    const connections = [...(node.connections ?? [])]; const next = index + direction;
    if (next < 0 || next >= connections.length) return;
    [connections[index], connections[next]] = [connections[next], connections[index]];
    if (node.templateId === 'formula') {
      const nextAliases = [...aliases]; [nextAliases[index], nextAliases[next]] = [nextAliases[next], nextAliases[index]];
      onChange({ connections, parameters: { ...parameters, aliases: JSON.stringify(nextAliases) } });
    } else onChange({ connections });
  };
  return <>
    <div className="space-y-2">
      <p className="text-xs font-medium text-plt-muted">{isAr ? 'المدخلات المرتبة' : 'Ordered inputs'}</p>
      {(node.connections ?? []).map((id, index) => <div key={id} className="flex min-w-0 items-end gap-2">
        <label className="min-w-0 flex-1"><span className={LABEL}>{nodes.find((candidate) => candidate.id === id)?.customName || nodes.find((candidate) => candidate.id === id)?.title[locale] || id}</span>
          {node.templateId === 'formula' ? <input aria-label={`Input alias ${index + 1}`} className={INPUT} value={aliases[index] ?? ''} maxLength={40} onChange={(event) => update('aliases', JSON.stringify((node.connections ?? []).map((_, position) => position === index ? event.target.value : aliases[position] ?? `input${position + 1}`)))} /> : <span className="block min-h-9 py-2 text-xs text-plt-text">{isAr ? 'ميزة' : 'Feature'} {index + 1}</span>}
        </label>
        <button type="button" aria-label={`Move input ${index + 1} up`} disabled={index === 0} onClick={() => moveSource(index, -1)} className="btn-token btn-secondary h-9 px-2 disabled:opacity-30">↑</button>
        <button type="button" aria-label={`Move input ${index + 1} down`} disabled={index === (node.connections?.length ?? 0) - 1} onClick={() => moveSource(index, 1)} className="btn-token btn-secondary h-9 px-2 disabled:opacity-30">↓</button>
      </div>)}
    </div>
    {node.templateId === 'rbf-model' ? <label><span className={LABEL}>{isAr ? 'أوزان النموذج (JSON)' : 'Model weights (JSON)'}</span><textarea aria-label="Model weights" className={`${INPUT} min-h-40 resize-y`} value={parameters.model ?? ''} onChange={(event) => update('model', event.target.value)} maxLength={40_000} spellCheck={false} /><span className="mt-2 block text-xs leading-5 text-plt-muted">{isAr ? 'أدخل gamma وintercept وprobA وprobB وmean وscale وcoefficients وvectors وwarmupBars. ترتيب الميزات يطابق المدخلات أعلاه.' : 'Supply gamma, intercept, probA, probB, mean, scale, coefficients, vectors, and warmupBars. Feature order must match the inputs above.'}</span></label> : <>
      {rows.map((row, index) => <fieldset key={index} className="space-y-2 border-t border-plt-border-soft pt-3">
        <label><span className={LABEL}>{isAr ? 'اسم النتيجة' : 'Result name'}</span><input aria-label={`Result name ${index + 1}`} value={row.key} maxLength={40} className={INPUT} onChange={(event) => { const renamed = renameCalculationResult(rows, parameters.outputKey, index, event.target.value); updateRows(renamed.rows, renamed.outputKey); }} /></label>
        <label><span className={LABEL}>{isAr ? 'المعادلة' : 'Formula'}</span><textarea aria-label={`Formula ${index + 1}`} className={`${INPUT} min-h-20 resize-y`} maxLength={2048} spellCheck={false} value={row.expression} onChange={(event) => updateRows(rows.map((item, position) => position === index ? { ...item, expression: event.target.value } : item))} /></label>
        <button type="button" disabled={rows.length <= 1} onClick={() => updateRows(rows.filter((_, position) => position !== index))} className="text-xs text-plt-muted hover:text-plt-text disabled:opacity-30">{isAr ? 'حذف النتيجة' : 'Remove result'}</button>
      </fieldset>)}
      <button type="button" disabled={rows.length >= 24} onClick={() => { let index = rows.length + 1; while (rows.some((row) => row.key === `value${index}`)) index += 1; updateRows([...rows, { key: `value${index}`, expression: '0' }]); }} className="btn-token btn-secondary text-xs">{isAr ? '+ إضافة نتيجة' : '+ Add result'}</button>
      <label><span className={LABEL}>{isAr ? 'مخرج الكتلة' : 'Block output'}</span><StudioSelect value={parameters.outputKey ?? ''} onValueChange={(value) => update('outputKey', value)} ariaLabel={isAr ? 'مخرج الكتلة' : 'Block output'}>{rows.map((row, index) => <option key={index} value={row.key}>{row.key || '—'}</option>)}</StudioSelect></label>
      <details className="border-t border-plt-border-soft pt-3 text-xs text-plt-muted"><summary className="cursor-pointer font-medium">{isAr ? 'كيفية كتابة المعادلات' : 'Formula reference'}</summary><p className="mt-2 leading-5">{isAr ? 'تُحسب النتائج من أعلى لأسفل لكل جلسة. استخدم أسماء المدخلات ونتائج سابقة في نفس الكتلة. prev(name, 0) تقرأ الجلسة السابقة، وbar يبدأ من صفر.' : 'Results update from top to bottom each session. Use input aliases and earlier result names. prev(name, 0) reads the previous session; bar starts at zero.'}</p><p className="mt-2 leading-5">{isAr ? 'أمثلة' : 'Examples'}: price &gt; 50 ? 1 : 0 · 0.5 * price + 0.5 * prev(smooth, price) · sma(price, 20, 1)</p><p className="mt-2 leading-5">abs · min · max · clamp · sqrt · log · exp · atan · tanh · round · coalesce · isValid · lag · sma · sum · highest · lowest · stdev · median · rank</p></details>
    </>}
  </>;
}
