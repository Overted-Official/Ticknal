import type { AdvancedStrategyNode } from './advanced-strategy-model';
import type { StrategyBuilderIndicatorOption, StrategyDraft } from './strategy-builder-model';

export interface StrategyVisualizationPoint { readonly date: string; readonly close: number; readonly volume: number }
export interface StrategyVisualizationMarker { readonly date: string; readonly price: number; readonly side: 'buy' | 'sell'; readonly label: string }
export interface StrategyVisualizationPane { readonly id: string; readonly name: string; readonly presentation: 'line' | 'bar'; readonly color: string; readonly values: readonly { date: string; value: number }[] }
export interface StrategyVisualizationModel { readonly ticker: string; readonly points: readonly StrategyVisualizationPoint[]; readonly markers: readonly StrategyVisualizationMarker[]; readonly panes: readonly StrategyVisualizationPane[] }

const TICKER_SEEDS: Readonly<Record<string, { base: number; drift: number; phase: number }>> = {
  COMI: { base: 71, drift: 0.24, phase: 1 },
  SWDY: { base: 62, drift: 0.18, phase: 4 },
  EAST: { base: 31, drift: 0.11, phase: 7 },
};

function makePoints(ticker: string): readonly StrategyVisualizationPoint[] {
  const seed = TICKER_SEEDS[ticker] ?? TICKER_SEEDS.COMI;
  return Array.from({ length: 52 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, 5 + index * 7)).toISOString().slice(0, 10);
    const close = seed.base + index * seed.drift + Math.sin((index + seed.phase) / 3.2) * 3.6 + Math.cos((index + seed.phase) / 7) * 1.5;
    return { date, close: Number(close.toFixed(2)), volume: Math.round(1_200_000 + (Math.sin(index / 2 + seed.phase) + 1) * 680_000 + index * 8_500) };
  });
}

function makePane(id: string, name: string, points: readonly StrategyVisualizationPoint[], offset: number, presentation: 'line' | 'bar' = 'line'): StrategyVisualizationPane {
  return {
    id, name, presentation, color: ['#2962ff', '#8b5cf6', '#089981', '#d6a316', '#f23645'][offset % 5],
    values: points.map((point, index) => ({ date: point.date, value: Number((50 + Math.sin((index + offset) / 3.4) * 27 + Math.cos((index + offset) / 8) * 8).toFixed(2)) })),
  };
}

export function getStrategyVisualizationModel(input: {
  readonly strategyId: string;
  readonly ticker: string;
  readonly draft: StrategyDraft;
  readonly advancedNodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
}): StrategyVisualizationModel | null {
  const isCustom = input.strategyId === input.draft.id;
  if (isCustom && (input.draft.buyRules.length === 0 || input.draft.sellRules.length === 0)) return null;
  const points = makePoints(input.ticker);
  const markerIndices = [9, 21, 34, 45];
  const markers = markerIndices.map((index, markerIndex) => ({ date: points[index].date, price: points[index].close, side: markerIndex % 2 === 0 ? 'buy' as const : 'sell' as const, label: markerIndex % 2 === 0 ? 'Buy rule matched' : 'Sell rule matched' }));

  let panes: readonly StrategyVisualizationPane[];
  if (input.strategyId === 'psi') {
    panes = [makePane('typhon-master-index', 'Master Index', points, 2), makePane('typhon-smoothing', 'EMA smoothing', points, 5)];
  } else if (!isCustom) {
    panes = [makePane(`${input.strategyId}-signal`, input.strategyId === 'hydra' ? 'Adaptive volatility' : 'PSI momentum', points, 3), makePane(`${input.strategyId}-regime`, 'Market regime', points, 8, 'bar')];
  } else {
    const advanced = input.advancedNodes.filter((node) => !node.protected && (node.kind === 'calculation' || node.templateId === 'indicator'));
    if (advanced.length > 0) {
      panes = advanced.map((node, index) => makePane(node.id, node.customName || node.title.en, points, index + 1, node.templateId === 'rolling-statistic' ? 'bar' : 'line'));
    } else {
      const uniqueIds = [...new Set([...input.draft.buyRules, ...input.draft.sellRules].map((rule) => rule.indicatorId))];
      panes = uniqueIds.map((indicatorId, index) => makePane(indicatorId, input.indicators.find((indicator) => indicator.id === indicatorId)?.name ?? 'Unknown indicator', points, index + 1));
    }
  }
  return { ticker: input.ticker, points, markers, panes };
}
