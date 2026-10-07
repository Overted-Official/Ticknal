import {
  aggregateMarketBars,
  createDiagnostic,
  type FieldObservationSummary,
  type MarketBar,
  type MarketField,
  type TimeSeriesFrame,
} from '@ticknal/quant-engine/canonical';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { dailyPrices, intradayCandles, priceAdjustments, tickers } from '@/db/schema';

import { createSourceRevision } from './source-revision';
import type { FrameLoadResult, LiveTimeSeriesRequest, LiveTimeframe } from './types';
import { normalizeLiveTicker } from './types';

interface InstrumentMetadata {
  readonly symbol: string;
  readonly exchange: string | null;
  readonly currency: string;
}

interface AppliedAdjustment {
  readonly effectiveDate: string;
  readonly factor: string;
  readonly source: string;
  readonly status: string;
  readonly appliedAt: Date | null;
}

type NumericRow = {
  readonly open: string | null;
  readonly high: string | null;
  readonly low: string | null;
  readonly close: string | null;
  readonly volume: string | null;
};

type DailyRow = NumericRow & { readonly date: string };
type IntradayRow = NumericRow & { readonly timestamp: Date };

const NORMALIZATION_TRANSFORMATION = {
  kind: 'other' as const,
  description:
    'Normalized stored SQL numeric values to finite numbers without filling missing observations.',
};

function unavailable(
  code: 'DATA_FIELD_MISSING' | 'DATA_FREQUENCY_UNAVAILABLE',
  messageKey: string,
  fields: Readonly<Record<string, unknown>>,
): FrameLoadResult {
  return { status: 'unavailable', diagnostics: [createDiagnostic(code, messageKey, fields)] };
}

function finiteOhlc(row: NumericRow): readonly [number, number, number, number] | null {
  if (row.open === null || row.high === null || row.low === null || row.close === null) return null;
  const values = [Number(row.open), Number(row.high), Number(row.low), Number(row.close)] as const;
  return values.every(Number.isFinite) ? values : null;
}

