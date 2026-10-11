import { and, desc, eq, sql, ilike, or, gte, asc, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  profiles,
  devicePushTokens,
  tickers,
  dailyPrices,
  signalNotifications,
  systemLogs,
  auditLogs,
  userSubscriptions,
  userBankAccounts,
  positions,
  userStrategySettings,
  pushSubscriptions,
  tickerAlerts,
  userTelemetryEvents,
} from '@/db/schema';
import { ensureBaselineTelemetrySeeded } from '@/lib/server/telemetry-seed';
import {
  getSubscriptionPlans,
  type PlanLimits,
  type PlanFeatures,
} from '@/lib/server/plans-service';

// Standard tier pricing constants in EGP (aligned with Landing Page)
const TIER_PRICES_EGP: Record<string, number> = {
  free: 0,
  plus: 50,
  plus_monthly: 50,
  plus_annual: 41.67, // 500 / 12
  elite: 95,
  elite_monthly: 95,
  elite_annual: 79.17, // 950 / 12
  vip: 0, // Exceptional friends & family (0 EGP)
  // Legacy aliases
  pro_monthly: 50,
  pro_annual: 41.67,
};

export interface ConsoleOverviewStats {
  executive: {
    mrr: number;
    arr: number;
    totalUsers: number;
    activePaidCount: number;
    freeCount: number;
    arpu: number;
    arpuPaid: number;
    paidConversionRate: number;
    newUsersToday: number;
    newUsers7d: number;
    newUsers30d: number;
    newUsersPrior30d: number;
    momGrowthPct: number;
    churnRiskCount: number;
    expiring14dCount: number;
    expiring30dCount: number;
    annualSeatsCount: number;
  };
  tierDistribution: {
    id: string;
    name: string;
    count: number;
    percentage: number;
    monthlyPrice: number;
    mrrContribution: number;
    color: string;
  }[];
  progression: {
    monthly: {
      key: string;
      label: string;
      newSignups: number;
      cumulativeSignups: number;
      mrr: number;
      arr: number;
    }[];
    daily30d: {
      date: string;
      label: string;
      newSignups: number;
      cumulativeSignups: number;
      mrr: number;
      arr: number;
    }[];
  };
  recentSignups: {
    id: string;
    email: string | null;
    fullName: string;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    tier: string;
    status: string;
    authProvider: string;
  }[];
  atRiskSubscriptions: {
    id: number;
    userId: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    tier: string;
    status: string;
    currentPeriodEnd: string;
    daysRemaining: number;
    cancelAtPeriodEnd: boolean;
    provider: string;
  }[];
  featureAdoption: {
    positionsUsersCount: number;
    positionsPct: number;
    alertsUsersCount: number;
    alertsPct: number;
    pushUsersCount: number;
    pushPct: number;
  };
  recentActivity: {
    id: string;
    type: 'signup' | 'subscription' | 'admin' | 'log';
    title: string;
    description: string;
    badge: string;
    badgeColor: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';
    timestamp: string;
  }[];
}

/**
 * 1. Overview Dashboard Stats - Commercial Management Executive Dashboard
 */
