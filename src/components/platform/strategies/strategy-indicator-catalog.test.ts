import { describe, expect, it } from 'vitest';
import { getIndicatorCatalogEntry } from '@ticknal/quant-engine/canonical';

import { getStrategyIndicatorCatalog } from './strategy-indicator-catalog';

describe('strategy indicator catalog', () => {
  it('exposes executable metadata from the canonical indicator definition', () => {
    const catalog = getStrategyIndicatorCatalog();
    const rsi = catalog.find((item) => item.id === 'relative-strength-index');
    const stochastic = catalog.find((item) => item.id === 'stochastic-oscillator');

    expect(rsi).toMatchObject({
      available: true,
      formulaVersion: '1.0.0',
      defaultParameters: { period: 14 },
      outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
      requiredCapabilities: [],
    });
    expect(stochastic?.outputs.map((output) => output.key)).toEqual(['percent_k', 'percent_d']);
    expect(rsi?.repaintBehavior).toBe('none');
    expect(catalog.find((item) => item.id === 'supertrend')).toMatchObject({
      available: true,
      defaultParameters: { period: 10, multiplier: 3, seedMode: 'bullish' },
    });
    expect(catalog.find((item) => item.id === 'supertrend')?.outputs).toContainEqual({ key: 'line', kind: 'number', unit: 'price' });
    expect(catalog.find((item) => item.id === 'money-flow-index')).toMatchObject({
      available: true,
      defaultParameters: { period: 14, mode: 'canonical' },
    });
    expect(getIndicatorCatalogEntry('money-flow-index')?.parameters.find((parameter) => parameter.key === 'mode')).toMatchObject({
      kind: 'select',
      options: [{ value: 'canonical' }, { value: 'legacy-technicalindicators' }],
    });
  });
});
