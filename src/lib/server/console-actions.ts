'use server';

import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { profiles, userSubscriptions, auditLogs, positions, tickers } from '@/db/schema';
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
  
    return { success: true };
  } catch (error) {
    console.error('[cancelSubscriptionAction] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 6. Bulk Update User Plan Tier
 */
export async function bulkUpdateUserTierAction(params: {
  targetUserIds: string[];
  tier: 'free' | 'plus' | 'elite' | 'vip';
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserIds, tier } = params;
  if (!targetUserIds || targetUserIds.length === 0) {
    return { success: true, count: 0 };
  }

  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  for (const uid of targetUserIds) {
    const [sub] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, uid))
      .limit(1);

    if (sub) {
      await db
        .update(userSubscriptions)
        .set({
          tier,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: oneYearFromNow,
          updatedAt: now,
        })
        .where(eq(userSubscriptions.id, sub.id));
    } else {
      await db.insert(userSubscriptions).values({
        userId: uid,
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneYearFromNow,
        provider: 'admin_bulk',
      });
    }

    await logAdminAction({
      adminId: adminUser.id,
      action: 'user.bulk_tier_update',
      targetId: uid,
      metadata: { tier },
    });
  }

  revalidatePath('/console/users');
  return { success: true, count: targetUserIds.length };
}

/**
 * 7. Bulk Delete Users
 */
export async function bulkDeleteUsersAction(params: {
  targetUserIds: string[];
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserIds } = params;
  if (!targetUserIds || targetUserIds.length === 0) {
    return { success: true, count: 0 };
  }

  let deletedCount = 0;
  for (const uid of targetUserIds) {
    // Prevent self-deletion of active admin
    if (uid === adminUser.id) continue;

    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, uid));
    await db.delete(profiles).where(eq(profiles.id, uid));

    await logAdminAction({
      adminId: adminUser.id,
      action: 'user.bulk_delete',
      targetId: uid,
    });
    deletedCount++;
  }

  revalidatePath('/console/users');
  return { success: true, count: deletedCount };
}

/**
 * 8. Bulk Suspend / Activate Users
 */
export async function bulkUpdateUserStatusAction(params: {
  targetUserIds: string[];
  status: 'active' | 'suspended';
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserIds, status } = params;
  if (!targetUserIds || targetUserIds.length === 0) {
    return { success: true, count: 0 };
  }

  const now = new Date();
  for (const uid of targetUserIds) {
    if (uid === adminUser.id && status === 'suspended') continue;

    const [sub] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, uid))
      .limit(1);

    if (sub) {
      await db
        .update(userSubscriptions)
        .set({
          status: status === 'suspended' ? 'canceled' : 'active',
          updatedAt: now,
        })
        .where(eq(userSubscriptions.id, sub.id));
    }

    await logAdminAction({
      adminId: adminUser.id,
      action: 'user.bulk_status_update',
      targetId: uid,
      metadata: { status },
    });
  }

  revalidatePath('/console/users');
  return { success: true, count: targetUserIds.length };
}

/**
 * 9. Fetch Open Positions for a Single User (for detail drawer)
 */
export async function getUserPositionsAction(params: { targetUserId: string }) {
  await assertAdminUser();
  const rows = await db
    .select({
      id: positions.id,
      tickerSymbol: positions.tickerSymbol,
      side: positions.side,
      entryDate: positions.entryDate,
      entryPrice: positions.entryPrice,
      quantity: positions.quantity,
      status: positions.status,
      companyName: tickers.companyName,
      logoUrl: tickers.logoUrl,
    })
    .from(positions)
    .leftJoin(tickers, eq(positions.tickerSymbol, tickers.symbol))
    .where(and(eq(positions.userId, params.targetUserId), eq(positions.status, 'OPEN')))
    .orderBy(desc(positions.createdAt));

  const items = rows.map((r) => {
    const entryPrice = parseFloat(r.entryPrice) || 0;
    const quantity = parseFloat(r.quantity) || 0;
    return {
      id: r.id,
      tickerSymbol: r.tickerSymbol,
      companyName: r.companyName || r.tickerSymbol,
      logoUrl: r.logoUrl,
      side: r.side,
      status: r.status,
      entryDate: r.entryDate,
      entryPrice,
      quantity,
      totalExposure: entryPrice * quantity,
    };
  });

  return { success: true, positions: items };
}

/**
 * 10. Update Single User Subscription Tier
 */
export async function updateSingleUserTierAction(params: {
  targetUserId: string;
  tier: 'free' | 'plus' | 'elite' | 'vip';
  durationDays?: number;
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserId, tier, durationDays = 365 } = params;

  const now = new Date();
  const periodEnd =
    tier === 'free'
      ? new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, targetUserId))
    .limit(1);

  if (sub) {
    await db
      .update(userSubscriptions)
      .set({
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(userSubscriptions.id, sub.id));
  } else {
    await db.insert(userSubscriptions).values({
      userId: targetUserId,
      tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      provider: 'manual_admin',
    });
  }

  await logAdminAction({
    adminId: adminUser.id,
    action: 'user.single_tier_update',
    targetId: targetUserId,
    metadata: { tier, durationDays },
  });

  revalidatePath('/console/users');
  return { success: true, tier };
}

/**
 * 11. Update Single User Member Status (Active vs Suspended)
 */
export async function updateSingleUserStatusAction(params: {
  targetUserId: string;
  status: 'active' | 'suspended';
}) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserId, status } = params;

  if (targetUserId === adminUser.id && status === 'suspended') {
    return { success: false, error: 'Cannot suspend your own admin account.' };
  }

  const now = new Date();
  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, targetUserId))
    .limit(1);

  if (sub) {
    await db
      .update(userSubscriptions)
      .set({
        status: status === 'suspended' ? 'canceled' : 'active',
        updatedAt: now,
      })
      .where(eq(userSubscriptions.id, sub.id));
  }

  await logAdminAction({
    adminId: adminUser.id,
    action: 'user.single_status_update',
    targetId: targetUserId,
    metadata: { status },
  });

  revalidatePath('/console/users');
  return { success: true, status };
}

/**
 * 12. Delete Single User
 */
export async function deleteSingleUserAction(params: { targetUserId: string }) {
  const { user: adminUser } = await assertAdminUser();
  const { targetUserId } = params;

  if (targetUserId === adminUser.id) {
    return { success: false, error: 'Cannot delete your own admin account.' };
  }

  await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, targetUserId));
  await db.delete(profiles).where(eq(profiles.id, targetUserId));

  await logAdminAction({
    adminId: adminUser.id,
    action: 'user.single_delete',
    targetId: targetUserId,
  });

  revalidatePath('/console/users');
  return { success: true };
}

/**
 * 13. Fetch Acquisition Stats Dynamically (for Console timeframe toggle)
 */
export async function getAcquisitionStatsAction(params: {
  timeframe: '30d' | '90d' | '120d' | 'ytd' | 'custom';
  customStart?: string;
  customEnd?: string;
}) {
  await assertAdminUser();
  const { getConsoleAcquisitionStats } = await import('@/lib/server/console-queries');
  const stats = await getConsoleAcquisitionStats(params.timeframe, params.customStart, params.customEnd);
  return { success: true, stats };
}


