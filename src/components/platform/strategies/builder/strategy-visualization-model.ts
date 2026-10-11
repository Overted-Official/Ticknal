import type { AdvancedStrategyNode } from './advanced-strategy-model';
import type { StrategyBuilderIndicatorOption, StrategyDraft } from './strategy-builder-model';

export interface StrategyVisualizationPoint {
  readonly date: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export interface StrategyVisualizationMarker {
  readonly date: string;
  readonly price: number;
  readonly side: 'buy' | 'sell';
  readonly label: string;
  readonly blockId?: string;
}

export interface StrategyVisualizationPane {
  readonly id: string;
  readonly name: string;
  readonly presentation: 'line' | 'bar';
  readonly color: string;
  readonly values: readonly { date: string; value: number }[];
}

export interface StrategyVisualizationLegendItem {
  readonly id: string;
  readonly name: string;
  readonly sourceBlockTitle: string;
  readonly color: string;
  readonly kind: 'price' | 'signal' | 'indicator' | 'calculation';
}

export interface StrategyVisualizationModel {
  readonly ticker: string;
  readonly points: readonly StrategyVisualizationPoint[];
  readonly markers: readonly StrategyVisualizationMarker[];
  readonly panes: readonly StrategyVisualizationPane[];
  readonly legendItems: readonly StrategyVisualizationLegendItem[];
}

const TICKER_SEEDS: Readonly<Record<string, { base: number; drift: number; phase: number }>> = {
  COMI: { base: 71, drift: 0.24, phase: 1 },
  SWDY: { base: 62, drift: 0.18, phase: 4 },
  EAST: { base: 31, drift: 0.11, phase: 7 },
  TMGH: { base: 87, drift: 0.22, phase: 2 },
  FWRY: { base: 9.5, drift: 0.05, phase: 5 },
  ETEL: { base: 42, drift: 0.14, phase: 3 },
  ORAS: { base: 240, drift: 0.8, phase: 6 },
  AMOC: { base: 10.2, drift: 0.04, phase: 8 },
  ESRS: { base: 95, drift: 0.35, phase: 2 },
  EKHO: { base: 48, drift: 0.16, phase: 4 },
  HRHO: { base: 24, drift: 0.09, phase: 1 },
  ABUK: { base: 66, drift: 0.21, phase: 5 },
  SKPC: { base: 28, drift: 0.08, phase: 3 },
  MFPC: { base: 45, drift: 0.15, phase: 7 },
};

function resolveTickerSeed(ticker: string): { base: number; drift: number; phase: number } {
  const clean = ticker.replace('.CA', '').toUpperCase();
  if (TICKER_SEEDS[clean]) return TICKER_SEEDS[clean];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
  }
  const base = 20 + (Math.abs(hash) % 80);
  const drift = 0.1 + ((Math.abs(hash) % 20) / 100);
  const phase = Math.abs(hash % 10);
  return { base, drift, phase };
}

function makePoints(ticker: string): readonly StrategyVisualizationPoint[] {
  const seed = resolveTickerSeed(ticker);
  let prevClose = seed.base;
  return Array.from({ length: 52 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, 5 + index * 7)).toISOString().slice(0, 10);
    const close = seed.base + index * seed.drift + Math.sin((index + seed.phase) / 3.2) * 3.6 + Math.cos((index + seed.phase) / 7) * 1.5;
    const roundedClose = Number(close.toFixed(2));
    const open = Number(prevClose.toFixed(2));
    const wickHigh = Number((Math.abs(Math.sin((index + seed.phase) * 1.8)) * 1.4 + 0.35).toFixed(2));
    const wickLow = Number((Math.abs(Math.cos((index + seed.phase) * 2.1)) * 1.3 + 0.35).toFixed(2));
    const high = Number((Math.max(open, roundedClose) + wickHigh).toFixed(2));
    const low = Number(Math.max(1, Math.min(open, roundedClose) - wickLow).toFixed(2));
    prevClose = roundedClose;
    return {
      date,
      open,
      high,
      low,
      close: roundedClose,
      volume: Math.round(1_200_000 + (Math.sin(index / 2 + seed.phase) + 1) * 680_000 + index * 8_500),
    };
  });
}

function makePane(id: string, name: string, points: readonly StrategyVisualizationPoint[], offset: number, presentation: 'line' | 'bar' = 'line'): StrategyVisualizationPane {
  return {
    id, name, presentation, color: ['var(--color-tv-blue-500)', 'var(--plt-violet)', 'var(--plt-profit)', 'var(--plt-warning)', 'var(--plt-risk)'][offset % 5],
    values: points.map((point, index) => ({ date: point.date, value: Number((50 + Math.sin((index + offset) / 3.4) * 27 + Math.cos((index + offset) / 8) * 8).toFixed(2)) })),
  };
}

