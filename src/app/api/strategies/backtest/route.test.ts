import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: { id: 'test-user' } as { id: string } | null }));
const runUniverse = vi.hoisted(() => vi.fn(async () => ({
  results: [{ symbol: 'COMI', status: 'ok', metrics: { totalReturnPct: 12, maxDrawdownPct: -5, closedTrades: 2, winRatePct: 50 }, sourceRevision: 'revision-1', asOf: '2025-12-31' }],
  summary: { requested: 1, completed: 1, unavailable: 0, positive: 1 },
})));

vi.mock('../../../../lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user }, error: null }) } }),
}));
vi.mock('../../../../lib/strategies/server/run-simple-universe-backtest', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../lib/strategies/server/run-simple-universe-backtest')>();
  return { ...original, runSimpleUniverseBacktest: runUniverse };
});
vi.mock('../../../../lib/strategies/server/run-simple-backtest-for-symbol', () => ({
  runSimpleBacktestForSymbol: vi.fn(),
}));

import { POST } from './route';

const payload = {
  symbols: ['COMI'],
  program: {
    schemaVersion: 1, timeframe: 'D',
    inputs: [{ id: 'input-1', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 20 } }],
    buy: [[{ id: 'buy-1', inputId: 'input-1', operator: 'crossesAbove', threshold: 50 }]],
    sell: [[{ id: 'sell-1', inputId: 'input-1', operator: 'crossesBelow', threshold: 50 }]],
  },
  assumptions: { initialCapital: 100_000, feeBps: 15 },
  period: { startDate: '2020-01-01', endDate: '2025-12-31' },
};

function request(body: string) {
  return new Request('http://localhost:3000/api/strategies/backtest', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
}

describe('POST /api/strategies/backtest', () => {
  beforeEach(() => {
    auth.user = { id: 'test-user' };
    runUniverse.mockClear();
  });

  it('requires an authenticated user before starting expensive work', async () => {
    auth.user = null;
    const response = await POST(request(JSON.stringify(payload)));
    expect(response.status).toBe(401);
    expect(runUniverse).not.toHaveBeenCalled();
  });

  it('rejects invalid and oversized input before any backtest starts', async () => {
    const invalid = await POST(request(JSON.stringify({ ...payload, symbols: [] })));
    const oversized = await POST(request(JSON.stringify({ ...payload, extra: 'x'.repeat(300_000) })));
    expect(invalid.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(runUniverse).not.toHaveBeenCalled();
  });

  it('returns compact private analytics for a valid request', async () => {
    const response = await POST(request(JSON.stringify(payload)));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ status: 'ok', summary: { completed: 1 }, results: [{ symbol: 'COMI', sourceRevision: 'revision-1' }] });
    expect(runUniverse).toHaveBeenCalledOnce();
  });
});
