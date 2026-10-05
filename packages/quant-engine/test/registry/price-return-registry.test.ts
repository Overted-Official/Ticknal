import { describe, expect, it } from 'vitest';

import { executeTimeSeriesIndicator } from '../../src/canonical/execution/execute-time-series-indicator';
import { PRICE_RETURN_DEFINITIONS } from '../../src/canonical/indicators/price-return/manifest';
import { PRICE_RETURN_PROGRAM_ENTRIES } from '../../src/canonical/program/categories';
import {
  CANONICAL_INDICATOR_REGISTRY,
} from '../../src/canonical/registry/category-registry';
import { getIndicatorDefinition } from '../../src/canonical/registry/resolve-definition';
import { prefixFrame } from '../references/assert-price-source-indicator';
import { FIVE_BAR_FRAME } from '../references/five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;
const VALID_UNITS = new Set([
  'price',
  'percent',
  'decimal-return',
  'count',
  'volume',
  'shares',
  'rank',
  'probability',
  'dimensionless',
  'boolean',
  'category',
]);
const VALID_PLACEMENTS = new Set(['overlay', 'pane', 'event', 'hidden']);

describe('price and return registry', () => {
  it('maps the 20 PRC program entries one-to-one to unique definitions', () => {
    expect(PRICE_RETURN_DEFINITIONS).toHaveLength(20);
    expect(new Set(PRICE_RETURN_DEFINITIONS.map((definition) => definition.backlogId)).size).toBe(20);
    expect(new Set(PRICE_RETURN_DEFINITIONS.map((definition) => definition.id)).size).toBe(20);
    expect(PRICE_RETURN_DEFINITIONS.map((definition) => definition.backlogId)).toEqual(
      PRICE_RETURN_PROGRAM_ENTRIES.map((entry) => entry.backlogId),
    );
    expect(PRICE_RETURN_DEFINITIONS.map((definition) => definition.id)).toEqual(
      PRICE_RETURN_PROGRAM_ENTRIES.map((entry) => entry.canonicalId),
    );
    expect(PRICE_RETURN_PROGRAM_ENTRIES.every((entry) => entry.state === 'integrated')).toBe(true);
  });

  it('publishes complete versioned bilingual metadata and explicit defaults', () => {
    for (const definition of PRICE_RETURN_DEFINITIONS) {
      expect(definition.formulaVersion).toBe('1.0.0');
      expect(definition.definitionSchemaVersion).toBe(1);
      expect(definition.metadata.description.en.trim().length).toBeGreaterThan(0);
      expect(definition.metadata.description.ar.trim().length).toBeGreaterThan(0);
      expect(definition.metadata.references.length).toBeGreaterThan(0);
      expect(definition.metadata.dependencies).toEqual([]);
      expect(definition.parseParameters({})).toEqual({
        success: true,
        value: definition.metadata.defaultParameters,
      });

      for (const output of definition.metadata.outputs) {
        expect(VALID_UNITS.has(output.unit)).toBe(true);
        expect(VALID_PLACEMENTS.has(output.placement)).toBe(true);
      }
    }
  });

  it('composes one frozen root registry and resolves either stable identity', () => {
    expect(CANONICAL_INDICATOR_REGISTRY).toHaveLength(20);
    expect(Object.isFrozen(CANONICAL_INDICATOR_REGISTRY)).toBe(true);

    for (const definition of PRICE_RETURN_DEFINITIONS) {
      expect(getIndicatorDefinition(definition.id)).toBe(definition);
      expect(getIndicatorDefinition(definition.backlogId)).toBe(definition);
    }
    expect(getIndicatorDefinition('not-an-indicator')).toBeUndefined();
  });

  it('keeps every confirmed prefix output stable when later bars are appended', () => {
    const prefix = prefixFrame(3);

    for (const definition of PRICE_RETURN_DEFINITIONS) {
      const fullResult = executeTimeSeriesIndicator(definition, FIVE_BAR_FRAME, {}, CONTEXT);
      const prefixResult = executeTimeSeriesIndicator(definition, prefix, {}, CONTEXT);

      expect(fullResult.status, definition.id).toBe('ok');
      expect(prefixResult.status, definition.id).toBe('ok');
      for (const output of definition.metadata.outputs) {
        expect(prefixResult.outputs[output.key], `${definition.id}:${output.key}`).toEqual(
          fullResult.outputs[output.key].slice(0, 3),
        );
      }
    }
  });
});
