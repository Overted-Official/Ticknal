'use client';

import { useMemo, useState, type ComponentType } from 'react';

import {
  Activity,
  Database,
  GitBranch,
  Info,
  Plus,
  Radio,
  Search,
  Sigma,
  X,
} from '@/components/ui/icon-library';

import {
  ADVANCED_BLOCK_TEMPLATES,
  localize,
  type AdvancedBlockLibraryGroup,
  type AdvancedBlockTemplate,
  type AdvancedNodeKind,
  type LocalizedAdvancedCopy,
} from './advanced-strategy-model';
import StrategyLibraryEducationDrawer from './StrategyLibraryEducationDrawer';
import { getBlockEducation, type StrategyLibraryEducation } from './strategy-library-education';

export interface AdvancedBlockLibraryModalProps {
  readonly templateIds: readonly string[];
  readonly title: LocalizedAdvancedCopy;
  readonly search: LocalizedAdvancedCopy;
  readonly locale: 'en' | 'ar';
  readonly onAdd: (template: AdvancedBlockTemplate) => void;
  readonly onClose: () => void;
}

export const NODE_APPEARANCE: Readonly<Record<AdvancedNodeKind, {
  readonly color: string;
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly label: LocalizedAdvancedCopy;
}>> = {
  input: { color: 'var(--color-tv-blue-500)', icon: Database, label: { en: 'Input', ar: 'مدخل' } },
  calculation: { color: 'var(--plt-violet)', icon: Sigma, label: { en: 'Calculation', ar: 'حساب' } },
  decision: { color: 'var(--plt-warning)', icon: GitBranch, label: { en: 'Decision', ar: 'قرار' } },
  state: { color: 'var(--color-cold-gray-500)', icon: Activity, label: { en: 'State', ar: 'حالة' } },
  exit: { color: 'var(--plt-risk)', icon: GitBranch, label: { en: 'Exit', ar: 'خروج' } },
  output: { color: 'var(--plt-profit)', icon: Radio, label: { en: 'Output', ar: 'مخرج' } },
};

export const BLOCK_LIBRARY_GROUPS: readonly {
  readonly id: AdvancedBlockLibraryGroup;
  readonly title: LocalizedAdvancedCopy;
}[] = [
  { id: 'marketData', title: { en: 'Market data', ar: 'بيانات السوق' } },
  { id: 'indicators', title: { en: 'Indicators', ar: 'المؤشرات' } },
  { id: 'calculate', title: { en: 'Calculate', ar: 'الحساب' } },
  { id: 'rules', title: { en: 'Create a rule', ar: 'إنشاء قاعدة' } },
  { id: 'combine', title: { en: 'Combine rules', ar: 'دمج القواعد' } },
  { id: 'holding', title: { en: 'While holding', ar: 'أثناء الاحتفاظ' } },
  { id: 'protect', title: { en: 'Protect the trade', ar: 'حماية الصفقة' } },
];

