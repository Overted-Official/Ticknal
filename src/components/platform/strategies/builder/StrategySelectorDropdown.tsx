'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Lock } from '@/components/ui/icon-library';
import { STRATEGY_PROFILE_ARABIC, type StrategyProfile } from './strategy-builder-fixtures';
import type { StrategyDraft } from './strategy-builder-model';

interface StrategySelectorDropdownProps {
  readonly selectedStrategyId: string;
  readonly draft: StrategyDraft;
  readonly profiles: readonly StrategyProfile[];
  readonly locale: 'en' | 'ar';
  readonly onSelect: (strategyId: string) => void;
}

export default function StrategySelectorDropdown({
  selectedStrategyId,
  draft,
  profiles,
  locale,
  onSelect,
}: StrategySelectorDropdownProps) {
  const isAr = locale === 'ar';
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  // Current selected label
  const selectedProfile = profiles.find((p) => p.id === selectedStrategyId);
  const currentLabel = selectedStrategyId === draft.id
    ? (isAr ? 'استراتيجية بلا اسم' : draft.name)
    : selectedProfile
      ? (isAr ? STRATEGY_PROFILE_ARABIC[selectedProfile.id]?.name ?? selectedProfile.name : selectedProfile.name)
      : (isAr ? 'اختر استراتيجية' : 'Select strategy');

  return (
    <div ref={containerRef} className="relative min-w-44 select-none">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={isAr ? 'اختر استراتيجية' : 'Select strategy'}
        className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-black px-3 font-sans text-xs font-semibold text-white/90 outline-none transition-all hover:border-white/20 hover:text-white focus:border-white/30"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-white/40 transition-transform duration-150 ${open ? 'rotate-180 text-white' : ''}`}
        />
      </button>

      {/* Sleek Custom Menu Popover */}
      {open && (
        <div
          role="listbox"
          aria-label={isAr ? 'قائمة الاستراتيجيات' : 'Strategies list'}
          className="absolute start-0 top-full z-50 mt-1.5 min-w-[200px] w-full rounded-xl border border-white/15 bg-black p-1 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {profiles.map((profile) => {
            const isSelected = profile.id === selectedStrategyId;
            const label = isAr ? STRATEGY_PROFILE_ARABIC[profile.id]?.name ?? profile.name : profile.name;
            return (
              <button
                key={profile.id}
                role="option"
                type="button"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(profile.id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 font-sans text-[11px] font-medium transition-colors ${
                  isSelected
                    ? 'bg-white/10 font-semibold text-white'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate">{label}</span>
                  <Lock size={10} className="shrink-0 text-white/30" aria-label={isAr ? 'محمي' : 'Protected'} />
                </div>
                {isSelected && <Check size={12} className="shrink-0 text-white" />}
              </button>
            );
          })}

          <div className="my-1 border-t border-white/[0.08]" />

          {/* Custom Draft Option */}
          <button
            role="option"
            type="button"
            aria-selected={draft.id === selectedStrategyId}
            onClick={() => {
              onSelect(draft.id);
              setOpen(false);
            }}
            className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 font-sans text-[11px] font-medium transition-colors ${
              draft.id === selectedStrategyId
                ? 'bg-white/10 font-semibold text-white'
                : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span className="truncate">{isAr ? 'استراتيجية بلا اسم' : draft.name}</span>
            {draft.id === selectedStrategyId && <Check size={12} className="shrink-0 text-white" />}
          </button>
        </div>
      )}
    </div>
  );
}