function optionalFinite(value: string | null): number | null | undefined {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function summarizeField(bars: readonly MarketBar[], field: MarketField): FieldObservationSummary {
  const observedCount = bars.filter((bar) => bar[field] !== null).length;
  const missingCount = bars.length - observedCount;
  return {
    coverage:
      observedCount === bars.length ? 'observed' : observedCount === 0 ? 'unavailable' : 'partial',
    observedCount,
    missingCount,
  };
}

function buildBars(
  rows: readonly (DailyRow | IntradayRow)[],
): { readonly bars: readonly MarketBar[]; readonly invalidIndex: number | null } {
  const bars: MarketBar[] = [];
  for (const [index, row] of rows.entries()) {
    const ohlc = finiteOhlc(row);
    const volume = optionalFinite(row.volume);
    if (!ohlc || volume === undefined) return { bars: [], invalidIndex: index };
    const [open, high, low, close] = ohlc;
    bars.push({
      time: 'date' in row ? row.date : row.timestamp.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      trades: null,
      finality: 'final',
    });
  }
  return { bars, invalidIndex: null };
}

function sourceIdFor(timeframe: LiveTimeframe): string {
  return timeframe === '1H'
    ? 'postgres:intraday_candles:1h'
    : timeframe === '15M'
      ? 'postgres:intraday_candles:15m'
      : 'postgres:daily_prices';
}

function fieldSummaries(bars: readonly MarketBar[]) {
  return {
    open: summarizeField(bars, 'open'),
    high: summarizeField(bars, 'high'),
    low: summarizeField(bars, 'low'),
    close: summarizeField(bars, 'close'),
    volume: summarizeField(bars, 'volume'),
    trades: summarizeField(bars, 'trades'),
  } as const;
}

function baseFrame(
  request: LiveTimeSeriesRequest,
  instrument: InstrumentMetadata,
  bars: readonly MarketBar[],
  adjustments: readonly AppliedAdjustment[],
  receivedAt: string,
): TimeSeriesFrame {
  const sourceId = sourceIdFor(request.timeframe);
  const sourceRevision = createSourceRevision({ sourceId, observations: bars, adjustments });
  const adjustmentRevision =
    adjustments.length === 0
      ? null
      : createSourceRevision({
          sourceId: 'postgres:price_adjustments:applied',
          observations: [],
          adjustments,
        });
  const lastBar = bars.at(-1);
  if (!lastBar) throw new RangeError('Cannot create a market frame without observations.');

  const storageTimeframe = request.timeframe === 'W' || request.timeframe === 'M' ? 'D' : request.timeframe;
  return {
    domain: 'time-series',
    meta: {
      instrumentId: instrument.symbol,
      symbol: instrument.symbol,
      exchange: instrument.exchange ?? 'unknown',
      assetClass: 'unknown',
      quoteCurrency: instrument.currency,
      requestedTimeframe: storageTimeframe,
      effectiveTimeframe: storageTimeframe,
      sourceId,
      sourceType: 'postgresql-table',
      sourceRevision,
      asOf: String(lastBar.time),
      receivedAt,
      timezone: 'Africa/Cairo',
      exchangeCalendar: instrument.exchange === 'EGX' ? 'EGX_SUN_THU' : 'UNKNOWN',
      sessionDefinition: 'stored-completed-bars',
      adjustmentMode: 'as-stored',
      adjustmentRevision,
      sessionCompleteness: 'complete',
      continuityStatus: 'unknown',
      fields: fieldSummaries(bars),
      transformations: [NORMALIZATION_TRANSFORMATION],
    },
    bars,
  };
}

async function loadInstrument(symbol: string): Promise<InstrumentMetadata | null> {
  const rows = await db
    .select({ symbol: tickers.symbol, exchange: tickers.exchange, currency: tickers.currency })
    .from(tickers)
    .where(eq(tickers.symbol, symbol))
    .limit(1);
  return rows[0] ?? null;
}

async function loadAppliedAdjustments(symbol: string): Promise<readonly AppliedAdjustment[]> {
  return db
    .select({
      effectiveDate: priceAdjustments.effectiveDate,
      factor: priceAdjustments.factor,
      source: priceAdjustments.source,
      status: priceAdjustments.status,
      appliedAt: priceAdjustments.appliedAt,
    })
    .from(priceAdjustments)
    .where(and(eq(priceAdjustments.tickerSymbol, symbol), eq(priceAdjustments.status, 'APPLIED')))
    .orderBy(asc(priceAdjustments.effectiveDate));
}

async function loadStoredRows(
  symbol: string,
  timeframe: LiveTimeframe,
): Promise<readonly (DailyRow | IntradayRow)[]> {
  if (timeframe === '1H' || timeframe === '15M') {
    return db
      .select({
        timestamp: intradayCandles.timestamp,
        open: intradayCandles.open,
        high: intradayCandles.high,
        low: intradayCandles.low,
        close: intradayCandles.close,
        volume: intradayCandles.volume,
      })
      .from(intradayCandles)
      .where(
        and(
          eq(intradayCandles.tickerSymbol, symbol),
          eq(intradayCandles.timeframe, timeframe === '1H' ? '1h' : '15m'),
        ),
      )
      .orderBy(asc(intradayCandles.timestamp));
  }

  return db
    .select({
      date: dailyPrices.date,
      open: dailyPrices.open,
      high: dailyPrices.high,
      low: dailyPrices.low,
      close: dailyPrices.close,
      volume: dailyPrices.volume,
    })
    .from(dailyPrices)
    .where(eq(dailyPrices.tickerSymbol, symbol))
    .orderBy(asc(dailyPrices.date));
}

export async function loadLiveTimeSeriesFrame(
  request: LiveTimeSeriesRequest,
): Promise<FrameLoadResult> {
  const symbol = normalizeLiveTicker(request.symbol);
  if (!symbol) {
    return unavailable('DATA_FIELD_MISSING', 'indicator.data.instrumentUnavailable', {
      symbol: request.symbol,
    });
  }

  const normalizedRequest = { ...request, symbol };
  const [instrument, rows, adjustments] = await Promise.all([
    loadInstrument(symbol),
    loadStoredRows(symbol, request.timeframe),
    loadAppliedAdjustments(symbol),
  ]);

  if (!instrument) {
    return unavailable('DATA_FIELD_MISSING', 'indicator.data.instrumentUnavailable', { symbol });
  }
  if (rows.length === 0) {
    if (request.timeframe === '1H' || request.timeframe === '15M') {
      return unavailable('DATA_FREQUENCY_UNAVAILABLE', 'indicator.data.frequencyUnavailable', {
        symbol,
        requestedTimeframe: request.timeframe,
        sourceId: sourceIdFor(request.timeframe),
      });
    }
    return unavailable('DATA_FIELD_MISSING', 'indicator.data.historyUnavailable', {
      symbol,
      requestedTimeframe: request.timeframe,
    });
  }

  const { bars, invalidIndex } = buildBars(rows);
  if (invalidIndex !== null) {
    return unavailable('DATA_FIELD_MISSING', 'indicator.data.requiredOhlcUnavailable', {
      symbol,
      requestedTimeframe: request.timeframe,
      rowIndex: invalidIndex,
    });
  }

  const frame = baseFrame(normalizedRequest, instrument, bars, adjustments, new Date().toISOString());
  return {
    status: 'ok',
    frame:
      request.timeframe === 'W' || request.timeframe === 'M'
        ? aggregateMarketBars(frame, request.timeframe)
        : frame,
  };
}