export function getStrategyVisualizationModel(input: {
  readonly strategyId: string;
  readonly ticker: string;
  readonly draft: StrategyDraft;
  readonly advancedNodes: readonly AdvancedStrategyNode[];
  readonly indicators: readonly StrategyBuilderIndicatorOption[];
  readonly startDate?: string;
  readonly endDate?: string;
}): StrategyVisualizationModel | null {
  const isCustom = input.strategyId === input.draft.id;
  if (isCustom && (input.draft.buyRules.length === 0 || input.draft.sellRules.length === 0)) return null;
  const rawPoints = makePoints(input.ticker);
  const filtered = (input.startDate || input.endDate)
    ? rawPoints.filter((p) => (!input.startDate || p.date >= input.startDate) && (!input.endDate || p.date <= input.endDate))
    : rawPoints;
  const points = filtered.length >= 2 ? filtered : rawPoints;

  let buyBlockId = 'buy-rule';
  let buyBlockTitle = 'Buy logic';
  let sellBlockId = 'sell-rule';
  let sellBlockTitle = 'Sell logic';
  let priceBlockId = 'market-data';

  let panes: readonly StrategyVisualizationPane[];
  if (input.strategyId === 'psi') {
    priceBlockId = 'typhon-input-comi';
    buyBlockId = 'typhon-entry';
    buyBlockTitle = 'Priority level crossover';
    sellBlockId = 'typhon-aym-target';
    sellBlockTitle = 'AYM take profit';
    panes = [makePane('typhon-master-index', 'Master Index', points, 2), makePane('typhon-smoothing', 'EMA smoothing', points, 5)];
  } else if (!isCustom) {
    priceBlockId = `${input.strategyId}-input`;
    buyBlockId = `${input.strategyId}-signal`;
    buyBlockTitle = `${input.strategyId.toUpperCase()} buy trigger`;
    sellBlockId = `${input.strategyId}-regime`;
    sellBlockTitle = `${input.strategyId.toUpperCase()} regime exit`;
    panes = [makePane(`${input.strategyId}-signal`, input.strategyId === 'hydra' ? 'Adaptive volatility' : 'PSI momentum', points, 3), makePane(`${input.strategyId}-regime`, 'Market regime', points, 8, 'bar')];
  } else {
    const inputNode = input.advancedNodes.find((node) => node.stage === 'inputs');
    if (inputNode) priceBlockId = inputNode.id;

    const entryNode = input.advancedNodes.find((node) => node.stage === 'entry' && node.parameters?.actionSide !== 'sell');
    if (entryNode) {
      buyBlockId = entryNode.id;
      buyBlockTitle = entryNode.customName || entryNode.title.en;
    } else if (input.draft.buyRules.length > 0) {
      buyBlockId = input.draft.buyRules[0].id;
      const ind = input.indicators.find((item) => item.id === input.draft.buyRules[0].indicatorId);
      buyBlockTitle = ind ? `Buy on ${ind.name}` : 'Buy rule';
    }

    const exitNode = input.advancedNodes.find((node) => node.stage === 'exit' || node.parameters?.actionSide === 'sell');
    if (exitNode) {
      sellBlockId = exitNode.id;
      sellBlockTitle = exitNode.customName || exitNode.title.en;
    } else if (input.draft.sellRules.length > 0) {
      sellBlockId = input.draft.sellRules[0].id;
      const ind = input.indicators.find((item) => item.id === input.draft.sellRules[0].indicatorId);
      sellBlockTitle = ind ? `Sell on ${ind.name}` : 'Sell rule';
    }

    const advanced = input.advancedNodes.filter((node) => !node.protected && (node.kind === 'calculation' || node.templateId === 'indicator'));
    if (advanced.length > 0) {
      panes = advanced.map((node, index) => makePane(node.id, node.customName || node.title.en, points, index + 1, node.templateId === 'rolling-statistic' ? 'bar' : 'line'));
    } else {
      const uniqueIds = [...new Set([...input.draft.buyRules, ...input.draft.sellRules].map((rule) => rule.indicatorId))];
      panes = uniqueIds.map((indicatorId, index) => makePane(indicatorId, input.indicators.find((indicator) => indicator.id === indicatorId)?.name ?? 'Unknown indicator', points, index + 1));
    }
  }

  const step = Math.max(1, Math.floor(points.length / 5));
  const markerIndices = [step, step * 2, step * 3, step * 4].filter((idx) => idx < points.length);
  const markers: readonly StrategyVisualizationMarker[] = markerIndices.map((index, markerIndex) => ({
    date: points[index].date,
    price: points[index].close,
    side: markerIndex % 2 === 0 ? 'buy' as const : 'sell' as const,
    label: markerIndex % 2 === 0 ? 'Buy rule matched' : 'Sell rule matched',
    blockId: markerIndex % 2 === 0 ? buyBlockId : sellBlockId,
  }));

  const legendItems: readonly StrategyVisualizationLegendItem[] = [
    {
      id: priceBlockId,
      name: `${input.ticker} Price`,
      sourceBlockTitle: input.strategyId === 'psi' ? 'OHLC Price Feed' : 'Market Data',
      color: 'var(--color-tv-blue-500)',
      kind: 'price',
    },
    {
      id: buyBlockId,
      name: 'Buy Signal',
      sourceBlockTitle: buyBlockTitle,
      color: 'var(--plt-profit)',
      kind: 'signal',
    },
    {
      id: sellBlockId,
      name: 'Sell Signal',
      sourceBlockTitle: sellBlockTitle,
      color: 'var(--plt-risk)',
      kind: 'signal',
    },
    ...panes.map((pane) => ({
      id: pane.id,
      name: pane.name,
      sourceBlockTitle: pane.name,
      color: pane.color,
      kind: (pane.presentation === 'bar' ? 'calculation' : 'indicator') as 'calculation' | 'indicator',
    })),
  ];

  return { ticker: input.ticker, points, markers, panes, legendItems };
}