export async function getConsoleOverviewStats(): Promise<ConsoleOverviewStats> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Fetch all profiles
  let allProfiles: (typeof profiles.$inferSelect)[] = [];
  try {
    allProfiles = await db
      .select()
      .from(profiles)
      .orderBy(asc(profiles.createdAt));
  } catch (err) {
    console.error('[getConsoleOverviewStats] Failed to fetch profiles:', err);
  }

  const totalUsers = allProfiles.length;
  let newUsersToday = 0;
  let newUsers7d = 0;
  let newUsers30d = 0;
  let newUsersPrior30d = 0;

  for (const u of allProfiles) {
    const t = u.createdAt ? new Date(u.createdAt).getTime() : 0;
    if (t >= oneDayAgo.getTime()) newUsersToday++;
    if (t >= sevenDaysAgo.getTime()) newUsers7d++;
    if (t >= thirtyDaysAgo.getTime()) newUsers30d++;
    else if (t >= sixtyDaysAgo.getTime()) newUsersPrior30d++;
  }

  const momGrowthPct =
    newUsersPrior30d > 0
      ? ((newUsers30d - newUsersPrior30d) / newUsersPrior30d) * 100
      : newUsers30d > 0
      ? 100
      : 0;

  // 2. Fetch all user subscriptions
  let allSubs: (typeof userSubscriptions.$inferSelect)[] = [];
  try {
    allSubs = await db
      .select()
      .from(userSubscriptions)
      .orderBy(asc(userSubscriptions.createdAt));
  } catch (err) {
    console.error('[getConsoleOverviewStats] Failed to fetch subscriptions:', err);
  }

  const subsByUserId = new Map(allSubs.map((s) => [s.userId, s]));

  let activePaidCount = 0;
  let mrr = 0;
  let annualSeatsCount = 0;
  let churnRiskCount = 0;
  let expiring14dCount = 0;
  let expiring30dCount = 0;

  const tierCounts: Record<string, number> = {
    free: 0,
    pro_monthly: 0,
    pro_annual: 0,
    elite: 0,
    vip: 0,
  };
  const tierMrrMap: Record<string, number> = {
    free: 0,
    pro_monthly: 0,
    pro_annual: 0,
    elite: 0,
    vip: 0,
  };

  for (const sub of allSubs) {
    const tier = sub.tier || 'free';
    const isPaid = tier !== 'free' && tier !== 'vip';
    const isActive = sub.status === 'active';

    if (isActive) {
      if (isPaid) {
        activePaidCount++;
        const price = TIER_PRICES_EGP[tier] ?? 299;
        mrr += price;
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        tierMrrMap[tier] = (tierMrrMap[tier] || 0) + price;

        if (tier === 'pro_annual') {
          annualSeatsCount++;
        }

        const periodEnd = new Date(sub.currentPeriodEnd);
        if (periodEnd <= fourteenDaysFromNow) {
          expiring14dCount++;
        }
        if (periodEnd <= thirtyDaysFromNow) {
          expiring30dCount++;
        }
      } else if (tier === 'vip') {
        tierCounts.vip = (tierCounts.vip || 0) + 1;
      }
    }

    if (
      sub.status === 'past_due' ||
      sub.status === 'canceled' ||
      Boolean(sub.cancelAtPeriodEnd)
    ) {
      churnRiskCount++;
    }
  }

  const freeCount = Math.max(0, totalUsers - activePaidCount - (tierCounts.vip || 0));
  tierCounts.free = freeCount;

  const arr = mrr * 12;
  const arpu = totalUsers > 0 ? Math.round(mrr / totalUsers) : 0;
  const arpuPaid = activePaidCount > 0 ? Math.round(mrr / activePaidCount) : 0;
  const paidConversionRate =
    totalUsers > 0 ? Number(((activePaidCount / totalUsers) * 100).toFixed(1)) : 0;

  // 3. Plan Distribution Breakdown
  const tierDistribution = [
    {
      id: 'free',
      name: 'Free Member',
      count: freeCount,
      percentage: totalUsers > 0 ? Number(((freeCount / totalUsers) * 100).toFixed(1)) : 0,
      monthlyPrice: 0,
      mrrContribution: 0,
      color: '#787b86',
    },
    {
      id: 'pro_monthly',
      name: 'Plus Monthly',
      count: tierCounts.pro_monthly || 0,
      percentage:
        totalUsers > 0
          ? Number((((tierCounts.pro_monthly || 0) / totalUsers) * 100).toFixed(1))
          : 0,
      monthlyPrice: 50,
      mrrContribution: tierMrrMap.pro_monthly || 0,
      color: '#2962ff',
    },
    {
      id: 'pro_annual',
      name: 'Plus Annual',
      count: tierCounts.pro_annual || 0,
      percentage:
        totalUsers > 0
          ? Number((((tierCounts.pro_annual || 0) / totalUsers) * 100).toFixed(1))
          : 0,
      monthlyPrice: 42,
      mrrContribution: tierMrrMap.pro_annual || 0,
      color: '#089981',
    },
    {
      id: 'elite',
      name: 'Elite Member',
      count: tierCounts.elite || 0,
      percentage:
        totalUsers > 0
          ? Number((((tierCounts.elite || 0) / totalUsers) * 100).toFixed(1))
          : 0,
      monthlyPrice: 95,
      mrrContribution: tierMrrMap.elite || 0,
      color: '#eab308',
    },
    {
      id: 'vip',
      name: 'VIP Member',
      count: tierCounts.vip || 0,
      percentage:
        totalUsers > 0
          ? Number((((tierCounts.vip || 0) / totalUsers) * 100).toFixed(1))
          : 0,
      monthlyPrice: 0,
      mrrContribution: 0,
      color: '#9c27b0',
    },
  ];

  // 4. Time-series Progression (Monthly & Daily 30D)
  const monthlyBuckets: Record<string, { month: string; newSignups: number; mrrAdd: number }> = {};
  for (const p of allProfiles) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });

    if (!monthlyBuckets[key]) {
      monthlyBuckets[key] = { month: monthLabel, newSignups: 0, mrrAdd: 0 };
    }
    monthlyBuckets[key].newSignups++;
    const sub = subsByUserId.get(p.id);
    if (sub && sub.status === 'active') {
      const price = TIER_PRICES_EGP[sub.tier] ?? 0;
      monthlyBuckets[key].mrrAdd += price;
    }
  }

  const sortedMonthlyKeys = Object.keys(monthlyBuckets).sort();
  let cumulativeSignups = 0;
  let cumulativeMrr = 0;

  const monthlyProgression = sortedMonthlyKeys.map((key) => {
    const b = monthlyBuckets[key];
    cumulativeSignups += b.newSignups;
    cumulativeMrr += b.mrrAdd;
    return {
      key,
      label: b.month,
      newSignups: b.newSignups,
      cumulativeSignups,
      mrr: cumulativeMrr,
      arr: cumulativeMrr * 12,
    };
  });

  const daily30dProgression = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = day.toISOString().slice(0, 10);
    const dayLabel = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const usersToDate = allProfiles.filter((p) => new Date(p.createdAt) <= day);
    const newOnDay = allProfiles.filter(
      (p) => new Date(p.createdAt).toISOString().slice(0, 10) === dayStr
    ).length;

    let dayMrr = 0;
    for (const u of usersToDate) {
      const sub = subsByUserId.get(u.id);
      if (sub && sub.status === 'active') {
        dayMrr += TIER_PRICES_EGP[sub.tier] ?? 0;
      }
    }

    daily30dProgression.push({
      date: dayStr,
      label: dayLabel,
      newSignups: newOnDay,
      cumulativeSignups: usersToDate.length,
      mrr: dayMrr,
      arr: dayMrr * 12,
    });
  }

  // 5. Recent Signups (sorted newest first)
  const profilesNewestFirst = [...allProfiles].reverse();
  const recentSignups = profilesNewestFirst.slice(0, 8).map((p) => {
    const sub = subsByUserId.get(p.id);
    const domain = p.email ? p.email.split('@')[1] : 'unknown';
    const isGoogle = domain?.includes('gmail.com');
    return {
      id: p.id,
      email: p.email,
      fullName: p.fullName || (p.email ? p.email.split('@')[0] : 'Member'),
      avatarUrl: p.avatarUrl,
      role: p.role,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      tier: sub?.tier || 'free',
      status: sub?.status || 'free',
      authProvider: isGoogle ? 'Google OAuth' : 'Email/SSO',
    };
  });

  // 6. At-Risk & Expiring Subscriptions
  const profilesById = new Map(allProfiles.map((p) => [p.id, p]));
  const atRiskSubscriptions = allSubs
    .map((s) => {
      const profile = profilesById.get(s.userId);
      const periodEnd = new Date(s.currentPeriodEnd);
      const diffMs = periodEnd.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        id: s.id,
        userId: s.userId,
        email: profile?.email || 'Unknown',
        fullName:
          profile?.fullName || (profile?.email ? profile.email.split('@')[0] : 'Member'),
        avatarUrl: profile?.avatarUrl || null,
        tier: s.tier,
        status: s.status,
        currentPeriodEnd: periodEnd.toISOString(),
        daysRemaining,
        cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
        provider: s.provider || 'manual',
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 7. Feature Adoption Metrics
  let positionsUsersCount = 0;
  let alertsUsersCount = 0;
  let pushUsersCount = 0;

  try {
    const positionsRes = await db
      .select({ count: sql<number>`count(distinct ${positions.userId})::int` })
      .from(positions);
    positionsUsersCount = positionsRes[0]?.count ?? 0;
  } catch (err) {
    console.error('[getConsoleOverviewStats] Failed positions count:', err);
  }

  try {
    const alertsRes = await db
      .select({ count: sql<number>`count(distinct ${tickerAlerts.userId})::int` })
      .from(tickerAlerts)
      .where(eq(tickerAlerts.enabled, true));
    alertsUsersCount = alertsRes[0]?.count ?? 0;
  } catch (err) {
    console.error('[getConsoleOverviewStats] Failed alerts count:', err);
  }

  try {
    const webUserIds = await db
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions);
    const devUserIds = await db
      .select({ userId: devicePushTokens.userId })
      .from(devicePushTokens);

    const uniquePushUsers = new Set<string>();
    webUserIds.forEach((w) => uniquePushUsers.add(w.userId));
    devUserIds.forEach((d) => d.userId && uniquePushUsers.add(d.userId));
    pushUsersCount = uniquePushUsers.size;
  } catch (err) {
    console.error('[getConsoleOverviewStats] Failed push count:', err);
  }

  const featureAdoption = {
    positionsUsersCount,
    positionsPct:
      totalUsers > 0 ? Number(((positionsUsersCount / totalUsers) * 100).toFixed(1)) : 0,
    alertsUsersCount,
    alertsPct:
      totalUsers > 0 ? Number(((alertsUsersCount / totalUsers) * 100).toFixed(1)) : 0,
    pushUsersCount,
    pushPct:
      totalUsers > 0 ? Number(((pushUsersCount / totalUsers) * 100).toFixed(1)) : 0,
  };

  // 8. Synthesized Real-Time Commercial Activity Stream
  const rawEvents: {
    id: string;
    type: 'signup' | 'subscription' | 'admin' | 'log';
    title: string;
    description: string;
    badge: string;
    badgeColor: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';
    timestamp: string;
    rawDate: Date;
  }[] = [];

  for (const p of allProfiles.slice(-10)) {
    const name = p.fullName || (p.email ? p.email.split('@')[0] : 'Member');
    const pDate = p.createdAt ? new Date(p.createdAt) : new Date();
    rawEvents.push({
      id: `profile-${p.id}`,
      type: 'signup',
      title: 'New Member Registered',
      description: `${name} (${p.email || 'no email'}) joined the platform`,
      badge: 'SIGNUP',
      badgeColor: 'blue',
      timestamp: pDate.toISOString(),
      rawDate: pDate,
    });
  }

  for (const s of allSubs.slice(-10)) {
    const profile = profilesById.get(s.userId);
    const name = profile?.fullName || profile?.email || 'User';
    const sDate = s.createdAt ? new Date(s.createdAt) : new Date();
    rawEvents.push({
      id: `sub-${s.id}`,
      type: 'subscription',
      title: `${s.tier.toUpperCase()} Subscription Active`,
      description: `${name} assigned to tier ${s.tier} (${s.provider || 'manual'})`,
      badge: s.tier.toUpperCase(),
      badgeColor: s.tier === 'elite' ? 'purple' : 'emerald',
      timestamp: sDate.toISOString(),
      rawDate: sDate,
    });
  }

  try {
    const audits = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);

    for (const a of audits) {
      const aDate = a.createdAt ? new Date(a.createdAt) : new Date();
      rawEvents.push({
        id: `audit-${a.id}`,
        type: 'admin',
        title: a.action,
        description: a.targetId ? `Target: ${a.targetId}` : 'Admin audit action',
        badge: 'AUDIT',
        badgeColor: 'amber',
        timestamp: aDate.toISOString(),
        rawDate: aDate,
      });
    }
  } catch (err) {
    console.error('[getConsoleOverviewStats] Failed audit logs fetch:', err);
  }

  rawEvents.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  const recentActivity = rawEvents.slice(0, 10).map(({ rawDate, ...rest }) => rest);

  return {
    executive: {
      mrr,
      arr,
      totalUsers,
      activePaidCount,
      freeCount,
      arpu,
      arpuPaid,
      paidConversionRate,
      newUsersToday,
      newUsers7d,
      newUsers30d,
      newUsersPrior30d,
      momGrowthPct: Number(momGrowthPct.toFixed(1)),
      churnRiskCount,
      expiring14dCount,
      expiring30dCount,
      annualSeatsCount,
    },
    tierDistribution,
    progression: {
      monthly: monthlyProgression,
      daily30d: daily30dProgression,
    },
    recentSignups,
    atRiskSubscriptions,
    featureAdoption,
    recentActivity,
  };
}

export interface UserOpenPositionItem {
  id: number;
  tickerSymbol: string;
  companyName: string;
  logoUrl: string | null;
  side: string;
  status: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  totalExposure: number;
}

export interface ConsoleUserRowItem {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  memberStatus: 'active' | 'inactive' | 'suspended';
  authProvider: string;
  openPositionsCount: number;
  openPositionsValue: number;
  openPositions?: UserOpenPositionItem[];
  positionsCount: number;
  alertsCount: number;
  pushDevicesCount: number;
  subscription: {
    tier: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    daysRemaining: number;
    provider: string;
  };
}

export interface ConsoleUsersPageData {
  users: ConsoleUserRowItem[];
  kpis: {
    totalUsers: number;
    paidCount: number;
    paidConversionRate: number;
    freeCount: number;
    annualCount: number;
    adminCount: number;
    totalPushDevices: number;
    totalPositionsHeld: number;
    ytdProgression?: {
      months: string[];
      totalUsers: number[];
      paidUsers: number[];
      freeUsers: number[];
      adminUsers: number[];
    };
  };
  cohorts: {
    month: string;
    signups: number;
    paidSeats: number;
    conversionRate: number;
  }[];
  tierDistribution: {
    id: string;
    name: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  acquisitionStats: ConsoleAcquisitionStats;
}

/**
 * 2. User Directory Query - Full Page Data
 */
export async function getConsoleUsersPageData(): Promise<ConsoleUsersPageData> {
  const now = new Date();

  try {
    const allProfiles = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        role: profiles.role,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt));

    const userIds = allProfiles.map((u) => u.id);

    let devPush: { userId: string | null; count: number }[] = [];
    let webPush: { userId: string; count: number }[] = [];
    let posCounts: {
      userId: string;
      count: number;
      openCount: number;
      openCostBasis: number;
    }[] = [];
    let openPositionsRows: {
      id: number;
      userId: string;
      tickerSymbol: string;
      side: string;
      entryDate: string;
      entryPrice: string;
      quantity: string;
      status: string;
      companyName: string | null;
      logoUrl: string | null;
    }[] = [];
    let alertCounts: { userId: string; count: number }[] = [];
    let subs: (typeof userSubscriptions.$inferSelect)[] = [];

