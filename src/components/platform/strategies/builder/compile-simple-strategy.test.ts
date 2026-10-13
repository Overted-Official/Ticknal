import { describe, expect, it } from 'vitest';

import { compileSimpleStrategy, type IndicatorExecutionMetadata } from './compile-simple-strategy';
import type { StrategyDraft } from './strategy-builder-model';

const RSI: IndicatorExecutionMetadata = {
  id: 'relative-strength-index',
  formulaVersion: '1.0.0',
  available: true,
  defaultParameters: { period: 14 },
  outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
  requiredCapabilities: [],
};

const draft = (buyRules: StrategyDraft['buyRules'], sellRules: StrategyDraft['sellRules']): StrategyDraft => ({
  id: 'my-strategy',
  name: 'RSI reversal',
  buyRules,
  sellRules,
});

const buy = (overrides: Partial<StrategyDraft['buyRules'][number]> = {}) => ({
  id: 'buy-rsi', indicatorId: RSI.id, period: 14, operator: 'crossesAbove' as const,
  value: 30, connector: 'and' as const, ...overrides,
});
const sell = (overrides: Partial<StrategyDraft['sellRules'][number]> = {}) => ({
  id: 'sell-rsi', indicatorId: RSI.id, period: 14, operator: 'crossesBelow' as const,
  value: 70, connector: 'and' as const, ...overrides,
});

describe('compileSimpleStrategy', () => {
  it('turns buy and sell rules into one reusable canonical indicator input', () => {
    const result = compileSimpleStrategy(draft([buy()], [sell()]), [RSI]);

    expect(result).toEqual({
      status: 'ready',
      diagnostics: [],
      program: {
        schemaVersion: 1,
        timeframe: 'D',
        inputs: [{ id: 'input-1', kind: 'indicator', indicatorId: RSI.id, formulaVersion: '1.0.0', outputKey: 'rsi', unit: 'percent', parameters: { period: 14 } }],
        buy: [[{ id: 'buy-rsi', inputId: 'input-1', operator: 'crossesAbove', threshold: 30 }]],
        sell: [[{ id: 'sell-rsi', inputId: 'input-1', operator: 'crossesBelow', threshold: 70 }]],
      },
    });
  });

  it('groups AND before OR so the rule order has unambiguous meaning', () => {
    const result = compileSimpleStrategy(draft([
      buy({ id: 'a' }),
      buy({ id: 'b', period: 21, connector: 'or' }),
      buy({ id: 'c', period: 7, connector: 'and' }),
    ], [sell()]), [RSI]);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.program.buy.map((branch) => branch.map((rule) => rule.id))).toEqual([['a'], ['b', 'c']]);
    expect(result.program.inputs.map((input) => input.parameters.period)).toEqual([14, 21, 7]);
  });

  it('rejects a missing sell action instead of calling the workflow runnable', () => {
    const result = compileSimpleStrategy(draft([buy()], []), [RSI]);
    expect(result).toMatchObject({ status: 'invalid', diagnostics: [{ code: 'SELL_RULE_REQUIRED' }] });
  });

  it('rejects invalid periods and values before they reach an evaluator', () => {
    const result = compileSimpleStrategy(draft([buy({ period: 0, value: Number.NaN })], [sell()]), [RSI]);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((item) => item.code)).toEqual(['PERIOD_INVALID', 'THRESHOLD_INVALID']);
  });

  it('requires an explicit output choice for a multi-output indicator', () => {
    const stochastic: IndicatorExecutionMetadata = {
      ...RSI, id: 'stochastic-oscillator',
      outputs: [{ key: 'percent_k', kind: 'number', unit: 'percent' }, { key: 'percent_d', kind: 'number', unit: 'percent' }],
    };
    const result = compileSimpleStrategy(draft([buy({ indicatorId: stochastic.id })], [sell()]), [stochastic, RSI]);
    expect(result).toMatchObject({ status: 'invalid', diagnostics: [{ code: 'OUTPUT_SELECTION_REQUIRED', ruleId: 'buy-rsi' }] });
  });

  it('compiles a specifically selected numeric output from a multi-output indicator', () => {
    const stochastic: IndicatorExecutionMetadata = {
      ...RSI, id: 'stochastic-oscillator',
      outputs: [{ key: 'percent_k', kind: 'number', unit: 'percent' }, { key: 'percent_d', kind: 'number', unit: 'percent' }],
    };
    const result = compileSimpleStrategy(draft([buy({ indicatorId: stochastic.id, outputKey: 'percent_d' })], [sell()]), [stochastic, RSI]);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.program.inputs[0]).toMatchObject({ indicatorId: stochastic.id, outputKey: 'percent_d' });
  });

  it('rejects a generic period control for an indicator without a period parameter', () => {
    const indicator: IndicatorExecutionMetadata = { ...RSI, defaultParameters: { fast: 12, slow: 26 } };
    const result = compileSimpleStrategy(draft([buy()], [sell()]), [indicator]);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((item) => item.code)).toEqual(['PERIOD_UNSUPPORTED', 'PERIOD_UNSUPPORTED']);
  });

  it('does not accept contextual indicators without their required data inputs', () => {
    const contextual: IndicatorExecutionMetadata = { ...RSI, requiredCapabilities: ['market-flow'] };
    const result = compileSimpleStrategy(draft([buy()], [sell()]), [contextual]);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((item) => item.code)).toEqual(['DATA_CAPABILITY_MISSING', 'DATA_CAPABILITY_MISSING']);
  });

  it('rejects unsupported operators and connectors from a persisted draft', () => {
    const result = compileSimpleStrategy(draft([buy({ operator: 'equals' as never, connector: 'xor' as never })], [sell()]), [RSI]);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((item) => item.code)).toEqual(['OPERATOR_INVALID', 'CONNECTOR_INVALID']);
  });

  it('rejects a future-confirmed indicator rather than compiling a look-ahead signal', () => {
    const indicator: IndicatorExecutionMetadata = { ...RSI, repaintBehavior: 'confirmed-with-delay' };
    const result = compileSimpleStrategy(draft([buy()], [sell()]), [indicator]);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((item) => item.code)).toEqual(['CONFIRMED_WITH_DELAY_UNSUPPORTED', 'CONFIRMED_WITH_DELAY_UNSUPPORTED']);
  });
});
