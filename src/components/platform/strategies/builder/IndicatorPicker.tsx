'use client';

import { useMemo, useState } from 'react';

import { ChevronDown, Plus, Search, X } from '@/components/ui/icon-library';

import {
  filterIndicatorOptions,
  type StrategyBuilderIndicatorOption,
} from './strategy-builder-model';

interface IndicatorPickerProps {
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly selectedIds: ReadonlySet<string>;
  readonly locale: 'en' | 'ar';
  readonly onAdd: (indicator: StrategyBuilderIndicatorOption) => void;
  readonly onClose: () => void;
}

interface IndicatorGroup {
  readonly category: string;
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
}

const MAX_VISIBLE_SEARCH_RESULTS = 12;

const CATEGORY_LABELS: Readonly<Record<string, { en: string; ar: string }>> = {
  'price-return': { en: 'Price & Return', ar: 'السعر والعائد' },
  trend: { en: 'Trend', ar: 'الاتجاه' },
  momentum: { en: 'Momentum', ar: 'الزخم' },
  volatility: { en: 'Volatility', ar: 'التذبذب' },
  'volume-flow': { en: 'Volume & Flow', ar: 'الحجم والتدفق' },
  'price-action': { en: 'Price Action', ar: 'حركة السعر' },
  'market-structure': { en: 'Market Structure', ar: 'هيكل السوق' },
  cycles: { en: 'Cycles', ar: 'الدورات' },
  quantitative: { en: 'Quantitative', ar: 'مؤشرات كمية' },
  statistical: { en: 'Statistical', ar: 'إحصائية' },
  breadth: { en: 'Market Breadth', ar: 'اتساع السوق' },
  'risk-portfolio': { en: 'Risk & Portfolio', ar: 'المخاطر والمحفظة' },
  'relative-intermarket': { en: 'Relative & Intermarket', ar: 'الأسواق النسبية والمترابطة' },
  'egypt-market': { en: 'Egypt Market', ar: 'السوق المصري' },
  macro: { en: 'Macroeconomic', ar: 'الاقتصاد الكلي' },
};