    if (userIds.length > 0) {
      try {
        devPush = await db
          .select({ userId: devicePushTokens.userId, count: sql<number>`count(*)::int` })
          .from(devicePushTokens)
          .where(sql`${devicePushTokens.userId} IN ${userIds}`)
          .groupBy(devicePushTokens.userId);
      } catch (e) {
        console.error('[getConsoleUsersPageData] Failed dev push:', e);
      }

      try {
        webPush = await db
          .select({ userId: pushSubscriptions.userId, count: sql<number>`count(*)::int` })
          .from(pushSubscriptions)
          .where(sql`${pushSubscriptions.userId} IN ${userIds}`)
          .groupBy(pushSubscriptions.userId);
      } catch (e) {
        console.error('[getConsoleUsersPageData] Failed web push:', e);
      }

      try {
        posCounts = await db
          .select({
            userId: positions.userId,
            count: sql<number>`count(*)::int`,
            openCount: sql<number>`coalesce(sum(case when ${positions.status} = 'OPEN' then 1 else 0 end), 0)::int`,
            openCostBasis: sql<number>`coalesce(sum(case when ${positions.status} = 'OPEN' then (${positions.entryPrice} * ${positions.quantity}) else 0 end), 0)::float`,
          })
          .from(positions)
          .where(sql`${positions.userId} IN ${userIds}`)
          .groupBy(positions.userId);
      } catch (e) {
        console.error('[getConsoleUsersPageData] Failed positions count:', e);
      }

      try {
        openPositionsRows = await db
          .select({
            id: positions.id,
            userId: positions.userId,
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
          .where(and(sql`${positions.userId} IN ${userIds}`, eq(positions.status, 'OPEN')))
          .orderBy(desc(positions.createdAt));
      } catch (e) {
        console.error('[getConsoleUsersPageData] Failed open positions query:', e);
      }

      try {
        alertCounts = await db
          .select({ userId: tickerAlerts.userId, count: sql<number>`count(*)::int` })
          .from(tickerAlerts)
          .where(sql`${tickerAlerts.userId} IN ${userIds}`)
          .groupBy(tickerAlerts.userId);
      } catch (e) {
        console.error('[getConsoleUsersPageData] Failed alerts count:', e);
      }

      try {
        subs = await db
          .select()
          .from(userSubscriptions)
          .where(sql`${userSubscriptions.userId} IN ${userIds}`);
      } catch (e) {
        console.error('[getConsoleUsersPageData] Failed subs query:', e);
      }
    }

    const userPositionsMap = new Map<string, UserOpenPositionItem[]>();
    for (const r of openPositionsRows) {
      const ep = parseFloat(r.entryPrice) || 0;
      const qty = parseFloat(r.quantity) || 0;
      const item: UserOpenPositionItem = {
        id: r.id,
        tickerSymbol: r.tickerSymbol,
        companyName: r.companyName || r.tickerSymbol,
        logoUrl: r.logoUrl,
        side: r.side,
        status: r.status,
        entryDate: r.entryDate,
        entryPrice: ep,
        quantity: qty,
        totalExposure: ep * qty,
      };
      const list = userPositionsMap.get(r.userId) || [];
      list.push(item);
      userPositionsMap.set(r.userId, list);
    }

    const subMap = new Map(subs.map((s) => [s.userId, s]));
    const devMap = new Map(devPush.map((d) => [d.userId, d.count]));
    const webMap = new Map(webPush.map((w) => [w.userId, w.count]));
    const posMap = new Map(
      posCounts.map((p) => [
        p.userId,
        {
          total: p.count,
          openCount: p.openCount,
          openCostBasis: p.openCostBasis,
        },
      ])
    );
    const alertMap = new Map(alertCounts.map((a) => [a.userId, a.count]));

    let paidCount = 0;
    let annualCount = 0;
    let adminCount = 0;
    let totalPushDevices = 0;
    let totalPositionsHeld = 0;
    const tierCounts: Record<string, number> = { free: 0, plus: 0, elite: 0, vip: 0 };

    const users: ConsoleUserRowItem[] = allProfiles.map((u) => {
      const s = subMap.get(u.id);
      const domain = u.email ? u.email.split('@')[1] : '';
      const isGoogle = domain?.includes('gmail.com');
      const periodEnd = s?.currentPeriodEnd ? new Date(s.currentPeriodEnd) : null;
      const diffMs = periodEnd ? periodEnd.getTime() - now.getTime() : 0;
      const daysRemaining = periodEnd ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

      const pushCount = (devMap.get(u.id) || 0) + (webMap.get(u.id) || 0);
      const pData = posMap.get(u.id);
      const positionsCount = pData?.total || 0;
      const openPositionsCount = pData?.openCount || 0;
      const openPositionsValue = Math.round(pData?.openCostBasis || 0);
      const alertsCount = alertMap.get(u.id) || 0;

      totalPushDevices += pushCount;
      totalPositionsHeld += positionsCount;

      if (u.role === 'admin' || u.role === 'superadmin') {
        adminCount++;
      }

      // Normalize tier to real system plans: 'free' | 'plus' | 'elite' | 'vip'
      let rawTier = (s?.tier || 'free').toLowerCase();
      let tier = 'free';
      if (
        rawTier === 'plus' ||
        rawTier === 'plus_monthly' ||
        rawTier === 'plus_annual' ||
        rawTier === 'pro_monthly' ||
        rawTier === 'pro_annual' ||
        rawTier === 'pro'
      ) {
        tier = 'plus';
      } else if (
        rawTier === 'elite' ||
        rawTier === 'elite_monthly' ||
        rawTier === 'elite_annual'
      ) {
        tier = 'elite';
      } else if (rawTier === 'vip') {
        tier = 'vip';
      }

      const isActiveSub = s?.status === 'active';
      if (isActiveSub && (tier === 'plus' || tier === 'elite')) {
        paidCount++;
      }
      if (s?.tier?.includes('annual')) {
        annualCount++;
      }
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;

      const createdTime = u.createdAt ? new Date(u.createdAt).getTime() : 0;
      const updatedTime = u.updatedAt ? new Date(u.updatedAt).getTime() : 0;
      const lastActiveTime = Math.max(createdTime, updatedTime);
      const lastActiveAt = new Date(lastActiveTime).toISOString();
      const daysSinceActive = (now.getTime() - lastActiveTime) / (1000 * 60 * 60 * 24);
      let memberStatus: 'active' | 'inactive' | 'suspended' = 'active';
      if (s?.status === 'canceled' || s?.status === 'suspended') {
        memberStatus = 'suspended';
      } else if (daysSinceActive > 60 && openPositionsCount === 0 && pushCount === 0) {
        memberStatus = 'inactive';
      } else {
        memberStatus = 'active';
      }

      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName || (u.email ? u.email.split('@')[0] : 'Member'),
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
        lastActiveAt,
        memberStatus,
        authProvider: isGoogle ? 'Google OAuth' : 'Email/SSO',
        openPositionsCount,
        openPositionsValue,
        openPositions: userPositionsMap.get(u.id) || [],
        positionsCount,
        alertsCount,
        pushDevicesCount: pushCount,
        subscription: {
          tier,
          status: s?.status || 'none',
          currentPeriodStart: s?.currentPeriodStart ? new Date(s.currentPeriodStart).toISOString() : null,
          currentPeriodEnd: s?.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString() : null,
          cancelAtPeriodEnd: Boolean(s?.cancelAtPeriodEnd),
          daysRemaining,
          provider: s?.provider || 'manual',
        },
      };
    });

    const totalUsers = users.length;
    const freeCount = tierCounts.free || 0;
    const paidConversionRate =
      totalUsers > 0 ? Number(((paidCount / totalUsers) * 100).toFixed(1)) : 0;

    // Monthly cohorts
    const cohortBuckets: Record<string, { month: string; signups: number; paidSeats: number }> = {};
    for (const u of users) {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (!cohortBuckets[key]) {
        cohortBuckets[key] = { month: monthLabel, signups: 0, paidSeats: 0 };
      }
      cohortBuckets[key].signups++;
      if (
        u.subscription.tier !== 'free' &&
        u.subscription.tier !== 'vip' &&
        u.subscription.status === 'active'
      ) {
        cohortBuckets[key].paidSeats++;
      }
    }

    const cohorts = Object.keys(cohortBuckets)
      .sort()
      .map((k) => {
        const b = cohortBuckets[k];
        return {
          month: b.month,
          signups: b.signups,
          paidSeats: b.paidSeats,
          conversionRate:
            b.signups > 0 ? Number(((b.paidSeats / b.signups) * 100).toFixed(1)) : 0,
        };
      });

    const tierDistribution = [
      {
        id: 'free',
        name: 'Free Member',
        count: freeCount,
        percentage: totalUsers > 0 ? Number(((freeCount / totalUsers) * 100).toFixed(1)) : 0,
        color: '#787b86',
      },
      {
        id: 'plus',
        name: 'Plus Member',
        count: tierCounts.plus || 0,
        percentage:
          totalUsers > 0
            ? Number((((tierCounts.plus || 0) / totalUsers) * 100).toFixed(1))
            : 0,
        color: '#2962ff',
      },
      {
        id: 'elite',
        name: 'Elite Member',
        count: tierCounts.elite || 0,
        percentage:
          totalUsers > 0
            ? Number((((tierCounts.elite || 0) / totalUsers) * 100).toFixed(1))
            : 0,
        color: '#089981',
      },
      {
        id: 'vip',
        name: 'VIP Member',
        count: tierCounts.vip || 0,
        percentage:
          totalUsers > 0
            ? Number((((tierCounts.vip || 0) / totalUsers) * 100).toFixed(1))
            : 0,
        color: '#9c27b0',
      },
    ];

    // 5. YTD progression for KPI trendlines (Jan through current month)
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0 = Jan, 11 = Dec
    const ytdMonths: string[] = [];
    const ytdTotalPoints: number[] = [];
    const ytdPaidPoints: number[] = [];
    const ytdFreePoints: number[] = [];
    const ytdAdminPoints: number[] = [];

    for (let m = 0; m <= currentMonth; m++) {
      const monthEnd = new Date(Date.UTC(currentYear, m + 1, 0, 23, 59, 59, 999));
      const monthLabel = new Date(Date.UTC(currentYear, m, 1)).toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      });
      ytdMonths.push(monthLabel);

