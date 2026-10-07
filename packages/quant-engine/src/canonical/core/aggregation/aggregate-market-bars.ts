import type {
  FieldObservationSummary,
  MarketBar,
  MarketField,
  TimeSeriesFrame,
} from '../../contracts';

export type AggregateTimeframe = 'W' | 'M';

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const CAIRO_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function calendarDate(time: string | number): CalendarDate {
  if (typeof time === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(time);
    if (dateOnly) {
      return {
        year: Number(dateOnly[1]),
        month: Number(dateOnly[2]),
        day: Number(dateOnly[3]),
      };
    }
  }

  const instant = new Date(time);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError(`Cannot aggregate invalid observation time: ${String(time)}`);
  }

  const parts = Object.fromEntries(
    CAIRO_DATE_FORMATTER.formatToParts(instant).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function aggregationKey(time: string | number, timeframe: AggregateTimeframe): string {
  const { year, month, day } = calendarDate(time);
  if (timeframe === 'M') {
    return isoDate(year, month, 1);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - utcDate.getUTCDay());
  return isoDate(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate());
}

function sumIfFullyObserved(
  bars: readonly MarketBar[],
  field: 'volume' | 'trades',
): number | null {
  let total = 0;
  for (const bar of bars) {
    const value = bar[field];
    if (value === null) return null;
    total += value;
  }
  return total;
}

function aggregateGroup(time: string, bars: readonly MarketBar[]): MarketBar {
  const first = bars[0];
  const last = bars.at(-1);
  if (!first || !last) {
    throw new RangeError('Cannot aggregate an empty market-bar group.');
  }

  return {
    time,
    open: first.open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    close: last.close,
    volume: sumIfFullyObserved(bars, 'volume'),
    trades: sumIfFullyObserved(bars, 'trades'),
    finality: bars.some((bar) => bar.finality === 'provisional') ? 'provisional' : 'final',
  };
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

export function aggregateMarketBars(
  frame: TimeSeriesFrame,
  timeframe: AggregateTimeframe,
): TimeSeriesFrame {
  if (frame.meta.effectiveTimeframe !== 'D') {
    throw new RangeError(
      `Calendar aggregation requires effectiveTimeframe D; received ${frame.meta.effectiveTimeframe}.`,
    );
  }

  const groups = new Map<string, MarketBar[]>();
  for (const bar of frame.bars) {
    const key = aggregationKey(bar.time, timeframe);
    const group = groups.get(key);
    if (group) group.push(bar);
    else groups.set(key, [bar]);
  }

  const bars = [...groups.entries()].map(([key, group]) => aggregateGroup(key, group));
  const fields = {
    open: summarizeField(bars, 'open'),
    high: summarizeField(bars, 'high'),
    low: summarizeField(bars, 'low'),
    close: summarizeField(bars, 'close'),
    volume: summarizeField(bars, 'volume'),
    trades: summarizeField(bars, 'trades'),
  };
  const description =
    timeframe === 'W'
      ? 'Aggregated Africa/Cairo daily observations into Sunday-through-Saturday weekly bars.'
      : 'Aggregated Africa/Cairo daily observations into calendar-month bars.';

  return {
    domain: 'time-series',
    meta: {
      ...frame.meta,
      requestedTimeframe: timeframe,
      effectiveTimeframe: timeframe,
      sessionCompleteness: bars.some((bar) => bar.finality === 'provisional') ? 'partial' : 'complete',
      fields,
      transformations: [
        ...frame.meta.transformations,
        {
          kind: 'aggregation',
          description,
          fromTimeframe: 'D',
          toTimeframe: timeframe,
        },
      ],
    },
    bars,
  };
}
