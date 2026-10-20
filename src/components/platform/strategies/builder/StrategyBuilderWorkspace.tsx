'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronRight, LineChart, Pencil, Plus, SlidersHorizontal, X } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import StrategyFlowCanvas from './StrategyFlowCanvas';
import StrategyResultsDeck, { type StrategyResultsMode } from './StrategyResultsDeck';
import StrategySelectorDropdown from './StrategySelectorDropdown';
import StrategyTimeRangeSelector from './StrategyTimeRangeSelector';
import { projectSimpleDraftIntoAdvancedNodes, reconcileSimpleDraftFromFlow } from './advanced-builder-state';
import { compileAdvancedStrategy } from './compile-advanced-strategy';
import { compileSimpleStrategy, type CompileDiagnosticCode } from './compile-simple-strategy';
import { createAdvancedDraftNodes, type AdvancedStrategyNode } from './advanced-strategy-model';
import type { ProprietaryStudioProfile } from '@/lib/server/proprietary-studio-presentation';
import {
  addRuleToDraft,
  createEmptyStrategyDraft,
  isStrategyDraftTestable,
  localizeIndicatorCatalog,
  type StrategyBuilderIndicatorCatalogItem,
  type StrategyBuilderIndicatorOption,
  type StrategyDraft,
} from './strategy-builder-model';
import { buildStrategyFlow, type OptionalStrategyStageId } from './strategy-flow-model';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';
import { getStrategyVisualizationModel } from './strategy-visualization-model';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import type { SavedStrategyRecord } from '../../../../lib/strategies/server/parse-saved-strategy';
import { readSelectedUniverse } from './strategy-universe-selection';

interface StrategyBuilderWorkspaceProps {
  readonly indicatorCatalog: readonly StrategyBuilderIndicatorCatalogItem[];
  readonly universe: readonly StrategyUniverseCompany[];
  readonly canViewProprietary: boolean;
  readonly proprietaryAlertsEnabled: boolean;
  readonly profiles: readonly ProprietaryStudioProfile[];
  readonly typhonNodes: readonly AdvancedStrategyNode[];
}

type SavedStrategy = SavedStrategyRecord;

const STORAGE_KEY = 'ticknal.strategy-studio.saved.v1';
const DIAGNOSTIC_TEXT: Record<CompileDiagnosticCode, { en: string; ar: string }> = {
  BUY_RULE_REQUIRED: { en: 'Add a buy condition', ar: 'أضف شرط شراء' },
  SELL_RULE_REQUIRED: { en: 'Add a sell condition', ar: 'أضف شرط بيع' },
  INDICATOR_UNAVAILABLE: { en: 'Replace an unavailable indicator', ar: 'استبدل مؤشراً غير متاح' },
  PERIOD_INVALID: { en: 'Check an indicator period', ar: 'راجع فترة المؤشر' },
  PERIOD_UNSUPPORTED: { en: 'This indicator needs different settings', ar: 'هذا المؤشر يحتاج إعدادات مختلفة' },
  THRESHOLD_INVALID: { en: 'Enter a valid threshold', ar: 'أدخل مستوى تفعيل صالحاً' },
  OUTPUT_SELECTION_REQUIRED: { en: 'Choose an indicator output', ar: 'اختر مخرج المؤشر' },
  DATA_CAPABILITY_MISSING: { en: 'Required data is not available yet', ar: 'البيانات المطلوبة غير متاحة بعد' },
  OPERATOR_INVALID: { en: 'Choose a valid comparison', ar: 'اختر مقارنة صالحة' },
  CONNECTOR_INVALID: { en: 'Choose AND or OR', ar: 'اختر و أو أو' },
  CONFIRMED_WITH_DELAY_UNSUPPORTED: { en: 'This indicator confirms after later bars', ar: 'تأكيد هذا المؤشر يعتمد على جلسات لاحقة' },
};

