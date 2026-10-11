import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAccessEntitlements, getSubscriptionPlanById } from '@/lib/server/plans-service';
import { CANONICAL_PLANS } from '@/lib/server/plans-seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Unauthenticated visitor -> default Free plan entitlements
      const freePlan = (await getSubscriptionPlanById('free')) || CANONICAL_PLANS[0];
      return NextResponse.json({
        success: true,
        tier: 'free',
        planName: freePlan.name,
        isPaid: false,
        limits: freePlan.limits,
        features: freePlan.features,
      });
    }

    const entitlements = await getUserAccessEntitlements(user.id);

    return NextResponse.json({
      success: true,
      tier: entitlements.tier,
      planName: entitlements.planName,
      status: entitlements.status,
      isPaid: entitlements.isPaid,
      limits: entitlements.limits,
      features: entitlements.features,
    });
  } catch (err: any) {
    console.error('Error fetching user entitlements:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch entitlements' },
      { status: 500 }
    );
  }
}
