import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateStrategyProposal } from '../../src/lib/strategies/assistant/strategy-model';
import type { AssistantTurnInput } from '../../src/lib/strategies/assistant/assistant-turn';

const originalFetch = globalThis.fetch;
const originalKey = process.env.STRATEGY_ASSISTANT_API_KEY;
const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.STRATEGY_ASSISTANT_MODEL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.STRATEGY_ASSISTANT_API_KEY;
  else process.env.STRATEGY_ASSISTANT_API_KEY = originalKey;
  if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  if (originalModel === undefined) delete process.env.STRATEGY_ASSISTANT_MODEL;
  else process.env.STRATEGY_ASSISTANT_MODEL = originalModel;
});

const input: AssistantTurnInput = {
  message: 'Add RSI for buy rules',
  snapshot: { revision: 0, mode: 'simple', draft: { id: 'custom-draft', name: 'Draft', buyRules: [], sellRules: [] }, nodes: [], optionalStages: [] },
  catalog: [{ id: 'rsi', backlogId: 'rsi', name: 'RSI', description: 'Momentum indicator', category: 'Momentum',
    available: true, formulaVersion: '1', defaultParameters: { period: 14 }, outputs: [{ key: 'rsi', kind: 'number', unit: 'index' }], requiredCapabilities: [] }],
};

describe('assistant model adapter', () => {
  it('sends only draft and public catalog context to a dedicated structured-output model', async () => {
    process.env.STRATEGY_ASSISTANT_API_KEY = 'test-secret';
    let body: Record<string, unknown> | undefined;
    globalThis.fetch = vi.fn(async (_url, request) => {
      body = JSON.parse(String(request?.body));
      return Response.json({ choices: [{ message: { content: JSON.stringify({ message: 'Added RSI', actions: [{ type: 'add_simple_rule', side: 'buy', indicatorId: 'rsi' }] }) } }] });
    }) as typeof fetch;
    const proposal = await generateStrategyProposal(input);
    expect(proposal).toMatchObject({ message: 'Added RSI' });
    expect(body?.model).toBeTruthy();
    expect(body?.response_format).toMatchObject({ type: 'json_object' });
    const content = JSON.stringify(body?.messages);
    expect(content).toContain('rsi');
    expect(content).toContain('weighted-composite');
    expect(content).toContain('editableParameters');
    expect(content).toContain('weight:<connected source ID>');
    expect(content).not.toContain('selectedSymbols');
    expect(content).not.toContain('notificationsEnabled');
  });

  it('fails closed if no dedicated model credential is configured', async () => {
    delete process.env.STRATEGY_ASSISTANT_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    await expect(generateStrategyProposal(input)).rejects.toThrow('not configured');
  });

  it('uses the existing OpenRouter key and pilot model when no dedicated assistant key is set', async () => {
    delete process.env.STRATEGY_ASSISTANT_API_KEY;
    delete process.env.STRATEGY_ASSISTANT_MODEL;
    process.env.OPENROUTER_API_KEY = 'pilot-secret';
    let authorization: string | undefined;
    let model: string | undefined;
    globalThis.fetch = vi.fn(async (_url, request) => {
      authorization = new Headers(request?.headers).get('authorization') ?? undefined;
      model = (JSON.parse(String(request?.body)) as { model: string }).model;
      return Response.json({ choices: [{ message: { content: '{"message":"I can help with RSI.","actions":[]}' } }] });
    }) as typeof fetch;
    await generateStrategyProposal(input);
    expect(authorization).toBe('Bearer pilot-secret');
    expect(model).toBe('openrouter/free');
  });

  it('uses a personal OpenRouter key only as the provider credential, never in model context', async () => {
    process.env.STRATEGY_ASSISTANT_API_KEY = 'platform-secret';
    const personalKey = 'sk-or-v1-personal-secret-123456';
    let authorization: string | null = null;
    let body = '';
    globalThis.fetch = vi.fn(async (_url, request) => {
      authorization = new Headers(request?.headers).get('authorization');
      body = String(request?.body);
      return Response.json({ choices: [{ message: { content: '{"message":"Done","actions":[]}' } }] });
    }) as typeof fetch;
    await generateStrategyProposal(input, { apiKey: personalKey });
    expect(authorization).toBe(`Bearer ${personalKey}`);
    expect(body).not.toContain(personalKey);
  });
});
