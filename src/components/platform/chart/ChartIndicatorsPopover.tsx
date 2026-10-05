'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgramView } from '@ticknal/quant-engine/canonical';

import { BarChart2, Check, ChevronDown, Search, X } from '@/components/ui/icon-library';
import { getAvailableIndicators } from '@/indicators';
import type {
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '@/indicators/canonical/types';
import { useTranslation } from '@/lib/i18n';
import {
  filterIndicatorBrowserEntries,
  getIndicatorBrowserEntries,
  groupIndicatorBrowserEntries,
} from './canonical/browser-model';
import IndicatorBrowserEntry from './canonical/IndicatorBrowserEntry';

type SelectionPatch = Partial<Pick<CanonicalIndicatorSelection, 'parameters' | 'visibleOutputs' | 'placementOverrides'>>;

interface ChartIndicatorsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: string[];
  onToggleIndicator: (id: string) => void;
  expandedIndicators: Record<string, boolean>;
  onToggleExpanded: (id: string) => void;
  strategyParams: Record<string, unknown>;
  onUpdateStrategyParam: (key: string, val: unknown) => void;
  canonicalIndicatorStates: Record<string, CanonicalIndicatorViewState>;
  canonicalSelections?: readonly CanonicalIndicatorSelection[];
  onAddCanonical?: (definitionId: string) => void;
  onUpdateCanonical?: (instanceId: string, patch: SelectionPatch) => void;
  onRemoveCanonical?: (instanceId: string) => void;
  onReorderCanonical?: (instanceId: string, direction: -1 | 1) => void;
}

