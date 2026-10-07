'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { profiles, userSubscriptions, auditLogs } from '@/db/schema';
import { assertAdminUser, logAdminAction } from '@/lib/server/admin-guard';
import {
  handleUpdateStocks,
  handleProcessSignals,
  handleUpdateFunds,
  handleUpdateCommodities,
  handleWatchdog,
  handleUpdateNews,
  handleGenerateTicknalTake,
} from '@/lib/cron-handlers';

const ALLOWED_ROLES = ['user', 'pro', 'analyst', 'admin', 'superadmin'] as const;

/**
 * 1. Update User Role
 */
export async function updateUserRoleAction(params: {
  targetUserId: string;
  newRole: string;
}) {
  const { user: adminUser } = await assertAdminUser();

  const roleClean = params.newRole.toLowerCase();
  if (!ALLOWED_ROLES.includes(roleClean as typeof ALLOWED_ROLES[number])) {
    return { success: false, error: 'Invalid role specified' };
  }

  const [targetProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, params.targetUserId))
    .limit(1);

  if (!targetProfile) {
    return { success: false, error: 'Target user not found' };
  }

  const oldRole = targetProfile.role;

  await db
    .update(profiles)
    .set({
      role: roleClean,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, params.targetUserId));

  await logAdminAction({
    adminId: adminUser.id,
    action: 'user.role_update',
    targetId: params.targetUserId,
    metadata: {
      oldRole,
      newRole: roleClean,
      targetEmail: targetProfile.email,
    },
  });

  revalidatePath('/console/users');
  revalidatePath('/console/overview');

  return { success: true, oldRole, newRole: roleClean };
}

/**
 * 2. Grant or Extend Pro Access for a User
 */
export async function grantProAccessAction(params: {
  targetUserId: string;
  days: number;
  tier?: string;
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserId, days = 30, tier = 'pro_monthly' } = params;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Check if active subscription already exists
  const [existingSub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, targetUserId))
    .limit(1);

  if (existingSub) {
    // Extend period
    const currentEnd = new Date(existingSub.currentPeriodEnd);
    const newEnd = currentEnd > now
      ? new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)
      : periodEnd;

    await db
      .update(userSubscriptions)
      .set({
        tier,
        status: 'active',
        currentPeriodEnd: newEnd,
        updatedAt: now,
      })
      .where(eq(userSubscriptions.id, existingSub.id));
  } else {
    // Insert new subscription record
    await db.insert(userSubscriptions).values({
      userId: targetUserId,
      tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      provider: 'manual_override',
    });
  }

  // Also elevate profile role to 'pro' if currently 'user'
  const [targetProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, targetUserId))
    .limit(1);

  if (targetProfile && targetProfile.role === 'user') {
    await db
      .update(profiles)
      .set({ role: 'pro', updatedAt: now })
      .where(eq(profiles.id, targetUserId));
  }

  await logAdminAction({
    adminId: adminUser.id,
    action: 'subscription.manual_grant',
    targetId: targetUserId,
    metadata: {
      days,
      tier,
      periodEnd: periodEnd.toISOString(),
      targetEmail: targetProfile?.email,
    },
  });

  revalidatePath('/console/subscriptions');
  revalidatePath('/console/users');
  revalidatePath('/console/overview');

  return { success: true, periodEnd: periodEnd.toISOString() };
}

/**
 * 3. Manually Trigger a Cron Ingestion Job
 */
export async function triggerCronAction(jobName: string) {
  const { user: adminUser } = await assertAdminUser();

  const dummyReq = new Request(`https://internal.ticknal.com/cron/${jobName}`);

  let resultSummary = '';
  try {
    switch (jobName) {
      case 'update-stocks': {
        const res = await handleUpdateStocks(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      case 'process-signals': {
        const res = await handleProcessSignals(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      case 'update-funds': {
        const res = await handleUpdateFunds(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      case 'update-commodities': {
        const res = await handleUpdateCommodities(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      case 'watchdog': {
        const res = await handleWatchdog(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      case 'update-news': {
        const res = await handleUpdateNews(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      case 'ticknal-take': {
        const res = await handleGenerateTicknalTake(dummyReq);
        const data = await res.json().catch(() => ({}));
        resultSummary = JSON.stringify(data);
        break;
      }
      default:
        return { success: false, error: 'Unknown cron job name' };
    }

    await logAdminAction({
      adminId: adminUser.id,
      action: `cron.manual_trigger:${jobName}`,
      targetId: jobName,
      metadata: { summary: resultSummary },
    });

    revalidatePath('/console/operations');
    revalidatePath('/console/signals');
    revalidatePath('/console/logs');
    revalidatePath('/console/overview');

    return { success: true, summary: resultSummary };
  } catch (error) {
    console.error(`[triggerCronAction] Error running ${jobName}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * 4. Reseed / Sync Canonical Alerts for a User
 */
export async function seedUserNotificationsAction(params: { targetUserId: string }) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserId } = params;

  try {
    const { seedUserNotifications } = await import('@/lib/handlers/notifications-handlers');
    const seededCount = await seedUserNotifications(targetUserId);

    await logAdminAction({
      adminId: adminUser.id,
      action: 'notifications.manual_seed',
      targetId: targetUserId,
      metadata: { seededCount },
    });

    revalidatePath('/console/users');
    return { success: true, seededCount };
  } catch (error) {
    console.error('[seedUserNotificationsAction] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 5. Cancel or Schedule Termination of a User Subscription
 */
export async function cancelSubscriptionAction(params: {
  targetUserId: string;
  immediate?: boolean;
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserId, immediate = false } = params;

  try {
    const [existingSub] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, targetUserId))
      .limit(1);

    if (!existingSub) {
      return { success: false, error: 'Subscription record not found' };
    }

    const now = new Date();
    if (immediate) {
      await db
        .update(userSubscriptions)
        .set({
          status: 'canceled',
          cancelAtPeriodEnd: true,
          updatedAt: now,
        })
        .where(eq(userSubscriptions.id, existingSub.id));

      // Also demote role to 'user' if currently 'pro'
      const [targetProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, targetUserId))
        .limit(1);

      if (targetProfile && targetProfile.role === 'pro') {
        await db
          .update(profiles)
          .set({ role: 'user', updatedAt: now })
          .where(eq(profiles.id, targetUserId));
      }
    } else {
      await db
        .update(userSubscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: now,
        })
        .where(eq(userSubscriptions.id, existingSub.id));
    }

    await logAdminAction({
      adminId: adminUser.id,
      action: immediate ? 'subscription.immediate_cancel' : 'subscription.cancel_at_period_end',
      targetId: targetUserId,
      metadata: {
        immediate,
        previousTier: existingSub.tier,
      },
    });

    revalidatePath('/console/subscriptions');
    revalidatePath('/console/users');
    revalidatePath('/console/overview');

    return { success: true };
  } catch (error) {
    console.error('[cancelSubscriptionAction] Error:', error);
    return { success: false, error: String(error) };
  }
}
