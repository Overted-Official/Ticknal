import {
  createIndicatorInputBundle,
  type CompletedTradeFrame,
  type IndicatorOutputFrame,
  type ModelOutputFrame,
  type NumericSeriesFrame,
  type PortfolioInputFrame,
  type TimeSeriesFrame,
} from '@ticknal/quant-engine/canonical';

import { executeChartIndicator } from '../../../indicators/canonical/execute-chart-indicator';
import type { CanonicalChartExecution, CanonicalIndicatorSelection } from '../../../indicators/canonical/types';
import type { ContextualEvaluationRequest } from './contextual-request';
import type { FrameLoadResult, LiveTimeframe } from './types';

export interface NumericSeriesLoadRequest {
  readonly role: string;
  readonly symbol: string;
  readonly timeframe: LiveTimeframe;
  readonly primaryFrame: TimeSeriesFrame;
}

export interface ContextualIndicatorLoaders {
  readonly loadPrimaryFrame: (request: { symbol: string; timeframe: LiveTimeframe }) => Promise<FrameLoadResult>;
  readonly loadNumericSeries: (request: NumericSeriesLoadRequest) => Promise<NumericSeriesFrame | null>;
  readonly loadM2Series: (primaryFrame: TimeSeriesFrame) => Promise<NumericSeriesFrame | null>;
  readonly loadMacroSeries: (role: string, primaryFrame: TimeSeriesFrame) => Promise<NumericSeriesFrame | null>;
  readonly loadCompletedTrades: (userId: string, primaryFrame: TimeSeriesFrame) => Promise<CompletedTradeFrame | null>;
  readonly loadPortfolio: (userId: string, primaryFrame: TimeSeriesFrame) => Promise<PortfolioInputFrame | null>;
  readonly loadModelOutputs: (primaryFrame: TimeSeriesFrame, symbol: string) => Promise<Readonly<Record<string, ModelOutputFrame>>>;
  readonly loadIndicatorOutputs: (selection: CanonicalIndicatorSelection, primaryFrame: TimeSeriesFrame) => Promise<Readonly<Record<string, IndicatorOutputFrame>>>;
}

export interface ContextualEvaluationContext {
  readonly calculatedAt: string;
  readonly userId: string | null;
}

export interface ContextualEvaluationItem {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly execution: CanonicalChartExecution;
}

export class ContextualAuthorizationError extends Error {}
export class ContextualPrimaryFrameError extends Error {
  constructor(readonly result: Extract<FrameLoadResult, { status: 'unavailable' }>) {
    super('Primary market frame is unavailable.');
  }
}

interface NumericRequirement { readonly role: string; readonly symbol: string }
interface SelectionRequirements {
  readonly numeric: readonly NumericRequirement[];
  readonly macro: readonly string[];
  readonly m2: boolean;
  readonly completedTrades: boolean;
  readonly portfolio: boolean;
  readonly models: boolean;
  readonly indicators: boolean;
}

const TRADE_IDS = new Set([
  'maximum-adverse-excursion', 'maximum-favorable-excursion', 'profit-factor', 'win-rate',
  'expectancy', 'payoff-ratio', 'kelly-fraction', 'risk-of-ruin', 'recovery-factor',
]);
const PORTFOLIO_IDS = new Set([
  'portfolio-beta', 'marginal-risk-contribution', 'concentration-hhi',
  'diversification-ratio', 'correlation-stress',
]);
const MODEL_IDS = new Set([
  'ticknal-typhon-or-psi-8-master-index', 'ticknal-psi-40-score',
  'ticknal-cerberus-or-psi-v2', 'ticknal-hydra-strategy',
  'ticknal-champion-strategy-resolver', 'ticknal-strategy-consensus',
]);

function stringParameter(
  selection: CanonicalIndicatorSelection,
  key: string,
  fallback: string,
): string {
  const value = selection.parameters[key];
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : fallback;
}

