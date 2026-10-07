import type { IndicatorOutputs } from './definition';
import type { ObservationTime } from './market';

export type IndicatorInputCapability =
  | 'numeric-series'
  | 'completed-trades'
  | 'portfolio'
  | 'model-output'
  | 'indicator-output';

export interface ContextualSourceProvenance {
  readonly sourceId: string;
  readonly sourceType: string;
  readonly sourceRevision: string;
  readonly instrumentId?: string;
  readonly symbol?: string;
  readonly modelVersion?: string;
  readonly portfolioRevision?: string;
  readonly asOf: string;
  readonly receivedAt: string;
}

export interface NumericSeriesPoint {
  readonly time: ObservationTime;
  readonly value: number | null;
}

export interface NumericSeriesFrame {
  readonly domain: 'numeric-series';
  readonly role: string;
  readonly unit: string;
  readonly points: readonly NumericSeriesPoint[];
  readonly provenance: ContextualSourceProvenance;
}

export type CompletedTradeSide = 'long' | 'short';

export interface CompletedTrade {
  readonly id: string;
  readonly symbol: string;
  readonly side: CompletedTradeSide;
  readonly entryTime: ObservationTime;
  readonly exitTime: ObservationTime;
  readonly entryPrice: number;
  readonly exitPrice: number;
  readonly quantity: number;
  readonly fees: number;
  readonly realizedPnl: number;
  readonly realizedReturn: number;
  readonly maximumAdverseExcursion: number | null;
  readonly maximumFavorableExcursion: number | null;
}

export interface CompletedTradeFrame {
  readonly domain: 'completed-trades';
  readonly trades: readonly CompletedTrade[];
  readonly provenance: ContextualSourceProvenance;
}

export interface PortfolioHoldingInput {
  readonly symbol: string;
  readonly quantity: number;
  readonly marketPrice: number;
  readonly marketValue: number;
  readonly weight?: number;
  readonly quoteCurrency: string;
}

export interface PortfolioInputFrame {
  readonly domain: 'portfolio';
  readonly holdings: readonly PortfolioHoldingInput[];
  readonly cash: number;
  readonly totalValue: number;
  readonly benchmarkSymbol?: string;
  readonly provenance: ContextualSourceProvenance;
}

export interface ModelOutputPoint {
  readonly time: ObservationTime;
  readonly values: Readonly<Record<string, number | boolean | string | null>>;
}

export interface ModelOutputFrame {
  readonly domain: 'model-output';
  readonly modelId: string;
  readonly points: readonly ModelOutputPoint[];
  readonly provenance: ContextualSourceProvenance;
}

export interface IndicatorOutputFrame {
  readonly domain: 'indicator-output';
  readonly indicatorId: string;
  readonly observationTimes: readonly ObservationTime[];
  readonly outputs: IndicatorOutputs;
  readonly provenance: ContextualSourceProvenance;
}

export interface IndicatorInputBundle {
  readonly seriesByRole: Readonly<Record<string, NumericSeriesFrame>>;
  readonly completedTrades: CompletedTradeFrame | null;
  readonly portfolio: PortfolioInputFrame | null;
  readonly modelOutputsById: Readonly<Record<string, ModelOutputFrame>>;
  readonly indicatorOutputsById: Readonly<Record<string, IndicatorOutputFrame>>;
}

export type IndicatorInputBundleInit = Readonly<{
  seriesByRole?: Readonly<Record<string, NumericSeriesFrame>>;
  completedTrades?: CompletedTradeFrame | null;
  portfolio?: PortfolioInputFrame | null;
  modelOutputsById?: Readonly<Record<string, ModelOutputFrame>>;
  indicatorOutputsById?: Readonly<Record<string, IndicatorOutputFrame>>;
}>;

export interface ContextualInputProvenance extends ContextualSourceProvenance {
  readonly capability: IndicatorInputCapability;
  readonly role: string;
}

function freezeProvenance(
  provenance: ContextualSourceProvenance,
): ContextualSourceProvenance {
  return Object.freeze({ ...provenance });
}

function freezeNumericSeries(frame: NumericSeriesFrame): NumericSeriesFrame {
  return Object.freeze({
    ...frame,
    points: Object.freeze(frame.points.map((point) => Object.freeze({ ...point }))),
    provenance: freezeProvenance(frame.provenance),
  });
}

