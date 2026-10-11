import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { assertAdminUser, logAdminAction } from '@/lib/server/admin-guard';
import { updateSubscriptionPlan, getSubscriptionPlanById } from '@/lib/server/plans-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const planId = (id || '').toLowerCase();

    const { user } = await assertAdminUser();

    const existing = await getSubscriptionPlanById(planId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Plan '${planId}' does not exist.` },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const updates: Parameters<typeof updateSubscriptionPlan>[1] = {};
    if (typeof body.name === 'string') updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (typeof body.monthlyPriceEgp === 'number') updates.monthlyPriceEgp = Math.max(0, body.monthlyPriceEgp);
    if (typeof body.annualPriceEgp === 'number') updates.annualPriceEgp = Math.max(0, body.annualPriceEgp);
    if (typeof body.annualDiscountPct === 'number') updates.annualDiscountPct = Math.max(0, Math.min(100, body.annualDiscountPct));
    if (typeof body.badge === 'string') updates.badge = body.badge.trim();
    if (typeof body.color === 'string') updates.color = body.color.trim();

    if (body.limits && typeof body.limits === 'object') {
      updates.limits = body.limits;
    }

    if (body.features && typeof body.features === 'object') {
      updates.features = body.features;
    }

    const updatedPlan = await updateSubscriptionPlan(planId, updates);

    // Record privileged admin audit log
    await logAdminAction({
      adminId: user.id,
      action: 'subscription_plan.update',
      targetId: planId,
      metadata: {
        previous: {
          monthlyPriceEgp: existing.monthlyPriceEgp,
          annualPriceEgp: existing.annualPriceEgp,
          limits: existing.limits,
          features: existing.features,
        },
        updated: {
          monthlyPriceEgp: updatedPlan.monthlyPriceEgp,
          annualPriceEgp: updatedPlan.annualPriceEgp,
          limits: updatedPlan.limits,
          features: updatedPlan.features,
        },
      },
    });

    // Revalidate landing page and subscriptions console to reflect updates immediately
    try {
      revalidatePath('/');
      revalidatePath('/console/subscriptions');
    } catch {
      // ignore in environments without active cache context
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
    });
  } catch (err: any) {
    const isAuth = err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('FORBIDDEN');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update plan' },
      { status: isAuth ? 403 : 500 }
    );
  }
}
