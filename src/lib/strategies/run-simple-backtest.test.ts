import { describe, expect, it } from 'vitest';
import { ADX, ATR, BollingerBands, MFI, OBV, RSI, SMA, Stochastic, WilliamsR } from 'technicalindicators';
import { evaluateRuleSeries, getIndicatorDefinition, type MarketBar, type TimeSeriesFrame } from '@ticknal/quant-engine/canonical';
import { computeAtr, computeSupertrend } from '../../../packages/quant-engine/src/strategies/Typhon/psi8Indicators';

import type { SimpleStrategyProgram } from './strategy-program';
import type { AdvancedStrategyProgram } from './strategy-program';
import { runAdvancedBacktest } from './run-advanced-backtest';
import { runSimpleBacktest } from './run-simple-backtest';
import { ADVANCED_BLOCK_TEMPLATES } from '../../components/platform/strategies/builder/advanced-strategy-model';
import { createAdvancedNodeFromTemplate, makeConditionScoreChanges } from '../../components/platform/strategies/builder/advanced-builder-state';
import { compileAdvancedStrategy } from '../../components/platform/strategies/builder/compile-advanced-strategy';
import { createEmptyStrategyDraft } from '../../components/platform/strategies/builder/strategy-builder-model';
import { parseSavedStrategy } from './server/parse-saved-strategy';

const prices = [
  { open: 10, high: 10, low: 10, close: 10 },
  { open: 10, high: 10, low: 10, close: 10 },
  { open: 10, high: 12, low: 10, close: 12 },
  { open: 13, high: 13, low: 12, close: 12 },
  { open: 12, high: 12, low: 8, close: 8 },
  { open: 7, high: 8, low: 7, close: 8 },
] as const;

function frame(rows: readonly { open: number; high: number; low: number; close: number }[]): TimeSeriesFrame {
  const bars: MarketBar[] = rows.map((row, index) => ({
    time: new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10),
    ...row,
    volume: 1000,
    trades: 10,
    finality: 'final',
  }));
  const observed = { coverage: 'observed' as const, observedCount: bars.length, missingCount: 0 };
  return {
    domain: 'time-series',
    meta: {
      instrumentId: 'TEST', symbol: 'TEST', exchange: 'EGX', assetClass: 'equity', quoteCurrency: 'EGP',
      requestedTimeframe: 'D', effectiveTimeframe: 'D', sourceId: 'test-snapshot', sourceType: 'fixture',
      sourceRevision: 'revision-1', asOf: String(bars.at(-1)?.time), receivedAt: new Date(Date.UTC(2025, 0, bars.length + 1)).toISOString(),
      timezone: 'Africa/Cairo', exchangeCalendar: 'EGX_SUN_THU', sessionDefinition: 'completed-bars',
      adjustmentMode: 'as-stored', adjustmentRevision: null, sessionCompleteness: 'complete',
      continuityStatus: 'unknown', fields: { open: observed, high: observed, low: observed, close: observed, volume: observed, trades: observed },
      transformations: [],
    },
    bars,
  };
}

const program: SimpleStrategyProgram = {
  schemaVersion: 1,
  timeframe: 'D',
  inputs: [{ id: 'sma', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 2 } }],
  buy: [[{ id: 'buy', inputId: 'sma', operator: 'crossesAbove', threshold: 10.5 }]],
  sell: [[{ id: 'sell', inputId: 'sma', operator: 'crossesBelow', threshold: 11 }]],
};

const assumptions = { initialCapital: 1000, feeBps: 0 } as const;

