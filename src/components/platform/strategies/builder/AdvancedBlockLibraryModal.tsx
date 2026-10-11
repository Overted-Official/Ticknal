'use client';

import { useMemo, useState, type ComponentType } from 'react';

import {
  Activity,
  Database,
  GitBranch,
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

  const templates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const areaTemplates = ADVANCED_BLOCK_TEMPLATES.filter((template) => templateIds.includes(template.id));
    if (!normalized) return areaTemplates;
    return areaTemplates.filter((template) => [
      localize(template.title, locale),
      localize(template.description, locale),
      template.libraryGroup,
    ].join(' ').toLocaleLowerCase().includes(normalized));
  }, [locale, query, templateIds]);

  const groupedTemplates = useMemo(() => BLOCK_LIBRARY_GROUPS
    .map((group) => ({
      ...group,
      templates: templates.filter((template) => template.libraryGroup === group.id),
    }))
    .filter((group) => group.templates.length > 0), [templates]);

  return (
    <section
      className="rounded-xl border border-white/15 bg-black overflow-hidden shadow-2xl"
      aria-label={`${isAr ? 'خيارات الإضافة إلى' : 'Add options for'} ${localize(title, locale)}`}
    >
      <div className="flex min-h-11 items-center border-b border-plt-border px-3 focus-within:border-white/30">
        <Search size={14} className="shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={localize(search, locale)}
          aria-label={localize(search, locale)}
          className="min-w-0 flex-1 bg-transparent px-2.5 font-sans text-xs text-white outline-none placeholder:text-plt-muted"
        />
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-plt-muted transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label={isAr ? 'إغلاق المكتبة' : 'Close block library'}
        >
          <X size={14} />
        </button>
      </div>

      <div className="no-scrollbar max-h-64 overflow-y-auto">
        {groupedTemplates.map((group) => (
          <section key={group.id} aria-labelledby={`block-library-${group.id}`} className="border-b border-plt-border last:border-b-0">
            <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2">
              <h5 id={`block-library-${group.id}`} className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/60">
                {localize(group.title, locale)}
              </h5>
              <span className="tabular-nums font-sans text-[9px] text-white/30">{group.templates.length}</span>
            </header>
            {group.templates.map((template) => {
              const appearance = NODE_APPEARANCE[template.kind];
              const Icon = appearance.icon;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onAdd(template)}
                  className="flex min-h-14 w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-start transition-colors last:border-b-0 hover:bg-plt-hover"
                >
                  <span className="shrink-0" style={{ color: appearance.color }}>
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-white">{localize(template.title, locale)}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-plt-muted">{localize(template.description, locale)}</span>
                  </span>
                  <Plus size={14} className="shrink-0 text-white/45" />
                </button>
              );
            })}
          </section>
        ))}

        {templates.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-plt-muted">
            {isAr ? 'لا توجد خيارات مطابقة.' : 'No matching options.'}
          </p>
        )}
      </div>
    </section>
  );
}
