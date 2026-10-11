'use client';

import { Plus } from '@/components/ui/icon-library';

import AdvancedBlockLibraryModal from './AdvancedBlockLibraryModal';
import CompactAdvancedNodeCard from './CompactAdvancedNodeCard';
import {
  localize,
  type AdvancedBlockTemplate,
  type AdvancedStrategyNode,
  type LocalizedAdvancedCopy,
} from './advanced-strategy-model';
import type { StrategyInspectorTab } from './strategy-inspector-model';

export type WorkflowAreaId = 'data' | 'calculations' | 'buy' | 'position' | 'sell';

export interface WorkflowAreaConfig {
  readonly id: WorkflowAreaId;
  readonly number: string;
  readonly title: LocalizedAdvancedCopy;
  readonly description: LocalizedAdvancedCopy;
  readonly templateIds: readonly string[];
  readonly matches: (node: AdvancedStrategyNode) => boolean;
  readonly addLabel: LocalizedAdvancedCopy;
  readonly searchLabel: LocalizedAdvancedCopy;
}

export interface AdvancedWorkflowAreaSectionProps {
  readonly area: WorkflowAreaConfig;
  readonly nodes: readonly AdvancedStrategyNode[];
  readonly locale: 'en' | 'ar';
  readonly readOnly: boolean;
  readonly activeNodeId: string | null;
  readonly isLibraryOpen: boolean;
  readonly terminalNode?: AdvancedStrategyNode | null;
  readonly onOpenLibrary: () => void;
  readonly onCloseLibrary: () => void;
  readonly onAddFromLibrary: (template: AdvancedBlockTemplate) => void;
  readonly onInspectNode: (node: AdvancedStrategyNode, tab: StrategyInspectorTab) => void;
  readonly onConfigureNode: (node: AdvancedStrategyNode) => void;
  readonly onRemoveNode: (nodeId: string) => void;
}

export default function AdvancedWorkflowAreaSection({
  area,
  nodes,
  locale,
  readOnly,
  activeNodeId,
  isLibraryOpen,
  terminalNode,
  onOpenLibrary,
  onCloseLibrary,
  onAddFromLibrary,
  onInspectNode,
  onConfigureNode,
  onRemoveNode,
}: AdvancedWorkflowAreaSectionProps) {
  const isAr = locale === 'ar';
  const titleColorClass = area.id === 'buy'
    ? 'text-plt-profit'
    : area.id === 'sell'
      ? 'text-plt-risk'
      : 'text-white/70';

  return (
    <section aria-labelledby={`advanced-area-${area.id}`} className="space-y-2 rounded-xl border border-white/[0.08] bg-black p-3">
      <header className="border-b border-white/[0.06] px-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-sans text-[9px] font-semibold text-white/30">{area.number}</span>
          <h6 id={`advanced-area-${area.id}`} className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${titleColorClass}`}>
            {localize(area.title, locale)}
          </h6>
          <span className="tabular-nums font-sans text-[9px] text-white/30">{nodes.length}</span>
        </div>
        <p className="mt-0.5 text-[9px] leading-4 text-plt-muted">{localize(area.description, locale)}</p>
      </header>

      <div className="space-y-2">
        {nodes.map((node, index) => (
          <div key={node.id}>
            {area.id === 'sell' && index > 0 && (
              <div className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="font-sans text-[8px] font-semibold text-plt-risk">{isAr ? 'أو' : 'OR'}</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>
            )}
            <CompactAdvancedNodeCard
              node={node}
              locale={locale}
              readOnly={readOnly}
              selected={activeNodeId === node.id}
              onInspect={() => onInspectNode(node, 'learn')}
              onConfigure={() => onConfigureNode(node)}
              onRemove={() => onRemoveNode(node.id)}
            />
          </div>
        ))}

        {!readOnly && (
          isLibraryOpen ? (
            <AdvancedBlockLibraryModal
              templateIds={area.templateIds}
              title={area.title}
              search={area.searchLabel}
              locale={locale}
              onAdd={onAddFromLibrary}
              onClose={onCloseLibrary}
            />
          ) : (
            <button
              type="button"
              onClick={onOpenLibrary}
              aria-expanded={false}
              className={`flex w-full items-center justify-center rounded-none border border-dashed border-white/10 font-sans text-[10px] text-plt-muted transition-colors hover:border-white/25 hover:text-white ${nodes.length === 0 ? 'min-h-16' : 'min-h-11'}`}
            >
              <Plus size={12} className="me-1.5" /> {localize(area.addLabel, locale)}
            </button>
          )
        )}

        {terminalNode && (
          <CompactAdvancedNodeCard
            node={terminalNode}
            locale={locale}
            readOnly={readOnly}
            selected={activeNodeId === terminalNode.id}
            onInspect={() => onInspectNode(terminalNode, 'learn')}
            onConfigure={() => onConfigureNode(terminalNode)}
          />
        )}
      </div>
    </section>
  );
}