      let mTotal = 0;
      let mPaid = 0;
      let mFree = 0;
      let mAdmin = 0;

      for (const u of users) {
        const created = new Date(u.createdAt);
        if (created <= monthEnd) {
          mTotal++;
          if (u.role === 'admin' || u.role === 'superadmin') {
            mAdmin++;
          }
          if ((u.subscription.tier === 'plus' || u.subscription.tier === 'elite') && u.subscription.status === 'active') {
            mPaid++;
          } else {
            mFree++;
          }
        }
      }

      ytdTotalPoints.push(mTotal);
      ytdPaidPoints.push(mPaid);
      ytdFreePoints.push(mFree);
      ytdAdminPoints.push(mAdmin);
    }

    const ytdProgression = {
      months: ytdMonths,
      totalUsers: ytdTotalPoints,
      paidUsers: ytdPaidPoints,
      freeUsers: ytdFreePoints,
      adminUsers: ytdAdminPoints,
    };

    const acquisitionStats = await getConsoleAcquisitionStats('30d');

    return {
      users,
      kpis: {
        totalUsers,
        paidCount,
        paidConversionRate,
        freeCount,
        annualCount,
        adminCount,
        totalPushDevices,
        totalPositionsHeld,
        ytdProgression,
      },
      cohorts,
      tierDistribution,
      acquisitionStats,
    };
  } catch (err) {
    console.error('[getConsoleUsersPageData] Error:', err);
    const fallbackAcquisition = await getConsoleAcquisitionStats('30d').catch(() => ({
      microKpis: {
        totalSessions: 0,
        uniqueUsers: 0,
        topChannel: { name: 'Direct Access', sharePct: 0 },
        topGovernorate: { name: 'Cairo Governorate', userCount: 0 },
        mobileSharePct: 0,
      },
      geoDistribution: { countries: [] },
      channels: [],
      devices: { formFactors: [], operatingSystems: [], clientPlatforms: [] },
      platformActivity: { daily: [], monthly: [], hourly: [] },
      activeUsersTrend: [],
    }));

    return {
      users: [],
      kpis: {
        totalUsers: 0,
        paidCount: 0,
        paidConversionRate: 0,
        freeCount: 0,
        annualCount: 0,
        adminCount: 0,
        totalPushDevices: 0,
        totalPositionsHeld: 0,
        ytdProgression: {
          months: [],
          totalUsers: [],
          paidUsers: [],
          freeUsers: [],
          adminUsers: [],
        },
      },
      cohorts: [],
      tierDistribution: [],
      acquisitionStats: fallbackAcquisition,
    };
  }
}

/**
 * Legacy compatibility wrapper for getConsoleUsersList
 */
export async function getConsoleUsersList() {
  const data = await getConsoleUsersPageData();
  return data.users;
}

/**
 * 3. Deep-Dive Single User Details for Support Drawer
 */
export async function getConsoleUserDetail(userId: string) {
  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (!profile) return null;

    let accounts: any[] = [];
    try {
      accounts = await db
        .select()
        .from(userBankAccounts)
        .where(eq(userBankAccounts.userId, userId));
    } catch (err) {
      console.error('[getConsoleUserDetail] Bank accounts query error:', err);
    }

    let userPositions: any[] = [];
    try {
      userPositions = await db
        .select()
        .from(positions)
        .where(eq(positions.userId, userId))
        .limit(20);
    } catch (err) {
      console.error('[getConsoleUserDetail] Positions query error:', err);
    }

    let tokens: any[] = [];
    try {
      tokens = await db
        .select()
        .from(devicePushTokens)
        .where(eq(devicePushTokens.userId, userId));
    } catch (err) {
      console.error('[getConsoleUserDetail] Tokens query error:', err);
    }

    let settings: any[] = [];
    try {
      settings = await db
        .select()
        .from(userStrategySettings)
        .where(eq(userStrategySettings.userId, userId));
    } catch (err) {
      console.error('[getConsoleUserDetail] Settings query error:', err);
    }

    let subscription: any = null;
    try {
      const subs = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1);
      subscription = subs[0] || null;
    } catch (err) {
      console.error('[getConsoleUserDetail] Subscriptions query error:', err);
    }

    return {
      profile: {
        ...profile,
        createdAt: profile.createdAt ? profile.createdAt.toISOString() : new Date().toISOString(),
      },
      subscription: subscription
        ? {
            ...subscription,
            currentPeriodStart: subscription.currentPeriodStart ? subscription.currentPeriodStart.toISOString() : new Date().toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : new Date().toISOString(),
            createdAt: subscription.createdAt ? subscription.createdAt.toISOString() : new Date().toISOString(),
          }
        : null,
      bankAccounts: accounts.map((acc) => ({
        ...acc,
        balance: Number(acc.balance || 0),
      })),
      positions: userPositions.map((pos) => ({
        ...pos,
        quantity: Number(pos.quantity || 0),
        entryPrice: Number(pos.entryPrice || 0),
      })),
      pushTokens: tokens.map((tok) => ({
        id: tok.id,
        platform: tok.platform || 'web',
        deviceModel: tok.deviceModel,
        createdAt: tok.createdAt ? tok.createdAt.toISOString() : '',
      })),
      strategySettings: settings,
    };
  } catch (err) {
    console.error('[getConsoleUserDetail] Error:', err);
    return null;
  }
}

export interface SubscriptionItemEnriched {
  id: number;
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  tier: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: string;
  priceEgp: number;
  billingCycle: 'monthly' | 'annual' | 'free' | 'custom';
  daysRemaining: number;
  positionsCount: number;
  alertsCount: number;
  pushDevicesCount: number;
  createdAt?: string;
}

export interface ConsoleSubscriptionsPageData {
  subscriptions: SubscriptionItemEnriched[];
  kpis: {
    mrr: number;
    arr: number;
    activePaidSeats: number;
    totalFreeMembers: number;
    arpuPaid: number;
    annualSeats: number;
    annualMixPct: number;
    expiring7dCount: number;
    expiring30dCount: number;
    churnRiskCount: number;
    totalLedgerRecords: number;
    ytdProgression?: {
      months: string[];
      mrr: number[];
      arr: number[];
      activePaidSeats: number[];
      arpuPaid: number[];
      annualSeats: number[];
    };
  };
  tierSummary: {
    tier: string;
    name: string;
    description?: string | null;
    monthlyPriceEgp: number;
    annualPriceEgp: number;
    annualDiscountPct?: number;
    badge?: string | null;
    activeSeats: number;
    mrrContribution: number;
    revenueSharePct: number;
    color: string;
    badgeColor: 'blue' | 'emerald' | 'purple' | 'zinc';
    features: string[];
    limits?: PlanLimits;
    planFeatures?: PlanFeatures;
  }[];
  renewalPipeline: {
    expiring7d: SubscriptionItemEnriched[];
    expiring30d: SubscriptionItemEnriched[];
    churnRisk: SubscriptionItemEnriched[];
  };
}

/**
 * 4. Subscriptions Page Query - Full Commercial Page Data
 */
