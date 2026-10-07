import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PRICE_RETURN_DEFINITIONS,
  MARKET_STRUCTURE_DEFINITIONS,
  CYCLE_DEFINITIONS,
  RISK_PORTFOLIO_DEFINITIONS,
  BREADTH_DEFINITIONS,
  RELATIVE_INTERMARKET_DEFINITIONS,
  EGYPT_DEFINITIONS,
  TICKNAL_COMPOSITE_DEFINITIONS,
  MOMENTUM_DEFINITIONS,
  PRICE_ACTION_DEFINITIONS,
  QUANTITATIVE_DEFINITIONS,
  TREND_DEFINITIONS,
  VOLATILITY_DEFINITIONS,
  VOLUME_FLOW_DEFINITIONS,
} from '../../src/canonical';

const indicatorsRoot = resolve(import.meta.dirname, '../../src/canonical/indicators');
const modularCategories = [
  ['price-return', PRICE_RETURN_DEFINITIONS],
  ['cycles', CYCLE_DEFINITIONS],
  ['risk-portfolio', RISK_PORTFOLIO_DEFINITIONS],
  ['breadth', BREADTH_DEFINITIONS],
  ['relative-intermarket', RELATIVE_INTERMARKET_DEFINITIONS],
  ['egypt', EGYPT_DEFINITIONS],
  ['ticknal-composites', TICKNAL_COMPOSITE_DEFINITIONS],
  ['trend', TREND_DEFINITIONS],
  ['momentum', MOMENTUM_DEFINITIONS],
  ['volatility', VOLATILITY_DEFINITIONS],
  ['price-action', PRICE_ACTION_DEFINITIONS],
  ['market-structure', MARKET_STRUCTURE_DEFINITIONS],
  ['volume-flow', VOLUME_FLOW_DEFINITIONS],
  ['quantitative', QUANTITATIVE_DEFINITIONS],
] as const;

describe('indicator module boundaries', () => {
  it('keeps one dedicated logic module per indicator', () => {
    for (const [category, definitions] of modularCategories) {
      for (const definition of definitions) {
        const logicPath = resolve(indicatorsRoot, category, definition.id, 'logic.ts');
        expect(existsSync(logicPath), `${category}/${definition.id}/logic.ts`).toBe(true);
      }
    }
  });

  it('keeps category definition files declarative', () => {
    for (const [category] of modularCategories.filter(([category]) => category !== 'price-return')) {
      const definitionsPath = resolve(indicatorsRoot, category, 'definitions.ts');
      const source = readFileSync(definitionsPath, 'utf8');

      expect(source, category).not.toMatch(/compute:\s*\([^)]*\)\s*=>/);
      expect(source.length, `${category} definitions.ts size`).toBeLessThan(30_000);
    }
  });
});
