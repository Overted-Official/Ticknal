'use client';

import React from 'react';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';
import SubscriptionKPICardsRail from './SubscriptionKPICardsRail';
import CompoundingRevenueChart from './CompoundingRevenueChart';
import SubscriptionTierDonutDistribution from './SubscriptionTierDonutDistribution';

interface SubscriptionMonetizationKpisProps {
  kpis: ConsoleSubscriptionsPageData['kpis'];
  tierSummary: ConsoleSubscriptionsPageData['tierSummary'];
  subscriptions?: ConsoleSubscriptionsPageData['subscriptions'];
}

export default function SubscriptionMonetizationKpis({
  kpis,
  tierSummary,
  subscriptions = [],
}: SubscriptionMonetizationKpisProps) {
  return (
    <div className="space-y-6">
      {/* 1. Crown KPI Rail with YTD Trajectory Sparklines */}
      <SubscriptionKPICardsRail kpis={kpis} />

      {/* 2. Compounding Total Revenue Line / Area Graph */}
      <CompoundingRevenueChart
        subscriptions={subscriptions}
        currentMrr={kpis.mrr}
      />

      {/* 3. Tier Distribution Donut Chart + Table Breakdown (No Borders) */}
      <SubscriptionTierDonutDistribution
        tierSummary={tierSummary}
        totalPaidSeats={kpis.activePaidSeats}
        totalMrr={kpis.mrr}
      />
    </div>
  );
}
