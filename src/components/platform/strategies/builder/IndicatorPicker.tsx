'use client';

import { useMemo, useState } from 'react';

import { ChevronDown, Info, Plus, Search, X } from '@/components/ui/icon-library';
import StrategyLibraryEducationDrawer from './StrategyLibraryEducationDrawer';
import { getIndicatorEducation, type StrategyLibraryEducation } from './strategy-library-education';

import {
  filterIndicatorOptions,
  type StrategyBuilderIndicatorOption,
  type StrategyRuleSide,
} from './strategy-builder-model';

interface IndicatorPickerProps {
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly selectedIds: ReadonlySet<string>;
  readonly locale: 'en' | 'ar';
  readonly presentation?: 'inline' | 'canvas';
  readonly canvasPurpose?: 'rule' | 'indicator';
  readonly ruleSide?: StrategyRuleSide;
  readonly onAdd: (indicator: StrategyBuilderIndicatorOption) => void;
  readonly onLearn?: (indicator: StrategyBuilderIndicatorOption) => void;
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

export function rankIndicatorSearchMatches(
  indicators: readonly StrategyBuilderIndicatorOption[],
  query: string,
): readonly StrategyBuilderIndicatorOption[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return indicators;
  const rank = (indicator: StrategyBuilderIndicatorOption) => {
    const name = indicator.name.toLocaleLowerCase();
    const code = indicator.backlogId.toLocaleLowerCase();
    const words = name.split(/[\s()[\]/-]+/u).filter(Boolean);
    const initials = words.map((word) => word[0]).join('');
    if (name === normalized || code === normalized) return 0;
    if (initials === normalized || (normalized.length <= 3 ? words.some((word) => word.startsWith(normalized)) : name.includes(normalized))) return 1;
    if (code.includes(normalized)) return 2;
    if (indicator.category.toLocaleLowerCase().includes(normalized)) return 3;
    return 4;
  };
  const ranked = [...indicators].sort((left, right) => rank(left) - rank(right));
  if (normalized.length <= 3 && ranked.some((indicator) => rank(indicator) < 4)) {
    return ranked.filter((indicator) => rank(indicator) < 4);
  }
  return ranked;
}

function IndicatorOption({
  indicator,
  locale,
  onAdd,
  onLearn,
  asSearchResult = false,
  showDescription = false,
}: {
  readonly indicator: StrategyBuilderIndicatorOption;
  readonly locale: 'en' | 'ar';
  readonly onAdd: (indicator: StrategyBuilderIndicatorOption) => void;
  readonly onLearn?: (indicator: StrategyBuilderIndicatorOption) => void;
  readonly asSearchResult?: boolean;
  readonly showDescription?: boolean;
}) {
  return (
    <div className={showDescription ? 'strategy-library-result-row' : 'strategy-library-result-row strategy-library-result-row--compact'}>
    <button
      type="button"
      role={asSearchResult ? 'option' : undefined}
      aria-selected={asSearchResult ? false : undefined}
      aria-label={`${locale === 'ar' ? 'إضافة' : 'Add'} ${indicator.name}`}
      onClick={() => onAdd(indicator)}
      className={showDescription ? 'strategy-library-result strategy-library-result--add' : 'strategy-library-result strategy-library-result--add strategy-library-result--compact'}
    >
      <div className="min-w-0 flex-1">
        <div className={`flex gap-2 ${showDescription ? 'items-start justify-between' : 'items-center'}`}>
          <span className={showDescription ? 'min-w-0 flex-1 text-xs font-semibold leading-4 text-plt-text' : 'truncate text-xs font-medium text-white'}>{indicator.name}</span>
          <span className="shrink-0 text-[9px] tabular-nums text-plt-muted">{indicator.backlogId}</span>
        </div>
        <span className={showDescription ? 'strategy-library-result-description' : 'mt-0.5 block truncate text-[10px] text-plt-muted'}>
          {showDescription ? indicator.description : formatCategoryLabel(indicator.category, locale)}
        </span>
      </div>
      <span className={showDescription ? 'strategy-library-result-add' : 'shrink-0 text-white/55'}><Plus size={14} /></span>
    </button>
    {onLearn && <button type="button" className="strategy-library-result-learn" onClick={() => onLearn(indicator)} aria-label={`${locale === 'ar' ? 'تعرف على' : 'Learn about'} ${indicator.name}`} title={locale === 'ar' ? 'تعرف على المؤشر' : 'Learn about this indicator'}><Info size={15} /></button>}
    </div>
  );
}

export default function IndicatorPicker({
  indicators,
  selectedIds,
  locale,
  presentation = 'inline',
  canvasPurpose = 'rule',
  ruleSide,
  onAdd,
  onClose,
}: IndicatorPickerProps) {
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [education, setEducation] = useState<StrategyLibraryEducation | null>(null);
  const onLearn = (indicator: StrategyBuilderIndicatorOption) => setEducation(getIndicatorEducation(indicator, locale));
  const educationDrawer = education && <StrategyLibraryEducationDrawer guide={education} locale={locale} onClose={() => setEducation(null)} />;
  const availableIndicators = useMemo(
    () => filterIndicatorOptions(indicators, '', 'all').filter((indicator) => !selectedIds.has(indicator.id)),
    [indicators, selectedIds],
  );
  const groups = useMemo(() => groupIndicators(availableIndicators), [availableIndicators]);
  const allSearchMatches = useMemo(
    () => query.trim() ? rankIndicatorSearchMatches(filterIndicatorOptions(availableIndicators, query, 'all'), query) : [],
    [availableIndicators, query],
  );
  const searchMatches = allSearchMatches.slice(0, MAX_VISIBLE_SEARCH_RESULTS);
  const listId = `indicator-options-${isAr ? 'ar' : 'en'}`;
  const isSearching = query.trim().length > 0;
  const activeGroup = groups.find((group) => group.category === activeCategory) ?? groups[0];

  if (presentation === 'canvas') {
    const side = ruleSide === 'sell' ? (isAr ? 'بيع' : 'sell') : (isAr ? 'شراء' : 'buy');
    const addingIndicator = canvasPurpose === 'indicator';
    return (
      <><section className="strategy-library-panel" aria-label={isAr ? 'مكتبة المؤشرات' : 'Indicator library'}>
        <header className="strategy-library-header">
          <div className="min-w-0">
            <p className="strategy-library-eyebrow">{isAr ? 'مكتبة المؤشرات' : 'Indicator library'}</p>
            <h2 className="strategy-library-title">{addingIndicator ? (isAr ? 'إضافة مؤشر' : 'Add an indicator') : (isAr ? `إضافة قاعدة ${side}` : `Add a ${side} rule`)}</h2>
            <p className="strategy-library-description">
              {addingIndicator
                ? (isAr ? 'اختر مؤشراً، ثم صله ببيانات السوق واضبط إعداداته.' : 'Choose an indicator, then connect market data and configure it on the canvas.')
                : (isAr ? 'اختر مؤشراً، ثم حدد شرط القاعدة على اللوحة.' : 'Choose an indicator, then set its condition on the canvas.')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="strategy-library-close" aria-label={isAr ? 'إغلاق مكتبة المؤشرات' : 'Close indicator library'}><X size={16} /></button>
        </header>

        <label className="strategy-library-search">
          <Search size={16} className="shrink-0 text-plt-muted" aria-hidden="true" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isAr ? 'ابحث بالاسم أو الرمز…' : 'Search indicators or codes…'}
            aria-label={isAr ? 'البحث في المؤشرات' : 'Search indicators'}
            className="min-w-0 flex-1 bg-transparent font-sans text-xs text-plt-text outline-none placeholder:text-plt-muted"
          />
        </label>

        {isSearching ? (
          <div className="strategy-library-results custom-scrollbar" role="region" aria-label={isAr ? 'نتائج البحث' : 'Search results'}>
            <div className="strategy-library-results-label">
              <span>{isAr ? 'نتائج البحث' : 'Search results'}</span>
              <span className="tabular-nums">{allSearchMatches.length}</span>
            </div>
            {searchMatches.length > 0 ? searchMatches.map((indicator) => (
              <IndicatorOption key={indicator.id} indicator={indicator} locale={locale} onAdd={onAdd} onLearn={onLearn} showDescription />
            )) : <p className="strategy-library-empty">{isAr ? 'لا توجد مؤشرات مطابقة. جرّب اسماً أو رمزاً آخر.' : 'No matching indicators. Try another name or code.'}</p>}
            {allSearchMatches.length > MAX_VISIBLE_SEARCH_RESULTS && <p className="strategy-library-more">
              {isAr ? `عرض ${MAX_VISIBLE_SEARCH_RESULTS} من ${allSearchMatches.length} — اكتب لتضييق النتائج` : `Showing ${MAX_VISIBLE_SEARCH_RESULTS} of ${allSearchMatches.length} — type to narrow the list`}
            </p>}
          </div>
        ) : groups.length === 0 ? (
          <p className="strategy-library-empty">{isAr ? 'لا توجد مؤشرات متاحة.' : 'No indicators are available.'}</p>
        ) : (
          <div className="strategy-library-browser">
            <nav className="strategy-library-categories custom-scrollbar" aria-label={isAr ? 'فئات المؤشرات' : 'Indicator categories'}>
              {groups.map((group) => {
                const selected = group.category === activeGroup.category;
                return <button
                  key={group.category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveCategory(group.category)}
                  className={`strategy-library-category ${selected ? 'is-active' : ''}`}
                >
                  <span className="min-w-0">{formatCategoryLabel(group.category, locale)}</span>
                  <span className="shrink-0 tabular-nums">{group.indicators.length}</span>
                </button>;
              })}
            </nav>
            <div className="strategy-library-results custom-scrollbar" role="region" aria-label={formatCategoryLabel(activeGroup.category, locale)}>
              <div className="strategy-library-results-label">
                <span>{formatCategoryLabel(activeGroup.category, locale)}</span>
                <span className="tabular-nums">{activeGroup.indicators.length}</span>
              </div>
              {activeGroup.indicators.map((indicator) => (
                <IndicatorOption key={indicator.id} indicator={indicator} locale={locale} onAdd={onAdd} onLearn={onLearn} showDescription />
              ))}
            </div>
          </div>
        )}
      </section>{educationDrawer}</>
    );
  }

  return (
    <><section className="mt-3 rounded-xl border border-white/10 bg-black overflow-hidden shadow-2xl" aria-label={isAr ? 'البحث عن مؤشر' : 'Indicator search'}>
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
                onLearn={onLearn}
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
                      <IndicatorOption key={indicator.id} indicator={indicator} locale={locale} onAdd={onAdd} onLearn={onLearn} />
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
    </section>{educationDrawer}</>
  );
}
