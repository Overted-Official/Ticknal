'use client';

import { ChevronDown, ChevronUp, Plus, RotateCcw, X } from '@/components/ui/icon-library';
import type {
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '@/indicators/canonical/types';
import IndicatorParameterEditor from './IndicatorParameterEditor';
import type { IndicatorBrowserEntry as BrowserEntry } from './browser-model';
import { formatIndicatorDiagnostic } from './indicator-diagnostic-message';

type SelectionPatch = Partial<Pick<CanonicalIndicatorSelection, 'parameters' | 'visibleOutputs' | 'placementOverrides'>>;

interface IndicatorBrowserEntryProps {
  readonly entry: BrowserEntry;
  readonly locale: 'en' | 'ar';
  readonly selections: readonly CanonicalIndicatorSelection[];
  readonly states: Readonly<Record<string, CanonicalIndicatorViewState>>;
  readonly onAdd: (definitionId: string) => void;
  readonly onUpdate: (instanceId: string, patch: SelectionPatch) => void;
  readonly onRemove: (instanceId: string) => void;
  readonly onReorder: (instanceId: string, direction: -1 | 1) => void;
}

export default function IndicatorBrowserEntry({ entry, locale, selections, states, onAdd, onUpdate, onRemove, onReorder }: IndicatorBrowserEntryProps) {
  const active = selections.filter((selection) => selection.definitionId === entry.definitionId);
  return (
    <article data-backlog-id={entry.backlogId} data-enabled={entry.enabled ? 'true' : 'false'} className="border-b border-plt-border-soft px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-semibold text-plt-text">{entry.name}</span>
            <span className="text-[9px] tabular-nums text-plt-faint">{entry.backlogId}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-plt-muted">{entry.description}</p>
          <span className={`mt-1 inline-block text-[9px] ${entry.enabled && entry.operational ? 'text-[#089981]' : entry.enabled ? 'text-[#ff9800]' : 'text-plt-faint'}`}>{entry.availability}</span>
        </div>
        <button type="button" disabled={!entry.enabled || !entry.definitionId}
          onClick={() => entry.definitionId && onAdd(entry.definitionId)}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-plt-border bg-plt-base text-plt-text disabled:cursor-not-allowed disabled:text-plt-faint enabled:hover:bg-plt-hover"
          aria-label={`Add ${entry.name}`}><Plus size={14} /></button>
      </div>

      {active.map((selection, index) => {
        const state = states[selection.instanceId];
        return (
          <div key={selection.instanceId} className="mt-2 border border-plt-border-soft bg-plt-base p-2">
            <div className="mb-2 flex items-center justify-between text-[10px]">
              <span className="tabular-nums text-plt-muted">#{index + 1} · {state?.status ?? 'loading'}</span>
              <div className="flex items-center gap-1 text-plt-muted">
                <button type="button" onClick={() => onReorder(selection.instanceId, -1)} className="p-1 hover:text-plt-text"><ChevronUp size={12} /></button>
                <button type="button" onClick={() => onReorder(selection.instanceId, 1)} className="p-1 hover:text-plt-text"><ChevronDown size={12} /></button>
                <button type="button" onClick={() => entry.catalog && onUpdate(selection.instanceId, { parameters: entry.catalog.defaultParameters })} className="p-1 hover:text-plt-text"><RotateCcw size={12} /></button>
                <button type="button" onClick={() => onRemove(selection.instanceId)} className="p-1 hover:text-plt-text"><X size={12} /></button>
              </div>
            </div>
            {state?.diagnostics?.[0] && (
              <p className="mb-2 text-[10px] leading-4 text-[#ffb74d]">
                {formatIndicatorDiagnostic(state.diagnostics[0], locale)}
              </p>
            )}
            {entry.catalog && entry.catalog.parameters.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {entry.catalog.parameters.map((schema) => (
                  <IndicatorParameterEditor key={schema.key} schema={schema} value={selection.parameters[schema.key]} locale={locale}
                    onChange={(value) => onUpdate(selection.instanceId, { parameters: { ...selection.parameters, [schema.key]: value } })} />
                ))}
              </div>
            )}
            {entry.catalog?.visuals.some((visual) => (visual.allowedSurfaces?.length ?? 0) > 1) && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {entry.catalog.visuals.filter((visual) => (visual.allowedSurfaces?.length ?? 0) > 1).map((visual) => (
                  <label key={visual.outputKey} className="text-[10px] text-plt-muted">
                    {visual.outputKey}
                    <select value={selection.placementOverrides[visual.outputKey] ?? visual.surface}
                      onChange={(event) => onUpdate(selection.instanceId, { placementOverrides: { ...selection.placementOverrides, [visual.outputKey]: event.target.value as 'overlay' | 'pane' } })}
                      className="mt-1 h-7 w-full rounded-none border border-plt-border-soft bg-plt-base px-2 text-plt-text">
                      {visual.allowedSurfaces?.map((surface) => <option key={surface} value={surface}>{surface}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </article>
  );
}
