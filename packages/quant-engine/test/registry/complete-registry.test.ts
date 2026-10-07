import { describe, expect, it } from 'vitest';

import { PROGRAM_MANIFEST } from '../../src/canonical/program/program-manifest';
import { CANONICAL_INDICATOR_REGISTRY } from '../../src/canonical/registry/category-registry';
import { CANONICAL_PRESENTATION_REGISTRY } from '../../src/canonical/registry/presentation-registry';

describe('complete canonical registry', () => {
  it('covers all 411 backlog entries with unique definitions and presentation entries', () => {
    expect(CANONICAL_INDICATOR_REGISTRY).toHaveLength(411);
    expect(CANONICAL_PRESENTATION_REGISTRY).toHaveLength(411);
    expect(new Set(CANONICAL_INDICATOR_REGISTRY.map((definition) => definition.id)).size).toBe(411);
    expect(new Set(CANONICAL_INDICATOR_REGISTRY.map((definition) => definition.backlogId))).toEqual(
      new Set(PROGRAM_MANIFEST.map((entry) => entry.backlogId)),
    );
  });
});
