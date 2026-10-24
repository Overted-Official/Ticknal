import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, quota, generateStrategyProposal } = vi.hoisted(() => ({ getUser: vi.fn(), quota: vi.fn(), generateStrategyProposal: vi.fn() }));
vi.mock('../../src/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser }, rpc: quota }) }));
vi.mock('../../src/lib/strategies/assistant/strategy-model', () => ({ generateStrategyProposal }));

import { POST } from '../../src/app/api/strategies/assistant/route';

const url = 'http://localhost:3000/api/strategies/assistant';
const snapshot = { revision: 0, mode: 'simple', draft: { id: 'custom-draft', name: 'Draft', buyRules: [], sellRules: [] }, nodes: [], optionalStages: [] };
const request = (body: unknown, origin = 'http://localhost:3000') => new Request(url, {
  method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body),
});

beforeEach(() => {
  process.env.STRATEGY_ASSISTANT_ENABLED = 'true';
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  quota.mockResolvedValue({ data: true, error: null });
  generateStrategyProposal.mockResolvedValue({ message: 'I can help with that.', actions: [] });
});
afterEach(() => { delete process.env.STRATEGY_ASSISTANT_ENABLED; vi.clearAllMocks(); });

describe('strategy assistant route', () => {
  it('returns no-store validated draft proposal for the signed-in user', async () => {
    const response = await POST(request({ snapshot, message: 'How do I start?' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toMatchObject({ status: 'ok', snapshot: { revision: 0 }, message: 'I can help with that.' });
    expect(generateStrategyProposal).toHaveBeenCalledTimes(1);
  });

  it('rejects unsigned requests without invoking the model', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request({ snapshot, message: 'Add RSI' }))).status).toBe(401);
    expect(generateStrategyProposal).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin request without invoking the model', async () => {
    expect((await POST(request({ snapshot, message: 'Add RSI' }, 'https://evil.example'))).status).toBe(403);
    expect(generateStrategyProposal).not.toHaveBeenCalled();
  });

  it('rejects protected content before invoking the model', async () => {
    const protectedSnapshot = { ...snapshot, nodes: [{ id: 'typhon', protected: true }] };
    expect((await POST(request({ snapshot: protectedSnapshot, message: 'Copy Typhon' }))).status).toBe(400);
    expect(generateStrategyProposal).not.toHaveBeenCalled();
  });

  it('is closed unless explicitly enabled', async () => {
    delete process.env.STRATEGY_ASSISTANT_ENABLED;
    expect((await POST(request({ snapshot, message: 'Add RSI' }))).status).toBe(404);
    expect(generateStrategyProposal).not.toHaveBeenCalled();
  });

  it('rejects an exhausted durable budget before model invocation', async () => {
    quota.mockResolvedValue({ data: false, error: null });
    expect((await POST(request({ snapshot, message: 'Add RSI' }))).status).toBe(429);
    expect(quota).toHaveBeenCalledWith('consume_strategy_assistant_quota');
    expect(generateStrategyProposal).not.toHaveBeenCalled();
  });

  it('passes a valid personal OpenRouter key to the model without echoing it', async () => {
    const providerKey = 'sk-or-v1-personal-secret-123456';
    const response = await POST(request({ snapshot, message: 'Add RSI', providerKey }));
    expect(response.status).toBe(200);
    expect(generateStrategyProposal).toHaveBeenCalledWith(expect.anything(), { apiKey: providerKey });
    expect(JSON.stringify(await response.json())).not.toContain(providerKey);
  });

  it('rejects malformed provider keys before consuming quota or invoking the model', async () => {
    const response = await POST(request({ snapshot, message: 'Add RSI', providerKey: 'sk-or-v1-key\nInjected: yes' }));
    expect(response.status).toBe(400);
    expect(quota).not.toHaveBeenCalled();
    expect(generateStrategyProposal).not.toHaveBeenCalled();
  });
});
