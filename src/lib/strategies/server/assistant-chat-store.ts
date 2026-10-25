import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { strategyAssistantChats } from '../../../db/schema';
import type { StrategyWorkspaceSnapshot } from '../assistant/strategy-actions';
import type { TickyChat, TickyChatSummary, TickyMessage } from '../assistant/chat-history';

type ChatMetaRow = Pick<typeof strategyAssistantChats.$inferSelect, 'id' | 'title' | 'strategyId' | 'revision' | 'createdAt' | 'updatedAt'>;
const summary = (row: ChatMetaRow): TickyChatSummary => ({
  id: row.id, title: row.title, strategyId: row.strategyId, revision: row.revision,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
const full = (row: typeof strategyAssistantChats.$inferSelect): TickyChat => ({
  ...summary(row), snapshot: row.snapshot as StrategyWorkspaceSnapshot, messages: row.messages as TickyMessage[],
});

export async function listAssistantChats(userId: string): Promise<readonly TickyChatSummary[]> {
  const rows = await db.select({ id: strategyAssistantChats.id, title: strategyAssistantChats.title, strategyId: strategyAssistantChats.strategyId,
    revision: strategyAssistantChats.revision, createdAt: strategyAssistantChats.createdAt, updatedAt: strategyAssistantChats.updatedAt })
    .from(strategyAssistantChats).where(eq(strategyAssistantChats.userId, userId))
    .orderBy(desc(strategyAssistantChats.updatedAt)).limit(100);
  return rows.map(summary);
}

export async function getAssistantChat(userId: string, id: string): Promise<TickyChat | null> {
  const [row] = await db.select().from(strategyAssistantChats).where(and(eq(strategyAssistantChats.userId, userId), eq(strategyAssistantChats.id, id))).limit(1);
  return row ? full(row) : null;
}

export async function createAssistantChat(userId: string, title: string, snapshot: StrategyWorkspaceSnapshot): Promise<TickyChat | null> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(strategyAssistantChats).where(eq(strategyAssistantChats.userId, userId));
  if (count >= 100) return null;
  const [row] = await db.insert(strategyAssistantChats).values({
    id: crypto.randomUUID(), userId, title, strategyId: snapshot.draft.id, revision: 1, snapshot, messages: [],
  }).returning();
  return full(row);
}

export async function updateAssistantChat(userId: string, id: string, expectedRevision: number, snapshot: StrategyWorkspaceSnapshot, messages: readonly TickyMessage[]): Promise<TickyChat | null> {
  const [row] = await db.update(strategyAssistantChats).set({
    snapshot, messages: [...messages], strategyId: snapshot.draft.id,
    revision: expectedRevision + 1, updatedAt: new Date(),
  }).where(and(eq(strategyAssistantChats.userId, userId), eq(strategyAssistantChats.id, id), eq(strategyAssistantChats.revision, expectedRevision))).returning();
  return row ? full(row) : null;
}

export async function renameAssistantChat(userId: string, id: string, title: string): Promise<TickyChatSummary | null> {
  const [row] = await db.update(strategyAssistantChats).set({ title, updatedAt: new Date() })
    .where(and(eq(strategyAssistantChats.userId, userId), eq(strategyAssistantChats.id, id)))
    .returning({ id: strategyAssistantChats.id, title: strategyAssistantChats.title, strategyId: strategyAssistantChats.strategyId,
      revision: strategyAssistantChats.revision, createdAt: strategyAssistantChats.createdAt, updatedAt: strategyAssistantChats.updatedAt });
  return row ? summary(row) : null;
}

export async function deleteAssistantChat(userId: string, id: string): Promise<boolean> {
  const rows = await db.delete(strategyAssistantChats).where(and(eq(strategyAssistantChats.userId, userId), eq(strategyAssistantChats.id, id))).returning({ id: strategyAssistantChats.id });
  return rows.length > 0;
}