function freezeCompletedTrades(frame: CompletedTradeFrame): CompletedTradeFrame {
  return Object.freeze({
    ...frame,
    trades: Object.freeze(frame.trades.map((trade) => Object.freeze({ ...trade }))),
    provenance: freezeProvenance(frame.provenance),
  });
}

function freezePortfolio(frame: PortfolioInputFrame): PortfolioInputFrame {
  return Object.freeze({
    ...frame,
    holdings: Object.freeze(frame.holdings.map((holding) => Object.freeze({ ...holding }))),
    provenance: freezeProvenance(frame.provenance),
  });
}

function freezeModelOutput(frame: ModelOutputFrame): ModelOutputFrame {
  return Object.freeze({
    ...frame,
    points: Object.freeze(frame.points.map((point) => Object.freeze({
      ...point,
      values: Object.freeze({ ...point.values }),
    }))),
    provenance: freezeProvenance(frame.provenance),
  });
}

function freezeIndicatorOutput(frame: IndicatorOutputFrame): IndicatorOutputFrame {
  return Object.freeze({
    ...frame,
    observationTimes: Object.freeze([...frame.observationTimes]),
    outputs: Object.freeze(Object.fromEntries(
      Object.entries(frame.outputs).map(([key, values]) => [key, Object.freeze([...values])]),
    )),
    provenance: freezeProvenance(frame.provenance),
  });
}

function freezeRecord<T>(
  record: Readonly<Record<string, T>>,
  freezeValue: (value: T) => T,
): Readonly<Record<string, T>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, freezeValue(value)]),
  ));
}

export function createIndicatorInputBundle(
  init: IndicatorInputBundleInit = {},
): IndicatorInputBundle {
  return Object.freeze({
    seriesByRole: freezeRecord(init.seriesByRole ?? {}, freezeNumericSeries),
    completedTrades: init.completedTrades == null
      ? null
      : freezeCompletedTrades(init.completedTrades),
    portfolio: init.portfolio == null ? null : freezePortfolio(init.portfolio),
    modelOutputsById: freezeRecord(init.modelOutputsById ?? {}, freezeModelOutput),
    indicatorOutputsById: freezeRecord(
      init.indicatorOutputsById ?? {},
      freezeIndicatorOutput,
    ),
  });
}

export const EMPTY_INDICATOR_INPUT_BUNDLE = createIndicatorInputBundle();

export function indicatorInputBundleHasCapability(
  inputs: IndicatorInputBundle,
  capability: IndicatorInputCapability,
): boolean {
  switch (capability) {
    case 'numeric-series':
      return Object.keys(inputs.seriesByRole).length > 0;
    case 'completed-trades':
      return inputs.completedTrades !== null;
    case 'portfolio':
      return inputs.portfolio !== null;
    case 'model-output':
      return Object.keys(inputs.modelOutputsById).length > 0;
    case 'indicator-output':
      return Object.keys(inputs.indicatorOutputsById).length > 0;
  }
}

export function listContextualInputProvenance(
  inputs: IndicatorInputBundle,
): readonly ContextualInputProvenance[] {
  const provenance: ContextualInputProvenance[] = [];
  for (const [role, frame] of Object.entries(inputs.seriesByRole)) {
    provenance.push({ capability: 'numeric-series', role, ...frame.provenance });
  }
  if (inputs.completedTrades !== null) {
    provenance.push({
      capability: 'completed-trades',
      role: 'completedTrades',
      ...inputs.completedTrades.provenance,
    });
  }
  if (inputs.portfolio !== null) {
    provenance.push({ capability: 'portfolio', role: 'portfolio', ...inputs.portfolio.provenance });
  }
  for (const [role, frame] of Object.entries(inputs.modelOutputsById)) {
    provenance.push({ capability: 'model-output', role, ...frame.provenance });
  }
  for (const [role, frame] of Object.entries(inputs.indicatorOutputsById)) {
    provenance.push({ capability: 'indicator-output', role, ...frame.provenance });
  }
  return Object.freeze(provenance.map((item) => Object.freeze(item)));
}
