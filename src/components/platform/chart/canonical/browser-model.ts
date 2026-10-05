import {
  CANONICAL_PRESENTATION_REGISTRY,
  PROGRAM_MANIFEST,
  getIndicatorDefinition,
  type CanonicalIndicatorCatalogEntry,
  type ProgramEntry,
  type ProgramState,
  type ProgramView,
} from '@ticknal/quant-engine/canonical';

export type IndicatorBrowserLocale = 'en' | 'ar';

export interface IndicatorBrowserEntry {
  readonly backlogId: string;
  readonly definitionId: string | null;
  readonly category: string;
  readonly name: string;
  readonly description: string;
  readonly searchText: string;
  readonly view: ProgramView | null;
  readonly state: ProgramState;
  readonly enabled: boolean;
  readonly availability: string;
  readonly catalog: CanonicalIndicatorCatalogEntry | null;
}

export interface IndicatorBrowserGroup {
  readonly category: string;
  readonly entries: readonly IndicatorBrowserEntry[];
}

const AVAILABILITY: Record<ProgramState, { en: string; ar: string }> = {
  unimplemented: { en: 'In development', ar: 'قيد التطوير' },
  'formula-review': { en: 'Awaiting formula review', ar: 'بانتظار مراجعة المعادلة' },
  implementation: { en: 'Implementation in progress', ar: 'جارٍ تنفيذ المؤشر' },
  'data-gated': { en: 'Required market data is not available', ar: 'بيانات السوق المطلوبة غير متاحة' },
  verified: { en: 'Verified; chart integration pending', ar: 'تم التحقق؛ بانتظار ربط الرسم' },
  integrated: { en: 'Available', ar: 'متاح' },
  retired: { en: 'Retired', ar: 'متوقف' },
};

export function buildIndicatorBrowserEntries(
  programEntries: readonly ProgramEntry[],
  catalogEntries: readonly CanonicalIndicatorCatalogEntry[],
  locale: IndicatorBrowserLocale,
): readonly IndicatorBrowserEntry[] {
  const catalogByBacklogId = new Map(catalogEntries.map((entry) => [entry.backlogId, entry]));
  return Object.freeze(programEntries.map((program) => {
    const catalog = catalogByBacklogId.get(program.backlogId) ?? null;
    const definition = program.canonicalId ? getIndicatorDefinition(program.canonicalId) : undefined;
    const enabled = program.state === 'integrated'
      && catalog !== null
      && definition !== undefined
      && definition.formulaVersion === catalog.formulaVersion;
    const name = catalog?.name[locale] || program.name;
    const description = catalog?.description[locale] || program.explanation;
    return Object.freeze({
      backlogId: program.backlogId,
      definitionId: program.canonicalId,
      category: program.category,
      name,
      description,
      searchText: [program.backlogId, program.name, name, description, program.category, program.explanation]
        .join(' ')
        .toLocaleLowerCase(locale === 'ar' ? 'ar-EG' : 'en'),
      view: program.view,
      state: program.state,
      enabled,
      availability: AVAILABILITY[program.state][locale],
      catalog,
    });
  }));
}

export function filterIndicatorBrowserEntries(
  entries: readonly IndicatorBrowserEntry[],
  query: string,
  surface: ProgramView | 'all',
  category: string | 'all',
): readonly IndicatorBrowserEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return entries.filter((entry) =>
    (!normalizedQuery || entry.searchText.includes(normalizedQuery))
    && (surface === 'all' || entry.view === surface)
    && (category === 'all' || entry.category === category),
  );
}

export function groupIndicatorBrowserEntries(
  entries: readonly IndicatorBrowserEntry[],
): readonly IndicatorBrowserGroup[] {
  const groups = new Map<string, IndicatorBrowserEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.category) ?? [];
    group.push(entry);
    groups.set(entry.category, group);
  }
  return Object.freeze([...groups].map(([category, groupEntries]) => Object.freeze({
    category,
    entries: Object.freeze(groupEntries),
  })));
}

export function getIndicatorBrowserEntries(
  locale: IndicatorBrowserLocale,
): readonly IndicatorBrowserEntry[] {
  return buildIndicatorBrowserEntries(PROGRAM_MANIFEST, CANONICAL_PRESENTATION_REGISTRY, locale);
}

export function resolveIndicatorAddDefinitionId(entry: IndicatorBrowserEntry): string | null {
  return entry.enabled && entry.catalog ? entry.catalog.id : null;
}
