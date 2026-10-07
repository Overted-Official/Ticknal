import { describe, expect, it } from 'vitest';

import { CANONICAL_ENGINE_SCHEMA_VERSION } from '../../src/canonical';

describe('canonical package entry', () => {
  it('publishes the immutable schema version used by every canonical definition', () => {
    expect(CANONICAL_ENGINE_SCHEMA_VERSION).toBe(1);
  });
});