function profileNodes(profile: ProprietaryStudioProfile, typhonNodes: readonly AdvancedStrategyNode[]): readonly AdvancedStrategyNode[] {
  if (profile.id === 'typhon') return typhonNodes;
  const prefix = profile.id;
  const inputs = `${prefix}-market`;
  const signals = profile.coreSignals.map((signal, index): AdvancedStrategyNode => ({
    id: `${prefix}-signal-${index}`,
    stage: 'signal',
    kind: 'calculation',
    title: { en: signal, ar: signal },
    summary: { en: signal, ar: signal },
    connections: [inputs],
    protected: true,
  }));
  const signalIds = signals.map((node) => node.id);
  return [
    { id: inputs, stage: 'inputs', kind: 'input', title: { en: 'Market data', ar: 'بيانات السوق' }, summary: { en: profile.description, ar: profile.description }, protected: true },
    ...signals,
    { id: `${prefix}-buy`, stage: 'entry', kind: 'decision', title: { en: 'Entry conditions', ar: 'شروط الشراء' }, summary: { en: profile.buyRule, ar: profile.buyRule }, connections: signalIds, protected: true },
    { id: `${prefix}-sell`, stage: 'exit', kind: 'exit', title: { en: 'Exit conditions', ar: 'شروط البيع' }, summary: { en: profile.sellRule, ar: profile.sellRule }, connections: signalIds, protected: true },
  ] as AdvancedStrategyNode[];
}

