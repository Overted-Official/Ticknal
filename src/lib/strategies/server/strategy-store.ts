import type { SavedStrategyRecord } from './parse-saved-strategy';
import { db } from '../../../db';
import { userStrategies } from '../../../db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

export async function listUserStrategies(userId: string): Promise<readonly SavedStrategyRecord[]> {
  const rows = await db.select().from(userStrategies).where(eq(userStrategies.userId, userId)).orderBy(desc(userStrategies.updatedAt)).limit(100);
  return rows.map((row) => ({ ...(row.definition as SavedStrategyRecord), selectedSymbols: row.selectedSymbols as string[], notificationsEnabled: row.notificationsEnabled, notificationError: row.notificationError }));
}

export async function saveUserStrategy(userId: string, strategy: SavedStrategyRecord): Promise<SavedStrategyRecord> {
  const now = new Date();
  await db.insert(userStrategies).values({
    userId, id: strategy.id, name: strategy.name, mode: strategy.mode,
    definition: strategy, selectedSymbols: [...(strategy.selectedSymbols ?? [])], notificationsEnabled: strategy.notificationsEnabled === true,
    notificationSession: null, notificationCursor: 0, notificationLeaseToken: null, notificationLeaseUntil: null, notificationError: null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [userStrategies.userId, userStrategies.id],
    set: { name: strategy.name, mode: strategy.mode, definition: strategy, selectedSymbols: [...(strategy.selectedSymbols ?? [])],
      notificationsEnabled: strategy.notificationsEnabled === true, notificationSession: null, notificationCursor: 0,
      notificationGeneration: sql`${userStrategies.notificationGeneration} + 1`, notificationLeaseToken: null,
      notificationLeaseUntil: null, notificationError: null, updatedAt: now },
  });
  return strategy;
}

export async function updateUserStrategySelection(userId: string, id: string, symbols: readonly string[]): Promise<boolean> {
  const rows = await db.update(userStrategies).set({ selectedSymbols: [...symbols], notificationsEnabled: symbols.length > 0 ? undefined : false,
    notificationSession: null, notificationCursor: 0, notificationGeneration: sql`${userStrategies.notificationGeneration} + 1`,
    notificationLeaseToken: null, notificationLeaseUntil: null, updatedAt: new Date() })
    .where(and(eq(userStrategies.userId, userId), eq(userStrategies.id, id))).returning({ id: userStrategies.id });
  return rows.length > 0;
}
