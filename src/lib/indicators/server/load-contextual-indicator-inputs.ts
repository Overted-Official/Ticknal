import {
  type CompletedTrade,
  type CompletedTradeFrame,
  type IndicatorOutputFrame,
  type ModelOutputFrame,
  type NumericSeriesFrame,
  type PortfolioInputFrame,
  type TimeSeriesFrame,
} from '@ticknal/quant-engine/canonical';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { macroMoneySupply, macroObservations, positions, userBankAccounts } from '@/db/schema';
import { executeChartIndicator } from '@/indicators/canonical/execute-chart-indicator';
import { getIndicatorCatalogEntry } from '@/indicators/canonical/catalog';

import { buildIndicatorConsensusContext } from './build-indicator-consensus-context';
import { buildStrategyOutputContext } from './build-strategy-output-context';
import type { ContextualIndicatorLoaders, NumericSeriesLoadRequest } from './evaluate-contextual-indicators';
import { loadLiveTimeSeriesFrame } from './load-live-time-series-frame';
import { createSourceRevision } from './source-revision';
import { supportsLongOnlyPortfolioValuation } from './portfolio-position-support';
import { alignPublishedMacroRows } from './published-macro-alignment';

function contextualProvenance(
  frame: TimeSeriesFrame,
  extras: Partial<NumericSeriesFrame['provenance']> = {},
): NumericSeriesFrame['provenance'] {
  return {
    sourceId: frame.meta.sourceId,
    sourceType: frame.meta.sourceType,
    sourceRevision: frame.meta.sourceRevision,
    instrumentId: frame.meta.instrumentId,
    symbol: frame.meta.symbol,
    asOf: frame.meta.asOf,
    receivedAt: frame.meta.receivedAt,
    ...extras,
  };
}

export async function loadContextualNumericSeries(
  request: NumericSeriesLoadRequest,
): Promise<NumericSeriesFrame | null> {
  const result = await loadLiveTimeSeriesFrame({ symbol: request.symbol, timeframe: request.timeframe });
  if (result.status !== 'ok') return null;
  const normalizedSymbol = request.symbol.toUpperCase();
  const unit = normalizedSymbol === 'USDEGP'
    ? 'EGP-per-USD'
    : normalizedSymbol === 'GC1!' || normalizedSymbol === 'SI1!'
      ? 'USD-per-troy-ounce'
      : 'price';
  return {
    domain: 'numeric-series',
    role: request.role,
    unit,
    points: result.frame.bars.map((bar) => ({ time: bar.time, value: bar.close })),
    provenance: contextualProvenance(result.frame),
  };
}

export async function loadM2Series(primaryFrame: TimeSeriesFrame): Promise<NumericSeriesFrame | null> {
  const rows = await db.select({
    date: macroMoneySupply.date,
    value: macroMoneySupply.value,
    updatedAt: macroMoneySupply.updatedAt,
  }).from(macroMoneySupply)
    .where(eq(macroMoneySupply.indicator, 'M2'))
    .orderBy(asc(macroMoneySupply.date));
  if (rows.length === 0) return null;

  const points = alignPublishedMacroRows(primaryFrame.bars.map((bar) => bar.time), rows);
  const sourceId = 'postgres:macro_money_supply:M2';
  return {
    domain: 'numeric-series', role: 'm2', unit: 'EGP', points,
    provenance: {
      sourceId, sourceType: 'postgresql-table',
      sourceRevision: createSourceRevision({ sourceId, observations: rows, adjustments: [] }),
      symbol: 'M2', asOf: rows.at(-1)!.date, receivedAt: new Date().toISOString(),
    },
  };
}

const MACRO_ROLE_SERIES = {
  egyptCpiIndex: 'EG_CPI_HEADLINE_INDEX',
  usCpiIndex: 'US_CPI_INDEX',
  egyptHeadlineInflationYoY: 'EG_CPI_HEADLINE_YOY',
  cbePolicyRate: 'CBE_OVERNIGHT_DEPOSIT_RATE',
  netInternationalReserves: 'EG_NET_INTERNATIONAL_RESERVES_USD_MN',
  treasury3mYield: 'EG_TBILL_3M_YIELD',
  treasury12mYield: 'EG_TBILL_12M_YIELD',
} as const;

