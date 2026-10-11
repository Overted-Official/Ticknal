import { db } from '@/db';
import { subscriptionPlans } from '@/db/schema';
import { sql } from 'drizzle-orm';

export interface PlanLimits {
  chartsPerTab: number;
  indicatorsPerChart: number;
  historicalBars: number;
  parallelConnections: number;
  priceAlerts: number;
  technicalAlerts: number;
  pushAlerts: number; // -1 for unlimited
}

export interface PlanFeatures {
  breakoutDetection: 'none' | 'intraday' | 'multi_timeframe';
  hydraIndicator: boolean;
  typhoonEngine: boolean;
  cerberusConfluence: boolean;
  egxCoverage: boolean;
  screeners: boolean;
  devicesSync: boolean;
  noAds: boolean;
}

export const CANONICAL_PLANS = [
  {
    id: 'free',
    name: 'Free Member',
    description: 'Full Egyptian equities & funds coverage for self-directed investors.',
    monthlyPriceEgp: '0',
    annualPriceEgp: '0',
    annualDiscountPct: 0,
    badge: 'Base Plan',
    color: '#787b86',
    displayOrder: 1,
    isActive: true,
    limits: {
      chartsPerTab: 2,
      indicatorsPerChart: 5,
      historicalBars: 2000,
      parallelConnections: 5,
      priceAlerts: 0,
      technicalAlerts: 0,
      pushAlerts: 0,
    } satisfies PlanLimits,
    features: {
      breakoutDetection: 'none',
      hydraIndicator: false,
      typhoonEngine: false,
      cerberusConfluence: false,
      egxCoverage: true,
      screeners: true,
      devicesSync: true,
      noAds: true,
    } satisfies PlanFeatures,
  },
  {
    id: 'plus',
    name: 'Plus Member',
    description: 'Real-time multi-channel alerts and expanded charting capacity.',
    monthlyPriceEgp: '50',
    annualPriceEgp: '500',
    annualDiscountPct: 17,
    badge: 'Most Popular',
    color: '#2962ff',
    displayOrder: 2,
    isActive: true,
    limits: {
      chartsPerTab: 4,
      indicatorsPerChart: 10,
      historicalBars: 10000,
      parallelConnections: 20,
      priceAlerts: 100,
      technicalAlerts: 100,
      pushAlerts: 25,
    } satisfies PlanLimits,
    features: {
      breakoutDetection: 'intraday',
      hydraIndicator: false,
      typhoonEngine: false,
      cerberusConfluence: false,
      egxCoverage: true,
      screeners: true,
      devicesSync: true,
      noAds: true,
    } satisfies PlanFeatures,
  },
  {
    id: 'elite',
    name: 'Elite Member',
    description: 'Institutional-grade quantitative models, multi-timeframe engines & unlimited alerts.',
    monthlyPriceEgp: '95',
    annualPriceEgp: '950',
    annualDiscountPct: 17,
    badge: 'Institutional',
    color: '#089981',
    displayOrder: 3,
    isActive: true,
    limits: {
      chartsPerTab: 8,
      indicatorsPerChart: 25,
      historicalBars: 40000,
      parallelConnections: 100,
      priceAlerts: 500,
      technicalAlerts: 500,
      pushAlerts: -1,
    } satisfies PlanLimits,
    features: {
      breakoutDetection: 'multi_timeframe',
      hydraIndicator: true,
      typhoonEngine: true,
      cerberusConfluence: true,
      egxCoverage: true,
      screeners: true,
      devicesSync: true,
      noAds: true,
    } satisfies PlanFeatures,
  },
  {
    id: 'vip',
    name: 'VIP Exceptional',
    description: 'Full platform unrestricted access for team, partners, and exceptional members.',
    monthlyPriceEgp: '0',
    annualPriceEgp: '0',
    annualDiscountPct: 0,
    badge: 'Partner & VIP',
    color: '#9c27b0',
    displayOrder: 4,
    isActive: true,
    limits: {
      chartsPerTab: 8,
      indicatorsPerChart: 25,
      historicalBars: 40000,
      parallelConnections: 100,
      priceAlerts: 500,
      technicalAlerts: 500,
      pushAlerts: -1,
    } satisfies PlanLimits,
    features: {
      breakoutDetection: 'multi_timeframe',
      hydraIndicator: true,
      typhoonEngine: true,
      cerberusConfluence: true,
      egxCoverage: true,
      screeners: true,
      devicesSync: true,
      noAds: true,
    } satisfies PlanFeatures,
  },
];

export async function ensureBaselinePlansSeeded() {
  try {
    // 1. Ensure table exists in Postgres
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        monthly_price_egp NUMERIC(10, 2) NOT NULL DEFAULT 0,
        annual_price_egp NUMERIC(10, 2) NOT NULL DEFAULT 0,
        annual_discount_pct INTEGER NOT NULL DEFAULT 0,
        badge VARCHAR(50),
        color VARCHAR(20) NOT NULL DEFAULT '#787b86',
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        limits JSONB NOT NULL,
        features JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Check if already seeded
    const existing = await db.select({ id: subscriptionPlans.id }).from(subscriptionPlans);
    if (existing.length >= 4) {
      return { success: true, count: existing.length };
    }

    // 3. Upsert canonical plans
    for (const plan of CANONICAL_PLANS) {
      await db
        .insert(subscriptionPlans)
        .values(plan)
        .onConflictDoUpdate({
          target: subscriptionPlans.id,
          set: {
            name: plan.name,
            description: plan.description,
            badge: plan.badge,
            color: plan.color,
            displayOrder: plan.displayOrder,
            updatedAt: new Date(),
          },
        });
    }

    return { success: true, count: CANONICAL_PLANS.length };
  } catch (err) {
    console.error('[ensureBaselinePlansSeeded] Seed failed:', err);
    return { success: false, count: 0 };
  }
}
