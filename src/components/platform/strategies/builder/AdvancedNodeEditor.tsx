'use client';

import { useMemo, useState } from 'react';

import { AlertTriangle, Plus } from '@/components/ui/icon-library';

import { getAvailableUpstreamNodes } from './advanced-builder-state';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import IndicatorPicker from './IndicatorPicker';
import type { StrategyBuilderIndicatorOption } from './strategy-builder-model';

interface AdvancedNodeEditorProps {
  readonly node: AdvancedStrategyNode;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly onChange: (changes: Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>>) => void;
}

const INPUT_CLASS = 'min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 font-sans text-xs text-white outline-none transition-colors focus:border-white/30';
const LABEL_CLASS = 'mb-1 block text-[9px] font-medium uppercase tracking-[0.08em] text-plt-muted';

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
  const parameters = node.parameters ?? {};
  const isBuyTerminal = node.templateId === 'buy-terminal';
  const isSellTerminal = node.templateId === 'sell-terminal';
  const isTerminal = isBuyTerminal || isSellTerminal;
  const upstreamNodes = useMemo(() => {
    const available = getAvailableUpstreamNodes(nodes, node.id);
    if (isBuyTerminal) return available.filter((candidate) => candidate.stage === 'entry' && candidate.parameters?.actionSide !== 'sell');
    if (isSellTerminal) return available.filter((candidate) => candidate.stage === 'exit' || (candidate.stage === 'entry' && candidate.parameters?.actionSide === 'sell'));
    return available;
  }, [isBuyTerminal, isSellTerminal, node.id, nodes]);
  const selectedIndicatorIds = useMemo(
    () => new Set(parameters.indicatorId ? [parameters.indicatorId] : []),
    [parameters.indicatorId],
  );
  const showsConnectionWeights = node.templateId === 'weighted-composite';
  const isMultiConnection = showsConnectionWeights || node.templateId === 'math-operation' || isTerminal;
  const supportsConnections = !['market-input', 'parameter'].includes(node.templateId ?? '');

  const updateParameter = (key: string, value: string) => {
    onChange({ parameters: { ...parameters, [key]: value } });
  };

  const toggleConnection = (sourceId: string) => {
    const current = node.connections ?? [];
    const connections = isMultiConnection
      ? (current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId])
      : (current[0] === sourceId ? [] : [sourceId]);
    onChange({ connections });
  };

  const renderTemplateFields = () => {
    switch (node.templateId) {
      case 'market-input':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'سلسلة البيانات' : 'Data series'}</span>
            <select value={parameters.series ?? 'ohlcv'} onChange={(event) => updateParameter('series', event.target.value)} className={INPUT_CLASS}>
              <option value="ohlcv">OHLCV</option>
              <option value="benchmark">{isAr ? 'مؤشر مرجعي' : 'Benchmark index'}</option>
              <option value="external">{isAr ? 'سلسلة سوق أخرى' : 'Another market series'}</option>
            </select>
          </label>
        );
      case 'parameter':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'القيمة الافتراضية' : 'Default value'}</span>
            <input value={parameters.value ?? '1'} onChange={(event) => updateParameter('value', event.target.value)} inputMode="decimal" className={INPUT_CLASS} />
          </label>
        );
      case 'indicator':
        return (
          <>
            <div className="sm:col-span-2">
              <span className={LABEL_CLASS}>{isAr ? 'المؤشر' : 'Indicator'}</span>
              <button
                type="button"
                onClick={() => setPickerOpen((current) => !current)}
                aria-expanded={pickerOpen}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 px-3 text-start text-xs transition-colors hover:border-white/25"
              >
                <span className={parameters.indicatorName ? 'text-white' : 'text-plt-muted'}>
                  {parameters.indicatorName || (isAr ? 'اختر مؤشراً' : 'Choose indicator')}
                </span>
                <Plus size={13} className="shrink-0 text-white/45" />
              </button>
              {pickerOpen && (
                <IndicatorPicker
                  indicators={indicators}
                  selectedIds={selectedIndicatorIds}
                  locale={locale}
                  onAdd={(indicator) => {
                    onChange({
                      customName: node.customName || indicator.name,
                      parameters: {
                        ...parameters,
                        indicatorId: indicator.id,
                        indicatorName: indicator.name,
                        indicatorBacklogId: indicator.backlogId,
                      },
                    });
                    setPickerOpen(false);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الفترة' : 'Period'}</span>
              <input type="number" min="1" value={parameters.period ?? '14'} onChange={(event) => updateParameter('period', event.target.value)} className={INPUT_CLASS} />
            </label>
          </>
        );
      case 'weighted-composite':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'التوحيد' : 'Normalization'}</span>
            <select value={parameters.normalization ?? 'zeroToHundred'} onChange={(event) => updateParameter('normalization', event.target.value)} className={INPUT_CLASS}>
              <option value="zeroToHundred">0–100</option>
              <option value="zScore">Z-score</option>
              <option value="minMax">Min–max</option>
              <option value="none">{isAr ? 'بدون' : 'None'}</option>
            </select>
          </label>
        );
      case 'transform':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الطريقة' : 'Method'}</span>
              <select value={parameters.method ?? 'ema'} onChange={(event) => updateParameter('method', event.target.value)} className={INPUT_CLASS}>
                <option value="ema">EMA</option>
                <option value="sma">SMA</option>
                <option value="wma">WMA</option>
                <option value="normalize">{isAr ? 'توحيد' : 'Normalize'}</option>
              </select>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الفترة' : 'Period'}</span>
              <input type="number" min="1" value={parameters.period ?? '3'} onChange={(event) => updateParameter('period', event.target.value)} className={INPUT_CLASS} />
            </label>
          </>
        );
      case 'rolling-statistic':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الإحصاء' : 'Statistic'}</span>
              <select value={parameters.operation ?? 'mean'} onChange={(event) => updateParameter('operation', event.target.value)} className={INPUT_CLASS}>
                <option value="minimum">{isAr ? 'الحد الأدنى' : 'Minimum'}</option>
                <option value="maximum">{isAr ? 'الحد الأقصى' : 'Maximum'}</option>
                <option value="mean">{isAr ? 'المتوسط' : 'Mean'}</option>
                <option value="median">{isAr ? 'الوسيط' : 'Median'}</option>
              </select>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الفترة' : 'Period'}</span>
              <input type="number" min="1" value={parameters.period ?? '20'} onChange={(event) => updateParameter('period', event.target.value)} className={INPUT_CLASS} />
            </label>
          </>
        );
      case 'math-operation':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'العملية' : 'Operation'}</span>
            <select value={parameters.operation ?? 'add'} onChange={(event) => updateParameter('operation', event.target.value)} className={INPUT_CLASS}>
              <option value="add">{isAr ? 'جمع' : 'Add'}</option>
              <option value="subtract">{isAr ? 'طرح' : 'Subtract'}</option>
              <option value="multiply">{isAr ? 'ضرب' : 'Multiply'}</option>
              <option value="divide">{isAr ? 'قسمة' : 'Divide'}</option>
            </select>
          </label>
        );
      case 'condition':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'المقارنة' : 'Comparison'}</span>
              <select value={parameters.operator ?? 'crossesAbove'} onChange={(event) => updateParameter('operator', event.target.value)} className={INPUT_CLASS}>
                <option value="crossesAbove">{isAr ? 'يعبر لأعلى' : 'Crosses above'}</option>
                <option value="crossesBelow">{isAr ? 'يعبر لأسفل' : 'Crosses below'}</option>
                <option value="isAbove">{isAr ? 'أعلى من' : 'Is above'}</option>
                <option value="isBelow">{isAr ? 'أقل من' : 'Is below'}</option>
              </select>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'القيمة' : 'Value'}</span>
              <input value={parameters.compareValue ?? '0'} onChange={(event) => updateParameter('compareValue', event.target.value)} inputMode="decimal" className={INPUT_CLASS} />
            </label>
          </>
        );
      case 'priority-trigger':
        return (
          <label className="sm:col-span-2">
            <span className={LABEL_CLASS}>{isAr ? 'المستويات حسب الأولوية' : 'Priority levels'}</span>
            <input value={parameters.thresholds ?? ''} onChange={(event) => updateParameter('thresholds', event.target.value)} placeholder="23.6, 14.6, 38.2" className={INPUT_CLASS} />
          </label>
        );
      case 'position-memory':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'الحفظ عند' : 'Capture at'}</span>
              <select value={parameters.capture ?? 'entry'} onChange={(event) => updateParameter('capture', event.target.value)} className={INPUT_CLASS}>
                <option value="entry">{isAr ? 'الدخول' : 'Entry'}</option>
                <option value="exit">{isAr ? 'الخروج' : 'Exit'}</option>
              </select>
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'التحديث' : 'Update'}</span>
              <select value={parameters.update ?? 'eachBar'} onChange={(event) => updateParameter('update', event.target.value)} className={INPUT_CLASS}>
                <option value="eachBar">{isAr ? 'كل فترة' : 'Each bar'}</option>
                <option value="never">{isAr ? 'ثابت' : 'Keep fixed'}</option>
              </select>
            </label>
          </>
        );
      case 'rolling-state':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'العملية' : 'Operation'}</span>
            <select value={parameters.operation ?? 'maximum'} onChange={(event) => updateParameter('operation', event.target.value)} className={INPUT_CLASS}>
              <option value="maximum">{isAr ? 'أعلى قيمة' : 'Maximum'}</option>
              <option value="minimum">{isAr ? 'أدنى قيمة' : 'Minimum'}</option>
            </select>
          </label>
        );
      case 'dynamic-target':
        return (
          <label>
            <span className={LABEL_CLASS}>{isAr ? 'المضاعف' : 'Multiplier'}</span>
            <input value={parameters.multiplier ?? '1'} onChange={(event) => updateParameter('multiplier', event.target.value)} inputMode="decimal" className={INPUT_CLASS} />
          </label>
        );
      case 'trailing-exit':
        return (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'مسافة التتبع' : 'Trail distance'}</span>
              <input value={parameters.distance ?? '2'} onChange={(event) => updateParameter('distance', event.target.value)} inputMode="decimal" className={INPUT_CLASS} />
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'فترة التذبذب' : 'Volatility period'}</span>
              <input type="number" min="1" value={parameters.volatilityPeriod ?? '14'} onChange={(event) => updateParameter('volatilityPeriod', event.target.value)} className={INPUT_CLASS} />
            </label>
          </>
        );
      case 'buy-terminal':
      case 'sell-terminal':
        return (
          <label className="sm:col-span-2">
            <span className={LABEL_CLASS}>{isAr ? 'تشغيل الإشارة عند' : 'Trigger this action when'}</span>
            <select value={parameters.combineMode ?? (isBuyTerminal ? 'all' : 'any')} onChange={(event) => updateParameter('combineMode', event.target.value)} className={INPUT_CLASS}>
              <option value="all">{isAr ? 'تحقق جميع القواعد المتصلة' : 'All connected rules are true'}</option>
              <option value="any">{isAr ? 'تحقق أي قاعدة متصلة' : 'Any connected rule is true'}</option>
            </select>
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
            <p className="mt-0.5 text-[10px] leading-4 text-white/70">
              {isTerminal
                ? (isAr ? 'اربط قاعدة سابقة بهذه المحطة لتحديد وقت تنفيذ الصفقة.' : 'Connect an upstream rule to this terminal to trigger execution.')
                : (isAr ? 'تحتاج هذه الكتلة إلى ربط مدخل واحد على الأقل من مرحلة سابقة لتعمل.' : 'This block requires at least one upstream input connection to function in the strategy.')}
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {!isTerminal && (
          <>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'اسم الكتلة' : 'Block name'}</span>
              <input value={node.customName ?? node.title[locale]} onChange={(event) => onChange({ customName: event.target.value })} className={INPUT_CLASS} />
            </label>
            <label>
              <span className={LABEL_CLASS}>{isAr ? 'المخرج المسمى' : 'Named output'}</span>
              <input value={node.outputName ?? ''} onChange={(event) => onChange({ outputName: event.target.value })} placeholder={isAr ? 'مثال: master_index' : 'e.g. master_index'} className={INPUT_CLASS} />
            </label>
          </>
        )}
        {renderTemplateFields()}
      </div>

      {supportsConnections && (
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-plt-muted">
              {isTerminal ? (isAr ? 'اربط القواعد النهائية' : 'Connect final rules') : (isAr ? 'ربط المدخلات' : 'Connect inputs')}
            </span>
            <span className="text-[9px] tabular-nums text-white/35">{node.connections?.length ?? 0}</span>
          </div>
          {upstreamNodes.length === 0 ? (
            <p className="mt-2 text-[10px] leading-4 text-plt-muted">
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
                      <span className={`block truncate text-[10px] font-medium ${selected ? 'text-brand-blue' : 'text-white/65'}`}>
                        {nodeName(source, locale)}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-plt-muted">{source.outputName || source.id}</span>
                    </button>
                    {showsConnectionWeights && selected ? (
                      <label className="flex items-center gap-1.5">
                        <span className="text-[8px] text-plt-muted">{isAr ? 'وزن' : 'Weight'}</span>
                        <input
                          aria-label={`${isAr ? 'وزن' : 'Weight'} ${nodeName(source, locale)}`}
                          value={parameters[`weight:${source.id}`] ?? '1'}
                          onChange={(event) => updateParameter(`weight:${source.id}`, event.target.value)}
                          inputMode="decimal"
                          className="h-8 w-14 rounded-lg border border-white/10 bg-black px-2 text-end font-sans text-[10px] tabular-nums text-white outline-none focus:border-white/30"
                        />
                      </label>
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
