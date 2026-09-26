'use client';

import React from 'react';

export interface StrategyMeta {
  name: string;
  shortName: string;
  color?: string;
  badgeBg?: string;
}

export const KNOWN_STRATEGIES: Record<string, StrategyMeta> = {
  ALL: {
    name: 'All Strategies',
    shortName: 'ALL',
    color: 'var(--text-primary)',
  },
  psi: {
    name: 'Typhon',
    shortName: 'Typhon',
    color: 'var(--color-brand-blue)',
    badgeBg: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
  },
  psi_v2: {
    name: 'Cerberus',
    shortName: 'Cerberus',
    color: 'var(--color-profit-num)',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  hydra: {
    name: 'Hydra',
    shortName: 'Hydra',
    color: 'var(--color-accent-cyan)',
    badgeBg: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
  },
};

export function resolveStrategyMeta(
  strategyId?: string,
  rawShortName?: string
): StrategyMeta & { id: string } {
  const normalizedId = (strategyId || 'psi').toLowerCase();
  const normalizedRaw = (rawShortName || '').toUpperCase();

  if (
    normalizedId === 'psi_v2' ||
    normalizedRaw.includes('CERBERUS') ||
    normalizedRaw.includes('PSI V2') ||
    normalizedRaw.includes('PSI_V2')
  ) {
    return {
      id: 'psi_v2',
      name: 'Cerberus',
      shortName: 'Cerberus',
      color: 'var(--color-profit-num)',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
  }

  if (normalizedId === 'hydra' || normalizedRaw.includes('HYDRA')) {
    return {
      id: 'hydra',
      name: 'Hydra',
      shortName: 'Hydra',
      color: 'var(--color-accent-cyan)',
      badgeBg: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
    };
  }

  // Default: Typhon (formerly psi)
  return {
    id: 'psi',
    name: 'Typhon',
    shortName: 'Typhon',
    color: 'var(--color-brand-blue)',
    badgeBg: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
  };
}

interface StrategySwitcherProps {
  selectedStrategy: string;
  onSelectStrategy: (strategyId: string) => void;
  availableStrategies: string[];
  counts?: Record<string, number>;
  totalCount?: number;
}

export default function StrategySwitcher({
  selectedStrategy,
  onSelectStrategy,
  availableStrategies,
}: StrategySwitcherProps) {
  // Always include all active system strategies in the switcher
  const systemStrategies = ['ALL', 'psi', 'psi_v2', 'hydra'];
  const strategyList = Array.from(new Set([...systemStrategies, ...(availableStrategies || []).filter((s) => s !== 'thoth_egx_macro')]));

  return (
    <div className="seg-control max-w-full overflow-x-auto no-scrollbar">
      {strategyList.map((id) => {
        const meta = KNOWN_STRATEGIES[id] || {
          name: id.toUpperCase(),
          shortName: id.toUpperCase(),
        };
        const isSelected = selectedStrategy === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectStrategy(id)}
            className={`seg-control-btn whitespace-nowrap ${isSelected ? 'seg-control-btn-active' : ''}`}
          >
            {meta.name}
          </button>
        );
      })}
    </div>
  );
}
