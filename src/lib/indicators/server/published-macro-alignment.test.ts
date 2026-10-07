import { describe, expect, it } from 'vitest';

import { alignPublishedMacroRows } from './published-macro-alignment';

describe('published macro alignment', () => {
  it('does not expose an observation before both its reference and recorded availability dates', () => {
    const points = alignPublishedMacroRows(
      ['2026-01-01', '2026-01-15', '2026-02-15'],
      [{ date: '2025-12-31', value: '100', updatedAt: new Date('2026-01-10T09:00:00Z') }],
    );

    expect(points).toEqual([
      { time: '2026-01-01', value: null },
      { time: '2026-01-15', value: 100 },
      { time: '2026-02-15', value: 100 },
    ]);
  });

  it('chooses the latest eligible macro reference date and rejects non-finite values', () => {
    const points = alignPublishedMacroRows(
      ['2026-02-15', '2026-03-15'],
      [
        { date: '2025-12-31', value: '100', updatedAt: '2026-01-10' },
        { date: '2026-01-31', value: 'invalid', updatedAt: '2026-02-10' },
      ],
    );

    expect(points).toEqual([
      { time: '2026-02-15', value: null },
      { time: '2026-03-15', value: null },
    ]);
  });

  it('does not expose a same-day update to an earlier intraday bar', () => {
    const points = alignPublishedMacroRows(
      ['2026-01-10T09:00:00Z', '2026-01-10T16:00:00Z', '2026-01-10T16:00:01Z'],
      [{ date: '2025-12-31', value: '100', updatedAt: '2026-01-10T16:00:00Z' }],
    );

    expect(points).toEqual([
      { time: '2026-01-10T09:00:00Z', value: null },
      { time: '2026-01-10T16:00:00Z', value: 100 },
      { time: '2026-01-10T16:00:01Z', value: 100 },
    ]);
  });
});