describe('runSimpleBacktest', () => {
  it('reproduces the protected PSI40 indicator series through opt-in settings', () => {
    const rows = Array.from({ length: 90 }, (_, index) => {
      const close = 100 + Math.sin(index / 2.8) * 9 + index * 0.07;
      return { open: close - 0.4, high: close + 1.4, low: close - 1.2, close };
    });
    const history = frame(rows);
    const high = rows.map((row) => row.high);
    const low = rows.map((row) => row.low);
    const close = rows.map((row) => row.close);
    const pad = <T,>(values: T[]): (T | null)[] => [...Array(rows.length - values.length).fill(null), ...values];
    const adx = pad(ADX.calculate({ high, low, close, period: 14 }));
    const stochastic = pad(Stochastic.calculate({ high, low, close, period: 14, signalPeriod: 3 }));
    const rawStochastic = Stochastic.calculate({ high, low, close, period: 14, signalPeriod: 3 }).map((value) => value.k);
    const smoothedK = SMA.calculate({ values: rawStochastic, period: 3 });
    const smoothedD = SMA.calculate({ values: smoothedK, period: 3 });
    const bands = pad(BollingerBands.calculate({ values: close, period: 20, stdDev: 2 }));
    const cases = [
      { id: 'relative-strength-index', outputKey: 'rsi', parameters: { period: 14 }, expected: pad(RSI.calculate({ values: close, period: 14 })) },
      { id: 'average-true-range', outputKey: 'atr', parameters: { period: 14 }, expected: pad(ATR.calculate({ high, low, close, period: 14 })) },
      { id: 'average-directional-index', outputKey: 'plus_di', parameters: { period: 14 }, expected: adx.map((value) => value?.pdi ?? null) },
      { id: 'average-directional-index', outputKey: 'minus_di', parameters: { period: 14 }, expected: adx.map((value) => value?.mdi ?? null) },
      { id: 'on-balance-volume', outputKey: 'obv', parameters: { smoothing: 1 }, expected: pad(OBV.calculate({ close, volume: rows.map(() => 1000) })) },
      { id: 'stochastic-oscillator', outputKey: 'percent_k', parameters: { period: 14, smoothK: 1, smoothD: 3 }, expected: stochastic.map((value) => value?.k ?? null) },
      { id: 'stochastic-oscillator', outputKey: 'percent_d', parameters: { period: 14, smoothK: 1, smoothD: 3 }, expected: stochastic.map((value) => value?.d ?? null) },
      { id: 'stochastic-oscillator', outputKey: 'percent_k', parameters: { period: 14, smoothK: 3, smoothD: 3 }, expected: pad(smoothedK) },
      { id: 'stochastic-oscillator', outputKey: 'percent_d', parameters: { period: 14, smoothK: 3, smoothD: 3 }, expected: pad(smoothedD) },
      { id: 'williams-percent-r', outputKey: 'williams_r', parameters: { period: 14 }, expected: pad(WilliamsR.calculate({ high, low, close, period: 14 })) },
      { id: 'simple-moving-average', outputKey: 'sma', parameters: { period: 20 }, expected: pad(SMA.calculate({ values: close, period: 20 })) },
      { id: 'bollinger-bands', outputKey: 'middle', parameters: { period: 20, deviation: 2 }, expected: bands.map((value) => value?.middle ?? null) },
    ];
    for (const item of cases) {
      const definition = getIndicatorDefinition(item.id);
      expect(definition).toBeDefined();
      if (!definition) continue;
      const actual = evaluateRuleSeries({ definitionId: item.id, formulaVersion: definition.formulaVersion,
        outputKey: item.outputKey, frame: history, parameters: { ...item.parameters, mode: 'legacy-technicalindicators' },
        context: { calculatedAt: history.meta.receivedAt } });
      expect(actual.status, `${item.id}/${item.outputKey}`).toBe('ok');
      if (actual.status === 'ok') expect(actual.points.map((point) => point.value), `${item.id}/${item.outputKey}`).toEqual(item.expected);
    }
  });
  it('offers PSI40-compatible MFI without changing the canonical default', () => {
    const rows = Array.from({ length: 80 }, (_, index) => {
      const close = 100 + Math.sin(index / 2.8) * 9 + index * 0.07;
      return { open: close - 0.4, high: close + 1.4, low: close - 1.2, close, volume: 1000 + index * 37 };
    });
    const history = frame(rows).bars.map((bar, index) => ({ ...bar, volume: rows[index].volume }));
    const series = { ...frame(rows), bars: history };
    const definition = getIndicatorDefinition('money-flow-index');
    expect(definition).toBeDefined();
    if (!definition) return;
    const evaluate = (parameters: Record<string, unknown>) => evaluateRuleSeries({
      definitionId: definition.id, formulaVersion: definition.formulaVersion,
      outputKey: 'mfi_0_100', frame: series, parameters, context: { calculatedAt: series.meta.receivedAt },
    });
    const legacy = evaluate({ period: 14, mode: 'legacy-technicalindicators' });
    const canonical = evaluate({ period: 14 });
    expect(legacy.status).toBe('ok');
    expect(canonical.status).toBe('ok');
    if (legacy.status !== 'ok' || canonical.status !== 'ok') return;
    const reference = MFI.calculate({ high: rows.map((row) => row.high), low: rows.map((row) => row.low),
      close: rows.map((row) => row.close), volume: rows.map((row) => row.volume), period: 14 });
    const padded = [...Array(rows.length - reference.length).fill(null), ...reference];
    expect(legacy.points.map((point) => point.value)).toEqual(padded);
    expect(canonical.points.map((point) => point.value)).not.toEqual(padded);
  });
  it('exposes an upper-seeded Supertrend indicator that matches the established strategy math', () => {
    const rows = Array.from({ length: 90 }, (_, index) => {
      const close = 100 + Math.sin(index / 3) * 8 + Math.cos(index / 11) * 3;
      return { open: close - 0.4, high: close + 1.2, low: close - 1.4, close };
    });
    const history = frame(rows);
    const definition = getIndicatorDefinition('supertrend');
    expect(definition).toBeDefined();
    if (!definition) return;
    const calculated = evaluateRuleSeries({ definitionId: definition.id, formulaVersion: definition.formulaVersion,
      outputKey: 'line', frame: history, parameters: { period: 14, multiplier: 3, seedMode: 'upper-band-first' }, context: { calculatedAt: history.meta.receivedAt } });
    expect(calculated.status).toBe('ok');
    if (calculated.status !== 'ok') return;
    const highs = rows.map((row) => row.high);
    const lows = rows.map((row) => row.low);
    const closes = rows.map((row) => row.close);
    const expected = computeSupertrend(highs, lows, closes, computeAtr(highs, lows, closes, 14), 3).value;
    expect(calculated.points.map((point) => point.value)).toEqual(expected);
  });
  it('builds, saves, reloads, edits, and retests a scored per-company strategy from a blank canvas', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = { ...createAdvancedNodeFromTemplate(template('market-input'), 'close'), parameters: { series: 'ohlcv', field: 'close' } };
    const zero = { ...createAdvancedNodeFromTemplate(template('parameter'), 'zero'), parameters: { value: '0' } };
    const score = { ...createAdvancedNodeFromTemplate(template('condition-score'), 'score'), ...makeConditionScoreChanges({}, [
      { inputId: 'close', operator: 'gt' as const, compareMode: 'fixed' as const, threshold: '10.5', weight: '1' },
      { inputId: 'close', operator: 'gte' as const, compareMode: 'fixed' as const, threshold: '12', weight: '3' },
    ]) };
    const profile = { ...createAdvancedNodeFromTemplate(template('ticker-select'), 'profile'), connections: ['zero', 'score'], parameters: { defaultSourceId: 'zero', alternateSourceId: 'score', alternateSymbols: '["TEST"]' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['profile'], parameters: { operator: 'crossesAbove', compareMode: 'value', compareValue: '50' } };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['profile'], parameters: { operator: 'crossesBelow', compareMode: 'value', compareValue: '50' } };
    const draft = { ...createEmptyStrategyDraft(), id: 'custom-score-proof', name: 'Score proof' };
    const saved = parseSavedStrategy(JSON.parse(JSON.stringify({ id: draft.id, name: draft.name, mode: 'advanced', draft, nodes: [close, zero, score, profile, buy, sell] })));
    expect(saved.success).toBe(true);
    if (!saved.success) return;
    const compiled = compileAdvancedStrategy(saved.value.nodes, []);
    expect(compiled.status).toBe('ready');
    if (compiled.status !== 'ready') return;
    const selected = runAdvancedBacktest(compiled.program, frame(prices), assumptions);
    const other = frame(prices);
    const unselected = runAdvancedBacktest(compiled.program, { ...other, meta: { ...other.meta, symbol: 'OTHER' } }, assumptions);
    expect(selected.status).toBe('ok');
    expect(unselected.status).toBe('ok');
    if (selected.status !== 'ok' || unselected.status !== 'ok') return;
    expect(selected.trades).toHaveLength(1);
    expect(unselected.trades).toHaveLength(0);
    const editedNodes = saved.value.nodes.map((node) => node.id === 'score' ? { ...node, ...makeConditionScoreChanges(node.parameters ?? {}, [
      { inputId: 'close', operator: 'gt', compareMode: 'fixed', threshold: '13', weight: '1' },
      { inputId: 'close', operator: 'gte', compareMode: 'fixed', threshold: '13', weight: '3' },
    ]) } : node);
    const edited = compileAdvancedStrategy(editedNodes, []);
    expect(edited.status).toBe('ready');
    if (edited.status === 'ready') {
      const retested = runAdvancedBacktest(edited.program, frame(prices), assumptions);
      expect(retested.status).toBe('ok');
      if (retested.status === 'ok') expect(retested.trades).toHaveLength(0);
    }
    const shortHistory = runAdvancedBacktest(compiled.program, frame(prices.slice(0, 2)), assumptions);
    expect(shortHistory.status).toBe('ok');
    if (shortHistory.status === 'ok') expect(shortHistory.trades).toHaveLength(0);
  });
  it('scores weighted comparisons and enters only after the score crosses its level', () => {
    const scoreProgram: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'score', kind: 'condition-score', conditions: [
          { inputId: 'close', operator: 'gt', threshold: 10.5, weight: 1 },
          { inputId: 'close', operator: 'gte', threshold: 12, weight: 3 },
        ] },
      ],
      buy: [[{ id: 'buy', inputId: 'score', operator: 'crossesAbove', threshold: 50 }]],
      sell: [[{ id: 'sell', inputId: 'score', operator: 'crossesBelow', threshold: 50 }]],
    };
    const result = runAdvancedBacktest(scoreProgram, frame(prices), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades[0]).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04', exitSignalTime: '2025-01-05', exitTime: '2025-01-06' });
  });
  it('chooses the alternate calculation only for its selected ticker', () => {
    const profileProgram: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'zero', kind: 'constant', value: 0 },
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'profile', kind: 'ticker-select', defaultSourceId: 'zero', alternateSourceId: 'close', alternateSymbols: ['TEST'] },
      ],
      buy: [[{ id: 'buy', inputId: 'profile', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'profile', operator: 'crossesBelow', threshold: 11 }]],
    };
    const selected = runAdvancedBacktest(profileProgram, frame(prices), assumptions);
    const otherFrame = frame(prices);
    const unselected = runAdvancedBacktest(profileProgram, { ...otherFrame, meta: { ...otherFrame.meta, symbol: 'OTHER' } }, assumptions);
    expect(selected.status).toBe('ok');
    expect(unselected.status).toBe('ok');
    if (selected.status === 'ok' && unselected.status === 'ok') {
      expect(selected.trades).toHaveLength(1);
      expect(unselected.trades).toHaveLength(0);
    }
  });
  it('rejects a malformed score without throwing during work estimation', () => {
    const broken = { schemaVersion: 2, timeframe: 'D', inputs: [{ id: 'bad-score', kind: 'condition-score' }],
      buy: [[{ id: 'buy', inputId: 'bad-score', operator: 'isAbove', threshold: 50 }]],
      sell: [[{ id: 'sell', inputId: 'bad-score', operator: 'isBelow', threshold: 50 }]],
    } as unknown as AdvancedStrategyProgram;
    expect(() => runAdvancedBacktest(broken, frame(prices), assumptions)).not.toThrow();
    expect(runAdvancedBacktest(broken, frame(prices), assumptions).status).toBe('invalid');
  });
  it('fills close-bar signals at the next open without looking ahead', () => {
    const result = runSimpleBacktest(program, frame(prices), assumptions);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      entrySignalTime: '2025-01-03', entryTime: '2025-01-04', entryPrice: 13,
      exitSignalTime: '2025-01-05', exitTime: '2025-01-06', exitPrice: 7,
    });
    expect(result.trades[0].returnPct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.trades[0].maePct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.metrics.totalReturnPct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.metrics.maxDrawdownPct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.provenance).toMatchObject({ sourceRevision: 'revision-1', formulaVersions: { 'simple-moving-average': '1.0.0' } });
  });

  it('does not fill a signal from the final session without a next open', () => {
    const result = runSimpleBacktest(program, frame(prices.slice(0, 3)), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toEqual([]);
    expect(result.openPosition).toBeNull();
    expect(result.metrics.totalReturnPct).toBe(0);
  });

  it('charges explicit entry and exit fees', () => {
    const result = runSimpleBacktest(program, frame(prices), { initialCapital: 1000, feeBps: 100 });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.metrics.totalReturnPct).toBeCloseTo(((7 * 0.99) / (13 * 1.01) - 1) * 100, 8);
  });

  it('honors OR branches while requiring every predicate in an AND branch', () => {
    const impossible = { id: 'impossible', inputId: 'sma', operator: 'crossesAbove' as const, threshold: 999 };
    const signal = program.buy[0][0];
    const blocked = runSimpleBacktest({ ...program, buy: [[impossible, signal]] }, frame(prices), assumptions);
    const allowed = runSimpleBacktest({ ...program, buy: [[impossible], [signal]] }, frame(prices), assumptions);
    expect(blocked.status).toBe('ok');
    expect(allowed.status).toBe('ok');
    if (blocked.status !== 'ok' || allowed.status !== 'ok') return;
    expect(blocked.trades).toHaveLength(0);
    expect(allowed.trades).toHaveLength(1);
  });

  it('rejects an indicator formula revision that differs from the compiled program', () => {
    const result = runSimpleBacktest({ ...program, inputs: [{ ...program.inputs[0], formulaVersion: '0.9.0' }] }, frame(prices), assumptions);
    expect(result).toMatchObject({ status: 'invalid', code: 'FORMULA_VERSION_MISMATCH' });
  });

  it('rejects zero prices before a next-open fill can divide by zero', () => {
    const rows = prices.map((row, index) => index === 3 ? { ...row, open: 0, low: 0 } : row);
    expect(runSimpleBacktest(program, frame(rows), assumptions)).toMatchObject({ status: 'invalid', code: 'NON_POSITIVE_PRICE' });
  });

  it('rejects indicators that confirm historical values using future bars', () => {
    const pivotInput = { ...program.inputs[0], indicatorId: 'auto-fibonacci', outputKey: 'swing_high', parameters: { period: 50, confirmation: 3 } };
    const result = runSimpleBacktest({ ...program, inputs: [pivotInput] }, frame(prices), assumptions);
    expect(result).toMatchObject({ status: 'invalid', code: 'CONFIRMED_WITH_DELAY_UNSUPPORTED' });
  });

  it('uses pre-period bars for indicator warm-up but starts trades and ROI inside the selected period', () => {
    const result = runSimpleBacktest(program, frame(prices), assumptions, {
      startDate: '2025-01-03', endDate: '2025-01-04',
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.equity.map((point) => point.time)).toEqual(['2025-01-03', '2025-01-04']);
    expect(result.openPosition?.entryTime).toBe('2025-01-04');
    expect(result.metrics.totalReturnPct).toBeCloseTo((12 / 13 - 1) * 100, 8);
  });

  it('does not carry a position from before the selected period', () => {
    const result = runSimpleBacktest(program, frame(prices), assumptions, {
      startDate: '2025-01-04', endDate: '2025-01-06',
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toEqual([]);
    expect(result.openPosition).toBeNull();
    expect(result.metrics.totalReturnPct).toBe(0);
  });

  it('rejects malformed or empty periods', () => {
    expect(runSimpleBacktest(program, frame(prices), assumptions, { startDate: '2025-1-2', endDate: '2025-01-06' }))
      .toMatchObject({ status: 'invalid', code: 'PERIOD_INVALID' });
    expect(runSimpleBacktest(program, frame(prices), assumptions, { startDate: '2025-02-01', endDate: '2025-02-28' }))
      .toMatchObject({ status: 'unavailable', code: 'PERIOD_NO_DATA' });
  });
});

describe('advanced causal calculation execution', () => {
  const priceFrame = (closes: readonly number[]) => frame(closes.map((close) => ({ open: close, high: close, low: close, close })));
  const advanced = (operation: Extract<AdvancedStrategyProgram['inputs'][number], { kind: 'calculation' }>['operation'], period: number, buyThreshold: number, sellThreshold = -1): AdvancedStrategyProgram => ({
    schemaVersion: 2,
    timeframe: 'D',
    inputs: [
      { id: 'close', kind: 'market', field: 'close' },
      { id: 'calculated', kind: 'calculation', operation, sourceIds: ['close'], period },
    ],
    buy: [[{ id: 'buy', inputId: 'calculated', operator: 'crossesAbove', threshold: buyThreshold }]],
    sell: [[{ id: 'sell', inputId: 'calculated', operator: 'crossesBelow', threshold: sellThreshold }]],
  });

  it('lags values by completed bars and cannot buy from future values', () => {
    const result = runAdvancedBacktest(advanced('lag', 2, 3), priceFrame([1, 2, 4, 8, 9, 10]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-05', entryTime: '2025-01-06', entryPrice: 10 });
  });

  it('uses Wilder RMA rather than EMA smoothing', () => {
    const result = runAdvancedBacktest(advanced('rma', 3, 3), priceFrame([1, 2, 3, 4, 5, 6]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-05', entryTime: '2025-01-06', entryPrice: 6 });
  });

  it('can seed EMA from the first valid bar for short-history strategies', () => {
    const base = advanced('ema', 3, 12);
    const seeded: AdvancedStrategyProgram = { ...base, inputs: [base.inputs[0], { id: 'calculated', kind: 'calculation', operation: 'ema', sourceIds: ['close'], period: 3, seedMode: 'first' }] };
    const bars = priceFrame([10, 20, 30, 40]);
    const first = runAdvancedBacktest(seeded, bars, assumptions);
    const standard = runAdvancedBacktest(base, bars, assumptions);
    expect(first.status).toBe('ok');
    expect(standard.status).toBe('ok');
    if (first.status === 'ok' && standard.status === 'ok') {
      expect(first.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
      expect(standard.openPosition).toBeNull();
    }
  });

  it('ranks the current value causally with midpoint ties', () => {
    const result = runAdvancedBacktest({
      ...advanced('percentileRank', 3, 80, 70),
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'calculated', kind: 'calculation', operation: 'percentileRank', sourceIds: ['close'], period: 3 },
      ],
    }, priceFrame([1, 2, 2, 3, 2, 2]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toMatchObject([{ entrySignalTime: '2025-01-04', entryTime: '2025-01-05', exitSignalTime: '2025-01-05', exitTime: '2025-01-06' }]);
  });

  it('builds Wilder ATR from high, low, and the prior close without future data', () => {
    const bars = frame([
      { open: 10, high: 11, low: 9, close: 10 },
      { open: 10, high: 11, low: 10, close: 10 },
      { open: 10, high: 11, low: 10, close: 10 },
      { open: 15, high: 16, low: 15, close: 15 },
      { open: 15, high: 16, low: 15, close: 15 },
    ]);
    const inputs: AdvancedStrategyProgram['inputs'] = [
      { id: 'high', kind: 'market', field: 'high' },
      { id: 'low', kind: 'market', field: 'low' },
      { id: 'close', kind: 'market', field: 'close' },
      { id: 'priorClose', kind: 'calculation', operation: 'lag', sourceIds: ['close'], period: 1 },
      { id: 'range', kind: 'calculation', operation: 'subtract', sourceIds: ['high', 'low'] },
      { id: 'highGap', kind: 'calculation', operation: 'subtract', sourceIds: ['high', 'priorClose'] },
      { id: 'highGapAbs', kind: 'calculation', operation: 'absolute', sourceIds: ['highGap'] },
      { id: 'lowGap', kind: 'calculation', operation: 'subtract', sourceIds: ['low', 'priorClose'] },
      { id: 'lowGapAbs', kind: 'calculation', operation: 'absolute', sourceIds: ['lowGap'] },
      { id: 'trueRange', kind: 'calculation', operation: 'max', sourceIds: ['range', 'highGapAbs', 'lowGapAbs'] },
      { id: 'atr', kind: 'calculation', operation: 'rma', sourceIds: ['trueRange'], period: 2 },
    ];
    const program: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D', inputs,
      buy: [[{ id: 'buy', inputId: 'atr', operator: 'crossesAbove', threshold: 3 }]],
      sell: [[{ id: 'sell', inputId: 'atr', operator: 'crossesBelow', threshold: -1 }]],
    };

    const result = runAdvancedBacktest(program, bars, assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-04', entryTime: '2025-01-05', entryPrice: 15 });

    const minimum = runAdvancedBacktest({ ...program, inputs: inputs.map((input) => input.id === 'trueRange' && input.kind === 'calculation' ? { ...input, operation: 'min' } : input) }, bars, assumptions);
    expect(minimum.status).toBe('ok');
    if (minimum.status === 'ok') expect(minimum.openPosition).toBeNull();
  });

  it('rejects a missing calculation period or an extra unary input in direct execution', () => {
    const base = advanced('rma', 2, 3);
    const calculation = base.inputs[1];
    if (calculation.kind !== 'calculation') throw new Error('Expected a calculation fixture');
    const bars = priceFrame([1, 2, 3, 4]);
    expect(runAdvancedBacktest({ ...base, inputs: [base.inputs[0], { ...calculation, period: undefined }] }, bars, assumptions)).toMatchObject({ status: 'invalid' });
    expect(runAdvancedBacktest({ ...base, inputs: [base.inputs[0], { ...calculation, sourceIds: ['close', 'close'] }] }, bars, assumptions)).toMatchObject({ status: 'invalid' });
  });

  it('seeds Wilder RMA from large finite values without overflowing the average', () => {
    const program: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'large', kind: 'constant', value: 1e308 },
        { id: 'smooth', kind: 'calculation', operation: 'rma', sourceIds: ['large'], period: 2 },
      ],
      buy: [[{ id: 'buy', inputId: 'smooth', operator: 'isAbove', threshold: 1e307 }]],
      sell: [[{ id: 'sell', inputId: 'smooth', operator: 'isBelow', threshold: 0 }]],
    };
    const result = runAdvancedBacktest(program, priceFrame([10, 10, 10]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
  });
});

describe('advanced dynamic rules', () => {
  it('compares two current series and fills the crossover at the following open', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'close', kind: 'market', field: 'close' }, { id: 'level', kind: 'constant', value: 11 }],
      buy: [[{ id: 'buy', inputId: 'close', compareInputId: 'level', operator: 'crossesAbove', threshold: 0 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, frame(prices), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04' });
  });

  it('can sell when close falls below the price captured at entry', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'open', kind: 'market', field: 'open' },
        { id: 'entryPrice', kind: 'position-memory', sourceId: 'open', capture: 'entry', update: 'never' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'close', compareInputId: 'entryPrice', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, frame(prices), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryTime: '2025-01-04', exitSignalTime: '2025-01-04', exitTime: '2025-01-05' }]);
  });
});

describe('advanced conditional exits', () => {
  it('can anchor a frozen percentage target to the buy-signal close', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12.5, high: 13.3, low: 12.5, close: 13.3 },
      { open: 13.3, high: 13.3, low: 13.3, close: 13.3 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D', inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'distance', kind: 'constant', value: 10 },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'target', kind: 'profit-target', sourceId: 'distance', multiplier: 1,
        distanceMode: 'percentOfEntry', targetBase: 'signalClose', freezeAtEntry: true }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryPrice: 12.5, exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });
  it('freezes a percentage target from the last completed signal bar at entry', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 13.5, low: 12, close: 13.5 },
      { open: 13.5, high: 13.5, low: 13.5, close: 13.5 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'target', kind: 'profit-target', sourceId: 'close', multiplier: 1,
        distanceMode: 'percentOfEntry', freezeAtEntry: true }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryPrice: 12, exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });
  it('waits for a gate before triggering a reached profit target', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 15, low: 12, close: 14 },
      { open: 14, high: 16, low: 14, close: 15 },
      { open: 15, high: 15, low: 15, close: 15 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'close', kind: 'market', field: 'close' }, { id: 'distance', kind: 'constant', value: 1 }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'target', kind: 'profit-target', sourceId: 'distance', multiplier: 1,
        gate: { id: 'gate', inputId: 'close', operator: 'isAbove', threshold: 14.5 } }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ exitSignalTime: '2025-01-04', exitTime: '2025-01-05' }]);
  });

  it('uses the connected volatility series for a trailing stop', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 15, low: 11, close: 11 },
      { open: 11, high: 16, low: 11, close: 14 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'high', kind: 'market', field: 'high' },
        { id: 'volatility', kind: 'constant', value: 2 },
        { id: 'trackedHigh', kind: 'rolling-state', sourceId: 'high', operation: 'maximum' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'trail', kind: 'trailing-stop', anchorId: 'trackedHigh', volatilitySourceId: 'volatility', volatilityPeriod: 100, distance: 1 }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });

  it('can defer trailing protection until the position is profitable', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 15, low: 11, close: 11 },
      { open: 11, high: 16, low: 11, close: 14 },
      { open: 14, high: 14, low: 14, close: 14 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'high', kind: 'market', field: 'high' },
        { id: 'volatility', kind: 'constant', value: 2 },
        { id: 'trackedHigh', kind: 'rolling-state', sourceId: 'high', operation: 'maximum' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'trail', kind: 'trailing-stop', anchorId: 'trackedHigh', volatilitySourceId: 'volatility', volatilityPeriod: 14, distance: 1, requireProfit: true }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ exitSignalTime: '2025-01-04', exitTime: '2025-01-05' }]);
  });
});

