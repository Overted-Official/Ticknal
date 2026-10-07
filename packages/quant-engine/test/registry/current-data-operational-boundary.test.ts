import { describe, expect, it } from 'vitest';

import {
  CANONICAL_INDICATOR_REGISTRY,
  isIndicatorOperational,
} from '../../src/canonical/registry/category-registry';
import { getIndicatorCatalogEntry } from '../../src/canonical/registry/presentation-registry';

const CURRENT_DATA_INDICATORS = Object.freeze([
  'QNT-007',
  'QNT-008',
  'QNT-009',
  'QNT-010',
  'REL-001',
  'REL-002',
  'REL-003',
  'REL-004',
  'REL-005',
  'REL-006',
  'REL-009',
  'REL-011',
  'REL-012',
  'REL-013',
  'REL-014',
  'REL-015',
  'REL-016',
  'REL-017',
  'REL-018',
  'REL-019',
  'RSK-013',
  'RSK-014',
  'RSK-015',
  'RSK-016',
  'RSK-020',
  'RSK-021',
  'RSK-022',
  'RSK-023',
  'RSK-024',
  'RSK-025',
  'RSK-026',
  'RSK-027',
  'RSK-030',
  'RSK-031',
  'RSK-032',
  'RSK-033',
  'RSK-034',
  'RSK-035',
  'EGY-016',
  'EGY-021',
  'EGY-022',
  'EGY-029',
  'EGY-030',
  'EGY-032',
  'TKL-001',
  'TKL-002',
  'TKL-003',
  'TKL-004',
  'TKL-005',
  'TKL-007',
  'TKL-009',
] as const);

const OFFICIAL_MACRO_INDICATORS = Object.freeze([
  'REL-020', 'EGY-017', 'EGY-018', 'EGY-024', 'EGY-025',
  'EGY-026', 'EGY-027', 'EGY-028', 'EGY-036',
] as const);

describe('current-data operational boundary', () => {
  it('enables the approved 51 plus 9 official-macro indicators', () => {
    const operational = CANONICAL_INDICATOR_REGISTRY.filter((definition) =>
      isIndicatorOperational(definition.id),
    );
    const unavailable = CANONICAL_INDICATOR_REGISTRY.filter(
      (definition) => !isIndicatorOperational(definition.id),
    );

    expect(CURRENT_DATA_INDICATORS).toHaveLength(51);
    expect(CURRENT_DATA_INDICATORS.every(isIndicatorOperational)).toBe(true);
    expect(OFFICIAL_MACRO_INDICATORS.every(isIndicatorOperational)).toBe(true);
    expect(operational).toHaveLength(359);
    expect(unavailable).toHaveLength(52);
  });

  it('presents cross-series symbols and consensus members as editable text parameters', () => {
    const correlation = getIndicatorCatalogEntry('rolling-correlation');
    const consensus = getIndicatorCatalogEntry('ticknal-indicator-consensus-score');

    expect(correlation?.parameters.find((parameter) => parameter.key === 'comparisonSymbol'))
      .toEqual(expect.objectContaining({ kind: 'symbol', defaultValue: 'COMPARISON' }));
    expect(consensus?.parameters.find((parameter) => parameter.key === 'indicatorIds'))
      .toEqual(expect.objectContaining({ kind: 'text' }));
  });
});