export default function ChartIndicatorsPopover({
  isOpen, onClose, activeIndicators, onToggleIndicator, expandedIndicators,
  onToggleExpanded, strategyParams, onUpdateStrategyParam, canonicalIndicatorStates,
  canonicalSelections = [], onAddCanonical, onUpdateCanonical, onRemoveCanonical, onReorderCanonical,
}: ChartIndicatorsPopoverProps) {
  const { locale } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [surface, setSurface] = useState<ProgramView | 'all'>('all');

  useEffect(() => {
    if (!isOpen) return;
    const clickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', clickOutside);
    window.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', clickOutside);
      window.removeEventListener('keydown', escape);
    };
  }, [isOpen, onClose]);

  const entries = useMemo(() => getIndicatorBrowserEntries(locale), [locale]);
  const groups = useMemo(() => groupIndicatorBrowserEntries(entries), [entries]);
  const filtered = useMemo(
    () => filterIndicatorBrowserEntries(entries, query, surface, category),
    [category, entries, query, surface],
  );
  const filteredGroups = useMemo(() => groupIndicatorBrowserEntries(filtered), [filtered]);
  if (!isOpen) return null;

  const advanced = getAvailableIndicators();
  const activeCount = activeIndicators.length + canonicalSelections.length;
  const localizedAdvancedName = (id: string, name: string) => {
    if (locale !== 'ar') return name;
    const names: Record<string, string> = {
      smartMoneyFlow: 'تدفق السيولة الذكية', hydraIndex: 'مؤشر هيدرا',
      frama: 'المتوسط المتحرك التكيفي', supportResistance: 'مستويات الدعم والمقاومة',
    };
    return names[id] ?? name;
  };

  return (
    <div ref={popoverRef} dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="absolute left-2 top-2 z-50 flex max-h-[min(80vh,720px)] w-[min(440px,calc(100vw-16px))] flex-col overflow-hidden rounded-none border border-white/10 bg-black font-sans text-xs shadow-2xl max-sm:fixed max-sm:inset-0 max-sm:max-h-none max-sm:w-full sm:left-64 md:left-72 rtl:left-auto rtl:right-2 sm:rtl:right-64 md:rtl:right-72">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="flex items-center gap-2 font-semibold text-white">
          <BarChart2 size={14} />
          <span>{locale === 'ar' ? 'مكتبة المؤشرات' : 'Indicator library'}</span>
          <span className="tabular-nums text-[10px] text-white/45">411 · {activeCount} {locale === 'ar' ? 'نشط' : 'active'}</span>
        </div>
        <button type="button" onClick={onClose} className="p-2 text-white/55 hover:text-white" aria-label="Close indicator library"><X size={14} /></button>
      </header>

      <div className="shrink-0 space-y-2 border-b border-white/10 p-3">
        <label className="flex h-9 items-center gap-2 border border-white/10 bg-black px-2 text-white/45 focus-within:border-white/30">
          <Search size={14} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={locale === 'ar' ? 'ابحث في 411 مؤشر…' : 'Search 411 indicators…'}
            className="min-w-0 flex-1 bg-transparent font-sans text-white outline-none placeholder:text-white/30" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-8 rounded-none border border-white/10 bg-black px-2 text-white/70 outline-none">
            <option value="all">{locale === 'ar' ? 'كل المجموعات' : 'All categories'}</option>
            {groups.map((group) => <option key={group.category} value={group.category}>{group.category}</option>)}
          </select>
          <select value={surface} onChange={(event) => setSurface(event.target.value as ProgramView | 'all')} className="h-8 rounded-none border border-white/10 bg-black px-2 text-white/70 outline-none">
            <option value="all">{locale === 'ar' ? 'كل طرق العرض' : 'All surfaces'}</option>
            {(['Overlay', 'Pane', 'Market', 'Card', 'Pane or Overlay'] as const).map((view) => <option key={view} value={view}>{view}</option>)}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredGroups.map((group) => (
          <section key={group.category}>
            <div className="sticky top-0 z-10 border-y border-white/[0.06] bg-black px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
              {group.category} <span className="tabular-nums">({group.entries.length})</span>
            </div>
            {group.entries.map((entry) => (
              <IndicatorBrowserEntry key={entry.backlogId} entry={entry} locale={locale}
                selections={canonicalSelections} states={canonicalIndicatorStates}
                onAdd={(definitionId) => onAddCanonical?.(definitionId) ?? onToggleIndicator(definitionId)}
                onUpdate={(instanceId, patch) => onUpdateCanonical?.(instanceId, patch)}
                onRemove={(instanceId) => onRemoveCanonical?.(instanceId)}
                onReorder={(instanceId, direction) => onReorderCanonical?.(instanceId, direction)} />
            ))}
          </section>
        ))}

        <section>
          <div className="sticky top-0 z-10 border-y border-white/[0.06] bg-black px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
            {locale === 'ar' ? 'مؤشرات متقدمة حالية' : 'Existing advanced indicators'}
          </div>
          {advanced.map((indicator) => {
            const active = activeIndicators.includes(indicator.id);
            const expanded = !!expandedIndicators[indicator.id];
            return (
              <div key={indicator.id} className="border-b border-white/[0.06] px-3 py-2">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => onToggleIndicator(indicator.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left rtl:text-right">
                    <span className={`flex h-4 w-4 items-center justify-center border ${active ? 'border-white bg-white text-black' : 'border-white/20 text-transparent'}`}><Check size={10} /></span>
                    <span className={active ? 'text-white' : 'text-white/55'}>{localizedAdvancedName(indicator.id, indicator.name)}</span>
                  </button>
                  {!!indicator.options?.length && <button type="button" onClick={() => onToggleExpanded(indicator.id)} className="p-1 text-white/45 hover:text-white"><ChevronDown size={13} className={expanded ? 'rotate-180' : ''} /></button>}
                </div>
                {expanded && indicator.options?.map((option) => {
                  const key = `${indicator.id}_${option.id}`;
                  return <label key={option.id} className="mt-2 flex items-center justify-between pl-6 text-[10px] text-white/45 rtl:pl-0 rtl:pr-6">
                    <span>{option.name}</span>
                    <input type="checkbox" checked={Boolean(strategyParams[key] ?? option.defaultActive)} onChange={(event) => onUpdateStrategyParam(key, event.target.checked)} className="accent-white" />
                  </label>;
                })}
              </div>
            );
          })}
        </section>
      </div>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-white/10 px-3 text-[10px] text-white/45">
        <span>{filtered.length} / 411</span>
        {activeCount > 0 && <button type="button" onClick={() => {
          canonicalSelections.forEach((selection) => onRemoveCanonical?.(selection.instanceId));
          activeIndicators.forEach(onToggleIndicator);
        }} className="hover:text-white">{locale === 'ar' ? 'مسح الكل' : 'Clear all'}</button>}
      </footer>
    </div>
  );
}