export default function AdvancedBlockLibraryModal({
  templateIds,
  title,
  search,
  locale,
  onAdd,
  onClose,
}: AdvancedBlockLibraryModalProps) {
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AdvancedBlockLibraryGroup | null>(null);
  const [education, setEducation] = useState<StrategyLibraryEducation | null>(null);

  const availableTemplates = useMemo(() => ADVANCED_BLOCK_TEMPLATES.filter((template) => templateIds.includes(template.id)), [templateIds]);
  const groups = useMemo(() => BLOCK_LIBRARY_GROUPS
    .map((group) => ({ ...group, templates: availableTemplates.filter((template) => template.libraryGroup === group.id) }))
    .filter((group) => group.templates.length > 0), [availableTemplates]);
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return availableTemplates.filter((template) => [
      localize(template.title, locale),
      localize(template.description, locale),
      localize(BLOCK_LIBRARY_GROUPS.find((group) => group.id === template.libraryGroup)!.title, locale),
    ].join(' ').toLocaleLowerCase().includes(normalized));
  }, [availableTemplates, locale, query]);
  const selectedGroup = groups.find((group) => group.id === activeCategory) ?? groups[0];
  const isSearching = query.trim().length > 0;

  const renderOption = (template: AdvancedBlockTemplate) => {
    const appearance = NODE_APPEARANCE[template.kind];
    const Icon = appearance.icon;
    return <div key={template.id} className="strategy-library-result-row">
      <button type="button" onClick={() => onAdd(template)} aria-label={`${isAr ? 'إضافة' : 'Add'} ${localize(template.title, locale)}`} className="strategy-library-result strategy-library-result--add">
        <span className="shrink-0" style={{ color: appearance.color }}><Icon size={14} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-plt-text">{localize(template.title, locale)}</span>
          <span className="strategy-library-result-description">{localize(template.description, locale)}</span>
        </span>
        <span className="strategy-library-result-add"><Plus size={14} /></span>
      </button>
      <button type="button" className="strategy-library-result-learn" onClick={() => setEducation(getBlockEducation(template, locale))} aria-label={`${isAr ? 'تعرف على' : 'Learn about'} ${localize(template.title, locale)}`} title={isAr ? 'تعرف على الكتلة' : 'Learn about this block'}><Info size={15} /></button>
    </div>;
  };

  return (
    <><section
      className="strategy-library-panel"
      aria-label={`${isAr ? 'خيارات الإضافة إلى' : 'Add options for'} ${localize(title, locale)}`}
    >
      <header className="strategy-library-header">
        <div className="min-w-0">
          <p className="strategy-library-eyebrow">{isAr ? 'مكتبة الكتل' : 'Block library'}</p>
          <h2 className="strategy-library-title">{isAr ? `إضافة إلى ${localize(title, locale)}` : `Add to ${localize(title, locale)}`}</h2>
          <p className="strategy-library-description">{isAr ? 'اختر كتلة، ثم اضبطها على اللوحة.' : 'Choose a block, then configure it on the canvas.'}</p>
        </div>
        <button type="button" onClick={onClose} className="strategy-library-close" aria-label={isAr ? 'إغلاق المكتبة' : 'Close block library'}><X size={16} /></button>
      </header>

      <label className="strategy-library-search">
        <Search size={16} className="shrink-0 text-plt-muted" aria-hidden="true" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={localize(search, locale)}
          aria-label={localize(search, locale)}
          className="min-w-0 flex-1 bg-transparent font-sans text-xs text-plt-text outline-none placeholder:text-plt-muted"
        />
      </label>

      {isSearching ? <div className="strategy-library-results custom-scrollbar border-t border-plt-border-soft" role="region" aria-label={isAr ? 'نتائج البحث' : 'Search results'}>
        <div className="strategy-library-results-label"><span>{isAr ? 'نتائج البحث' : 'Search results'}</span><span className="tabular-nums">{searchResults.length}</span></div>
        {searchResults.length ? searchResults.map(renderOption) : <p className="strategy-library-empty">{isAr ? 'لا توجد خيارات مطابقة.' : 'No matching options.'}</p>}
      </div> : selectedGroup ? <div className="strategy-library-browser">
        <nav className="strategy-library-categories custom-scrollbar" aria-label={isAr ? 'فئات الكتل' : 'Block categories'}>
          {groups.map((group) => <button key={group.id} type="button" aria-pressed={group.id === selectedGroup.id} onClick={() => setActiveCategory(group.id)} className={`strategy-library-category ${group.id === selectedGroup.id ? 'is-active' : ''}`}>
            <span className="min-w-0">{localize(group.title, locale)}</span><span className="shrink-0 tabular-nums">{group.templates.length}</span>
          </button>)}
        </nav>
        <div className="strategy-library-results custom-scrollbar" role="region" aria-label={localize(selectedGroup.title, locale)}>
          <div className="strategy-library-results-label"><span>{localize(selectedGroup.title, locale)}</span><span className="tabular-nums">{selectedGroup.templates.length}</span></div>
          {selectedGroup.templates.map(renderOption)}
        </div>
      </div> : <p className="strategy-library-empty">{isAr ? 'لا توجد كتل متاحة.' : 'No blocks are available.'}</p>}
    </section>{education && <StrategyLibraryEducationDrawer guide={education} locale={locale} onClose={() => setEducation(null)} />}</>
  );
}
