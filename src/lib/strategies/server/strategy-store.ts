import type { SavedStrategyRecord } from './parse-saved-strategy';
import { db } from '../../../db';
import { userStrategies } from '../../../db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

export async function listUserStrategies(userId: string): Promise<readonly SavedStrategyRecord[]> {
  const rows = await db.select().from(userStrategies).where(eq(userStrategies.userId, userId)).orderBy(desc(userStrategies.updatedAt)).limit(100);
  return rows.map((row) => ({ ...(row.definition as SavedStrategyRecord), revision: row.revision, selectedSymbols: row.selectedSymbols as string[], notificationsEnabled: row.notificationsEnabled, notificationError: row.notificationError }));
}

export async function saveUserStrategy(userId: string, strategy: SavedStrategyRecord, expectedRevision: number): Promise<
  | { readonly status: 'ok'; readonly strategy: SavedStrategyRecord }
  | { readonly status: 'conflict' }
> {
  const now = new Date();
  if (expectedRevision === 0) {
    const inserted = await db.insert(userStrategies).values({
      userId, id: strategy.id, revision: 1, name: strategy.name, mode: strategy.mode,
      definition: strategy, selectedSymbols: [...(strategy.selectedSymbols ?? [])], notificationsEnabled: strategy.notificationsEnabled === true,
      notificationSession: null, notificationCursor: 0, notificationLeaseToken: null, notificationLeaseUntil: null, notificationError: null,
      updatedAt: now,
    }).onConflictDoNothing().returning({ id: userStrategies.id });
    return inserted.length ? { status: 'ok', strategy: { ...strategy, revision: 1 } } : { status: 'conflict' };
  }
  const updated = await db.update(userStrategies).set({
    revision: expectedRevision + 1, name: strategy.name, mode: strategy.mode, definition: strategy,
    selectedSymbols: [...(strategy.selectedSymbols ?? [])], notificationsEnabled: strategy.notificationsEnabled === true,
    notificationSession: null, notificationCursor: 0,
    notificationGeneration: sql`${userStrategies.notificationGeneration} + 1`, notificationLeaseToken: null,
    notificationLeaseUntil: null, notificationError: null, updatedAt: now,
  }).where(and(eq(userStrategies.userId, userId), eq(userStrategies.id, strategy.id), eq(userStrategies.revision, expectedRevision)))
    .returning({ id: userStrategies.id });
  return updated.length ? { status: 'ok', strategy: { ...strategy, revision: expectedRevision + 1 } } : { status: 'conflict' };
}

export async function updateUserStrategySelection(userId: string, id: string, symbols: readonly string[]): Promise<boolean> {
  const rows = await db.update(userStrategies).set({ selectedSymbols: [...symbols], revision: sql`${userStrategies.revision} + 1`, notificationsEnabled: symbols.length > 0 ? undefined : false,
    notificationSession: null, notificationCursor: 0, notificationGeneration: sql`${userStrategies.notificationGeneration} + 1`,
    notificationLeaseToken: null, notificationLeaseUntil: null, updatedAt: new Date() })
    .where(and(eq(userStrategies.userId, userId), eq(userStrategies.id, id))).returning({ id: userStrategies.id });
  return rows.length > 0;
}