export default function StrategyBuilderWorkspace({ indicatorCatalog, universe, canViewProprietary, proprietaryAlertsEnabled, profiles, typhonNodes }: StrategyBuilderWorkspaceProps) {
  const { locale } = useTranslation();
  const builderLocale: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en';
  const isAr = builderLocale === 'ar';
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(canViewProprietary ? 'typhon' : 'custom-draft');
  const [draft, setDraft] = useState<StrategyDraft>(createEmptyStrategyDraft);
  const [advancedNodes, setAdvancedNodes] = useState<readonly AdvancedStrategyNode[]>([]);
  const [savedStrategies, setSavedStrategies] = useState<readonly SavedStrategy[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<readonly string[] | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [protectedAlertsEnabled, setProtectedAlertsEnabled] = useState(proprietaryAlertsEnabled);
  const [protectedAlertsPending, setProtectedAlertsPending] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [builderMode, setBuilderMode] = useState<'simple' | 'advanced'>('simple');
  const [enabledOptionalStages, setEnabledOptionalStages] = useState<readonly OptionalStrategyStageId[]>([]);
  const [draftRevision, setDraftRevision] = useState(0);
  const [ticker, setTicker] = useState('COMI');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [dockRailOpen, setDockRailOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement>(null);
  const mobileActionsTriggerRef = useRef<HTMLButtonElement>(null);
  const [analyticsWidth, setAnalyticsWidth] = useState(530);
  const [resultsMode, setResultsMode] = useState<StrategyResultsMode>('market');
  const [startDate, setStartDate] = useState('2025-01-05');
  const [endDate, setEndDate] = useState('2025-12-28');
  const [savedNotice, setSavedNotice] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!mobileActionsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!mobileActionsRef.current?.contains(event.target as Node)) setMobileActionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileActionsOpen(false);
      mobileActionsTriggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileActionsOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/strategies/saved', { cache: 'no-store' });
        if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to save strategies.' : 'Strategy storage is unavailable.');
        const payload: { status?: string; strategies?: SavedStrategy[] } = await response.json();
        if (payload.status !== 'ok' || !Array.isArray(payload.strategies)) throw new Error('Strategy storage returned an invalid response.');
        const server = payload.strategies;
        const legacyRaw = localStorage.getItem(STORAGE_KEY);
        let legacy: SavedStrategy[] = [];
        if (legacyRaw) {
          try { const parsed: unknown = JSON.parse(legacyRaw); if (Array.isArray(parsed)) legacy = parsed as SavedStrategy[]; }
          catch { /* Ignore an unreadable legacy cache; server data remains authoritative. */ }
        }
        const existing = new Set(server.map((strategy) => strategy.id));
        const migrated: SavedStrategy[] = [];
        for (const strategy of Array.isArray(legacy) ? legacy : []) {
          if (!strategy?.id?.startsWith('custom-') || existing.has(strategy.id)) continue;
          const snapshot = { ...strategy, selectedSymbols: readSelectedUniverse(strategy.id, universe.map((company) => company.symbol)) };
          const saved = await fetch('/api/strategies/saved', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strategy: snapshot }), cache: 'no-store' });
          if (!saved.ok) throw new Error('Could not migrate browser-saved strategies. Nothing was removed.');
          migrated.push(snapshot);
        }
        if (cancelled) return;
        setSavedStrategies([...server, ...migrated]);
        const deepLink = new URLSearchParams(window.location.search);
        const linked = [...server, ...migrated].find((strategy) => strategy.id === deepLink.get('strategy'));
        if (linked) {
          setDraft(linked.draft);
          setAdvancedNodes(linked.nodes.filter((node) => node.stage !== 'output'));
          setBuilderMode(linked.mode);
          setEnabledOptionalStages(linked.optionalStages ?? []);
          setSelectedSymbols(linked.selectedSymbols ?? null);
          setNotificationsEnabled(linked.notificationsEnabled === true);
          setStorageError(linked.notificationError ?? null);
          setSelectedStrategyId(linked.id);
          const linkedTicker = deepLink.get('ticker');
          if (linkedTicker && universe.some((company) => company.symbol === linkedTicker)) setTicker(linkedTicker);
        }
        if (legacyRaw) localStorage.removeItem(STORAGE_KEY);
        setStorageError(null);
      } catch (error) { if (!cancelled) setStorageError(error instanceof Error ? error.message : 'Strategy storage is unavailable.'); }
    };
    void load();
    return () => { cancelled = true; };
  }, [universe]);

  const indicators = useMemo<readonly StrategyBuilderIndicatorOption[]>(() => localizeIndicatorCatalog(indicatorCatalog, builderLocale), [builderLocale, indicatorCatalog]);
  const simpleCompilation = useMemo(() => compileSimpleStrategy(draft, indicators), [draft, indicators]);
  const advancedCompilation = useMemo(() => compileAdvancedStrategy(advancedNodes, indicators), [advancedNodes, indicators]);
  const visibleProfiles = canViewProprietary ? profiles : [];
  const selectedProfile = visibleProfiles.find((profile) => profile.id === selectedStrategyId);
  const isProtected = Boolean(selectedProfile);
  const strategyName = selectedProfile ? (isAr ? selectedProfile.nameAr : selectedProfile.name) : draft.name;
  const flowNodes = selectedProfile ? profileNodes(selectedProfile, typhonNodes) : builderMode === 'simple' ? projectSimpleDraftIntoAdvancedNodes(draft, indicators, createAdvancedDraftNodes()) : advancedNodes;
  const complete = isProtected || (builderMode === 'simple' ? simpleCompilation.status === 'ready' : advancedCompilation.status === 'ready');
  const liveProgram = isProtected ? null : builderMode === 'simple' ? (simpleCompilation.status === 'ready' ? simpleCompilation.program : null) : (advancedCompilation.status === 'ready' ? advancedCompilation.program : null);

  const visualization = getStrategyVisualizationModel({
    strategyId: selectedStrategyId,
    ticker,
    draft: complete && !isProtected && !isStrategyDraftTestable(draft)
      ? { ...draft, buyRules: [{ id: 'advanced-buy', indicatorId: 'advanced', period: 1, operator: 'isAbove', value: 0, connector: 'and' }], sellRules: [{ id: 'advanced-sell', indicatorId: 'advanced', period: 1, operator: 'isBelow', value: 0, connector: 'and' }] }
      : draft,
    advancedNodes: selectedProfile?.id === 'typhon' ? typhonNodes : advancedNodes,
    indicators,
    startDate,
    endDate,
  });

  const touchDraft = () => { setDraftRevision((value) => value + 1); setSavedNotice(false); setStorageError(null); };

  const selectStrategy = (id: string) => {
    const saved = savedStrategies.find((strategy) => strategy.id === id);
    if (saved) {
      setDraft(saved.draft);
      setAdvancedNodes(saved.nodes.filter((node) => node.stage !== 'output'));
      setBuilderMode(saved.mode);
      setEnabledOptionalStages((saved.optionalStages ?? []).filter((stage): stage is OptionalStrategyStageId => stage === 'calculations' || stage === 'position'));
      setSelectedSymbols(saved.selectedSymbols ?? null);
      setNotificationsEnabled(saved.notificationsEnabled === true);
      touchDraft();
      setStorageError(saved.notificationError ?? null);
    } else {
      setEnabledOptionalStages([]);
      setSelectedSymbols(null);
      setNotificationsEnabled(false);
    }
    setSelectedStrategyId(id);
    setFocusedBlockId(null);
    setRenaming(false);
  };

  const createNew = () => {
    const id = `custom-${Date.now()}`;
    setDraft({ ...createEmptyStrategyDraft(), id });
    setAdvancedNodes([]);
    setBuilderMode('simple');
    setSelectedSymbols(null);
    setNotificationsEnabled(false);
    setEnabledOptionalStages([]);
    setSelectedStrategyId(id);
    setFocusedBlockId(null);
    setRenaming(true);
    touchDraft();
  };

  const editProfile = () => {
    if (!selectedProfile) setRenaming(true);
  };

  const toggleProtectedAlerts = async () => {
    if (!selectedProfile || protectedAlertsPending) return;
    setProtectedAlertsPending(true);
    setStorageError(null);
    try {
      const response = await fetch('/api/strategies/proprietary/access', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationsEnabled: !protectedAlertsEnabled }), cache: 'no-store',
      });
      if (!response.ok) throw new Error('Could not update proprietary alerts.');
      setProtectedAlertsEnabled(!protectedAlertsEnabled);
    } catch (error) { setStorageError(error instanceof Error ? error.message : 'Could not update alerts.'); }
    finally { setProtectedAlertsPending(false); }
  };

  const saveStrategy = async (symbolsOverride?: readonly string[], notificationsOverride?: boolean): Promise<boolean> => {
    if (isProtected) return false;
    const name = draft.name.trim() || 'Untitled strategy';
    const snapshot: SavedStrategy = { id: draft.id, name, draft: { ...draft, name }, nodes: advancedNodes.filter((node) => node.stage !== 'output'), mode: builderMode, optionalStages: enabledOptionalStages, selectedSymbols: symbolsOverride ?? selectedSymbols ?? universe.map((company) => company.symbol), notificationsEnabled: complete && (notificationsOverride ?? notificationsEnabled) };
    setSaving(true);
    setStorageError(null);
    try {
      const response = await fetch('/api/strategies/saved', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strategy: snapshot }), cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(response.status === 401 ? 'Sign in to save strategies.' : body?.error ?? 'Could not save strategy on the server.');
      }
      setSavedStrategies((current) => [...current.filter((strategy) => strategy.id !== snapshot.id), snapshot]);
      setDraft(snapshot.draft);
      setSelectedSymbols(snapshot.selectedSymbols ?? null);
      setNotificationsEnabled(snapshot.notificationsEnabled === true);
      setSavedNotice(true);
      setRenaming(false);
      return true;
    } catch (error) { setStorageError(error instanceof Error ? error.message : 'Could not save strategy.'); setSavedNotice(false); return false; }
    finally { setSaving(false); }
  };

  const updateFlowNodes = (nodes: readonly AdvancedStrategyNode[]) => {
    if (builderMode === 'advanced') { setAdvancedNodes(nodes); touchDraft(); return; }
    setDraft((current) => reconcileSimpleDraftFromFlow(current, nodes));
    touchDraft();
  };

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const move = (pointer: PointerEvent) => setAnalyticsWidth(Math.min(Math.max(window.innerWidth - pointer.clientX - 56, 360), window.innerWidth * 0.7));
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-black font-sans text-white">
      <div className="relative flex min-h-0 flex-1">
        <div className="strategy-studio-viewport relative min-w-0 flex-1" aria-label={isAr ? 'لوحة تدفق الاستراتيجية' : 'Strategy flow canvas'}>
          <StrategyFlowCanvas key={`${selectedStrategyId}-${builderMode}`} strategyNodes={flowNodes} indicators={indicators} locale={builderLocale} protectedBlueprint={isProtected} editable={!isProtected} mode={builderMode} resizeSignal={analyticsOpen ? analyticsWidth : 0} enabledOptionalStages={enabledOptionalStages} onOptionalStagesChange={(stages) => { setEnabledOptionalStages(stages); touchDraft(); }} onNodesChange={updateFlowNodes} onAddSimpleRule={(side, indicator) => { setDraft((current) => addRuleToDraft(current, side, indicator)); touchDraft(); }} />
          <div className="strategy-studio-identity">
            <h1 className="strategy-studio-identity-title">{isAr ? 'استوديو الاستراتيجيات' : 'Strategy Studio'}</h1>
            {renaming && !isProtected ? <div className="mt-2 flex items-center gap-2"><label htmlFor="strategy-name" className="sr-only">{isAr ? 'اسم الاستراتيجية' : 'Strategy name'}</label><input id="strategy-name" autoFocus value={draft.name} onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); touchDraft(); }} onKeyDown={(event) => { if (event.key === 'Enter') setRenaming(false); }} className="h-8 min-w-0 flex-1 rounded-md border border-white/20 bg-black px-2.5 text-xs text-white outline-none focus:border-tv-blue-500" /><button type="button" className="strategy-studio-toolbar-button" onClick={() => setRenaming(false)}>{isAr ? 'تم' : 'Done'}</button></div> : <p className="strategy-studio-identity-caption truncate">{strategyName} <span className="mx-1 text-white/20">/</span> {isProtected ? (isAr ? 'للعرض فقط' : 'View mode') : (isAr ? 'وضع التحرير' : 'Edit mode')}</p>}
            {!isProtected && builderMode === 'simple' && <p className="strategy-studio-identity-caption" role="status">{simpleCompilation.status === 'ready' ? (isAr ? 'قواعد صالحة · اختبر شركة في التحليلات' : 'Rules valid · test a company in Analytics') : DIAGNOSTIC_TEXT[simpleCompilation.diagnostics[0].code][builderLocale]}</p>}
            {!isProtected && builderMode === 'advanced' && <p className="strategy-studio-identity-caption" role="status">{advancedCompilation.status === 'ready' ? (isAr ? 'سير العمل صالح · افتح التحليلات للاختبار' : 'Workflow valid · open Analytics to test') : advancedCompilation.diagnostics[0]?.message}</p>}
            {storageError && <p className="strategy-studio-identity-caption text-plt-risk" role="alert">{storageError}</p>}
          </div>
          <div
            className={analyticsOpen ? 'strategy-studio-dock-rail' : undefined}
            onMouseEnter={analyticsOpen ? () => setDockRailOpen(true) : undefined}
            onMouseLeave={analyticsOpen ? (event) => { if (!event.currentTarget.contains(document.activeElement)) setDockRailOpen(false); } : undefined}
            onFocus={analyticsOpen ? () => setDockRailOpen(true) : undefined}
            onBlur={analyticsOpen ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDockRailOpen(false); } : undefined}
            onKeyDown={analyticsOpen ? (event) => { if (event.key === 'Escape') { setDockRailOpen(false); document.querySelector<HTMLButtonElement>('#strategy-analytics-panel button')?.focus(); } } : undefined}
          >
          {analyticsOpen && <button type="button" className="strategy-studio-dock-rail-trigger" aria-label={isAr ? 'عناصر تحكم الاستوديو' : 'Studio controls'} aria-controls="strategy-studio-dock" aria-expanded={dockRailOpen} onClick={() => setDockRailOpen(true)}><SlidersHorizontal size={18} /></button>}
          <div id="strategy-studio-dock" className={`strategy-studio-dock ${analyticsOpen ? `strategy-studio-dock--rail ${dockRailOpen ? 'is-open' : ''}` : ''}`} role="toolbar" aria-orientation={analyticsOpen ? 'vertical' : 'horizontal'} aria-label={isAr ? 'عناصر تحكم استوديو الاستراتيجيات' : 'Strategy studio controls'}>
            <div className="strategy-studio-selector"><StrategySelectorDropdown selectedStrategyId={selectedStrategyId} draft={draft} profiles={visibleProfiles} savedStrategies={savedStrategies} locale={builderLocale} onSelect={selectStrategy} openUp /></div>
            <span className="strategy-studio-dock-divider strategy-studio-dock-desktop-only" aria-hidden="true" />
            <div className="seg-control shrink-0 strategy-studio-dock-desktop-only" role="tablist" aria-label={isAr ? 'وضع الإنشاء' : 'Builder mode'}>
              <button type="button" role="tab" aria-selected={builderMode === 'simple'} onClick={() => setBuilderMode('simple')} className={`seg-control-btn ${builderMode === 'simple' ? 'seg-control-btn-active active' : ''}`}>{isAr ? 'بسيط' : 'Simple'}</button>
              <button type="button" role="tab" aria-selected={builderMode === 'advanced'} onClick={() => { if (!isProtected) setAdvancedNodes(projectSimpleDraftIntoAdvancedNodes(draft, indicators, advancedNodes)); setBuilderMode('advanced'); }} className={`seg-control-btn ${builderMode === 'advanced' ? 'seg-control-btn-active active' : ''}`}>{isAr ? 'متقدم' : 'Advanced'}</button>
            </div>
            <span className="strategy-studio-dock-divider strategy-studio-dock-desktop-only" aria-hidden="true" />
            <button type="button" className="strategy-studio-toolbar-button strategy-studio-dock-desktop-only" onClick={createNew}><Plus size={13} />{isAr ? 'جديدة' : 'New'}</button>
            {!isProtected && <button type="button" className="strategy-studio-toolbar-button strategy-studio-dock-desktop-only" onClick={editProfile}><Pencil size={13} />{isAr ? 'تعديل' : 'Edit'}</button>}
            {!isProtected && <button type="button" className="strategy-studio-save-button strategy-studio-dock-desktop-only" onClick={() => { void saveStrategy(); }} disabled={saving}>{saving ? (isAr ? 'جارٍ الحفظ' : 'Saving…') : savedNotice ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ' : 'Save')}</button>}
            {!isProtected && <button type="button" className="strategy-studio-toolbar-button strategy-studio-dock-desktop-only" onClick={() => { void saveStrategy(undefined, !notificationsEnabled); }} disabled={saving || (!notificationsEnabled && !complete)} aria-pressed={notificationsEnabled} title={!complete && !notificationsEnabled ? (isAr ? 'أكمل قواعد الاستراتيجية لتفعيل التنبيهات' : 'Complete the strategy before enabling alerts') : undefined}><Bell size={13} />{notificationsEnabled ? (isAr ? 'التنبيهات مفعلة' : 'Alerts on') : (isAr ? 'تفعيل التنبيهات' : 'Alerts off')}</button>}
            {isProtected && <button type="button" className="strategy-studio-toolbar-button strategy-studio-dock-desktop-only" onClick={() => { void toggleProtectedAlerts(); }} disabled={protectedAlertsPending} aria-pressed={protectedAlertsEnabled} title={isAr ? 'تنبيه واحد لكل شركة من أفضل استراتيجية بين تايفون وسيربيروس وهيدرا' : 'One alert per ticker from the champion of Typhon, Cerberus and Hydra'}><Bell size={13} />{protectedAlertsEnabled ? (isAr ? 'تنبيهات البطل مفعلة' : 'Champion alerts on') : (isAr ? 'تنبيهات البطل متوقفة' : 'Champion alerts off')}</button>}
            <span className="strategy-studio-dock-divider strategy-studio-dock-desktop-only" aria-hidden="true" />
            <button type="button" className="strategy-studio-analytics-button" aria-label={isAr ? 'التحليلات' : 'Analytics'} aria-controls="strategy-analytics-panel" aria-expanded={analyticsOpen} onClick={() => { setMobileActionsOpen(false); setDockRailOpen(false); setAnalyticsOpen((value) => !value); }}><LineChart size={15} /><span className="strategy-studio-analytics-label">{isAr ? 'التحليلات' : 'Analytics'}</span><ChevronRight size={14} className="strategy-studio-analytics-arrow rtl-mirror" /></button>
            {!analyticsOpen && <div ref={mobileActionsRef} className="strategy-studio-mobile-actions">
              <button ref={mobileActionsTriggerRef} type="button" className="strategy-studio-mobile-actions-trigger" aria-label={isAr ? 'المزيد من إجراءات الاستراتيجية' : 'More strategy actions'} aria-controls="strategy-studio-mobile-menu" aria-expanded={mobileActionsOpen} onClick={() => setMobileActionsOpen((open) => !open)}><SlidersHorizontal size={18} /></button>
              {mobileActionsOpen && <div id="strategy-studio-mobile-menu" className="strategy-studio-mobile-menu" role="group" aria-label={isAr ? 'إجراءات الاستراتيجية' : 'Strategy actions'}>
                <div className="seg-control strategy-studio-mobile-mode" role="tablist" aria-label={isAr ? 'وضع الإنشاء' : 'Builder mode'}>
                  <button type="button" role="tab" aria-selected={builderMode === 'simple'} onClick={() => { setBuilderMode('simple'); setMobileActionsOpen(false); }} className={`seg-control-btn ${builderMode === 'simple' ? 'seg-control-btn-active active' : ''}`}>{isAr ? 'بسيط' : 'Simple'}</button>
                  <button type="button" role="tab" aria-selected={builderMode === 'advanced'} onClick={() => { if (!isProtected) setAdvancedNodes(projectSimpleDraftIntoAdvancedNodes(draft, indicators, advancedNodes)); setBuilderMode('advanced'); setMobileActionsOpen(false); }} className={`seg-control-btn ${builderMode === 'advanced' ? 'seg-control-btn-active active' : ''}`}>{isAr ? 'متقدم' : 'Advanced'}</button>
                </div>
                <div className="strategy-studio-mobile-menu-divider" />
                <button type="button" className="strategy-studio-toolbar-button" onClick={() => { createNew(); setMobileActionsOpen(false); }}><Plus size={15} />{isAr ? 'استراتيجية جديدة' : 'New strategy'}</button>
                {!isProtected && <button type="button" className="strategy-studio-toolbar-button" onClick={() => { editProfile(); setMobileActionsOpen(false); }}><Pencil size={15} />{isAr ? 'تعديل الاسم' : 'Edit name'}</button>}
                {!isProtected && <button type="button" className="strategy-studio-toolbar-button" onClick={() => { setMobileActionsOpen(false); void saveStrategy(); }} disabled={saving}>{saving ? (isAr ? 'جارٍ الحفظ' : 'Saving…') : savedNotice ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ الاستراتيجية' : 'Save strategy')}</button>}
                {!isProtected && <button type="button" className="strategy-studio-toolbar-button" onClick={() => { setMobileActionsOpen(false); void saveStrategy(undefined, !notificationsEnabled); }} disabled={saving || (!notificationsEnabled && !complete)} aria-pressed={notificationsEnabled} title={!complete && !notificationsEnabled ? (isAr ? 'أكمل قواعد الاستراتيجية لتفعيل التنبيهات' : 'Complete the strategy before enabling alerts') : undefined}><Bell size={15} />{notificationsEnabled ? (isAr ? 'التنبيهات مفعلة' : 'Alerts on') : (isAr ? 'التنبيهات متوقفة' : 'Alerts off')}</button>}
                {isProtected && <button type="button" className="strategy-studio-toolbar-button" onClick={() => { setMobileActionsOpen(false); void toggleProtectedAlerts(); }} disabled={protectedAlertsPending} aria-pressed={protectedAlertsEnabled} title={isAr ? 'تنبيه واحد لكل شركة من أفضل استراتيجية بين تايفون وسيربيروس وهيدرا' : 'One alert per ticker from the champion of Typhon, Cerberus and Hydra'}><Bell size={15} />{protectedAlertsEnabled ? (isAr ? 'تنبيهات البطل مفعلة' : 'Champion alerts on') : (isAr ? 'تنبيهات البطل متوقفة' : 'Champion alerts off')}</button>}
              </div>}
            </div>}
          </div>
          </div>
        </div>
        {analyticsOpen && <><div className="strategy-studio-resize-handle" role="separator" aria-label={isAr ? 'تغيير حجم التحليلات' : 'Resize analytics'} aria-orientation="vertical" tabIndex={0} onPointerDown={beginResize} onKeyDown={(event) => { if (event.key === 'ArrowLeft') setAnalyticsWidth((value) => Math.min(value + 24, window.innerWidth * 0.7)); if (event.key === 'ArrowRight') setAnalyticsWidth((value) => Math.max(value - 24, 360)); }} /><aside id="strategy-analytics-panel" className="flex min-h-0 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-black custom-scrollbar" style={{ width: analyticsWidth, maxWidth: 'calc(100vw - 56px)' }} aria-label={isAr ? 'تحليلات الاستراتيجية' : 'Strategy analytics'}><div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-black px-4 py-2"><span className="text-xs font-semibold">{isAr ? 'التحليلات' : 'Analytics'}</span><button type="button" className="strategy-studio-toolbar-button" onClick={() => setAnalyticsOpen(false)} aria-label={isAr ? 'إغلاق التحليلات' : 'Close analytics'}><X size={13} /></button></div><div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3"><div className="seg-control" role="tablist" aria-label={isAr ? 'عرض النتائج' : 'Results view'}><button type="button" role="tab" aria-selected={resultsMode === 'market'} onClick={() => setResultsMode('market')} className={`seg-control-btn ${resultsMode === 'market' ? 'seg-control-btn-active active' : ''}`}>{isAr ? 'السوق' : 'Market'}</button><button type="button" role="tab" aria-selected={resultsMode === 'companies'} onClick={() => setResultsMode('companies')} className={`seg-control-btn ${resultsMode === 'companies' ? 'seg-control-btn-active active' : ''}`}>{isAr ? 'الشركات' : 'Companies'}</button></div>{(resultsMode === 'companies' || liveProgram !== null) && <StrategyTimeRangeSelector startDate={startDate} endDate={endDate} locale={builderLocale} purpose={liveProgram ? 'backtest' : 'chart'} onChange={(start, end) => { setStartDate(start); setEndDate(end); }} />}</div><div className="min-w-0 flex-1 p-3"><StrategyResultsDeck strategyId={selectedStrategyId} strategyName={strategyName} hasRules={complete} draftRevision={draftRevision} locale={builderLocale} visualizationModel={visualization} ticker={ticker} focusedBlockId={focusedBlockId} resultsMode={resultsMode} startDate={startDate} endDate={endDate} simpleProgram={liveProgram} selectedSymbols={selectedSymbols} onSaveSelection={isProtected ? undefined : (symbols) => saveStrategy(symbols)} universe={universe} onResultsModeChange={setResultsMode} onTickerChange={setTicker} onFocusBlock={setFocusedBlockId} /></div></aside></>}
      </div>
    </div>
  );
}
