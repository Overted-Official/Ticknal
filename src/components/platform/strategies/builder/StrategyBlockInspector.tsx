'use client';

import { useEffect, useRef } from 'react';

import { X } from '@/components/ui/icon-library';

import AdvancedNodeEditor from './AdvancedNodeEditor';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import {
  getInspectorName,
  isInspectorReadOnly,
  type StrategyInspectorChange,
  type StrategyInspectorTab,
  type StrategyInspectorTarget,
} from './strategy-inspector-model';
import type { StrategyBuilderIndicatorOption, StrategyRuleOperator } from './strategy-builder-model';

interface StrategyBlockInspectorProps {
  readonly target: StrategyInspectorTarget;
  readonly tab: StrategyInspectorTab;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly locale: 'en' | 'ar';
  readonly onTabChange: (tab: StrategyInspectorTab) => void;
  readonly onChange: (change: StrategyInspectorChange) => void;
  readonly onClose: () => void;
}

const OPERATORS: readonly StrategyRuleOperator[] = ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'];

export default function StrategyBlockInspector({
  target, tab, nodes, indicators, locale, onTabChange, onChange, onClose,
}: StrategyBlockInspectorProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const isAr = locale === 'ar';
  const name = getInspectorName(target, locale);
  const readOnly = isInspectorReadOnly(target);
  const tabs: readonly StrategyInspectorTab[] = readOnly
    ? ['learn', 'output', 'usage']
    : ['configure', 'learn', 'output', 'usage'];
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const targetId = target.kind === 'advanced-node' ? target.node.id : target.rule.id;
  const downstream = nodes.filter((node) => node.connections?.includes(targetId));

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${name} inspector`}
        className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col rounded-none border-s border-white/10 bg-black shadow-2xl"
      >
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#787b86]">{isAr ? 'تفاصيل الكتلة' : 'Block inspector'}</span>
            <h3 className="mt-1 truncate text-sm font-semibold text-white">{name}</h3>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center border border-white/10 text-[#787b86] hover:text-white" aria-label={isAr ? 'إغلاق' : 'Close inspector'}>
            <X size={15} />
          </button>
        </header>

        <nav className="flex overflow-x-auto border-b border-white/10 px-2" aria-label={isAr ? 'أقسام التفاصيل' : 'Inspector sections'}>
          {tabs.map((candidate) => (
            <button key={candidate} type="button" onClick={() => onTabChange(candidate)} aria-pressed={activeTab === candidate} className={`min-h-11 shrink-0 border-b-2 px-3 text-[10px] font-semibold capitalize ${activeTab === candidate ? 'border-white text-white' : 'border-transparent text-[#787b86] hover:text-white'}`}>
              {candidate === 'usage' ? (isAr ? 'مستخدم في' : 'Used by') : candidate === 'configure' ? (isAr ? 'إعداد' : 'Configure') : candidate === 'learn' ? (isAr ? 'تعلّم' : 'Learn') : (isAr ? 'الناتج' : 'Output')}
            </button>
          ))}
        </nav>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
          {activeTab === 'configure' && target.kind === 'simple-rule' && (
            <div className="space-y-4">
              <label className="block text-[10px] font-semibold text-[#787b86]">
                {isAr ? 'الفترة' : 'Period'}
                <input type="number" min="1" value={target.rule.period} onChange={(event) => onChange({ kind: 'simple-rule', changes: { period: Math.max(1, Number(event.target.value) || 1) } })} className="mt-1 min-h-11 w-full rounded-none border border-white/10 bg-black px-3 font-sans text-xs tabular-nums text-white outline-none focus:border-white/30" />
              </label>
              <label className="block text-[10px] font-semibold text-[#787b86]">
                {isAr ? 'الشرط' : 'Condition'}
                <select value={target.rule.operator} onChange={(event) => onChange({ kind: 'simple-rule', changes: { operator: event.target.value as StrategyRuleOperator } })} className="mt-1 min-h-11 w-full rounded-none border border-white/10 bg-black px-3 font-sans text-xs text-white outline-none focus:border-white/30">
                  {OPERATORS.map((operator) => <option key={operator} value={operator}>{operator.replace(/([A-Z])/g, ' $1')}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-semibold text-[#787b86]">
                {isAr ? 'القيمة' : 'Level'}
                <input type="number" value={target.rule.value} onChange={(event) => onChange({ kind: 'simple-rule', changes: { value: Number(event.target.value) || 0 } })} className="mt-1 min-h-11 w-full rounded-none border border-white/10 bg-black px-3 font-sans text-xs tabular-nums text-white outline-none focus:border-white/30" />
              </label>
            </div>
          )}
          {activeTab === 'configure' && target.kind === 'advanced-node' && !readOnly && (
            <AdvancedNodeEditor node={target.node} nodes={nodes} indicators={indicators} locale={locale} onChange={(changes) => onChange({ kind: 'advanced-node', changes })} />
          )}
          {activeTab === 'learn' && (
            <div>
              <div className="border border-white/10 p-3">
                <p className="text-xs leading-5 text-white/75">{target.kind === 'simple-rule' ? (target.indicator?.description ?? (isAr ? 'هذا المؤشر لم يعد متاحاً في المكتبة.' : 'This indicator is no longer available in the library.')) : target.node.summary[locale]}</p>
              </div>
              <svg role="img" aria-label={`${name} example chart`} viewBox="0 0 360 150" className="mt-4 h-auto w-full border border-white/10 bg-black">
                <path d="M0 120 C45 115 55 42 105 72 S175 128 215 70 S292 30 360 55" fill="none" stroke="#787b86" strokeWidth="2" />
                <path d="M0 98 H360" stroke="#f23645" strokeDasharray="4 5" opacity=".7" />
                <circle cx="105" cy="72" r="4" fill="#089981" />
              </svg>
              {target.kind === 'advanced-node' && target.node.details && (
                <dl className="mt-4 space-y-2">{target.node.details.map((detail) => <div key={detail.label.en} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2"><dt className="text-[10px] text-[#787b86]">{detail.label[locale]}</dt><dd className="text-end text-[10px] text-white">{detail.value[locale]}</dd></div>)}</dl>
              )}
            </div>
          )}
          {activeTab === 'output' && (
            <div className="border border-white/10 p-3 text-xs text-white/75">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-[#787b86]">{isAr ? 'اسم الناتج' : 'Available output'}</span>
              <strong className="mt-2 block font-semibold text-white">{target.kind === 'simple-rule' ? `${target.side}_${target.indicator?.id ?? 'unknown'}` : target.node.outputName || target.node.customName || target.node.title[locale]}</strong>
            </div>
          )}
          {activeTab === 'usage' && (
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#787b86]">{isAr ? 'تستخدمه الكتل التالية' : 'Used by these blocks'}</span>
              <div className="mt-2 space-y-2">
                {downstream.map((node) => <div key={node.id} className="border border-white/10 px-3 py-2 text-xs text-white">{node.customName || node.title[locale]}</div>)}
                {downstream.length === 0 && <div className="border border-dashed border-white/10 px-3 py-6 text-center text-[10px] text-[#787b86]">{isAr ? 'لا توجد اتصالات لاحقة بعد.' : 'No downstream connections yet.'}</div>}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
