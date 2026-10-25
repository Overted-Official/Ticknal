import { canEditStrategySnapshot, type StrategyWorkspaceSnapshot } from './strategy-actions';

export interface TickyMessage { readonly role: 'user' | 'assistant'; readonly text: string; readonly time: string }
export interface TickyChatSummary { readonly id: string; readonly title: string; readonly strategyId: string; readonly revision: number; readonly createdAt: string; readonly updatedAt: string }
export interface TickyChat extends TickyChatSummary { readonly snapshot: StrategyWorkspaceSnapshot; readonly messages: readonly TickyMessage[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /sk-or-[A-Za-z0-9_-]{5,}/i;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const validTitle = (value: unknown): value is string => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80 && !KEY.test(value);
const validSnapshot = (value: unknown): value is StrategyWorkspaceSnapshot => {
  try { const serialized = JSON.stringify(value); return serialized.length <= 200_000 && !KEY.test(serialized) && canEditStrategySnapshot(value as StrategyWorkspaceSnapshot); }
  catch { return false; }
};
const validMessages = (value: unknown): value is readonly TickyMessage[] => Array.isArray(value) && value.length <= 200 && value.every((item) => record(item)
  && Object.keys(item).length === 3 && ['role', 'text', 'time'].every((key) => key in item)
  && (item.role === 'user' || item.role === 'assistant')
  && typeof item.text === 'string' && item.text.length >= 1 && item.text.length <= 4_000 && !KEY.test(item.text)
  && typeof item.time === 'string' && item.time.length <= 24 && /^\d{1,2}:\d{2}$/.test(item.time));

export function chatTitleFromMessage(message: string): string {
  const text = message.trim().replace(/\s+/g, ' ');
  return text.length > 54 ? `${text.slice(0, 53).trimEnd()}…` : text || 'New strategy chat';
}

export function parseChatCreate(value: unknown): { readonly title: string; readonly snapshot: StrategyWorkspaceSnapshot } | null {
  if (!record(value) || !validTitle(value.title) || !validSnapshot(value.snapshot)) return null;
  return { title: value.title.trim(), snapshot: value.snapshot };
}

export function parseChatUpdate(value: unknown): { readonly id: string; readonly expectedRevision: number; readonly snapshot: StrategyWorkspaceSnapshot; readonly messages: readonly TickyMessage[] } | null {
  try { if (JSON.stringify(value).length > 550_000) return null; }
  catch { return null; }
  if (!record(value) || typeof value.id !== 'string' || !UUID.test(value.id) || !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 1 || Number(value.expectedRevision) > 1_000_000
    || !validSnapshot(value.snapshot) || !validMessages(value.messages)) return null;
  return { id: value.id, expectedRevision: value.expectedRevision as number, snapshot: value.snapshot, messages: value.messages };
}

export function parseChatRename(value: unknown): { readonly id: string; readonly title: string } | null {
  if (!record(value) || typeof value.id !== 'string' || !UUID.test(value.id) || !validTitle(value.title)) return null;
  return { id: value.id, title: value.title.trim() };
}

export function parseChatId(value: unknown): string | null { return typeof value === 'string' && UUID.test(value) ? value : null; }
