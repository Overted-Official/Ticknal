'use client';

import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, Check, BarChart2 } from '@/components/ui/icon-library';
import { getAvailableIndicators } from '@/indicators';

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
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const availableIndicators = getAvailableIndicators();

  return (
    <div
      ref={popoverRef}
      className="absolute top-2 left-2 sm:left-64 md:left-72 z-50 w-[270px] sm:w-[285px] max-w-[calc(100vw-16px)] bg-cold-gray-900 border border-white/[0.08] rounded-lg shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden text-xs font-sans"
    >
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
          <BarChart2 size={13} className="text-white" />
          <span>Technical Indicators</span>
          {activeIndicators.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-white/20 text-white font-bold leading-none">
              {activeIndicators.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-5 w-5 rounded flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Indicators List */}
      <div className="p-1 max-h-72 overflow-y-auto no-scrollbar space-y-0.5">
        {availableIndicators.map((ind) => {
          const isActive = activeIndicators.includes(ind.id);
          const isExpanded = !!expandedIndicators[ind.id];

          return (
            <div
              key={ind.id}
              className={`rounded-md transition-colors ${
                isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() => onToggleIndicator(ind.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                >
                  <div
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                      isActive
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/20 bg-transparent text-transparent'
                    }`}
                  >
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span
                    className={`text-[11.5px] truncate ${
                      isActive ? 'font-medium text-white' : 'text-text-muted'
                    }`}
                  >
                    {ind.name}
                  </span>
                </button>

                {ind.options && ind.options.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(ind.id)}
                    className="p-1 text-text-muted hover:text-white transition-colors rounded cursor-pointer"
                    aria-label={`Toggle ${ind.name} options`}
                  >
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-150 ${
                        isExpanded ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Sub-options if expanded */}
              {isExpanded && ind.options && ind.options.length > 0 && (
                <div className="px-3 pb-2 pt-1 border-t border-white/[0.04] space-y-1 bg-black/25 rounded-b-md">
                  {ind.options.map((opt) => {
                    const optKey = `${ind.id}_${opt.id}`;
                    const isOptActive = strategyParams[optKey] ?? opt.defaultActive;

                    return (
                      <label
                        key={opt.id}
                        className="flex items-center justify-between text-[10.5px] text-text-muted hover:text-white cursor-pointer select-none py-0.5"
                      >
                        <span className="truncate pr-2">{opt.name}</span>
                        <input
                          type="checkbox"
                          checked={isOptActive}
                          onChange={(e) => onUpdateStrategyParam(optKey, e.target.checked)}
                          className="accent-white h-3 w-3 rounded cursor-pointer"
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

      {/* Compact Status Footer */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] bg-black/30 flex items-center justify-between text-[10px] text-text-muted font-sans">
        <span>{activeIndicators.length} active on chart</span>
        {activeIndicators.length > 0 && (
          <button
            type="button"
            onClick={() => {
              activeIndicators.forEach((id) => onToggleIndicator(id));
            }}
            className="text-[10px] text-text-muted hover:text-white cursor-pointer transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