export async function getConsoleSubscriptionsPageData(): Promise<ConsoleSubscriptionsPageData> {
  const now = new Date();

  try {
    // 1. Fetch all subscription records joined with user profiles
    const rawSubs = await db
      .select({
        id: userSubscriptions.id,
        userId: userSubscriptions.userId,
        tier: userSubscriptions.tier,
        status: userSubscriptions.status,
        currentPeriodStart: userSubscriptions.currentPeriodStart,
        currentPeriodEnd: userSubscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
        provider: userSubscriptions.provider,
        createdAt: userSubscriptions.createdAt,
        userEmail: profiles.email,
        userName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        userRole: profiles.role,
      })
      .from(userSubscriptions)
      .leftJoin(profiles, eq(userSubscriptions.userId, profiles.id))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(200);

    // 2. Fetch total count of user profiles for free tier calculation
    let totalProfilesCount = 0;
    try {
      const pCountRes = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(profiles);
      totalProfilesCount = pCountRes[0]?.count ?? 0;
    } catch (e) {
      console.error('[getConsoleSubscriptionsPageData] Failed profiles count:', e);
    }

    // 3. User IDs for telemetry
    const userIds = rawSubs.map((s) => s.userId).filter(Boolean);

    let devPush: { userId: string | null; count: number }[] = [];
    let webPush: { userId: string; count: number }[] = [];
    let posCounts: { userId: string; count: number }[] = [];
    let alertCounts: { userId: string; count: number }[] = [];

    if (userIds.length > 0) {
      try {
        devPush = await db
          .select({ userId: devicePushTokens.userId, count: sql<number>`count(*)::int` })
          .from(devicePushTokens)
          .where(sql`${devicePushTokens.userId} IN ${userIds}`)
          .groupBy(devicePushTokens.userId);
      } catch (e) {
        console.error('[getConsoleSubscriptionsPageData] Failed dev push:', e);
      }

      try {
        webPush = await db
          .select({ userId: pushSubscriptions.userId, count: sql<number>`count(*)::int` })
          .from(pushSubscriptions)
          .where(sql`${pushSubscriptions.userId} IN ${userIds}`)
          .groupBy(pushSubscriptions.userId);
      } catch (e) {
        console.error('[getConsoleSubscriptionsPageData] Failed web push:', e);
      }

      try {
        posCounts = await db
          .select({ userId: positions.userId, count: sql<number>`count(*)::int` })
          .from(positions)
          .where(sql`${positions.userId} IN ${userIds}`)
          .groupBy(positions.userId);
      } catch (e) {
        console.error('[getConsoleSubscriptionsPageData] Failed pos count:', e);
      }

      try {
        alertCounts = await db
          .select({ userId: tickerAlerts.userId, count: sql<number>`count(*)::int` })
          .from(tickerAlerts)
          .where(sql`${tickerAlerts.userId} IN ${userIds}`)
          .groupBy(tickerAlerts.userId);
      } catch (e) {
        console.error('[getConsoleSubscriptionsPageData] Failed alerts count:', e);
      }
    }

    const pushMap = new Map<string, number>();
    devPush.forEach((d) => d.userId && pushMap.set(d.userId, (pushMap.get(d.userId) || 0) + d.count));
    webPush.forEach((w) => pushMap.set(w.userId, (pushMap.get(w.userId) || 0) + w.count));

    const posMap = new Map<string, number>();
    posCounts.forEach((p) => posMap.set(p.userId, p.count));

    const alertMap = new Map<string, number>();
    alertCounts.forEach((a) => alertMap.set(a.userId, a.count));

    // 4. Enrich subscriptions
    const subscriptions: SubscriptionItemEnriched[] = rawSubs.map((r) => {
      const periodEnd = r.currentPeriodEnd ? new Date(r.currentPeriodEnd) : now;
      const periodStart = r.currentPeriodStart ? new Date(r.currentPeriodStart) : now;
      const diffMs = periodEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const tierClean = r.tier || 'free';
      const priceEgp = TIER_PRICES_EGP[tierClean] ?? (tierClean === 'free' ? 0 : 299);
      const billingCycle: SubscriptionItemEnriched['billingCycle'] =
        tierClean === 'pro_annual' ? 'annual' : tierClean === 'free' ? 'free' : 'monthly';

      const rawProv = (r.provider || 'card').toLowerCase();
      const providerClean = rawProv.includes('stripe') ? 'card' : rawProv;

      return {
        id: r.id,
        userId: r.userId,
        email: r.userEmail,
        fullName: r.userName || (r.userEmail ? r.userEmail.split('@')[0] : 'Member'),
        avatarUrl: r.avatarUrl,
        role: r.userRole || 'user',
        tier: tierClean,
        status: r.status || 'active',
        currentPeriodStart: periodStart.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAtPeriodEnd: Boolean(r.cancelAtPeriodEnd),
        provider: providerClean,
        priceEgp,
        billingCycle,
        daysRemaining,
        positionsCount: posMap.get(r.userId) || 0,
        alertsCount: alertMap.get(r.userId) || 0,
        pushDevicesCount: pushMap.get(r.userId) || 0,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : periodStart.toISOString(),
      };
    });

    // Ensure all registered profiles appear in ledger (unmonetized as free members)
    try {
      const allProfilesList = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
      const assignedUserIds = new Set(subscriptions.map((s) => s.userId));
      for (const p of allProfilesList) {
        if (!assignedUserIds.has(p.id)) {
          subscriptions.push({
            id: -1,
            userId: p.id,
            email: p.email,
            fullName: p.fullName || (p.email ? p.email.split('@')[0] : 'Member'),
            avatarUrl: p.avatarUrl,
            role: p.role || 'user',
            tier: 'free',
            status: 'active',
            currentPeriodStart: p.createdAt ? new Date(p.createdAt).toISOString() : now.toISOString(),
            currentPeriodEnd: p.createdAt ? new Date(p.createdAt).toISOString() : now.toISOString(),
            cancelAtPeriodEnd: false,
            provider: 'direct',
            priceEgp: 0,
            billingCycle: 'free',
            daysRemaining: 0,
            positionsCount: posMap.get(p.id) || 0,
            alertsCount: alertMap.get(p.id) || 0,
            pushDevicesCount: pushMap.get(p.id) || 0,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : now.toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('[getConsoleSubscriptionsPageData] Failed unassigned profiles merge:', e);
    }

    // 5. Aggregate KPIs
    const activePaidSubs = subscriptions.filter(
      (s) => s.status.toLowerCase() === 'active' && s.tier !== 'free' && s.tier !== 'vip'
    );
    const mrr = activePaidSubs.reduce((sum, s) => sum + s.priceEgp, 0);
    const arr = mrr * 12;
    const activePaidSeats = activePaidSubs.length;
    const arpuPaid = activePaidSeats > 0 ? Math.round(mrr / activePaidSeats) : 0;
    const annualSeats = activePaidSubs.filter(
      (s) => s.billingCycle === 'annual' || s.tier.includes('annual')
    ).length;
    const annualMixPct =
      activePaidSeats > 0 ? Number(((annualSeats / activePaidSeats) * 100).toFixed(1)) : 0;
    const totalFreeMembers = Math.max(0, totalProfilesCount - activePaidSeats);

    // 6. Renewal Pipeline
    const expiring7d = activePaidSubs.filter((s) => s.daysRemaining <= 7);
    const expiring30d = activePaidSubs.filter(
      (s) => s.daysRemaining > 7 && s.daysRemaining <= 30
    );
    const churnRisk = activePaidSubs.filter(
      (s) => s.cancelAtPeriodEnd || s.daysRemaining <= 7
    );

    // 7. Dynamic Centralized Tier Summary Breakdown
    const plans = await getSubscriptionPlans();

    const planCounts: Record<string, { seats: number; mrr: number }> = {
      free: { seats: 0, mrr: 0 },
      plus: { seats: 0, mrr: 0 },
      elite: { seats: 0, mrr: 0 },
      vip: { seats: 0, mrr: 0 },
    };

    subscriptions.forEach((s) => {
      if (s.status.toLowerCase() !== 'active') return;
      let t = (s.tier || 'free').toLowerCase();
      if (t === 'pro_monthly' || t === 'pro_annual' || t === 'pro') t = 'plus';
      if (!planCounts[t]) planCounts[t] = { seats: 0, mrr: 0 };
      planCounts[t].seats += 1;
      if (t !== 'free' && t !== 'vip') {
        planCounts[t].mrr += s.priceEgp;
      }
    });

    // Unassigned active profiles default to free
    const assignedSeats = Object.values(planCounts).reduce((acc, c) => acc + c.seats, 0);
    planCounts.free.seats += Math.max(0, totalProfilesCount - assignedSeats);

    const tierSummary: ConsoleSubscriptionsPageData['tierSummary'] = plans.map((plan) => {
      const counts = planCounts[plan.id] || { seats: 0, mrr: 0 };
      const mrrContribution = counts.mrr;
      const revenueSharePct = mrr > 0 ? Number(((mrrContribution / mrr) * 100).toFixed(1)) : 0;

      const badgeColor: 'blue' | 'emerald' | 'purple' | 'zinc' =
        plan.id === 'plus'
          ? 'blue'
          : plan.id === 'elite'
          ? 'emerald'
          : plan.id === 'vip'
          ? 'purple'
          : 'zinc';

      // Build feature bullets from limits and flags
      const featureList: string[] = [];
      if (plan.limits.chartsPerTab) featureList.push(`${plan.limits.chartsPerTab} charts per layout`);
      if (plan.limits.indicatorsPerChart) featureList.push(`${plan.limits.indicatorsPerChart} indicators per chart`);
      if (plan.limits.historicalBars) featureList.push(`${(plan.limits.historicalBars / 1000).toFixed(0)}K historical bars`);
      if (plan.limits.priceAlerts === -1) featureList.push('Unlimited price alerts');
      else if (plan.limits.priceAlerts > 0) featureList.push(`${plan.limits.priceAlerts} price alerts`);
      else featureList.push('0 price alerts');
      if (plan.limits.pushAlerts === -1) featureList.push('Unlimited push & Telegram alerts');
      else if (plan.limits.pushAlerts > 0) featureList.push(`${plan.limits.pushAlerts} push & Telegram alerts`);
      if (plan.features.breakoutDetection === 'multi_timeframe') featureList.push('Multi-timeframe breakout engine');
      else if (plan.features.breakoutDetection === 'intraday') featureList.push('Intraday breakout alerts');
      if (plan.features.hydraIndicator) featureList.push('Hydra Adaptive Momentum');
      if (plan.features.typhoonEngine) featureList.push('Typhoon Volume Engine');
      if (plan.features.cerberusConfluence) featureList.push('Cerberus Confluence');

      return {
        tier: plan.id,
        name: plan.name,
        description: plan.description,
        monthlyPriceEgp: plan.monthlyPriceEgp,
        annualPriceEgp: plan.annualPriceEgp,
        annualDiscountPct: plan.annualDiscountPct,
        badge: plan.badge,
        badgeColor,
        activeSeats: counts.seats,
        mrrContribution,
        revenueSharePct,
        color: plan.color,
        features: featureList,
        limits: plan.limits,
        planFeatures: plan.features,
      };
    });

    // 8. Calculate YTD Progression
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0 to 11
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ytdMonths = monthNames.slice(0, currentMonthIdx + 1);

    const ytdMrr: number[] = [];
    const ytdArr: number[] = [];
    const ytdActivePaidSeats: number[] = [];
    const ytdArpuPaid: number[] = [];
    const ytdAnnualSeats: number[] = [];

    for (let m = 0; m <= currentMonthIdx; m++) {
      const endOfMonth = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);
      const subsAsOfDate = subscriptions.filter((s) => {
        const cDate = s.createdAt ? new Date(s.createdAt) : new Date(s.currentPeriodStart);
        return cDate <= endOfMonth;
      });

      const paidSubsAsOf = subsAsOfDate.filter(
        (s) => s.status.toLowerCase() === 'active' && s.tier !== 'free' && s.tier !== 'vip'
      );
      const mVal = paidSubsAsOf.reduce((sum, s) => sum + s.priceEgp, 0);
      const aVal = mVal * 12;
      const seatsVal = paidSubsAsOf.length;
      const arpuVal = seatsVal > 0 ? Math.round(mVal / seatsVal) : 0;
      const annualVal = paidSubsAsOf.filter(
        (s) => s.billingCycle === 'annual' || s.tier.includes('annual')
      ).length;

      ytdMrr.push(mVal);
      ytdArr.push(aVal);
      ytdActivePaidSeats.push(seatsVal);
      ytdArpuPaid.push(arpuVal);
      ytdAnnualSeats.push(annualVal);
    }

    return {
      subscriptions,
      kpis: {
        mrr,
        arr,
        activePaidSeats,
        totalFreeMembers,
        arpuPaid,
        annualSeats,
        annualMixPct,
        expiring7dCount: expiring7d.length,
        expiring30dCount: expiring30d.length,
        churnRiskCount: churnRisk.length,
        totalLedgerRecords: subscriptions.length,
        ytdProgression: {
          months: ytdMonths,
          mrr: ytdMrr,
          arr: ytdArr,
          activePaidSeats: ytdActivePaidSeats,
          arpuPaid: ytdArpuPaid,
          annualSeats: ytdAnnualSeats,
        },
      },
      tierSummary,
      renewalPipeline: {
        expiring7d,
        expiring30d,
        churnRisk,
      },
    };
  } catch (err) {
    console.error('[getConsoleSubscriptionsPageData] Error:', err);
    return {
      subscriptions: [],
      kpis: {
        mrr: 0,
        arr: 0,
        activePaidSeats: 0,
        totalFreeMembers: 0,
        arpuPaid: 0,
        annualSeats: 0,
        annualMixPct: 0,
        expiring7dCount: 0,
        expiring30dCount: 0,
        churnRiskCount: 0,
        totalLedgerRecords: 0,
      },
      tierSummary: [],
      renewalPipeline: {
        expiring7d: [],
        expiring30d: [],
        churnRisk: [],
      },
    };
  }
}

/**
 * Subscriptions Ledger List - Backward-compatible wrapper
 */
export async function getConsoleSubscriptionsList() {
  const data = await getConsoleSubscriptionsPageData();
  return data.subscriptions.map((s) => ({
    id: s.id,
    userId: s.userId,
    tier: s.tier,
    status: s.status,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    provider: s.provider,
    userEmail: s.email,
    userName: s.fullName,
    userRole: s.role,
    priceEgp: s.priceEgp,
  }));
}

/**
 * 5. Quant Signals & Market Operations Stats
 */
export interface TickerFeedItem {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  currency: string;
  logoUrl: string | null;
  latestDate: string | null;
  latestClose: number | null;
  isSynced: boolean;
}

export interface CronJobItem {
  id: string;
  name: string;
  source: string;
  desc: string;
  schedule: string;
  category: 'market_data' | 'quant_engine' | 'watchdog';
}

export interface SystemLogItem {
  id: number;
  level: string;
  source: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string | null;
  metadata?: unknown;
  createdAt: string;
}

export interface ConsoleOperationsPageData {
  feeds: {
    totalTickers: number;
    syncedTickersCount: number;
    staleTickersCount: number;
    syncRatePct: number;
    tickers: TickerFeedItem[];
    strategyBreakdown: {
      strategy: string | null;
      signal: string;
      count: number;
    }[];
  };
  crons: CronJobItem[];
  diagnostics: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    systemLogs: SystemLogItem[];
  };
  audit: {
    totalAudits: number;
    auditLogs: AuditLogItem[];
  };
}

const CONSOLE_CRON_JOBS: CronJobItem[] = [
  {
    id: 'update-stocks',
    name: 'Stocks Ingestion',
    source: 'cron:update-stocks',
    schedule: 'Weekdays 15:30 Cairo (EOD)',
    desc: 'Syncs daily bars, OHLCV, market turnover, and company sector changes from TradingView & EGX.',
    category: 'market_data',
  },
  {
    id: 'process-signals',
    name: 'Signal Processor',
    source: 'cron:process-signals',
    schedule: 'Weekdays 16:00 Cairo',
    desc: 'Computes multi-factor indicators (Champion, PSI, Momentum Breakout) and dispatches user alerts.',
    category: 'quant_engine',
  },
  {
    id: 'update-funds',
    name: 'Mutual Funds NAV',
    source: 'cron:update-funds',
    schedule: 'Daily 20:00 Cairo',
    desc: 'Fetches net asset valuations and performance tables for Egyptian mutual investment funds.',
    category: 'market_data',
  },
  {
    id: 'update-commodities',
    name: 'Commodities & Macro',
    source: 'cron:update-commodities',
    schedule: 'Every 30 Mins (Market Hours)',
    desc: 'Syncs Gold 24k/21k (EGP/g), Silver, and USD/EGP official and parallel FX benchmarks.',
    category: 'market_data',
  },
  {
    id: 'watchdog',
    name: 'Market Watchdog',
    source: 'cron:watchdog',
    schedule: 'Hourly Health Check',
    desc: 'Health watchdog that detects stalled ingestion workers, schema locks, or missed cron intervals.',
    category: 'watchdog',
  },
];

/**
 * 5. Unified Operations Portal Query (Feeds, Crons, Diagnostics, Audit)
 */
export async function getConsoleOperationsPageData(): Promise<ConsoleOperationsPageData> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  // 1. Tickers and market prices
  let allTickers: any[] = [];
  try {
    allTickers = await db
      .select({
        symbol: tickers.symbol,
        companyName: tickers.companyName,
        sector: tickers.sector,
        currency: tickers.currency,
        logoUrl: tickers.logoUrl,
      })
      .from(tickers)
      .limit(150);
  } catch (err) {
    console.error('[getConsoleOperationsPageData] Tickers query error:', err);
  }

  const barsMap = new Map<string, { latestDate: string; close: string }>();
  try {
    const latestBars = await db
      .select({
        tickerSymbol: dailyPrices.tickerSymbol,
        latestDate: sql<string>`MAX(${dailyPrices.date})`,
        latestClose: sql<string>`(ARRAY_AGG(${dailyPrices.close} ORDER BY ${dailyPrices.date} DESC))[1]`,
      })
      .from(dailyPrices)
      .groupBy(dailyPrices.tickerSymbol);

    for (const bar of latestBars) {
      barsMap.set(bar.tickerSymbol, {
        latestDate: String(bar.latestDate),
        close: String(bar.latestClose || '0'),
      });
    }
  } catch (err) {
    console.error('[getConsoleOperationsPageData] Daily prices query error:', err);
  }

  let recentSignals: any[] = [];
  try {
    recentSignals = await db
      .select({
        strategy: signalNotifications.strategy,
        signal: signalNotifications.signal,
        count: sql<number>`count(*)::int`,
      })
      .from(signalNotifications)
      .groupBy(signalNotifications.strategy, signalNotifications.signal);
  } catch (err) {
    console.error('[getConsoleOperationsPageData] Signals query error:', err);
  }

  let syncedCount = 0;
  const enrichedTickers: TickerFeedItem[] = allTickers.map((t) => {
    const bar = barsMap.get(t.symbol);
    const hasRecentDate = bar?.latestDate ? new Date(bar.latestDate) >= fiveDaysAgo : false;
    if (hasRecentDate) syncedCount++;

    return {
      symbol: t.symbol,
      companyName: t.companyName,
      sector: t.sector,
      currency: t.currency,
      logoUrl: t.logoUrl,
      latestDate: bar?.latestDate ?? null,
      latestClose: bar?.close ? parseFloat(bar.close) : null,
      isSynced: hasRecentDate,
    };
  });

  const totalTickers = enrichedTickers.length;
  const staleCount = Math.max(0, totalTickers - syncedCount);
  const syncRatePct = totalTickers > 0 ? Number(((syncedCount / totalTickers) * 100).toFixed(1)) : 0;

  // 2. Diagnostics & System Logs
  let rawSystemLogs: any[] = [];
  try {
    rawSystemLogs = await db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(100);
  } catch (err) {
    console.error('[getConsoleOperationsPageData] System logs query error:', err);
  }

  const systemLogsList: SystemLogItem[] = rawSystemLogs.map((l) => ({
    id: l.id,
    level: l.level || 'INFO',
    source: l.source || 'system',
    message: l.message || '',
    metadata: l.metadata,
    createdAt: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
  }));

  const errorCount = systemLogsList.filter((l) => l.level.toUpperCase() === 'ERROR').length;
  const warnCount = systemLogsList.filter((l) => l.level.toUpperCase() === 'WARN').length;
  const infoCount = systemLogsList.filter((l) => l.level.toUpperCase() === 'INFO').length;

  // 3. Security & Audit Logs
  let rawAudits: any[] = [];
  try {
    rawAudits = await db
      .select({
        id: auditLogs.id,
        adminId: auditLogs.adminId,
        action: auditLogs.action,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        adminEmail: profiles.email,
      })
      .from(auditLogs)
      .leftJoin(profiles, eq(auditLogs.adminId, profiles.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
  } catch (err) {
    console.error('[getConsoleOperationsPageData] Audit logs query error:', err);
  }

  const auditLogsList: AuditLogItem[] = rawAudits.map((a) => ({
    id: a.id,
    adminId: a.adminId,
    adminEmail: a.adminEmail || 'Admin',
    action: a.action,
    targetId: a.targetId,
    metadata: a.metadata,
    createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
  }));

  return {
    feeds: {
      totalTickers,
      syncedTickersCount: syncedCount,
      staleTickersCount: staleCount,
      syncRatePct,
      tickers: enrichedTickers,
      strategyBreakdown: recentSignals,
    },
    crons: CONSOLE_CRON_JOBS,
    diagnostics: {
      totalLogs: systemLogsList.length,
      errorCount,
      warnCount,
      infoCount,
      systemLogs: systemLogsList,
    },
    audit: {
      totalAudits: auditLogsList.length,
      auditLogs: auditLogsList,
    },
  };
}

/**
 * Legacy Quant Signals wrapper
 */
export async function getConsoleSignalsStats() {
  const data = await getConsoleOperationsPageData();
  return {
    totalTickers: data.feeds.totalTickers,
    tickers: data.feeds.tickers,
    strategyBreakdown: data.feeds.strategyBreakdown,
  };
}

/**
 * 6. System & Cron Logs Query
 */
export async function getConsoleLogsData(params?: {
  level?: string;
  source?: string;
  search?: string;
  limit?: number;
}) {
  const { level, source, search, limit = 100 } = params || {};

  try {
    const query = db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit);

    const conditions = [];
    if (level && level !== 'ALL') {
      conditions.push(eq(systemLogs.level, level.toUpperCase()));
    }
    if (source && source !== 'ALL') {
      conditions.push(eq(systemLogs.source, source));
    }
    if (search && search.trim()) {
      conditions.push(ilike(systemLogs.message, `%${search.trim()}%`));
    }

    let logs: any[] = [];
    try {
      logs = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    } catch (err) {
      console.error('[getConsoleLogsData] System logs query error:', err);
    }

    // Audit Logs query
    let auditEntries: any[] = [];
    try {
      auditEntries = await db
        .select({
          id: auditLogs.id,
          adminId: auditLogs.adminId,
          action: auditLogs.action,
          targetId: auditLogs.targetId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          adminEmail: profiles.email,
        })
        .from(auditLogs)
        .leftJoin(profiles, eq(auditLogs.adminId, profiles.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);
    } catch (err) {
      console.error('[getConsoleLogsData] Audit logs query error:', err);
    }

    return {
      systemLogs: logs.map((l) => ({
        id: l.id,
        level: l.level,
        source: l.source,
        message: l.message,
        metadata: l.metadata,
        createdAt: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
      })),
      auditLogs: auditEntries.map((a) => ({
        id: a.id,
        adminId: a.adminId,
        adminEmail: a.adminEmail || 'Admin',
        action: a.action,
        targetId: a.targetId,
        metadata: a.metadata,
        createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
      })),
    };
  } catch (err) {
    console.error('[getConsoleLogsData] Error:', err);
    return {
      systemLogs: [],
      auditLogs: [],
    };
  }
}

export interface ConsoleAcquisitionStats {
  microKpis: {
    totalSessions: number;
    uniqueUsers: number;
    topChannel: { name: string; sharePct: number };
    topGovernorate: { name: string; userCount: number };
    mobileSharePct: number;
  };
  geoDistribution: {
    totalSessions?: number;
    totalUniqueUsers?: number;
    countries: {
      code: string;
      name: string;
      count: number;
      lat: number;
      lng: number;
      cities: {
        name: string;
        region: string;
        count: number;
        sessionCount: number;
        userCount: number;
        lat: number;
        lng: number;
        adRadiusKm: number;
        userProfiles?: { name: string; email: string; avatarUrl: string | null }[];
      }[];
    }[];
  };
  channels: {
    id: string;
    label: string;
    count: number;
    uniqueUsers: number;
    percentage: number;
    paidConversions: number;
    conversionRate: number;
    color: string;
  }[];
  devices: {
    formFactors: { name: string; count: number; userCount: number; percentage: number }[];
    operatingSystems: { name: string; count: number; userCount: number; percentage: number }[];
    clientPlatforms: { name: string; count: number; userCount: number; percentage: number }[];
  };
  platformActivity: {
    daily: {
      date: string;
      label: string;
      sessions: number;
      users: number;
    }[];
    monthly: {
      month: string;
      label: string;
      sessions: number;
      users: number;
    }[];
    hourly: {
      hour: number;
      label: string;
      sessions: number;
      users: number;
    }[];
  };
  activeUsersTrend: {
    date: string;
    label: string;
    activeUsers: number;
    sessions: number;
  }[];
}

export async function getConsoleAcquisitionStats(
  timeframe: '30d' | '90d' | '120d' | 'ytd' | 'custom' = '30d',
  customStart?: string,
  customEnd?: string
): Promise<ConsoleAcquisitionStats> {
  // 1. Ensure baseline seeding exists
  await ensureBaselineTelemetrySeeded();

  const now = new Date();
  let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (timeframe === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (timeframe === '120d') {
    startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
  } else if (timeframe === 'ytd') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (timeframe === 'custom' && customStart) {
    const s = new Date(customStart);
    if (!isNaN(s.getTime())) startDate = s;
    if (customEnd) {
      const e = new Date(customEnd);
      if (!isNaN(e.getTime())) endDate = new Date(e.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  try {
    // 2. Fetch telemetry events within timeframe
    const events = await db
      .select()
      .from(userTelemetryEvents)
      .where(
        and(
          gte(userTelemetryEvents.createdAt, startDate),
          lte(userTelemetryEvents.createdAt, endDate)
        )
      )
      .orderBy(asc(userTelemetryEvents.createdAt));

    // 3. Fetch paid user IDs for conversion calculations
    const [paidSubs, allProfiles] = await Promise.all([
      db
        .select({ userId: userSubscriptions.userId })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.status, 'active'),
            or(
              eq(userSubscriptions.tier, 'plus'),
              eq(userSubscriptions.tier, 'elite'),
              eq(userSubscriptions.tier, 'pro_monthly'),
              eq(userSubscriptions.tier, 'pro_annual')
            )
          )
        )
        .catch(() => []),
      db.select().from(profiles).catch(() => []),
    ]);
    const paidUserIds = new Set(paidSubs.map((s) => s.userId).filter(Boolean));
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const uniqueSessionIds = new Set<string>();
    const verifiedUserIdentities = new Set<string>();
    const mobileSessionIds = new Set<string>();

    // 4. Geolocation Aggregation
    const countryMap = new Map<
      string,
      {
        name: string;
        code: string;
        sessionIds: Set<string>;
        lat: number;
        lng: number;
        cities: Map<
          string,
          {
            name: string;
            region: string;
            sessionIds: Set<string>;
            lat: number;
            lng: number;
            adRadiusKm: number;
            userProfiles: Map<string, { name: string; email: string; avatarUrl: string | null }>;
          }
        >;
      }
    >();

    // 5. Channel Aggregation
    const channelMap = new Map<
      string,
      { sessionIds: Set<string>; uniqueUsers: Set<string>; paidUsers: Set<string> }
    >();

    // 6. Device Demographics Aggregation
    const formFactorMap = new Map<string, { sessionIds: Set<string>; users: Set<string> }>();
    const osMap = new Map<string, { sessionIds: Set<string>; users: Set<string> }>();
    const platformMap = new Map<string, { sessionIds: Set<string>; users: Set<string> }>();

    // 7. Activity Trends (Daily, Monthly, Hourly)
    const dailyMap = new Map<
      string,
      { sessionIds: Set<string>; activeUsers: Set<string> }
    >();
    const monthlyMap = new Map<
      string,
      { sessionIds: Set<string>; activeUsers: Set<string> }
    >();
    const hourlyMap = new Map<
      number,
      { sessionIds: Set<string>; activeUsers: Set<string> }
    >();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { sessionIds: new Set(), activeUsers: new Set() });
    }

    for (const evt of events) {
      uniqueSessionIds.add(evt.sessionId);
      if (evt.userId) {
        verifiedUserIdentities.add(evt.userId);
      }

      if (evt.deviceType === 'mobile') {
        mobileSessionIds.add(evt.sessionId);
      }

      // Form Factor
      const ff = evt.deviceType || 'desktop';
      if (!formFactorMap.has(ff)) {
        formFactorMap.set(ff, { sessionIds: new Set(), users: new Set() });
      }
      const ffData = formFactorMap.get(ff)!;
      ffData.sessionIds.add(evt.sessionId);
      if (evt.userId) ffData.users.add(evt.userId);

      // OS
      const os = evt.os || 'Other';
      if (!osMap.has(os)) {
        osMap.set(os, { sessionIds: new Set(), users: new Set() });
      }
      const osData = osMap.get(os)!;
      osData.sessionIds.add(evt.sessionId);
      if (evt.userId) osData.users.add(evt.userId);

      // Client Platform
      const plat = evt.isPwaOrNative ? 'PWA / Native App' : 'Web Browser';
      if (!platformMap.has(plat)) {
        platformMap.set(plat, { sessionIds: new Set(), users: new Set() });
      }
      const platData = platformMap.get(plat)!;
      platData.sessionIds.add(evt.sessionId);
      if (evt.userId) platData.users.add(evt.userId);

      // Channel
      const ch = evt.channel || 'direct';
      if (!channelMap.has(ch)) {
        channelMap.set(ch, { sessionIds: new Set(), uniqueUsers: new Set(), paidUsers: new Set() });
      }
      const chData = channelMap.get(ch)!;
      chData.sessionIds.add(evt.sessionId);
      if (evt.userId) {
        chData.uniqueUsers.add(evt.userId);
        if (paidUserIds.has(evt.userId)) {
          chData.paidUsers.add(evt.userId);
        }
      }

      // Geo
      const cCode = evt.countryCode || 'EG';
      const cName = evt.country || 'Egypt';
      if (!countryMap.has(cCode)) {
        countryMap.set(cCode, {
          code: cCode,
          name: cName,
          sessionIds: new Set(),
          lat: parseFloat(evt.latitude || '30.044420') || 30.044420,
          lng: parseFloat(evt.longitude || '31.235712') || 31.235712,
          cities: new Map(),
        });
      }
      const cGroup = countryMap.get(cCode)!;
      cGroup.sessionIds.add(evt.sessionId);

      const cityName = evt.city || 'Cairo';
      const regionName = evt.regionOrGovernorate || 'Cairo Governorate';
      if (!cGroup.cities.has(cityName)) {
        // Suggested ad radius based on Egyptian urban density vs regional cities
        const radius =
          cityName.includes('Cairo') || cityName.includes('Giza') || cityName.includes('Maadi') || cityName.includes('Zayed')
            ? 25
            : cityName.includes('Alexandria')
            ? 15
            : 10;

        cGroup.cities.set(cityName, {
          name: cityName,
          region: regionName,
          sessionIds: new Set(),
          lat: parseFloat(evt.latitude || '30.044420') || 30.044420,
          lng: parseFloat(evt.longitude || '31.235712') || 31.235712,
          adRadiusKm: radius,
          userProfiles: new Map(),
        });
      }
      const cityObj = cGroup.cities.get(cityName)!;
      cityObj.sessionIds.add(evt.sessionId);
      if (evt.userId && profileMap.has(evt.userId)) {
        const p = profileMap.get(evt.userId)!;
        cityObj.userProfiles.set(p.id, {
          name: p.fullName || p.email || 'User',
          email: p.email || '',
          avatarUrl: p.avatarUrl || null,
        });
      }

      // Activity Trends (Daily, Monthly, Hourly)
      if (evt.createdAt) {
        const evtDate = new Date(evt.createdAt);

        // Daily
        const dayKey = evtDate.toISOString().slice(0, 10);
        if (!dailyMap.has(dayKey)) {
          dailyMap.set(dayKey, { sessionIds: new Set(), activeUsers: new Set() });
        }
        const dData = dailyMap.get(dayKey)!;
        dData.sessionIds.add(evt.sessionId);
        if (evt.userId) {
          dData.activeUsers.add(evt.userId);
        }

        // Monthly
        const monthKey = evtDate.toISOString().slice(0, 7);
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { sessionIds: new Set(), activeUsers: new Set() });
        }
        const mData = monthlyMap.get(monthKey)!;
        mData.sessionIds.add(evt.sessionId);
        if (evt.userId) {
          mData.activeUsers.add(evt.userId);
        }

        // Hourly (Cairo timezone)
        try {
          const cairoHour = parseInt(
            new Intl.DateTimeFormat('en-US', {
              timeZone: 'Africa/Cairo',
              hour: 'numeric',
              hourCycle: 'h23',
            }).format(evtDate),
            10
          );
          if (!isNaN(cairoHour) && hourlyMap.has(cairoHour)) {
            const hData = hourlyMap.get(cairoHour)!;
            hData.sessionIds.add(evt.sessionId);
            if (evt.userId) {
              hData.activeUsers.add(evt.userId);
            }
          }
        } catch {
          const fallbackHour = evtDate.getUTCHours();
          if (hourlyMap.has(fallbackHour)) {
            const hData = hourlyMap.get(fallbackHour)!;
            hData.sessionIds.add(evt.sessionId);
            if (evt.userId) {
              hData.activeUsers.add(evt.userId);
            }
          }
        }
      }
    }

    const totalSessions = uniqueSessionIds.size;
    const safeTotal = totalSessions || 1;
    const uniqueUsersCount = verifiedUserIdentities.size || (totalSessions > 0 ? 1 : 0);

    // Top Channel calculation
    let topChannelName = 'Direct Access';
    let topChannelCount = 0;
    channelMap.forEach((val, key) => {
      const sCount = val.sessionIds.size;
      if (sCount > topChannelCount) {
        topChannelCount = sCount;
        topChannelName = key;
      }
    });

    // Top Governorate calculation (by distinct verified users)
    let topGovName = 'Cairo Governorate';
    let topGovCount = 0;
    const egGroup = countryMap.get('EG');
    if (egGroup) {
      const govUsersMap = new Map<string, Set<string>>();
      egGroup.cities.forEach((city) => {
        const gov = city.region || city.name;
        if (!govUsersMap.has(gov)) govUsersMap.set(gov, new Set());
        city.userProfiles.forEach((_, userId) => {
          govUsersMap.get(gov)!.add(userId);
        });
      });
      govUsersMap.forEach((users, gov) => {
        if (users.size > topGovCount) {
          topGovCount = users.size;
          topGovName = gov;
        }
      });
      if (topGovCount === 0) {
        topGovCount = egGroup.cities.size > 0 ? 1 : 0;
      }
    }

    // Format Channels
    const CHANNEL_LABELS: Record<string, { label: string; color: string }> = {
      direct: { label: 'Direct Access', color: '#38bdf8' },
      linkedin: { label: 'LinkedIn Organic', color: '#0a66c2' },
      instagram: { label: 'Instagram Social', color: '#e1306c' },
      x_twitter: { label: 'X (Twitter)', color: '#ffffff' },
      facebook: { label: 'Facebook / Meta', color: '#1877f2' },
      google_organic: { label: 'Google Search', color: '#34a853' },
      google_cpc: { label: 'Google Paid Ads', color: '#fbbc05' },
      campaign: { label: 'Partner Campaigns', color: '#a855f7' },
      referral: { label: 'External Referrals', color: '#64748b' },
    };

    const channels = Array.from(channelMap.entries())
      .map(([id, data]) => {
        const meta = CHANNEL_LABELS[id] || {
          label: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          color: '#94a3b8',
        };
        const sCount = data.sessionIds.size;
        const percentage = Math.round((sCount / safeTotal) * 100);
        const paidCount = data.paidUsers.size;
        const uniqueCount = data.uniqueUsers.size || (sCount > 0 ? 1 : 0);
        const conversionRate = uniqueCount > 0 ? parseFloat(((paidCount / uniqueCount) * 100).toFixed(1)) : 0;
        return {
          id,
          label: meta.label,
          count: sCount,
          uniqueUsers: uniqueCount,
          percentage,
          paidConversions: paidCount,
          conversionRate,
          color: meta.color,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Format Geo Distribution
    const countries = Array.from(countryMap.values())
      .map((c) => ({
        code: c.code,
        name: c.name,
        count: c.sessionIds.size,
        lat: c.lat,
        lng: c.lng,
        cities: Array.from(c.cities.values())
          .map((city) => {
            const userProfilesArr = Array.from(city.userProfiles.values());
            const userCount = userProfilesArr.length || (city.sessionIds.size > 0 ? 1 : 0);
            return {
              name: city.name,
              region: city.region,
              count: city.sessionIds.size,
              sessionCount: city.sessionIds.size,
              userCount,
              lat: city.lat,
              lng: city.lng,
              adRadiusKm: city.adRadiusKm,
              userProfiles: userProfilesArr,
            };
          })
          .sort((a, b) => b.userCount - a.userCount || b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);

    // Format Devices
    const formFactors = Array.from(formFactorMap.entries())
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: data.sessionIds.size,
        userCount: data.users.size,
        percentage: Math.round((data.sessionIds.size / safeTotal) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const mobileCount = formFactorMap.get('mobile')?.sessionIds.size || 0;

    const operatingSystems = Array.from(osMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.sessionIds.size,
        userCount: data.users.size,
        percentage: Math.round((data.sessionIds.size / safeTotal) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const clientPlatforms = Array.from(platformMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.sessionIds.size,
        userCount: data.users.size,
        percentage: Math.round((data.sessionIds.size / safeTotal) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Format Daily Trend
    const dailyActivity = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const d = new Date(date);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date,
          label,
          sessions: data.sessionIds.size,
          users: data.activeUsers.size,
        };
      });

    // Format Monthly Trend
    const monthlyActivity = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1, 1));
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
        return {
          month,
          label,
          sessions: data.sessionIds.size,
          users: data.activeUsers.size,
        };
      });

    // Format Hourly Trend (0-23)
    const hourlyActivity = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, data]) => {
        const h12 =
          hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        return {
          hour,
          label: h12,
          sessions: data.sessionIds.size,
          users: data.activeUsers.size,
        };
      });

    // Legacy activeUsersTrend adapter
    const activeUsersTrend = dailyActivity.map((d) => ({
      date: d.date,
      label: d.label,
      activeUsers: d.users,
      sessions: d.sessions,
    }));

    return {
      microKpis: {
        totalSessions,
        uniqueUsers: uniqueUsersCount,
        topChannel: {
          name:
            CHANNEL_LABELS[topChannelName]?.label ||
            topChannelName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          sharePct: Math.round((topChannelCount / safeTotal) * 100),
        },
        topGovernorate: {
          name: topGovName,
          userCount: topGovCount,
        },
        mobileSharePct: Math.round((mobileCount / safeTotal) * 100),
      },
      geoDistribution: {
        totalSessions,
        totalUniqueUsers: uniqueUsersCount,
        countries,
      },
      channels,
      devices: {
        formFactors,
        operatingSystems,
        clientPlatforms,
      },
      platformActivity: {
        daily: dailyActivity,
        monthly: monthlyActivity,
        hourly: hourlyActivity,
      },
      activeUsersTrend,
    };
  } catch (err) {
    console.error('[getConsoleAcquisitionStats] Error:', err);
    return {
      microKpis: {
        totalSessions: 0,
        uniqueUsers: 0,
        topChannel: { name: 'Direct Access', sharePct: 0 },
        topGovernorate: { name: 'Cairo Governorate', userCount: 0 },
        mobileSharePct: 0,
      },
      geoDistribution: { countries: [] },
      channels: [],
      devices: { formFactors: [], operatingSystems: [], clientPlatforms: [] },
      platformActivity: { daily: [], monthly: [], hourly: [] },
      activeUsersTrend: [],
    };
  }
}
