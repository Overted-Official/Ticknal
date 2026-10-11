import { NextResponse } from 'next/server';
import { assertAdminUser } from '@/lib/server/admin-guard';
import { getSubscriptionPlans } from '@/lib/server/plans-service';
import { db } from '@/db';
import { userSubscriptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await assertAdminUser();

    const [plans, seatCounts] = await Promise.all([
      getSubscriptionPlans(),
      db
        .select({
          tier: userSubscriptions.tier,
          count: sql<number>`count(*)::int`,
        })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.status, 'active'))
        .groupBy(userSubscriptions.tier)
        .catch(() => []),
    ]);

    const seatsMap = new Map<string, number>();
    seatCounts.forEach((s) => {
      let t = (s.tier || '').toLowerCase();
      if (t === 'pro_monthly' || t === 'pro_annual' || t === 'pro') t = 'plus';
      seatsMap.set(t, (seatsMap.get(t) || 0) + s.count);
    });

    const enrichedPlans = plans.map((p) => ({
      ...p,
      activeSeats: seatsMap.get(p.id) || 0,
    }));

    return NextResponse.json({
      success: true,
      plans: enrichedPlans,
    });
  } catch (err: any) {
    const isAuth = err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch plans' },
      { status: isAuth ? 403 : 500 }
    );
  }
}
