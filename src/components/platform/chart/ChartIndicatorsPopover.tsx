'use client';

import { X, ChevronDown, Check } from '@/components/ui/icon-library';
import { INDICATORS, getAvailableIndicators } from '@/indicators';

interface ChartIndicatorsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: string[];
  onToggleIndicator: (id: string) => void;
  expandedIndicators: Record<string, boolean>;
  onToggleExpanded: (id: string) => void;
  strategyParams: Record<string, any>;
  onUpdateStrategyParam: (key: string, val: any) => void;
}

export default function ChartIndicatorsPopover({
  isOpen,
  onClose,
  activeIndicators,
  onToggleIndicator,
  expandedIndicators,
  onToggleExpanded,
  strategyParams,
  onUpdateStrategyParam,
}: ChartIndicatorsPopoverProps) {
  if (!isOpen) return null;

  const availableIndicators = getAvailableIndicators();

  return (
    <div className="surface-popover absolute bottom-20 left-2 sm:left-4 z-50 w-72 p-3 text-xs text-plt-text shadow-2xl backdrop-blur-xl border border-plt-border bg-plt-base/95 rounded-xl animate-in fade-in zoom-in-95 duration-100">
      <div className="mb-2.5 flex items-center justify-between border-b border-plt-border pb-2">
        <span className="font-semibold text-xs text-plt-text">Technical Indicators</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-plt-muted hover:bg-plt-hover hover:text-plt-text transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto no-scrollbar pr-0.5">
        {availableIndicators.map((ind) => {
          const isActive = activeIndicators.includes(ind.id);
          const isExpanded = !!expandedIndicators[ind.id];

          return (
            <div key={ind.id} className="rounded-lg border border-transparent hover:border-plt-border-subtle bg-plt-hover/50 transition-colors">
              <div className="flex items-center justify-between p-2">
                <button
                  type="button"
                  onClick={() => onToggleIndicator(ind.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isActive
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-plt-border bg-plt-base text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className={`text-xs truncate ${isActive ? 'font-medium text-plt-text' : 'text-plt-subtle'}`}>
                    {ind.name}
                  </span>
                </button>

                {ind.options && ind.options.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(ind.id)}
                    className="p-1 text-plt-muted hover:text-plt-text transition-colors rounded"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Sub-options if expanded */}
              {isExpanded && ind.options && ind.options.length > 0 && (
                <div className="px-3 pb-2 pt-1 border-t border-plt-border/40 space-y-1.5 bg-plt-active/30 rounded-b-lg">
                  {ind.options.map((opt) => {
                    const optKey = `${ind.id}_${opt.id}`;
                    const isOptActive = strategyParams[optKey] ?? opt.defaultActive;

                    return (
                      <label
                        key={opt.id}
                        className="flex items-center justify-between text-[11px] text-plt-subtle hover:text-plt-text cursor-pointer select-none"
                      >
                        <span>{opt.name}</span>
                        <input
                          type="checkbox"
                          checked={isOptActive}
                          onChange={(e) => onUpdateStrategyParam(optKey, e.target.checked)}
                          className="accent-white h-3.5 w-3.5 rounded cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