export async function loadOfficialMacroSeries(
  role: string,
  primaryFrame: TimeSeriesFrame,
): Promise<NumericSeriesFrame | null> {
  const seriesCode = MACRO_ROLE_SERIES[role as keyof typeof MACRO_ROLE_SERIES];
  if (seriesCode === undefined) return null;
  try {
    const rows = await db.select({
      date: macroObservations.observationDate,
      value: macroObservations.value,
      publishedAt: macroObservations.publishedAt,
      unit: macroObservations.unit,
      sourceRevision: macroObservations.sourceRevision,
    }).from(macroObservations)
      .where(and(eq(macroObservations.seriesCode, seriesCode), eq(macroObservations.isLatest, true)))
      .orderBy(asc(macroObservations.observationDate), asc(macroObservations.publishedAt));
    if (rows.length === 0) return null;
    const points = alignPublishedMacroRows(primaryFrame.bars.map((bar) => bar.time), rows.map((row) => ({
      date: row.date,
      value: row.value,
      updatedAt: row.publishedAt,
    })));
    const sourceId = `postgres:macro_observations:${seriesCode}`;
    return {
      domain: 'numeric-series', role, unit: rows.at(-1)!.unit, points,
      provenance: {
        sourceId, sourceType: 'official-macro-observations',
        sourceRevision: createSourceRevision({ sourceId, observations: rows, adjustments: [] }),
        symbol: seriesCode, asOf: rows.at(-1)!.date, receivedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.warn(`[macro-series] Unable to load ${seriesCode}:`, error);
    return null;
  }
}

function dateOnly(value: unknown): string {
  return String(value).slice(0, 10);
}

async function pricesBySymbol(symbols: readonly string[]) {
  return new Map(await Promise.all([...new Set(symbols)].map(async (symbol) => {
    const result = await loadLiveTimeSeriesFrame({ symbol, timeframe: 'D' });
    return [symbol, result.status === 'ok' ? result.frame : null] as const;
  })));
}

export async function loadCompletedTrades(
  userId: string,
  _primaryFrame: TimeSeriesFrame,
): Promise<CompletedTradeFrame | null> {
  const rows = await db.select({
    id: positions.id, symbol: positions.tickerSymbol, side: positions.side,
    entryDate: positions.entryDate, exitDate: positions.exitDate,
    entryPrice: positions.entryPrice, exitPrice: positions.exitPrice,
    quantity: positions.quantity, updatedAt: positions.updatedAt,
  }).from(positions)
    .where(and(eq(positions.userId, userId), eq(positions.status, 'CLOSED')))
    .orderBy(asc(positions.exitDate), asc(positions.id));
  const validRows = rows.filter((row) => row.exitDate !== null && row.exitPrice !== null);
  const priceFrames = await pricesBySymbol(validRows.map((row) => row.symbol));
  const trades: CompletedTrade[] = validRows.map((row) => {
    const entryPrice = Number(row.entryPrice);
    const exitPrice = Number(row.exitPrice);
    const quantity = Number(row.quantity);
    const short = row.side.toUpperCase() === 'SHORT';
    const pnlPerShare = short ? entryPrice - exitPrice : exitPrice - entryPrice;
    const history = priceFrames.get(row.symbol)?.bars.filter((bar) => {
      const date = dateOnly(bar.time);
      return date >= row.entryDate && date <= row.exitDate!;
    }) ?? [];
    const adverse = history.length === 0 || entryPrice <= 0
      ? null
      : short
        ? Math.min(...history.map((bar) => (entryPrice - bar.high) / entryPrice))
        : Math.min(...history.map((bar) => bar.low / entryPrice - 1));
    const favorable = history.length === 0 || entryPrice <= 0
      ? null
      : short
        ? Math.max(...history.map((bar) => (entryPrice - bar.low) / entryPrice))
        : Math.max(...history.map((bar) => bar.high / entryPrice - 1));
    return {
      id: String(row.id), symbol: row.symbol, side: short ? 'short' : 'long',
      entryTime: row.entryDate, exitTime: row.exitDate!, entryPrice, exitPrice, quantity, fees: 0,
      realizedPnl: pnlPerShare * quantity,
      realizedReturn: entryPrice <= 0 ? 0 : pnlPerShare / entryPrice,
      maximumAdverseExcursion: adverse,
      maximumFavorableExcursion: favorable,
    };
  });
  const sourceId = 'postgres:positions:completed';
  return {
    domain: 'completed-trades', trades,
    provenance: {
      sourceId, sourceType: 'authenticated-portfolio-ledger',
      sourceRevision: createSourceRevision({ sourceId, observations: rows, adjustments: [] }),
      asOf: rows.at(-1)?.updatedAt.toISOString() ?? new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    },
  };
}

export async function loadPortfolio(
  userId: string,
  primaryFrame: TimeSeriesFrame,
): Promise<PortfolioInputFrame | null> {
  const [positionRows, accountRows] = await Promise.all([
    db.select({
      symbol: positions.tickerSymbol, side: positions.side,
      quantity: positions.quantity, updatedAt: positions.updatedAt,
    }).from(positions).where(and(eq(positions.userId, userId), eq(positions.status, 'OPEN'))),
    db.select({
      balance: userBankAccounts.balance, accountType: userBankAccounts.accountType,
      currency: userBankAccounts.currency, updatedAt: userBankAccounts.updatedAt,
    }).from(userBankAccounts).where(and(
      eq(userBankAccounts.userId, userId),
      eq(userBankAccounts.isArchived, false),
    )),
  ]);
  if (!supportsLongOnlyPortfolioValuation(positionRows)) return null;
  const grouped = new Map<string, number>();
  for (const row of positionRows) grouped.set(row.symbol, (grouped.get(row.symbol) ?? 0) + Number(row.quantity));
  const prices = await pricesBySymbol([...grouped.keys()]);
  const asOf = String(primaryFrame.bars.at(-1)?.time ?? primaryFrame.meta.asOf);
  const holdings = [...grouped].flatMap(([symbol, quantity]) => {
    const eligible = prices.get(symbol)?.bars.filter((bar) => String(bar.time) <= asOf);
    const marketPrice = eligible?.at(-1)?.close;
    if (marketPrice === undefined || !Number.isFinite(marketPrice)) return [];
    return [{ symbol, quantity, marketPrice, marketValue: quantity * marketPrice, quoteCurrency: 'EGP' }];
  });
  const cash = accountRows
    .filter((row) => ['BROKERAGE', 'BROKER_CASH'].includes(row.accountType) && row.currency.toUpperCase() === 'EGP')
    .reduce((sum, row) => sum + Number(row.balance), 0);
  const totalValue = cash + holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const sourceId = 'postgres:positions:open-portfolio';
  return {
    domain: 'portfolio', holdings, cash, totalValue, benchmarkSymbol: 'EGX30',
    provenance: {
      sourceId, sourceType: 'authenticated-portfolio-valuation',
      sourceRevision: createSourceRevision({ sourceId, observations: [...positionRows, ...accountRows], adjustments: [] }),
      portfolioRevision: createSourceRevision({ sourceId: `${sourceId}:valuation`, observations: holdings, adjustments: [] }),
      asOf, receivedAt: new Date().toISOString(),
    },
  };
}

function normalizeIndicatorValue(value: number, unit: string): number {
  if (unit === 'percent') return Math.max(-1, Math.min(1, value / 100));
  return value / (1 + Math.abs(value));
}

export async function loadIndicatorOutputs(
  selection: Parameters<ContextualIndicatorLoaders['loadIndicatorOutputs']>[0],
  frame: TimeSeriesFrame,
): Promise<Readonly<Record<string, IndicatorOutputFrame>>> {
  const configured = typeof selection.parameters.indicatorIds === 'string'
    ? selection.parameters.indicatorIds.split(',').map((id) => id.trim()).filter(Boolean)
    : ['percentage-change', 'z-score'];
  const outputFrames: IndicatorOutputFrame[] = [];
  const dependencies: Record<string, readonly string[]> = {};
  for (const definitionId of configured) {
    if (definitionId === selection.definitionId) continue;
    const entry = getIndicatorCatalogEntry(definitionId);
    if (entry === undefined || (entry.definition.metadata.requiredCapabilities?.length ?? 0) > 0) continue;
    const execution = executeChartIndicator({
      instanceId: `consensus:${definitionId}`, definitionId, formulaVersion: entry.formulaVersion,
      parameters: entry.defaultParameters, visibleOutputs: [], placementOverrides: {},
    }, frame, { calculatedAt: new Date().toISOString() });
    if (execution.result.status !== 'ok') continue;
    const numeric = execution.result.series.find((series) => series.kind === 'number');
    if (numeric === undefined) continue;
    outputFrames.push({
      domain: 'indicator-output', indicatorId: definitionId,
      observationTimes: numeric.points.map((point) => point.time),
      outputs: { normalizedScore: numeric.points.map((point) => typeof point.value === 'number' ? normalizeIndicatorValue(point.value, numeric.unit) : null) },
      provenance: {
        sourceId: definitionId, sourceType: 'canonical-indicator',
        sourceRevision: execution.result.evidence.executionFingerprint,
        asOf: execution.result.evidence.provenance.asOf,
        receivedAt: execution.result.evidence.calculatedAt,
      },
    });
    dependencies[definitionId] = entry.definition.metadata.dependencies;
  }
  return buildIndicatorConsensusContext({
    consensusIndicatorId: selection.definitionId,
    selectedIndicatorIds: outputFrames.map((output) => output.indicatorId),
    frames: outputFrames,
    minimumCoverage: Number(selection.parameters.minimumCoverage ?? 0.5),
    minimumInputs: Number(selection.parameters.minimumInputs ?? 2),
    dependenciesByIndicatorId: dependencies,
  });
}

export const contextualIndicatorLoaders: ContextualIndicatorLoaders = {
  loadPrimaryFrame: loadLiveTimeSeriesFrame,
  loadNumericSeries: loadContextualNumericSeries,
  loadM2Series,
  loadMacroSeries: loadOfficialMacroSeries,
  loadCompletedTrades,
  loadPortfolio,
  loadModelOutputs: async (frame, symbol): Promise<Readonly<Record<string, ModelOutputFrame>>> => buildStrategyOutputContext(frame, symbol),
  loadIndicatorOutputs,
};
