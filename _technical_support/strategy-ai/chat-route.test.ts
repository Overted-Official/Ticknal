import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ listAssistantChats: vi.fn(), getAssistantChat: vi.fn(), createAssistantChat: vi.fn(), updateAssistantChat: vi.fn(), renameAssistantChat: vi.fn(), deleteAssistantChat: vi.fn(), getUser: vi.fn() }));
vi.mock('../../src/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: store.getUser } }) }));
vi.mock('../../src/lib/strategies/server/assistant-chat-store', () => store);

import { GET, POST, PUT, PATCH, DELETE } from '../../src/app/api/strategies/assistant/chats/route';

const endpoint = 'http://localhost:3000/api/strategies/assistant/chats';
const id = 'd9a120d2-36cf-4cc0-9703-791393a62cb3';
const snapshot = { revision: 0, mode: 'simple', draft: { id: 'custom-123', name: 'Draft', buyRules: [], sellRules: [] }, nodes: [], optionalStages: [] };
const chat = { id, title: 'Strategy X', strategyId: 'custom-123', revision: 1, createdAt: '2026-10-25T00:00:00.000Z', updatedAt: '2026-10-25T00:00:00.000Z', snapshot, messages: [] };
const request = (method: string, payload?: unknown, origin = 'http://localhost:3000') => new Request(endpoint, { method, headers: { origin, 'content-type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });

beforeEach(() => {
  process.env.STRATEGY_ASSISTANT_ENABLED = 'true';
  store.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  store.listAssistantChats.mockResolvedValue([chat]);
  store.getAssistantChat.mockResolvedValue(chat);
  store.createAssistantChat.mockResolvedValue(chat);
  store.updateAssistantChat.mockResolvedValue({ ...chat, revision: 2 });
  store.renameAssistantChat.mockResolvedValue({ ...chat, title: 'Renamed' });
  store.deleteAssistantChat.mockResolvedValue(true);
});
afterEach(() => { delete process.env.STRATEGY_ASSISTANT_ENABLED; vi.clearAllMocks(); });

describe('authenticated Ticky chat history route', () => {
  it('lists and opens only the signed-in owner’s chats', async () => {
    expect((await GET(request('GET'))).status).toBe(200);
    expect(store.listAssistantChats).toHaveBeenCalledWith('user-1');
    expect((await GET(new Request(`${endpoint}?id=${id}`))).status).toBe(200);
    expect(store.getAssistantChat).toHaveBeenCalledWith('user-1', id);
  });

  it('creates, updates and renames a draft chat without saving a strategy', async () => {
    expect((await POST(request('POST', { title: 'Strategy X', snapshot }))).status).toBe(201);
    expect(store.createAssistantChat).toHaveBeenCalledWith('user-1', 'Strategy X', snapshot);
    expect((await PUT(request('PUT', { id, expectedRevision: 1, snapshot, messages: [{ role: 'user', text: 'Add RSI', time: '09:41' }] }))).status).toBe(200);
    expect(store.updateAssistantChat).toHaveBeenCalledWith('user-1', id, 1, snapshot, [{ role: 'user', text: 'Add RSI', time: '09:41' }]);
    expect((await PATCH(request('PATCH', { id, title: 'Renamed' }))).status).toBe(200);
    expect(store.renameAssistantChat).toHaveBeenCalledWith('user-1', id, 'Renamed');
    expect((await DELETE(new Request(`${endpoint}?id=${id}`, { method: 'DELETE', headers: { origin: 'http://localhost:3000' } }))).status).toBe(200);
  });

  it('rejects anonymous, cross-origin and protected-draft writes', async () => {
    store.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(request('GET'))).status).toBe(401);
    store.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    expect((await POST(request('POST', { title: 'X', snapshot }, 'https://evil.example'))).status).toBe(403);
    expect((await POST(request('POST', { title: 'Typhon', snapshot: { ...snapshot, draft: { ...snapshot.draft, id: 'typhon' } } }))).status).toBe(400);
    expect(store.createAssistantChat).not.toHaveBeenCalled();
  });

  it('returns a conflict rather than overwriting a newer chat', async () => {
    store.updateAssistantChat.mockResolvedValue(null);
    expect((await PUT(request('PUT', { id, expectedRevision: 1, snapshot, messages: [] }))).status).toBe(409);
  });
});
