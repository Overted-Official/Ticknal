'use client';

import { useId, useMemo, useState } from 'react';

import { AlertTriangle, Plus } from '@/components/ui/icon-library';

import { getAvailableUpstreamNodes, makeConditionScoreChanges, readConditionScoreRows, type ConditionScoreDraftRow } from './advanced-builder-state';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import IndicatorPicker from './IndicatorPicker';
import StudioSelect from './StudioSelect';
import CustomCalculationEditor, { readCalculationAliases } from './CustomCalculationEditor';
import type { StrategyBuilderIndicatorOption } from './strategy-builder-model';

interface AdvancedNodeEditorProps {
  readonly node: AdvancedStrategyNode;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly onChange: (changes: Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>>) => void;
}

const INPUT_CLASS = 'strategy-editor-input min-h-10 w-full rounded-lg border border-white/15 bg-black px-3 font-sans text-xs font-medium text-white outline-none transition-colors focus:border-brand-blue';
const LABEL_CLASS = 'mb-1.5 block font-sans text-xs font-medium text-white/65';

function fieldLabel(key: string): string {
  return key.replace(/([A-Z])/gu, ' $1').replace(/^./u, (letter) => letter.toUpperCase());
}

function stepNumericValue(value: string, direction: -1 | 1, step: number, min?: number, max?: number): string {
  const current = Number(value);
  const base = Number.isFinite(current) && value.trim() !== '' ? current : 0;
  const precision = Math.max(0, (String(step).split('.')[1] ?? '').length);
  const next = Number((base + direction * step).toFixed(precision));
  return String(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
}

function NumberField({ label, value, onValueChange, min, max, step = 1 }: {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}) {
  const id = useId();
  const changeBy = (direction: -1 | 1) => {
    onValueChange(stepNumericValue(value, direction, step, min, max));
  };
  return <div>
    <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
    <div className="strategy-editor-number flex min-h-10 overflow-hidden rounded-lg border border-white/15 bg-black focus-within:border-brand-blue">
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onValueChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 font-sans text-xs font-medium tabular-nums text-white outline-none" />
      <button type="button" aria-label={`Decrement ${label}`} onClick={() => changeBy(-1)} className="w-9 border-s border-white/10 font-sans text-base font-medium text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white">−</button>
      <button type="button" aria-label={`Increment ${label}`} onClick={() => changeBy(1)} className="w-9 border-s border-white/10 font-sans text-base font-medium text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white">+</button>
    </div>
  </div>;
}

function nodeName(node: AdvancedStrategyNode, locale: 'en' | 'ar'): string {
  return node.customName || node.title[locale];
}

export default function AdvancedNodeEditor({
  node,
  nodes,
  indicators,
  locale,
  onChange,
}: AdvancedNodeEditorProps) {
  const isAr = locale === 'ar';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [tickerDraft, setTickerDraft] = useState('');
  const parameters = node.parameters ?? {};
  const isBuyTerminal = node.templateId === 'buy-terminal';
  const isSellTerminal = node.templateId === 'sell-terminal';
  const isTerminal = isBuyTerminal || isSellTerminal;
  const numericUpstreamNodes = useMemo(() => getAvailableUpstreamNodes(nodes, node.id)
    .filter((candidate) => ['input', 'calculation', 'state'].includes(candidate.kind)), [node.id, nodes]);
  const scoreSourceNodes = useMemo(() => numericUpstreamNodes.filter((candidate) => candidate.kind !== 'state' && candidate.templateId !== 'execution-policy'), [numericUpstreamNodes]);
  const upstreamNodes = useMemo(() => {
    const available = getAvailableUpstreamNodes(nodes, node.id);
    if (isBuyTerminal) return available.filter((candidate) => candidate.stage === 'entry' && candidate.parameters?.actionSide !== 'sell');
    if (isSellTerminal) return available.filter((candidate) => candidate.stage === 'exit' || (candidate.stage === 'entry' && candidate.parameters?.actionSide === 'sell'));
    if (node.templateId === 'position-memory' || node.templateId === 'rolling-state') return available.filter((candidate) => candidate.kind === 'input' || candidate.kind === 'calculation');
    if (node.templateId === 'dynamic-target') return available.filter((candidate) => candidate.kind === 'input' || candidate.kind === 'calculation' || candidate.kind === 'state');
    if (node.templateId === 'trailing-exit') return available.filter((candidate) => candidate.templateId === 'rolling-state' && (candidate.parameters?.operation ?? 'maximum') === 'maximum');
    if (node.templateId === 'formula-output') return available.filter((candidate) => candidate.templateId === 'formula');
    return available;
  }, [isBuyTerminal, isSellTerminal, node.id, node.templateId, nodes]);
  const selectedIndicatorIds = useMemo(
    () => new Set(parameters.indicatorId ? [parameters.indicatorId] : []),
    [parameters.indicatorId],
  );
  const ruleIndicator = indicators.find((indicator) => indicator.id === parameters.indicatorId);
  const numericOutputs = ruleIndicator?.outputs.filter((output) => output.kind === 'number') ?? [];
  const showsConnectionWeights = node.templateId === 'weighted-composite';
  const isMultiConnection = showsConnectionWeights || ['math-operation', 'formula', 'rbf-model'].includes(node.templateId ?? '') || isTerminal;
  const isRegimeCalculation = node.templateId === 'math-operation' && (parameters.operation ?? '').startsWith('regime');
  const supportsConnections = !parameters.sourceRuleId && !['market-input', 'parameter', 'execution-policy', 'condition-score', 'ticker-select'].includes(node.templateId ?? '') && !isRegimeCalculation;
  const scoreRows = readConditionScoreRows(parameters.conditions);
  const updateScoreRows = (rows: readonly ConditionScoreDraftRow[]) => onChange(makeConditionScoreChanges(parameters, rows));
  const updateScoreRow = (index: number, changes: Partial<ConditionScoreDraftRow>) => updateScoreRows(scoreRows.map((row, position) => position === index ? { ...row, ...changes } : row));
  const alternateSymbols: string[] = (() => { try { const value: unknown = JSON.parse(parameters.alternateSymbols ?? '[]'); return Array.isArray(value) ? value.filter((symbol): symbol is string => typeof symbol === 'string') : []; } catch { return []; } })();
  const updateProfileSource = (key: 'defaultSourceId' | 'alternateSourceId', value: string) => {
    const next = { ...parameters, [key]: value };
    onChange({ parameters: next, connections: [...new Set([next.defaultSourceId, next.alternateSourceId].filter(Boolean))] });
  };
  const addAlternateSymbol = () => {
    const symbol = tickerDraft.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.!-]{0,19}$/.test(symbol) || alternateSymbols.includes(symbol) || alternateSymbols.length >= 400) return;
    updateParameter('alternateSymbols', JSON.stringify([...alternateSymbols, symbol]));
    setTickerDraft('');
  };

  const updateParameter = (key: string, value: string) => {
    onChange({ parameters: { ...parameters, [key]: value } });
  };
  const overrideRows: { symbol: string; value: number | string }[] = (() => {
    try {
      const parsed: unknown = JSON.parse(parameters.symbolOverrides ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === 'object' && typeof row.symbol === 'string'
        && (typeof row.value === 'number' || typeof row.value === 'string')) : [];
    } catch { return []; }
  })();
  const updateOverrideRows = (rows: readonly { symbol: string; value: number | string }[]) => updateParameter('symbolOverrides', JSON.stringify(rows));
  const updateRegimeSource = (field: 'regimeValueId' | 'regimeId', value: string) => {
    const next = { ...parameters, regimeValueId: parameters.regimeValueId ?? node.connections?.[0] ?? '', regimeId: parameters.regimeId ?? node.connections?.[1] ?? '', [field]: value };
    onChange({ parameters: next, connections: next.regimeValueId && next.regimeId ? [next.regimeValueId, next.regimeId] : [] });
  };

  const toggleConnection = (sourceId: string) => {
    const current = node.connections ?? [];
    const connections = isMultiConnection
      ? (current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId])
      : (current[0] === sourceId ? [] : [sourceId]);
    if (node.templateId === 'formula') {
      const aliases = readCalculationAliases(parameters.aliases);
      const used = new Set(aliases);
      let next = 1; while (used.has(`input${next}`)) next += 1;
      onChange({ connections, parameters: { ...parameters, aliases: JSON.stringify(connections.map((id) => current.includes(id) ? aliases[current.indexOf(id)] ?? `input${current.indexOf(id) + 1}` : `input${next}`)) } });
    } else onChange({ connections });
  };

  const exitGateFields = () => {
    const eligible = numericUpstreamNodes;
    return <>
      <label>
        <span className={LABEL_CLASS}>{isAr ? 'شرط إضافي للخروج' : 'Additional exit condition'}</span>
        <StudioSelect value={parameters.gateMode ?? (parameters.gateInputId ? 'condition' : 'always')} onValueChange={(value) => updateParameter('gateMode', value)} ariaLabel={isAr ? 'شرط إضافي للخروج' : 'Additional exit condition'}>
          <option value="always">{isAr ? 'بدون شرط إضافي' : 'No additional condition'}</option>
          <option value="condition">{isAr ? 'فقط عند تحقق شرط' : 'Only when a condition is met'}</option>
        </StudioSelect>
      </label>
      {(parameters.gateMode === 'condition' || (!parameters.gateMode && parameters.gateInputId)) && <>
        <label>
          <span className={LABEL_CLASS}>{isAr ? 'القيمة المشروطة' : 'Condition value'}</span>
          <StudioSelect value={parameters.gateInputId ?? ''} onValueChange={(value) => updateParameter('gateInputId', value)} ariaLabel={isAr ? 'القيمة المشروطة' : 'Condition value'}>
            <option value="">{isAr ? 'اختر قيمة' : 'Choose a value'}</option>
            {eligible.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}
          </StudioSelect>
        </label>
        <label>
          <span className={LABEL_CLASS}>{isAr ? 'قارن مع' : 'Compare condition against'}</span>
          <StudioSelect value={parameters.gateComparisonMode ?? 'value'} onValueChange={(value) => updateParameter('gateComparisonMode', value)} ariaLabel={isAr ? 'قارن مع' : 'Compare condition against'}>
            <option value="value">{isAr ? 'مستوى ثابت' : 'Fixed level'}</option>
            <option value="series">{isAr ? 'قيمة أخرى' : 'Another value'}</option>
          </StudioSelect>
        </label>
        {parameters.gateComparisonMode === 'series' && <label>
          <span className={LABEL_CLASS}>{isAr ? 'القيمة المرجعية' : 'Reference value'}</span>
          <StudioSelect value={parameters.gateCompareInputId ?? ''} onValueChange={(value) => updateParameter('gateCompareInputId', value)} ariaLabel={isAr ? 'القيمة المرجعية' : 'Reference value'}>
            <option value="">{isAr ? 'اختر قيمة' : 'Choose a value'}</option>
            {eligible.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}
          </StudioSelect>
        </label>}
        <label>
          <span className={LABEL_CLASS}>{isAr ? 'المقارنة' : 'Comparison'}</span>
          <StudioSelect value={parameters.gateOperator ?? 'isAbove'} onValueChange={(value) => updateParameter('gateOperator', value)} ariaLabel={isAr ? 'المقارنة' : 'Comparison'}>
            <option value="isAbove">{isAr ? 'أعلى من' : 'Is above'}</option>
            <option value="isBelow">{isAr ? 'أقل من' : 'Is below'}</option>
            <option value="crossesAbove">{isAr ? 'يعبر لأعلى' : 'Crosses above'}</option>
            <option value="crossesBelow">{isAr ? 'يعبر لأسفل' : 'Crosses below'}</option>
          </StudioSelect>
        </label>
        <NumberField label={parameters.gateComparisonMode === 'series' ? (isAr ? 'الفرق المطلوب' : 'Required difference') : (isAr ? 'المستوى' : 'Level')} value={parameters.gateThreshold ?? '0'} onValueChange={(value) => updateParameter('gateThreshold', value)} step={0.1} />
      </>}
    </>;
  };

  const renderTemplateFields = () => {
    switch (node.templateId) {
      case 'condition-score':
        return <div className="space-y-3">
          <p className="font-sans text-xs leading-5 text-plt-muted">{isAr ? 'كل مقارنة صحيحة تكسب وزنها. القيم المفقودة لا تكسب نقاطاً. الناتج من 0 إلى 100.' : 'Each passing comparison earns its weight. Missing values earn zero. The result is 0–100.'}</p>
          {scoreRows.map((row, index) => <fieldset key={index} className="space-y-3 border-t border-white/10 pt-3">
            <legend className="font-sans text-xs font-semibold text-white">{isAr ? `شرط ${index + 1}` : `Condition ${index + 1}`}</legend>
            <label><span className={LABEL_CLASS}>{isAr ? 'القيمة المراد فحصها' : 'Value to test'}</span><StudioSelect value={row.inputId} onValueChange={(value) => updateScoreRow(index, { inputId: value })} ariaLabel={`${isAr ? 'القيمة' : 'Value'} ${index + 1}`}><option value="">{isAr ? 'اختر قيمة' : 'Choose value'}</option>{scoreSourceNodes.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}</StudioSelect></label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label><span className={LABEL_CLASS}>{isAr ? 'المقارنة' : 'Comparison'}</span><StudioSelect value={row.operator} onValueChange={(value) => updateScoreRow(index, { operator: value as ConditionScoreDraftRow['operator'] })} ariaLabel={`${isAr ? 'مقارنة' : 'Comparison'} ${index + 1}`}><option value="gt">{isAr ? 'أكبر من' : 'Greater than'}</option><option value="gte">{isAr ? 'أكبر أو يساوي' : 'At least'}</option><option value="lt">{isAr ? 'أقل من' : 'Less than'}</option><option value="lte">{isAr ? 'أقل أو يساوي' : 'At most'}</option><option value="eq">{isAr ? 'يساوي' : 'Equals'}</option></StudioSelect></label>
              <label><span className={LABEL_CLASS}>{isAr ? 'مقارنة مع' : 'Compare with'}</span><StudioSelect value={row.compareMode ?? 'fixed'} onValueChange={(value) => updateScoreRow(index, value === 'series' ? { compareMode: 'series', compareInputId: '' } : { compareMode: 'fixed', compareInputId: undefined })} ariaLabel={`${isAr ? 'نوع المرجع' : 'Reference type'} ${index + 1}`}><option value="fixed">{isAr ? 'مستوى ثابت' : 'Fixed level'}</option><option value="series">{isAr ? 'قيمة أخرى' : 'Another value'}</option></StudioSelect></label>
            </div>
            {row.compareMode === 'series' && <label><span className={LABEL_CLASS}>{isAr ? 'القيمة المرجعية' : 'Reference value'}</span><StudioSelect value={row.compareInputId ?? ''} onValueChange={(value) => updateScoreRow(index, { compareInputId: value })} ariaLabel={`${isAr ? 'مرجع' : 'Reference'} ${index + 1}`}><option value="">{isAr ? 'اختر قيمة' : 'Choose value'}</option>{scoreSourceNodes.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}</StudioSelect></label>}
            <div className="grid min-w-0 gap-3 sm:grid-cols-2"><NumberField label={row.compareMode === 'series' ? (isAr ? 'الإزاحة' : 'Offset') : (isAr ? 'المستوى' : 'Level')} value={row.threshold} onValueChange={(value) => updateScoreRow(index, { threshold: value })} step={0.1} /><NumberField label={isAr ? 'الوزن' : 'Weight'} value={row.weight} onValueChange={(value) => updateScoreRow(index, { weight: value })} min={0.01} max={1000} step={0.1} /></div>
            <button type="button" onClick={() => updateScoreRows(scoreRows.filter((_, position) => position !== index))} className="btn-token btn-secondary btn-micro">{isAr ? 'حذف الشرط' : 'Remove condition'}</button>
          </fieldset>)}
          {scoreRows.length < 12 && <button type="button" onClick={() => updateScoreRows([...scoreRows, { inputId: scoreSourceNodes[0]?.id ?? '', operator: 'gt', compareMode: 'fixed', threshold: '0', weight: '1' }])} className="btn-token btn-secondary btn-compact w-full">+ {isAr ? 'إضافة شرط' : 'Add condition'}</button>}
        </div>;
      case 'ticker-select':
        return <div className="space-y-3">
          <p className="font-sans text-xs leading-5 text-plt-muted">{isAr ? 'استخدم الحساب الافتراضي لمعظم الشركات، والحساب البديل للرموز المدرجة فقط.' : 'Use the default calculation for most companies and the alternate only for listed tickers.'}</p>
          {(['defaultSourceId', 'alternateSourceId'] as const).map((key) => <label key={key}><span className={LABEL_CLASS}>{key === 'defaultSourceId' ? (isAr ? 'الحساب الافتراضي' : 'Default calculation') : (isAr ? 'الحساب البديل' : 'Alternate calculation')}</span><StudioSelect value={parameters[key] ?? ''} onValueChange={(value) => updateProfileSource(key, value)} ariaLabel={key === 'defaultSourceId' ? 'Default calculation' : 'Alternate calculation'}><option value="">{isAr ? 'اختر حساباً' : 'Choose calculation'}</option>{scoreSourceNodes.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}</StudioSelect></label>)}
          <div><span className={LABEL_CLASS}>{isAr ? 'شركات تستخدم البديل' : 'Companies using alternate'}</span><div className="flex flex-wrap gap-1.5">{alternateSymbols.map((symbol) => <button key={symbol} type="button" aria-label={`${isAr ? 'حذف' : 'Remove'} ${symbol}`} onClick={() => updateParameter('alternateSymbols', JSON.stringify(alternateSymbols.filter((item) => item !== symbol)))} className="badge badge-symbol border border-white/15 px-2 py-1 font-sans text-xs">{symbol} ×</button>)}</div></div>
          <div className="flex min-w-0 gap-2"><input type="text" aria-label={isAr ? 'أضف رمز شركة' : 'Add company ticker'} value={tickerDraft} maxLength={20} onChange={(event) => setTickerDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addAlternateSymbol(); } }} placeholder="TMGH" className={INPUT_CLASS} /><button type="button" onClick={addAlternateSymbol} className="btn-token btn-secondary btn-compact shrink-0">{isAr ? 'إضافة' : 'Add'}</button></div>
        </div>;
      case 'formula':
      case 'formula-output':
      case 'rbf-model':
        return <CustomCalculationEditor node={node} nodes={nodes} locale={locale} onChange={onChange} />;
      case 'market-input':
        return (
          <><label>
            <span className={LABEL_CLASS}>{isAr ? 'سلسلة البيانات' : 'Data series'}</span>
            <StudioSelect value={parameters.series ?? 'ohlcv'} onValueChange={(value) => updateParameter('series', value)} ariaLabel={isAr ? 'سلسلة البيانات' : 'Data series'}>
              <option value="ohlcv">OHLCV</option>
              <option value="benchmark" disabled>{isAr ? 'مؤشر مرجعي · قريباً' : 'Benchmark index · coming soon'}</option>
              <option value="external" disabled>{isAr ? 'سلسلة سوق أخرى · قريباً' : 'Another market series · coming soon'}</option>
            </StudioSelect>
          </label><label><span className={LABEL_CLASS}>{isAr ? 'حقل الأسعار' : 'Price field'}</span><StudioSelect value={parameters.field ?? 'close'} onValueChange={(value) => updateParameter('field', value)} ariaLabel={isAr ? 'حقل الأسعار' : 'Price field'}><option value="close">Close</option><option value="open">Open</option><option value="high">High</option><option value="low">Low</option><option value="volume">Volume</option></StudioSelect></label></>
        );
      case 'parameter':
        return (
          <>
            <NumberField label={isAr ? 'القيمة الافتراضية' : 'Default value'} value={parameters.value ?? '1'} onValueChange={(value) => updateParameter('value', value)} step={0.1} />
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className={LABEL_CLASS}>{isAr ? 'قيم خاصة بالشركات' : 'Company-specific values'}</span>
                <button type="button" onClick={() => updateOverrideRows([...overrideRows, { symbol: '', value: '' }])} disabled={overrideRows.length >= 400} className="font-sans text-xs font-medium text-brand-blue disabled:opacity-40">+ {isAr ? 'أضف شركة' : 'Add company'}</button>
              </div>
              {overrideRows.map((row, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                <label><span className={LABEL_CLASS}>{isAr ? 'رمز الشركة' : 'Ticker'}</span><input type="text" value={row.symbol} onChange={(event) => updateOverrideRows(overrideRows.map((item, position) => position === index ? { ...item, symbol: event.target.value } : item))} className={INPUT_CLASS} autoCapitalize="characters" maxLength={20} /></label>
                <NumberField label={isAr ? 'القيمة' : 'Value'} value={String(row.value)} onValueChange={(value) => updateOverrideRows(overrideRows.map((item, position) => position === index ? { ...item, value } : item))} step={0.1} />
                <button type="button" aria-label={`${isAr ? 'إزالة الشركة' : 'Remove company'} ${row.symbol || index + 1}`} onClick={() => updateOverrideRows(overrideRows.filter((_, position) => position !== index))} className="h-10 min-w-10 rounded-lg border border-white/10 font-sans text-sm text-white/65 hover:bg-white/[0.04]">×</button>
              </div>)}
            </div>
          </>
        );
      case 'execution-policy':
        return <>
          <label><span className={LABEL_CLASS}>{isAr ? 'موعد التنفيذ' : 'Fill timing'}</span><StudioSelect value={parameters.fillPolicy ?? 'next-session-open'} onValueChange={(value) => updateParameter('fillPolicy', value)} ariaLabel={isAr ? 'موعد التنفيذ' : 'Fill timing'}><option value="next-session-open">{isAr ? 'افتتاح الجلسة التالية' : 'Next-session open'}</option><option value="signal-close">{isAr ? 'إغلاق يوم الإشارة' : 'Signal-day close'}</option></StudioSelect></label>
          <label><span className={LABEL_CLASS}>{isAr ? 'حجم المركز' : 'Share sizing'}</span><StudioSelect value={parameters.shareSizing ?? 'fractional'} onValueChange={(value) => updateParameter('shareSizing', value)} ariaLabel={isAr ? 'حجم المركز' : 'Share sizing'}><option value="fractional">{isAr ? 'أسهم كسرية' : 'Fractional shares'}</option><option value="wholeShares">{isAr ? 'أسهم كاملة فقط' : 'Whole shares only'}</option></StudioSelect></label>
          <NumberField label={isAr ? 'العمولة (نقطة أساس؛ اتركه فارغاً لاستخدام الافتراضي)' : 'Commission (bps; blank uses test default)'} value={parameters.feeBps ?? ''} onValueChange={(value) => updateParameter('feeBps', value)} min={0} max={1000} step={1} />
          <NumberField label={isAr ? 'الانزلاق السعري (نقطة أساس)' : 'Slippage (bps)'} value={parameters.slippageBps ?? '0'} onValueChange={(value) => updateParameter('slippageBps', value)} min={0} max={1000} step={1} />
          <label><span className={LABEL_CLASS}>{isAr ? 'تقييم المركز المفتوح' : 'Open-position valuation'}</span><StudioSelect value={parameters.valuation ?? 'net-liquidation'} onValueChange={(value) => updateParameter('valuation', value)} ariaLabel={isAr ? 'تقييم المركز المفتوح' : 'Open-position valuation'}><option value="net-liquidation">{isAr ? 'صافي التصفية (تكاليف مركبة)' : 'Net liquidation (compounded costs)'}</option><option value="net-liquidation-linear-costs">{isAr ? 'صافي التصفية (تكاليف مجمعة)' : 'Net liquidation (additive costs)'}</option></StudioSelect></label>
          <p className="text-xs leading-5 text-plt-muted">{isAr ? '١٠٠ نقطة أساس = ١٪. تُطبّق العمولة والانزلاق عند الشراء والبيع.' : '100 bps = 1%. Commission and slippage apply to both buys and sells.'}</p>
          {(parameters.fillPolicy ?? 'next-session-open') === 'signal-close' && <p className="text-xs leading-5 text-plt-warning">{isAr ? 'التنفيذ عند الإغلاق يستخدم سعر الإغلاق نفسه لتقييم الإشارة وتنفيذها؛ هذا افتراض تاريخي متفائل وليس محاكاة مضمونة للتداول الفعلي.' : 'Signal-close fills use the same closing price to decide and execute. This is optimistic historical modeling, not a guarantee of live execution.'}</p>}
        </>;
      case 'indicator':
        return (
          <>
            <div>
              <button
                type="button"
                onClick={() => setPickerOpen((current) => !current)}
                aria-expanded={pickerOpen}
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-white/15 px-3 font-sans text-xs font-medium transition-colors hover:border-white/30 focus-visible:border-brand-blue focus-visible:outline-none"
              >
                <span className={parameters.indicatorId ? 'text-white/75' : 'text-white'}>{parameters.indicatorId ? (isAr ? 'تغيير المؤشر' : 'Change indicator') : (isAr ? 'اختر مؤشراً' : 'Choose indicator')}</span>
                <Plus size={13} className="shrink-0 text-white/45" />
              </button>
              {pickerOpen && (
                <IndicatorPicker
                  indicators={indicators}
                  selectedIds={selectedIndicatorIds}
                  locale={locale}
                  onAdd={(indicator) => {
                    const numeric = indicator.outputs.filter((output) => output.kind === 'number');
                    onChange({
                      customName: !node.customName || node.customName === parameters.indicatorName ? indicator.name : node.customName,
                      parameters: {
                        indicatorId: indicator.id,
                        indicatorName: indicator.name,
                        indicatorBacklogId: indicator.backlogId,
                        ...Object.fromEntries(Object.entries(indicator.defaultParameters).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => [key, String(value)])),
                        ...(numeric.length === 1 ? { outputKey: numeric[0].key } : {}),
                      },
                    });
                    setPickerOpen(false);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
            {ruleIndicator && Object.entries(ruleIndicator.defaultParameters).map(([key, defaultValue]) => {
              const label = isAr && key === 'period' ? 'الفترة' : fieldLabel(key);
              if (typeof defaultValue === 'number') return <NumberField key={key} label={label} value={parameters[key] ?? String(defaultValue)} onValueChange={(value) => updateParameter(key, value)} min={Number.isInteger(defaultValue) && /period|length|lookback|window|fast|slow|signal/iu.test(key) ? 1 : undefined} max={/period|length|lookback|window/iu.test(key) ? 1000 : undefined} step={Number.isInteger(defaultValue) ? 1 : 0.1} />;
              if (typeof defaultValue === 'boolean') return <label key={key}><span className={LABEL_CLASS}>{label}</span><StudioSelect value={parameters[key] ?? String(defaultValue)} onValueChange={(value) => updateParameter(key, value)} ariaLabel={label}><option value="true">{isAr ? 'نعم' : 'On'}</option><option value="false">{isAr ? 'لا' : 'Off'}</option></StudioSelect></label>;
              if (typeof defaultValue === 'string' && key === 'seedMode' && parameters.indicatorId === 'supertrend') return <label key={key}><span className={LABEL_CLASS}>{isAr ? 'تهيئة الاتجاه' : 'Trend initialization'}</span><StudioSelect value={parameters[key] ?? defaultValue} onValueChange={(value) => updateParameter(key, value)} ariaLabel={isAr ? 'تهيئة الاتجاه' : 'Trend initialization'}><option value="bullish">{isAr ? 'قياسية — تبدأ من الحد السفلي' : 'Standard — lower band first'}</option><option value="upper-band-first">{isAr ? 'تبدأ من الحد العلوي — متوافقة مع نموذج Typhon' : 'Upper band first — Typhon-compatible'}</option></StudioSelect></label>;
              if (typeof defaultValue === 'string' && key === 'mode' && defaultValue === 'canonical') return <label key={key}><span className={LABEL_CLASS}>{isAr ? 'طريقة الحساب' : 'Calculation method'}</span><StudioSelect value={parameters[key] ?? defaultValue} onValueChange={(value) => updateParameter(key, value)} ariaLabel={isAr ? 'طريقة الحساب' : 'Calculation method'}><option value="canonical">{isAr ? 'القياسية' : 'Standard'}</option><option value="legacy-technicalindicators">{isAr ? 'الكلاسيكية — متوافقة مع الاستراتيجيات التاريخية' : 'Classic — historical strategy compatible'}</option></StudioSelect></label>;
              if (typeof defaultValue === 'string' && key === 'source') return <label key={key}><span className={LABEL_CLASS}>{label}</span><StudioSelect value={parameters[key] ?? defaultValue} onValueChange={(value) => updateParameter(key, value)} ariaLabel={label}>{['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'].map((option) => <option key={option} value={option}>{option.toUpperCase()}</option>)}</StudioSelect></label>;
              if (typeof defaultValue === 'string') return <label key={key}><span className={LABEL_CLASS}>{label}</span><input value={parameters[key] ?? defaultValue} onChange={(event) => updateParameter(key, event.target.value)} className={INPUT_CLASS} /></label>;
              return null;
            })}
            {numericOutputs.length > 1 && <label><span className={LABEL_CLASS}>{isAr ? 'مخرج المؤشر' : 'Indicator output'}</span><StudioSelect value={parameters.outputKey ?? ''} onValueChange={(value) => updateParameter('outputKey', value)} ariaLabel={isAr ? 'مخرج المؤشر' : 'Indicator output'}><option value="">{isAr ? 'اختر مخرجاً' : 'Choose an output'}</option>{numericOutputs.map((output) => <option key={output.key} value={output.key}>{output.key}</option>)}</StudioSelect></label>}
          </>
        );
      case 'weighted-composite':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'التوحيد' : 'Normalization'}</span>
            <StudioSelect value={parameters.normalization ?? 'zeroToHundred'} onValueChange={(value) => updateParameter('normalization', value)} ariaLabel={isAr ? 'التوحيد' : 'Normalization'}>
              <option value="zeroToHundred">0–100</option>
              <option value="zScore">Z-score</option>
              <option value="minMax">Min–max</option>
              <option value="none">{isAr ? 'بدون' : 'None'}</option>
            </StudioSelect>
          </label>
        );
      case 'transform':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الطريقة' : 'Method'}</span>
              <StudioSelect value={parameters.method ?? 'ema'} onValueChange={(value) => updateParameter('method', value)} ariaLabel={isAr ? 'الطريقة' : 'Method'}>
                <option value="ema">EMA</option>
                <option value="rma">{isAr ? 'متوسط وايلدر (RMA)' : 'Wilder RMA'}</option>
                <option value="sma">SMA</option>
                <option value="wma">WMA</option>
                <option value="lag">{isAr ? 'قيمة سابقة' : 'Lagged value'}</option>
                <option value="absolute">{isAr ? 'القيمة المطلقة' : 'Absolute value'}</option>
                <option value="atan">{isAr ? 'ظل عكسي (راديان)' : 'Arctangent (radians)'}</option>
                <option value="clamp">{isAr ? 'حصر بين حدين' : 'Clamp to bounds'}</option>
                <option value="normalize">{isAr ? 'توحيد' : 'Normalize'}</option>
              </StudioSelect>
            </label>
            {!['normalize', 'absolute', 'atan', 'clamp'].includes(parameters.method ?? 'ema') && <NumberField label={parameters.method === 'lag' ? (isAr ? 'عدد الفترات السابقة' : 'Bars back') : (isAr ? 'الفترة' : 'Period')} value={parameters.period ?? '3'} onValueChange={(value) => updateParameter('period', value)} min={1} max={1000} />}
            {['ema', 'rma'].includes(parameters.method ?? 'ema') && <label><span className={LABEL_CLASS}>{isAr ? 'بداية التنعيم' : 'Smoothing start'}</span><StudioSelect value={parameters.seedMode ?? 'periodMean'} onValueChange={(value) => updateParameter('seedMode', value)} ariaLabel={isAr ? 'بداية التنعيم' : 'Smoothing start'}><option value="periodMean">{isAr ? 'بعد اكتمال الفترة' : 'After full period'}</option><option value="first">{isAr ? 'من أول قيمة متاحة' : 'First available value'}</option></StudioSelect></label>}
            {parameters.method === 'clamp' && <><NumberField label={isAr ? 'الحد الأدنى' : 'Lower bound'} value={parameters.lowerBound ?? '0'} onValueChange={(value) => updateParameter('lowerBound', value)} step={0.1} /><NumberField label={isAr ? 'الحد الأعلى' : 'Upper bound'} value={parameters.upperBound ?? '100'} onValueChange={(value) => updateParameter('upperBound', value)} step={0.1} /></>}
          </>
        );
      case 'rolling-statistic':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الإحصاء' : 'Statistic'}</span>
              <StudioSelect value={parameters.operation ?? 'mean'} onValueChange={(value) => updateParameter('operation', value)} ariaLabel={isAr ? 'الإحصاء' : 'Statistic'}>
                <option value="minimum">{isAr ? 'الحد الأدنى' : 'Minimum'}</option>
                <option value="maximum">{isAr ? 'الحد الأقصى' : 'Maximum'}</option>
                <option value="mean">{isAr ? 'المتوسط' : 'Mean'}</option>
                <option value="median">{isAr ? 'الوسيط' : 'Median'}</option>
                <option value="stdDev">{isAr ? 'الانحراف المعياري' : 'Standard deviation'}</option>
                <option value="percentileRank">{isAr ? 'الترتيب المئوي' : 'Percentile rank'}</option>
              </StudioSelect>
            </label>
            <NumberField label={isAr ? 'الفترة' : 'Period'} value={parameters.period ?? '20'} onValueChange={(value) => updateParameter('period', value)} min={1} max={1000} />
            {(parameters.operation ?? 'mean') === 'median' && <NumberField label={isAr ? 'الحد الأدنى للتاريخ' : 'Minimum history'} value={parameters.minPeriod ?? parameters.period ?? '20'} onValueChange={(value) => updateParameter('minPeriod', value)} min={1} max={Number(parameters.period ?? '20')} />}
          </>
        );
      case 'math-operation':
        return (
          <><label>
            <span className={LABEL_CLASS}>{isAr ? 'العملية' : 'Operation'}</span>
            <StudioSelect value={parameters.operation ?? 'add'} onValueChange={(value) => updateParameter('operation', value)} ariaLabel={isAr ? 'العملية' : 'Operation'}>
              <option value="add">{isAr ? 'جمع' : 'Add'}</option>
              <option value="subtract">{isAr ? 'طرح' : 'Subtract'}</option>
              <option value="multiply">{isAr ? 'ضرب' : 'Multiply'}</option>
              <option value="divide">{isAr ? 'قسمة' : 'Divide'}</option>
              <option value="min">{isAr ? 'أصغر قيمة بين المدخلات' : 'Smallest input'}</option>
              <option value="max">{isAr ? 'أكبر قيمة بين المدخلات' : 'Largest input'}</option>
              <option value="coalesce">{isAr ? 'أول قيمة متاحة' : 'First available value'}</option>
              <option value="regimeStart">{isAr ? 'القيمة عند بداية النظام' : 'Value at regime start'}</option>
              <option value="regimeMaximum">{isAr ? 'القمة منذ بداية النظام' : 'Maximum since regime start'}</option>
              <option value="regimeMinimum">{isAr ? 'القاع منذ بداية النظام' : 'Minimum since regime start'}</option>
            </StudioSelect>
          </label>
          {isRegimeCalculation && <>
            <label><span className={LABEL_CLASS}>{isAr ? 'القيمة المتتبعة' : 'Value to track'}</span><StudioSelect value={parameters.regimeValueId ?? node.connections?.[0] ?? ''} onValueChange={(value) => updateRegimeSource('regimeValueId', value)} ariaLabel={isAr ? 'القيمة المتتبعة' : 'Value to track'}><option value="">{isAr ? 'اختر قيمة' : 'Choose value'}</option>{numericUpstreamNodes.filter((candidate) => candidate.kind !== 'state').map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}</StudioSelect></label>
            <label><span className={LABEL_CLASS}>{isAr ? 'معرّف النظام' : 'Regime identifier'}</span><StudioSelect value={parameters.regimeId ?? node.connections?.[1] ?? ''} onValueChange={(value) => updateRegimeSource('regimeId', value)} ariaLabel={isAr ? 'معرّف النظام' : 'Regime identifier'}><option value="">{isAr ? 'اختر نظاماً' : 'Choose regime'}</option>{numericUpstreamNodes.filter((candidate) => candidate.kind !== 'state').map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}</StudioSelect></label>
          </>}
          </>
        );
      case 'condition':
      case 'sell-condition':
        return (
          <>
            {!parameters.sourceRuleId && <label>
              <span className={LABEL_CLASS}>{isAr ? 'قارن مع' : 'Compare against'}</span>
              <StudioSelect value={parameters.compareMode ?? 'value'} onValueChange={(value) => updateParameter('compareMode', value)} ariaLabel={isAr ? 'قارن مع' : 'Compare against'}>
                <option value="value">{isAr ? 'مستوى ثابت' : 'Fixed level'}</option>
                <option value="series">{isAr ? 'قيمة أخرى أو ذاكرة الصفقة' : 'Another value or trade memory'}</option>
              </StudioSelect>
            </label>}
            {!parameters.sourceRuleId && parameters.compareMode === 'series' && <label>
              <span className={LABEL_CLASS}>{isAr ? 'القيمة المرجعية' : 'Reference value'}</span>
              <StudioSelect value={parameters.compareInputId ?? ''} onValueChange={(value) => updateParameter('compareInputId', value)} ariaLabel={isAr ? 'القيمة المرجعية' : 'Reference value'}>
                <option value="">{isAr ? 'اختر قيمة' : 'Choose a value'}</option>
                {numericUpstreamNodes.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}
              </StudioSelect>
            </label>}
            {parameters.sourceRuleId && numericOutputs.length > 1 && <label>
              <span className={LABEL_CLASS}>{isAr ? 'مخرج المؤشر' : 'Indicator output'}</span>
              <StudioSelect value={parameters.outputKey ?? ''} onValueChange={(value) => updateParameter('outputKey', value)} ariaLabel={isAr ? 'مخرج المؤشر' : 'Indicator output'}>
                <option value="">{isAr ? 'اختر مخرجاً' : 'Choose an output'}</option>
                {numericOutputs.map((output) => <option key={output.key} value={output.key}>{output.key}</option>)}
              </StudioSelect>
            </label>}
            {nodes.filter((candidate) => candidate.templateId === node.templateId).findIndex((candidate) => candidate.id === node.id) > 0 && <label>
              <span className={LABEL_CLASS}>{isAr ? 'اربط بالقاعدة السابقة' : 'Join with previous rule'}</span>
              <StudioSelect value={parameters.connector ?? 'or'} onValueChange={(value) => updateParameter('connector', value)} ariaLabel={isAr ? 'اربط بالقاعدة السابقة' : 'Join with previous rule'}>
                <option value="and">{isAr ? 'و — يجب تحقق القاعدتين' : 'AND — both rules must match'}</option>
                <option value="or">{isAr ? 'أو — تكفي إحدى القاعدتين' : 'OR — either rule can match'}</option>
              </StudioSelect>
            </label>}
            {parameters.sourceRuleId && ruleIndicator && Object.hasOwn(ruleIndicator.defaultParameters, 'period') && <NumberField label={isAr ? 'الفترة' : 'Period'} value={parameters.period ?? String(ruleIndicator.defaultParameters.period)} onValueChange={(value) => updateParameter('period', value)} min={1} max={1000} />}
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'المقارنة' : 'Comparison'}</span>
              <StudioSelect value={parameters.operator ?? 'crossesAbove'} onValueChange={(value) => updateParameter('operator', value)} ariaLabel={isAr ? 'المقارنة' : 'Comparison'}>
                <option value="crossesAbove">{isAr ? 'يعبر لأعلى' : 'Crosses above'}</option>
                <option value="crossesBelow">{isAr ? 'يعبر لأسفل' : 'Crosses below'}</option>
                <option value="isAbove">{isAr ? 'أعلى من' : 'Is above'}</option>
                <option value="isBelow">{isAr ? 'أقل من' : 'Is below'}</option>
              </StudioSelect>
            </label>
            <NumberField label={parameters.compareMode === 'series' && !parameters.sourceRuleId ? (isAr ? 'الفرق المطلوب' : 'Required difference') : (isAr ? 'القيمة' : 'Value')} value={parameters.compareValue ?? '0'} onValueChange={(value) => updateParameter('compareValue', value)} step={0.1} />
          </>
        );
      case 'priority-trigger':
        return (() => {
          const levels = (parameters.thresholds ?? '').split(',').map((value) => value.trim());
          const updateLevel = (index: number, value: string) => updateParameter('thresholds', levels.map((level, position) => position === index ? value : level).join(', '));
          return <div className="space-y-3">
            <span className={LABEL_CLASS}>{isAr ? 'المستويات حسب الأولوية' : 'Priority levels'}</span>
            {levels.map((level, index) => <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1"><NumberField label={isAr ? `مستوى الأولوية ${index + 1}` : `Priority level ${index + 1}`} value={level} onValueChange={(value) => updateLevel(index, value)} step={0.1} /></div>
              {levels.length > 1 && <button type="button" aria-label={isAr ? `حذف المستوى ${index + 1}` : `Remove level ${index + 1}`} onClick={() => updateParameter('thresholds', levels.filter((_, position) => position !== index).join(', '))} className="h-10 shrink-0 rounded-lg border border-white/15 px-2.5 font-sans text-xs font-medium text-white/65 hover:border-white/30 hover:text-white">×</button>}
            </div>)}
            {levels.length < 12 && <button type="button" onClick={() => updateParameter('thresholds', [...levels, '0'].join(', '))} className="rounded-lg border border-white/15 px-3 py-2 font-sans text-xs font-medium text-white/75 hover:border-white/30">+ {isAr ? 'أضف مستوى' : 'Add level'}</button>}
          </div>;
        })();
      case 'position-memory':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الحفظ عند' : 'Capture at'}</span>
              <StudioSelect value={parameters.capture ?? 'entry'} onValueChange={(value) => updateParameter('capture', value)} ariaLabel={isAr ? 'الحفظ عند' : 'Capture at'}>
                <option value="entry">{isAr ? 'الدخول' : 'Entry'}</option>
                <option value="exit">{isAr ? 'الخروج' : 'Exit'}</option>
              </StudioSelect>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'التحديث' : 'Update'}</span>
              <StudioSelect value={parameters.update ?? 'never'} onValueChange={(value) => updateParameter('update', value)} ariaLabel={isAr ? 'التحديث' : 'Update'}>
                <option value="eachBar">{isAr ? 'كل فترة' : 'Each bar'}</option>
                <option value="never">{isAr ? 'ثابت' : 'Keep fixed'}</option>
              </StudioSelect>
            </label>
          </>
        );
      case 'rolling-state':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'العملية' : 'Operation'}</span>
            <StudioSelect value={parameters.operation ?? 'maximum'} onValueChange={(value) => updateParameter('operation', value)} ariaLabel={isAr ? 'العملية' : 'Operation'}>
              <option value="maximum">{isAr ? 'أعلى قيمة' : 'Maximum'}</option>
              <option value="minimum">{isAr ? 'أدنى قيمة' : 'Minimum'}</option>
            </StudioSelect>
          </label>
        );
      case 'dynamic-target':
        return (
          <>
            <NumberField label={isAr ? 'مضاعف الهدف' : 'Target multiplier'} value={parameters.multiplier ?? '1'} onValueChange={(value) => updateParameter('multiplier', value)} min={0.01} max={1000} step={0.1} />
            <label><span className={LABEL_CLASS}>{isAr ? 'حماية الربح' : 'Profit protection'}</span><StudioSelect value={parameters.requireProfit ?? 'false'} onValueChange={(value) => updateParameter('requireProfit', value)} ariaLabel={isAr ? 'حماية الربح' : 'Profit protection'}><option value="false">{isAr ? 'عند الوصول للمستوى' : 'Whenever target is reached'}</option><option value="true">{isAr ? 'فقط فوق سعر الشراء' : 'Only above buy fill price'}</option></StudioSelect></label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'وحدة المسافة' : 'Distance unit'}</span>
              <StudioSelect value={parameters.distanceMode ?? 'absolute'} onValueChange={(value) => updateParameter('distanceMode', value)} ariaLabel={isAr ? 'وحدة المسافة' : 'Distance unit'}>
                <option value="absolute">{isAr ? 'فرق السعر' : 'Price difference'}</option>
                <option value="percentOfEntry">{isAr ? 'نسبة من السعر المرجعي' : '% of reference price'}</option>
              </StudioSelect>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'السعر المرجعي' : 'Reference price'}</span>
              <StudioSelect value={parameters.targetBase ?? 'entryPrice'} onValueChange={(value) => updateParameter('targetBase', value)} ariaLabel={isAr ? 'السعر المرجعي' : 'Reference price'}>
                <option value="entryPrice">{isAr ? 'سعر تنفيذ الشراء' : 'Buy fill price'}</option>
                <option value="signalClose">{isAr ? 'إغلاق يوم إشارة الشراء' : 'Buy-signal close'}</option>
              </StudioSelect>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'توقيت حساب الهدف' : 'Calculate target'}</span>
              <StudioSelect value={parameters.freezeAtEntry ?? 'false'} onValueChange={(value) => updateParameter('freezeAtEntry', value)} ariaLabel={isAr ? 'توقيت حساب الهدف' : 'Calculate target'}>
                <option value="false">{isAr ? 'إعادة الحساب كل جلسة' : 'Recalculate each session'}</option>
                <option value="true">{isAr ? 'تثبيت عند إشارة الشراء' : 'Lock at buy signal'}</option>
              </StudioSelect>
            </label>
            {exitGateFields()}
          </>
        );
      case 'trailing-exit':
        return (
          <>
            <NumberField label={isAr ? 'مضاعف ATR' : 'ATR multiplier'} value={parameters.distance ?? '2'} onValueChange={(value) => updateParameter('distance', value)} min={0.01} max={1000} step={0.1} />
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'مصدر التقلب' : 'Volatility source'}</span>
              <StudioSelect value={parameters.volatilitySourceId ?? ''} onValueChange={(value) => updateParameter('volatilitySourceId', value)} ariaLabel={isAr ? 'مصدر التقلب' : 'Volatility source'}>
                <option value="">{isAr ? 'ATR المدمج' : 'Built-in ATR'}</option>
                {numericUpstreamNodes.map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeName(candidate, locale)}</option>)}
              </StudioSelect>
            </label>
            {!parameters.volatilitySourceId && <NumberField label={isAr ? 'فترة ATR' : 'ATR period'} value={parameters.volatilityPeriod ?? '14'} onValueChange={(value) => updateParameter('volatilityPeriod', value)} min={1} max={1000} />}
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'تفعيل الوقف' : 'Activate stop'}</span>
              <StudioSelect value={parameters.requireProfit ?? 'false'} onValueChange={(value) => updateParameter('requireProfit', value)} ariaLabel={isAr ? 'تفعيل الوقف' : 'Activate stop'}>
                <option value="false">{isAr ? 'عند الوصول للمستوى' : 'Whenever level is reached'}</option>
                <option value="true">{isAr ? 'فقط إذا كانت الصفقة رابحة' : 'Only while trade is profitable'}</option>
              </StudioSelect>
            </label>
            {exitGateFields()}
          </>
        );
      case 'buy-terminal':
      case 'sell-terminal':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'تشغيل الإشارة عند' : 'Trigger this action when'}</span>
            <StudioSelect value={parameters.combineMode ?? (isBuyTerminal ? 'all' : 'any')} onValueChange={(value) => updateParameter('combineMode', value)} ariaLabel={isAr ? 'تشغيل الإشارة عند' : 'Trigger this action when'}>
              <option value="all">{isAr ? 'تحقق جميع القواعد المتصلة' : 'All connected rules are true'}</option>
              <option value="any">{isAr ? 'تحقق أي قاعدة متصلة' : 'Any connected rule is true'}</option>
            </StudioSelect>
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {supportsConnections && !node.protected && (!node.connections || node.connections.length === 0) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-plt-warning-border bg-plt-warning/10 p-3 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-plt-warning" />
          <div className="min-w-0">
            <h6 className="font-semibold text-plt-warning">
              {isAr ? 'كتلة غير متصلة' : 'Disconnected block'}
            </h6>
            <p className="mt-0.5 text-[11px] leading-4 text-white/70">
              {isTerminal
                ? (isAr ? 'اربط قاعدة سابقة بهذه المحطة لتحديد وقت تنفيذ الصفقة.' : 'Connect an upstream rule to this terminal to trigger execution.')
                : (isAr ? 'تحتاج هذه الكتلة إلى ربط مدخل واحد على الأقل من مرحلة سابقة لتعمل.' : 'This block requires at least one upstream input connection to function in the strategy.')}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {renderTemplateFields()}
        {!isTerminal && node.templateId !== 'execution-policy' && <div className="border-t border-white/10 pt-3">
          <button type="button" aria-expanded={identityOpen} onClick={() => setIdentityOpen((current) => !current)} className="font-sans text-xs font-medium text-white/60 transition-colors hover:text-white">{isAr ? 'الاسم والمخرج' : 'Name & output'} <span aria-hidden="true">{identityOpen ? '−' : '+'}</span></button>
          {identityOpen && <div className="mt-3 flex flex-col gap-3">
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'اسم الكتلة' : 'Block name'}</span>
              <input value={node.customName ?? node.title[locale]} onChange={(event) => onChange({ customName: event.target.value })} className={INPUT_CLASS} />
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'المخرج المسمى' : 'Named output'}</span>
              <input value={node.outputName ?? ''} onChange={(event) => onChange({ outputName: event.target.value })} placeholder={isAr ? 'مثال: master_index' : 'e.g. master_index'} className={INPUT_CLASS} />
            </label>
          </div>}
        </div>}
      </div>

      {supportsConnections && (
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-white/60">
              {isTerminal ? (isAr ? 'اربط القواعد النهائية' : 'Connect final rules') : (isAr ? 'ربط المدخلات' : 'Connect inputs')}
            </span>
            <span className="text-[11px] tabular-nums text-white/45">{node.connections?.length ?? 0}</span>
          </div>
          {upstreamNodes.length === 0 ? (
            <p className="mt-2 text-[11px] leading-4 text-plt-muted">
              {isTerminal
                ? (isAr ? 'أنشئ قاعدة أولاً ثم اربطها هنا.' : 'Create a rule first, then connect it here.')
                : (isAr ? 'أضف كتلة في مرحلة سابقة أولاً.' : 'Add a block in an earlier stage first.')}
            </p>
          ) : (
            <div className="mt-2 grid gap-1.5">
              {upstreamNodes.map((source) => {
                const selected = node.connections?.includes(source.id) ?? false;
                return (
                  <div key={source.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleConnection(source.id)}
                      aria-pressed={selected}
                      className="min-w-0 text-start"
                    >
                      <span className={`block truncate text-[11px] font-medium ${selected ? 'text-brand-blue' : 'text-white/65'}`}>
                        {nodeName(source, locale)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-plt-muted">{source.outputName || source.id}</span>
                    </button>
                    {showsConnectionWeights && selected ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-plt-muted">{isAr ? 'وزن' : 'Weight'}</span>
                        <button type="button" aria-label={`${isAr ? 'تقليل وزن' : 'Decrement weight for'} ${nodeName(source, locale)}`} onClick={() => updateParameter(`weight:${source.id}`, stepNumericValue(parameters[`weight:${source.id}`] ?? '1', -1, 0.1))} className="h-8 w-6 rounded border border-white/10 font-sans text-xs text-white/75">−</button>
                        <input
                          aria-label={`${isAr ? 'وزن' : 'Weight'} ${nodeName(source, locale)}`}
                          value={parameters[`weight:${source.id}`] ?? '1'}
                          onChange={(event) => updateParameter(`weight:${source.id}`, event.target.value)}
                          type="number"
                          step="0.1"
                          className="h-8 w-10 rounded border border-white/10 bg-black px-1 text-end font-sans text-xs font-medium tabular-nums text-white outline-none focus:border-brand-blue"
                        />
                        <button type="button" aria-label={`${isAr ? 'زيادة وزن' : 'Increment weight for'} ${nodeName(source, locale)}`} onClick={() => updateParameter(`weight:${source.id}`, stepNumericValue(parameters[`weight:${source.id}`] ?? '1', 1, 0.1))} className="h-8 w-6 rounded border border-white/10 font-sans text-xs text-white/75">+</button>
                      </div>
                    ) : (
                      <span className={`h-3.5 w-3.5 rounded-sm border ${selected ? 'border-brand-blue bg-brand-blue' : 'border-white/20'}`} aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