export function planSelectionRequirements(
  selection: CanonicalIndicatorSelection,
): SelectionRequirements {
  const id = selection.definitionId;
  const numeric: NumericRequirement[] = [];
  const macro: string[] = [];
  const comparisonIds = new Set([
    'rolling-correlation', 'rolling-covariance', 'relative-price-ratio',
    'relative-rolling-correlation-matrix', 'relative-lead-lag-correlation',
    'relative-cointegration-spread', 'relative-pair-ratio-z-score',
  ]);
  const benchmarkIds = new Set([
    'rolling-beta', 'rolling-alpha', 'relative-relative-strength-versus-benchmark',
    'relative-relative-strength-line', 'relative-relative-strength-momentum',
    'relative-mansfield-relative-strength', 'relative-relative-rotation-graph-metrics',
    'relative-dual-momentum', 'relative-rolling-beta-matrix',
    'relative-fund-versus-benchmark-attribution', 'information-ratio', 'treynor-ratio',
    'jensen-alpha', 'tracking-error', 'egypt-fund-tracking-difference', 'portfolio-beta',
  ]);
  if (comparisonIds.has(id)) {
    numeric.push({ role: 'comparison', symbol: stringParameter(selection, 'comparisonSymbol', 'EGX30') });
  }
  if (benchmarkIds.has(id)) {
    numeric.push({ role: 'benchmark', symbol: stringParameter(selection, 'benchmarkSymbol', 'EGX30') });
  }
  if (id === 'relative-egx-versus-gold-relative-strength') numeric.push({ role: 'gold', symbol: 'GC1!' });
  if (id === 'relative-egx-versus-usd-relative-strength' || id === 'relative-currency-adjusted-return' || id === 'egypt-official-usd-egp-trend') {
    numeric.push({ role: 'usdEgp', symbol: 'USDEGP' });
  }
  if (id === 'egypt-gold-in-egp-per-gram') {
    numeric.push({ role: 'gold', symbol: 'GC1!' }, { role: 'usdEgp', symbol: 'USDEGP' });
  }
  if (id === 'egypt-silver-in-egp-per-gram') {
    numeric.push({ role: 'silver', symbol: 'SI1!' }, { role: 'usdEgp', symbol: 'USDEGP' });
  }
  if (id === 'egypt-real-usd-egp-fair-value') {
    numeric.push({ role: 'usdEgp', symbol: 'USDEGP' });
    macro.push('egyptCpiIndex', 'usCpiIndex');
  }
  if (id === 'egypt-fx-devaluation-risk') {
    numeric.push({ role: 'usdEgp', symbol: 'USDEGP' });
    macro.push('egyptHeadlineInflationYoY', 'cbePolicyRate', 'netInternationalReserves');
  }
  if (id === 'egypt-gold-versus-egp-hedge-effectiveness') {
    numeric.push({ role: 'gold', symbol: 'GC1!' }, { role: 'usdEgp', symbol: 'USDEGP' });
    macro.push('egyptCpiIndex');
  }
  if (id === 'egypt-cbe-policy-rate') macro.push('cbePolicyRate', 'egyptHeadlineInflationYoY');
  if (id === 'egypt-yield-curve-slope') macro.push('treasury3mYield', 'treasury12mYield');
  if (['relative-inflation-adjusted-return', 'egypt-inflation-momentum', 'egypt-real-equity-return', 'egypt-egp-purchasing-power-index'].includes(id)) {
    macro.push('egyptCpiIndex');
  }
  return {
    numeric,
    macro,
    m2: id === 'egypt-m2-liquidity-growth' || id === 'egypt-liquidity-versus-egx-divergence' || id === 'egypt-fx-devaluation-risk',
    completedTrades: TRADE_IDS.has(id),
    portfolio: PORTFOLIO_IDS.has(id),
    models: MODEL_IDS.has(id),
    indicators: id === 'ticknal-indicator-consensus-score',
  };
}

