import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { proprietaryStrategyAccess } from '@/db/schema';
import { getCurrentProprietaryAccess } from '@/lib/server/proprietary-strategy-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' } as const;

export async function GET(): Promise<Response> {
  try {
    const access = await getCurrentProprietaryAccess();
    if (!access.authenticated) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    return Response.json({ canView: access.canView, canManageAlerts: access.canManageAlerts, notificationsEnabled: access.canReceiveAlerts }, { headers });
  } catch (error) {
    console.error('[proprietary-access] Read failed.', error);
    return Response.json({ error: 'Access service unavailable.' }, { status: 503, headers });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const access = await getCurrentProprietaryAccess();
    if (!access.authenticated || !access.userId) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    if (!access.canManageAlerts) return Response.json({ error: 'Forbidden' }, { status: 403, headers });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('notificationsEnabled' in body)
      || typeof body.notificationsEnabled !== 'boolean') return Response.json({ error: 'Invalid setting.' }, { status: 400, headers });
    const notificationsEnabled = body.notificationsEnabled;
    if (access.isOwner) {
      await db.insert(proprietaryStrategyAccess).values({
        userId: access.userId, enabled: true, notificationsEnabled,
      }).onConflictDoUpdate({
        target: proprietaryStrategyAccess.userId,
        set: { enabled: true, notificationsEnabled, updatedAt: new Date() },
      });
    } else {
      const changed = await db.update(proprietaryStrategyAccess)
        .set({ notificationsEnabled, updatedAt: new Date() })
        .where(and(eq(proprietaryStrategyAccess.userId, access.userId), eq(proprietaryStrategyAccess.enabled, true)))
        .returning({ userId: proprietaryStrategyAccess.userId });
      if (!changed.length) return Response.json({ error: 'Access was revoked.' }, { status: 403, headers });
    }
    return Response.json({ notificationsEnabled }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: 'Invalid JSON.' }, { status: 400, headers });
    console.error('[proprietary-access] Alert preference update failed.', error);
    return Response.json({ error: 'Access service unavailable.' }, { status: 503, headers });
  }
}
