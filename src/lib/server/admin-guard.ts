import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, auditLogs } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export type UserProfile = typeof profiles.$inferSelect;

/**
 * Retrieves the currently authenticated Supabase user and their DB profile.
 */
export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return {
    user,
    profile: profile ?? null,
  };
}

/**
 * Asserts that the current session belongs to an authorized administrator.
 * Throws an error or redirects if unauthorized.
 */
export async function assertAdminUser(options?: { redirectOnFail?: boolean }) {
  const { redirectOnFail = false } = options || {};
  const current = await getCurrentUserAndProfile();

  if (!current || !current.user) {
    if (redirectOnFail) {
      redirect('/login?next=/console');
    }
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  const role = current.profile?.role?.toLowerCase() || 'user';
  const isAdmin = role === 'admin' || role === 'superadmin';

  if (!isAdmin) {
    if (redirectOnFail) {
      redirect('/home?error=forbidden');
    }
    throw new Error('FORBIDDEN: Administrative access required');
  }

  return {
    user: current.user,
    profile: current.profile!,
  };
}

/**
 * Immutable audit logger for any privileged administrative mutation.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      adminId: params.adminId,
      action: params.action,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (error) {
    console.error('[logAdminAction] Failed to record audit log entry:', error);
  }
}
