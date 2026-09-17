'use client';

import React from 'react';
import { CheckCircle2 } from '@/components/ui/icon-library';
import { getAllStrategies } from '@/strategies/intraday/strategyRegistry';

interface BotStrategySelectorCardProps {
  currentStrategyId: string;
  onSelectStrategy: (id: string) => void;
}

export default function BotStrategySelectorCard({
  currentStrategyId,
  onSelectStrategy,
}: BotStrategySelectorCardProps) {
  const strategies = getAllStrategies();

  return (
    <div className="card-widget space-y-4 select-none">
      <div className="pb-2 border-b border-plt-border-soft">
        <h2 className="section-title">Active Algorithmic Model</h2>
        <p className="section-subtitle mt-0.5">
          Select which quantitative strategy generates the intraday trading signals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((strat) => {
          const isSelected = currentStrategyId === strat.id;
          return (
            <div
              key={strat.id}
              onClick={() => {
                if (strat.status !== 'COMING_SOON') {
                  onSelectStrategy(strat.id);
                }
              }}
              className={`option-card relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'option-card-active'
                  : strat.status === 'COMING_SOON'
                  ? 'option-card-disabled'
                  : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="row-title font-sans font-bold">{strat.name}</span>
                  {isSelected && <CheckCircle2 size={16} className="text-plt-profit" />}
                </div>
                <p className="text-plt-muted text-xs leading-relaxed font-sans">{strat.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-plt-border-soft flex items-center justify-between text-xs font-sans text-plt-muted">
                <span>Category: {strat.category}</span>
                <span className="font-semibold">{isSelected ? 'ACTIVE MODEL' : 'SELECT'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