function formatCategoryLabel(category: string, locale: 'en' | 'ar'): string {
  const localized = CATEGORY_LABELS[category];
  if (localized) return localized[locale];
  return category
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function groupIndicators(indicators: readonly StrategyBuilderIndicatorOption[]): readonly IndicatorGroup[] {
  const groups = new Map<string, StrategyBuilderIndicatorOption[]>();
  for (const indicator of indicators) {
    const group = groups.get(indicator.category) ?? [];
    group.push(indicator);
    groups.set(indicator.category, group);
  }
  return [...groups].map(([category, groupIndicators]) => ({ category, indicators: groupIndicators }));
}

function IndicatorOption({
  indicator,
  locale,
  onAdd,
  asSearchResult = false,
}: {
  readonly indicator: StrategyBuilderIndicatorOption;
  readonly locale: 'en' | 'ar';
  readonly onAdd: (indicator: StrategyBuilderIndicatorOption) => void;
  readonly asSearchResult?: boolean;
}) {
  return (
    <button
      type="button"
      role={asSearchResult ? 'option' : undefined}
      aria-selected={asSearchResult ? false : undefined}
      onClick={() => onAdd(indicator)}
      className="flex min-h-11 w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-start transition-colors last:border-b-0 hover:bg-white/[0.04]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-medium text-white">{indicator.name}</span>
          <span className="shrink-0 text-[9px] tabular-nums text-plt-muted">{indicator.backlogId}</span>
        </div>
        <span className="mt-0.5 block truncate text-[10px] text-plt-muted">
          {formatCategoryLabel(indicator.category, locale)}
        </span>
      </div>
      <Plus size={14} className="shrink-0 text-white/55" />
    </button>
  );
}

export default function IndicatorPicker({
  indicators,
  selectedIds,
  locale,
  onAdd,
  onClose,
}: IndicatorPickerProps) {
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const availableIndicators = useMemo(
    () => filterIndicatorOptions(indicators, '', 'all').filter((indicator) => !selectedIds.has(indicator.id)),
    [indicators, selectedIds],
  );
  const groups = useMemo(() => groupIndicators(availableIndicators), [availableIndicators]);
  const allSearchMatches = useMemo(
    () => query.trim() ? filterIndicatorOptions(availableIndicators, query, 'all') : [],
    [availableIndicators, query],
  );
  const searchMatches = allSearchMatches.slice(0, MAX_VISIBLE_SEARCH_RESULTS);
  const listId = `indicator-options-${isAr ? 'ar' : 'en'}`;
  const isSearching = query.trim().length > 0;

  return (
    <section className="mt-3 rounded-xl border border-white/10 bg-black overflow-hidden shadow-2xl" aria-label={isAr ? 'البحث عن مؤشر' : 'Indicator search'}>
      <div className="flex min-h-11 items-center border-b border-white/10 px-3 focus-within:border-white/30">
        <Search size={15} className="shrink-0 text-white/40" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={isAr ? 'ابحث واختر مؤشراً' : 'Search and select indicator'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isAr ? 'ابحث بالاسم أو الرمز…' : 'Search by name or code…'}
          className="min-w-0 flex-1 bg-transparent px-2.5 font-sans text-xs text-white outline-none placeholder:text-plt-muted"
        />
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-plt-muted transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label={isAr ? 'إغلاق البحث عن مؤشر' : 'Close indicator search'}
        >
          <X size={14} />
        </button>
      </div>

      <div id={listId} role={isSearching ? 'listbox' : undefined} className="custom-scrollbar max-h-80 overflow-y-auto">
        {isSearching ? (
          searchMatches.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-plt-muted">
              {isAr ? 'لا توجد مؤشرات متاحة تطابق البحث.' : 'No available indicators match this search.'}
            </div>
          ) : (
            searchMatches.map((indicator) => (
              <IndicatorOption
                key={indicator.id}
                indicator={indicator}
                locale={locale}
                onAdd={onAdd}
                asSearchResult
              />
            ))
          )
        ) : groups.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-plt-muted">
            {isAr ? 'لا توجد مؤشرات متاحة.' : 'No indicators are available.'}
          </div>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedGroup === group.category;
            const groupId = `indicator-group-${group.category.replace(/[^a-z0-9_-]/giu, '-')}`;
            return (
              <div key={group.category} className="border-b border-white/[0.06] last:border-b-0">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={groupId}
                  onClick={() => setExpandedGroup((current) => current === group.category ? null : group.category)}
                  className="flex min-h-11 w-full items-center gap-3 px-3 text-start transition-colors hover:bg-white/[0.04]"
                >
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-white/45 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  <span className="min-w-0 flex-1 text-xs font-medium text-white">
                    {formatCategoryLabel(group.category, locale)}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-plt-muted">
                    {group.indicators.length}
                  </span>
                </button>
                {isExpanded && (
                  <div id={groupId} role="group" aria-label={formatCategoryLabel(group.category, locale)} className="border-t border-white/[0.06]">
                    {group.indicators.map((indicator) => (
                      <IndicatorOption key={indicator.id} indicator={indicator} locale={locale} onAdd={onAdd} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isSearching && allSearchMatches.length > MAX_VISIBLE_SEARCH_RESULTS && (
        <p className="border-t border-white/[0.06] px-3 py-2 text-[10px] text-plt-muted">
          {isAr
            ? `عرض ${MAX_VISIBLE_SEARCH_RESULTS} من ${allSearchMatches.length} — اكتب لتضييق النتائج`
            : `Showing ${MAX_VISIBLE_SEARCH_RESULTS} of ${allSearchMatches.length} — type to narrow the list`}
        </p>
      )}
    </section>
  );
}
