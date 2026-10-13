import { describe, expect, it } from 'vitest';

import { parseSelectedUniverse } from './strategy-universe-selection';

describe('parseSelectedUniverse', () => {
  it('defaults to all live catalog companies and preserves a selection above 12', () => {
    const known = Array.from({ length: 290 }, (_, index) => `EGX${index}`);
    expect(parseSelectedUniverse(null, known)).toEqual(known);
    expect(parseSelectedUniverse(JSON.stringify(known.slice(0, 30)), known)).toEqual(known.slice(0, 30));
  });
});