describe('advanced custom oscillator calculations', () => {
  const priceFrame = (closes: readonly number[]) => frame(closes.map((close) => ({ open: close, high: close, low: close, close })));

  it('starts an adaptive rolling median after its minimum observed bars', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'median', kind: 'calculation', operation: 'median', sourceIds: ['close'], period: 3, minPeriod: 2 },
      ],
      buy: [[{ id: 'buy', inputId: 'median', operator: 'isAbove', threshold: 14 }]],
      sell: [[{ id: 'sell', inputId: 'median', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([10, 20, 30, 40]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
  });

  it('clamps a series to configured bounds before evaluating a rule', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'bounded', kind: 'calculation', operation: 'clamp', sourceIds: ['close'], lowerBound: 0, upperBound: 25 },
      ],
      buy: [[{ id: 'buy', inputId: 'bounded', operator: 'crossesAbove', threshold: 24 }]],
      sell: [[{ id: 'sell', inputId: 'bounded', operator: 'crossesBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([10, 20, 30, 40]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04' });
    const capped = runAdvancedBacktest({ ...model, buy: [[{ id: 'buy', inputId: 'bounded', operator: 'crossesAbove', threshold: 26 }]] }, priceFrame([10, 20, 30, 40]), assumptions);
    if (capped.status === 'ok') expect(capped.openPosition).toBeNull();
  });

  it('calculates population standard deviation over a complete causal window', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'deviation', kind: 'calculation', operation: 'stdDev', sourceIds: ['close'], period: 3 },
      ],
      buy: [[{ id: 'buy', inputId: 'deviation', operator: 'isAbove', threshold: 0.8 }]],
      sell: [[{ id: 'sell', inputId: 'deviation', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([1, 2, 3, 4]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04' });
  });

  it('uses a fallback when an earlier formula is unavailable without reading future bars', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'zero', kind: 'constant', value: 0 },
        { id: 'fallback', kind: 'constant', value: 50 },
        { id: 'ratio', kind: 'calculation', operation: 'divide', sourceIds: ['close', 'zero'] },
        { id: 'score', kind: 'calculation', operation: 'coalesce', sourceIds: ['ratio', 'fallback'] },
      ],
      buy: [[{ id: 'buy', inputId: 'score', operator: 'isAbove', threshold: 49 }]],
      sell: [[{ id: 'sell', inputId: 'score', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([10, 11, 12]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-01', entryTime: '2025-01-02' });
  });

  it('supports arctangent when shaping a normalized slope score', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'angle', kind: 'calculation', operation: 'atan', sourceIds: ['close'] },
      ],
      buy: [[{ id: 'buy', inputId: 'angle', operator: 'crossesAbove', threshold: 1 }]],
      sell: [[{ id: 'sell', inputId: 'angle', operator: 'crossesBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([1, 2, 3]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
  });
});

describe('company-specific advanced parameters', () => {
  it('uses a ticker override and falls back to the shared default', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'level', kind: 'constant', value: 10, overrides: { COMI: 20 } }],
      buy: [[{ id: 'buy', inputId: 'level', operator: 'isAbove', threshold: 15 }]],
      sell: [[{ id: 'sell', inputId: 'level', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const rows = frame(prices.slice(0, 3));
    const comi = runAdvancedBacktest(program, { ...rows, meta: { ...rows.meta, symbol: 'COMI' } }, assumptions);
    const other = runAdvancedBacktest(program, { ...rows, meta: { ...rows.meta, symbol: 'HRHO' } }, assumptions);
    expect(comi.status).toBe('ok');
    expect(other.status).toBe('ok');
    if (comi.status === 'ok' && other.status === 'ok') {
      expect(comi.openPosition?.entryTime).toBe('2025-01-02');
      expect(other.openPosition).toBeNull();
    }
  });
});

describe('regime-reset calculations', () => {
  it('restarts an anchored running maximum and baseline when the regime changes', () => {
    const original = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 14, high: 14, low: 14, close: 14 },
      { open: 11, high: 11, low: 11, close: 11 },
      { open: 6, high: 6, low: 6, close: 6 },
    ]);
    const bars = original.bars.map((bar, index) => ({ ...bar, volume: [1, 1, 2, 2][index] }));
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'regime', kind: 'market', field: 'volume' },
        { id: 'peak', kind: 'calculation', operation: 'regimeMaximum', sourceIds: ['close', 'regime'] },
        { id: 'baseline', kind: 'calculation', operation: 'regimeStart', sourceIds: ['close', 'regime'] },
        { id: 'progress', kind: 'calculation', operation: 'subtract', sourceIds: ['peak', 'baseline'] },
      ],
      buy: [[{ id: 'buy', inputId: 'progress', operator: 'isAbove', threshold: 3 }]],
      sell: [[{ id: 'sell', inputId: 'progress', operator: 'isBelow', threshold: 1 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(program, { ...original, bars }, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryTime: '2025-01-03', exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });
});

describe('advanced execution assumptions', () => {
  it('can fill a signal at its closing price with whole shares', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      execution: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' },
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 14, high: 14, low: 14, close: 14 },
    ]);
    const result = runAdvancedBacktest(program, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.openPosition).toMatchObject({ entryTime: '2025-01-02', entryPrice: 12 });
      expect(result.openPosition?.maePct).toBe(0);
      expect(result.metrics.totalReturnPct).toBeCloseTo(16.6, 5);
      expect(result.provenance).toMatchObject({ fillPolicy: 'signal-close', shareSizing: 'wholeShares' });
    }
  });

  it('closes at the signal-day close and includes residual cash in portfolio return', () => {
    const model: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D',
      execution: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' },
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 9 }]],
    };
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 12, low: 8, close: 8 },
    ]);
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toMatchObject([{ entryTime: '2025-01-02', entryPrice: 12,
      exitSignalTime: '2025-01-03', exitTime: '2025-01-03', exitPrice: 8 }]);
    expect(result.openPosition).toBeNull();
    expect(result.metrics.totalReturnPct).toBeCloseTo(-33.2, 8);
  });
});
