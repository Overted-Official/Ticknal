import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { proprietaryStrategyAccess } from '@/db/schema';
import { getCurrentUserAndProfile } from '@/lib/server/admin-guard';
import { resolveProprietaryAccess } from '@/lib/strategies/proprietary-access-policy';
import { isProprietaryOwner } from '@/lib/strategies/proprietary-access-policy';

export async function getProprietaryAccessForUser(userId: string, email: string | null, role: string | null) {
  try {
    const [grant] = await db.select({
      enabled: proprietaryStrategyAccess.enabled,
      notificationsEnabled: proprietaryStrategyAccess.notificationsEnabled,
    }).from(proprietaryStrategyAccess).where(eq(proprietaryStrategyAccess.userId, userId)).limit(1);
    return resolveProprietaryAccess(email, role, grant ?? null);
  } catch (error) {
    console.warn(`[proprietary-strategy-access] Failed to load grant for user ${userId}:`, error);
    return resolveProprietaryAccess(email, role, null);
  }
}

export async function getCurrentProprietaryAccess() {
  try {
    const current = await getCurrentUserAndProfile();
    if (!current) return { authenticated: false, userId: null, isOwner: false, canView: false, canReceiveAlerts: false } as const;
    const access = await getProprietaryAccessForUser(current.user.id, current.user.email ?? null, current.profile?.role ?? null);
    return {
      authenticated: true,
      userId: current.user.id,
      isOwner: isProprietaryOwner(current.user.email, current.profile?.role),
      ...access,
    };
  } catch (error) {
    console.warn('[proprietary-strategy-access] Failed to resolve current access:', error);
    return { authenticated: false, userId: null, isOwner: false, canView: false, canReceiveAlerts: false } as const;
  }
}

export async function requireProprietaryAccess(): Promise<Response | null> {
  const access = await getCurrentProprietaryAccess();
  if (!access.authenticated) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  if (!access.canView) return Response.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  return null;
}