export async function evaluateContextualIndicators(
  request: ContextualEvaluationRequest,
  loaders: ContextualIndicatorLoaders,
  context: ContextualEvaluationContext,
): Promise<readonly ContextualEvaluationItem[]> {
  const primaryResult = await loaders.loadPrimaryFrame({ symbol: request.symbol, timeframe: request.timeframe });
  if (primaryResult.status !== 'ok') throw new ContextualPrimaryFrameError(primaryResult);
  const frame = primaryResult.frame;
  const plans = request.selections.map(planSelectionRequirements);
  if (plans.some((plan) => plan.completedTrades || plan.portfolio) && context.userId === null) {
    throw new ContextualAuthorizationError('Authentication is required for portfolio indicators.');
  }

  const numericLoads = new Map<string, Promise<NumericSeriesFrame | null>>();
  const numeric = (role: string, symbol: string) => {
    const key = symbol.toUpperCase();
    let pending = numericLoads.get(key);
    if (pending === undefined) {
      pending = loaders.loadNumericSeries({ role, symbol, timeframe: request.timeframe, primaryFrame: frame });
      numericLoads.set(key, pending);
    }
    return pending.then((source) => source === null || source.role === role
      ? source
      : { ...source, role });
  };
  for (const plan of plans) for (const requirement of plan.numeric) void numeric(requirement.role, requirement.symbol);

  const macroLoads = new Map<string, Promise<NumericSeriesFrame | null>>();
  const macro = (role: string) => {
    let pending = macroLoads.get(role);
    if (pending === undefined) {
      pending = loaders.loadMacroSeries(role, frame);
      macroLoads.set(role, pending);
    }
    return pending;
  };
  for (const plan of plans) for (const role of plan.macro) void macro(role);

  const m2Promise = plans.some((plan) => plan.m2) ? loaders.loadM2Series(frame) : Promise.resolve(null);
  const tradesPromise = plans.some((plan) => plan.completedTrades)
    ? loaders.loadCompletedTrades(context.userId!, frame)
    : Promise.resolve(null);
  const portfolioPromise = plans.some((plan) => plan.portfolio)
    ? loaders.loadPortfolio(context.userId!, frame)
    : Promise.resolve(null);
  const modelsPromise = plans.some((plan) => plan.models)
    ? loaders.loadModelOutputs(frame, request.symbol)
    : Promise.resolve({});
  const [m2, completedTrades, portfolio, modelOutputs] = await Promise.all([
    m2Promise, tradesPromise, portfolioPromise, modelsPromise,
  ]);

  if (portfolio !== null) {
    for (const holding of portfolio.holdings) void numeric(`holding:${holding.symbol}`, holding.symbol);
  }

  const items: ContextualEvaluationItem[] = [];
  for (const [index, selection] of request.selections.entries()) {
    const plan = plans[index]!;
    const seriesEntries = await Promise.all(plan.numeric.map(async (requirement) => [
      requirement.role,
      await numeric(requirement.role, requirement.symbol),
    ] as const));
    seriesEntries.push(...await Promise.all(plan.macro.map(async (role) => [role, await macro(role)] as const)));
    if (plan.m2) seriesEntries.push(['m2', m2]);
    if (plan.portfolio && portfolio !== null) {
      for (const holding of portfolio.holdings) {
        seriesEntries.push([`holding:${holding.symbol}`, await numeric(`holding:${holding.symbol}`, holding.symbol)]);
      }
    }
    const seriesByRole = Object.fromEntries(
      seriesEntries.filter((entry): entry is readonly [string, NumericSeriesFrame] => entry[1] !== null),
    );
    const indicatorOutputs = plan.indicators
      ? await loaders.loadIndicatorOutputs(selection, frame)
      : {};
    const inputs = createIndicatorInputBundle({
      seriesByRole,
      completedTrades: plan.completedTrades ? completedTrades : null,
      portfolio: plan.portfolio ? portfolio : null,
      modelOutputsById: plan.models ? modelOutputs : {},
      indicatorOutputsById: indicatorOutputs,
    });
    const execution = executeChartIndicator(selection, frame, { calculatedAt: context.calculatedAt }, inputs);
    items.push({ instanceId: selection.instanceId, definitionId: selection.definitionId, execution });
  }
  return Object.freeze(items);
}
