import { db } from '@/db';
import { subscriptionPlans, userSubscriptions, profiles } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  ensureBaselinePlansSeeded,
  CANONICAL_PLANS,
  type PlanLimits,
  type PlanFeatures,
} from './plans-seed';

export type { PlanLimits, PlanFeatures };

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPriceEgp: number;
  annualPriceEgp: number;
  annualDiscountPct: number;
  badge: string | null;
  color: string;
  displayOrder: number;
  isActive: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  updatedAt: Date;
  createdAt: Date;
}

export interface UserAccessEntitlements {
  userId: string;
  tier: 'free' | 'plus' | 'elite' | 'vip';
  planName: string;
  status: 'active' | 'past_due' | 'canceled' | 'none';
  isPaid: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  // Ergonomic Access Check Helpers
  canCreateAlert: (currentCount: number) => boolean;
  canAddIndicator: (currentCount: number) => boolean;
  canAddChart: (currentCount: number) => boolean;
  canUseIndicator: (indicatorKey: 'hydra' | 'typhoon' | 'cerberus') => boolean;
}

/**
 * Fetch all subscription plans ordered by displayOrder.
 * Automatically runs baseline seed if table is empty.
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    await ensureBaselinePlansSeeded();
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(asc(subscriptionPlans.displayOrder));

    if (rows.length === 0) {
      return CANONICAL_PLANS.map((p) => ({
        ...p,
        monthlyPriceEgp: parseFloat(p.monthlyPriceEgp),
        annualPriceEgp: parseFloat(p.annualPriceEgp),
        limits: p.limits as PlanLimits,
        features: p.features as PlanFeatures,
        updatedAt: new Date(),
        createdAt: new Date(),
      }));
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      monthlyPriceEgp: parseFloat(r.monthlyPriceEgp || '0'),
      annualPriceEgp: parseFloat(r.annualPriceEgp || '0'),
      annualDiscountPct: r.annualDiscountPct,
      badge: r.badge,
      color: r.color,
      displayOrder: r.displayOrder,
      isActive: r.isActive,
      limits: r.limits as PlanLimits,
      features: r.features as PlanFeatures,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error('[getSubscriptionPlans] Error fetching plans:', err);
    return CANONICAL_PLANS.map((p) => ({
      ...p,
      monthlyPriceEgp: parseFloat(p.monthlyPriceEgp),
      annualPriceEgp: parseFloat(p.annualPriceEgp),
      limits: p.limits as PlanLimits,
      features: p.features as PlanFeatures,
      updatedAt: new Date(),
      createdAt: new Date(),
    }));
  }
}

/**
 * Get a single plan by ID ('free', 'plus', 'elite', 'vip')
 */
export async function getSubscriptionPlanById(id: string): Promise<SubscriptionPlan | null> {
  const plans = await getSubscriptionPlans();
  return plans.find((p) => p.id === id) || null;
}

/**
 * Update plan pricing, limits, or feature entitlements.
 */
export async function updateSubscriptionPlan(
  id: string,
  updates: {
    name?: string;
    description?: string;
    monthlyPriceEgp?: number;
    annualPriceEgp?: number;
    annualDiscountPct?: number;
    badge?: string;
    color?: string;
    limits?: Partial<PlanLimits>;
    features?: Partial<PlanFeatures>;
  }
): Promise<SubscriptionPlan> {
  const existing = await getSubscriptionPlanById(id);
  if (!existing) {
    throw new Error(`Subscription plan '${id}' not found.`);
  }

  const mergedLimits: PlanLimits = {
    ...existing.limits,
    ...(updates.limits || {}),
  };

  const mergedFeatures: PlanFeatures = {
    ...existing.features,
    ...(updates.features || {}),
  };

  const valuesToSet: any = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) valuesToSet.name = updates.name;
  if (updates.description !== undefined) valuesToSet.description = updates.description;
  if (updates.monthlyPriceEgp !== undefined)
    valuesToSet.monthlyPriceEgp = updates.monthlyPriceEgp.toFixed(2);
  if (updates.annualPriceEgp !== undefined)
    valuesToSet.annualPriceEgp = updates.annualPriceEgp.toFixed(2);
  if (updates.annualDiscountPct !== undefined)
    valuesToSet.annualDiscountPct = updates.annualDiscountPct;
  if (updates.badge !== undefined) valuesToSet.badge = updates.badge;
  if (updates.color !== undefined) valuesToSet.color = updates.color;
  valuesToSet.limits = mergedLimits;
  valuesToSet.features = mergedFeatures;

  await db
    .update(subscriptionPlans)
    .set(valuesToSet)
    .where(eq(subscriptionPlans.id, id));

  const updated = await getSubscriptionPlanById(id);
  if (!updated) {
    throw new Error(`Failed to retrieve updated plan '${id}'`);
  }

  return updated;
}

/**
 * Core User Access Control:
 * Resolves a user's subscription, maps it to the centralized plan limits and feature flags,
 * and provides instant ergonomic check methods.
 */
export async function getUserAccessEntitlements(userId: string): Promise<UserAccessEntitlements> {
  const [subRow] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1)
    .catch(() => []);

  let rawTier = (subRow?.tier || 'free').toLowerCase();
  // Map legacy aliases
  if (rawTier === 'pro_monthly' || rawTier === 'pro_annual' || rawTier === 'pro') {
    rawTier = 'plus';
  }

  const validTiers: ('free' | 'plus' | 'elite' | 'vip')[] = ['free', 'plus', 'elite', 'vip'];
  const userTier: 'free' | 'plus' | 'elite' | 'vip' = validTiers.includes(rawTier as any)
    ? (rawTier as any)
    : 'free';

  const plan = await getSubscriptionPlanById(userTier);
  const fallbackPlan = CANONICAL_PLANS.find((p) => p.id === userTier) || CANONICAL_PLANS[0];

  const limits: PlanLimits = plan?.limits || (fallbackPlan.limits as PlanLimits);
  const features: PlanFeatures = plan?.features || (fallbackPlan.features as PlanFeatures);

  const isActive = subRow?.status === 'active';
  // VIP is complimentary, not a paid customer
  const isPaid = isActive && (userTier === 'plus' || userTier === 'elite');

  return {
    userId,
    tier: userTier,
    planName: plan?.name || fallbackPlan.name,
    status: (subRow?.status as any) || 'none',
    isPaid,
    limits,
    features,
    canCreateAlert: (currentCount: number) => {
      if (limits.priceAlerts === -1) return true;
      return currentCount < limits.priceAlerts;
    },
    canAddIndicator: (currentCount: number) => {
      return currentCount < limits.indicatorsPerChart;
    },
    canAddChart: (currentCount: number) => {
      return currentCount < limits.chartsPerTab;
    },
    canUseIndicator: (indicatorKey: 'hydra' | 'typhoon' | 'cerberus') => {
      if (indicatorKey === 'hydra') return Boolean(features.hydraIndicator);
      if (indicatorKey === 'typhoon') return Boolean(features.typhoonEngine);
      if (indicatorKey === 'cerberus') return Boolean(features.cerberusConfluence);
      return true;
    },
  };
}
