import { describe, expect, it } from 'vitest';

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
  });
});
