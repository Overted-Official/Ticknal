'use client';

import React from 'react';
import type { StrategyVisualizationModel } from './strategy-visualization-model';
import StrategyBacktestPanel from './StrategyBacktestPanel';
import StrategyVisualizationPanel from './StrategyVisualizationPanel';

export type StrategyResultsMode = 'market' | 'companies';

interface StrategyResultsDeckProps {
  readonly strategyId: string;
  readonly strategyName: string;
  readonly hasRules: boolean;
  readonly draftRevision: number;
  readonly locale: 'en' | 'ar';
  readonly visualizationModel: StrategyVisualizationModel | null;
  readonly ticker: string;
  readonly focusedBlockId: string | null;
  readonly resultsMode: StrategyResultsMode;
  readonly onResultsModeChange?: (mode: StrategyResultsMode) => void;
  readonly onTickerChange: (ticker: string) => void;
  readonly onFocusBlock: (blockId: string) => void;
}

export default function StrategyResultsDeck({
  strategyId,
  strategyName,
  hasRules,
  draftRevision,
  locale,
  visualizationModel,
  ticker,
  focusedBlockId,
  resultsMode,
  onResultsModeChange,
  onTickerChange,
  onFocusBlock,
}: StrategyResultsDeckProps) {
  const handleSelectTickerFromTreemap = (symbol: string) => {
    onTickerChange(symbol);
    onResultsModeChange?.('companies');
  };

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Main View Display */}
      <div className="min-w-0 flex-1">
        {resultsMode === 'market' ? (
          <StrategyBacktestPanel
            strategyId={strategyId}
            strategyName={strategyName}
            hasRules={hasRules}
            draftRevision={draftRevision}
            locale={locale}
            onSelectTicker={handleSelectTickerFromTreemap}
          />
        ) : (
          <StrategyVisualizationPanel
            model={visualizationModel}
            ticker={ticker}
            focusedBlockId={focusedBlockId}
            locale={locale}
            onTickerChange={onTickerChange}
            onFocusBlock={onFocusBlock}
          />
        )}
      </div>
    </div>
  );
}
