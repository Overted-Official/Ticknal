'use client';

import React from 'react';
import { Layers3, TrendingUp } from '@/components/ui/icon-library';
import {
  money,
  number,
  regimeTone,
  type Grouping,
  type Regime,
} from './portfolioTypes';

interface PortfolioAllocationsCardWidgetProps {
  grouping: Grouping;
  allocation: Array<[string, number]>;
  investedValue: number;
  leadingRegimes: Array<[Regime, number]>;
}

export default function PortfolioAllocationsCardWidget({
  grouping,
  allocation,
  investedValue,
  leadingRegimes,
}: PortfolioAllocationsCardWidgetProps) {
  const groupingLabel = grouping === 'sector' ? 'sector' : grouping === 'industryGroup' ? 'industry group' : 'industry';

  return (
    <div className="w-full min-w-0 relative grid insights-grid gap-3">
      {/* Allocation breakdown card */}
      <div className="rounded-xl bg-plt-card/35 p-4 min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-plt-text">Allocation by {groupingLabel}</p>
            <p className="mt-0.5 text-[10px] text-plt-muted">Based on invested value, not brokerage cash.</p>
          </div>
          <Layers3 size={15} className="text-plt-muted shrink-0" />
        </div>

        {allocation.length === 0 ? (
          <p className="py-4 text-xs text-plt-muted">No open holdings.</p>
        ) : (
          <div className="space-y-2.5">
            {allocation.map(([group, value]) => {
              const share = investedValue > 0 ? (value / investedValue) * 100 : 0;
              return (
                <div key={group}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-plt-text truncate mr-2">{group}</span>
                    <span className="text-plt-muted shrink-0 font-mono">
                      {number(share)}% · {money(value)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-plt-hover">
                    <div
                      className="allocation-bar-fill"
                      data-concentration={share > 30 ? 'high' : 'standard'}
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Position Regimes Card */}
      <div className="rounded-xl bg-plt-card/35 p-4 min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-plt-text">Position regimes</p>
            <p className="mt-0.5 text-[10px] text-plt-muted">Rotation state for groups you own.</p>
          </div>
          <TrendingUp size={15} className="text-plt-muted shrink-0" />
        </div>

        <div className="flex flex-wrap gap-2">
          {leadingRegimes.length === 0 ? (
            <span className="text-xs text-plt-muted">No open holdings.</span>
          ) : (
            leadingRegimes.map(([item, count]) => (
              <span key={item} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${regimeTone(item)}`}>
                {item} · {count}
              </span>
            ))
          )}
        </div>

        <div className="mt-4 rounded-lg bg-plt-base/60 px-3 py-2 text-[11px] text-plt-muted">
          Largest allocation:{' '}
          <span className="font-semibold text-plt-text">{allocation[0]?.[0] || 'None'}</span>
          {allocation[0] && investedValue > 0 ? ` · ${number((allocation[0][1] / investedValue) * 100)}%` : ''}.{' '}
          {allocation[0] && allocation[0][1] / investedValue > 0.3
            ? 'Concentration warning above 30%.'
            : 'Inside the 30% concentration guardrail.'}
        </div>
      </div>
    </div>
  );
}
