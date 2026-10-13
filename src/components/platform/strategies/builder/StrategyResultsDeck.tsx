'use client';

import React from 'react';
import type { StrategyVisualizationModel } from './strategy-visualization-model';
import StrategyBacktestPanel from './StrategyBacktestPanel';
import StrategyCompanyResultsPanel from './StrategyCompanyResultsPanel';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import { useSimpleCompanyBacktest } from './use-simple-company-backtest';
import type { StrategyUniverseCompany } from './strategy-universe-catalog';

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
  readonly startDate: string;
  readonly endDate: string;
  readonly simpleProgram: ExecutableStrategyProgram | null;
  readonly selectedSymbols: readonly string[] | null;
  readonly onSaveSelection?: (symbols: readonly string[]) => Promise<boolean>;
  readonly universe: readonly StrategyUniverseCompany[];
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
  startDate,
  endDate,
  simpleProgram,
  selectedSymbols,
  onSaveSelection,
  universe,
  onResultsModeChange,
  onTickerChange,
  onFocusBlock,
}: StrategyResultsDeckProps) {
  const companyBacktest = useSimpleCompanyBacktest({
    enabled: resultsMode === 'companies' && simpleProgram !== null,
    program: simpleProgram, symbol: ticker, startDate, endDate,
  });
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
            key={strategyId}
            strategyId={strategyId}
            strategyName={strategyName}
            hasRules={hasRules}
            draftRevision={draftRevision}
            locale={locale}
            simpleProgram={simpleProgram}
            selectedSymbols={selectedSymbols}
            universe={universe}
            startDate={startDate}
            endDate={endDate}
            onChooseCompanies={() => onResultsModeChange?.('companies')}
            onSelectTicker={handleSelectTickerFromTreemap}
          />
        ) : (
          <StrategyCompanyResultsPanel
            key={strategyId}
            strategyId={strategyId}
            model={visualizationModel}
            ticker={ticker}
            focusedBlockId={focusedBlockId}
            locale={locale}
            liveBacktest={companyBacktest}
            liveEligible={simpleProgram !== null}
            universe={universe}
            savedSelectedSymbols={selectedSymbols}
            onSaveSelection={onSaveSelection}
            backtestPeriod={{ startDate, endDate }}
            onTickerChange={onTickerChange}
            onFocusBlock={onFocusBlock}
          />
        )}
      </div>
    </div>
  );
}
