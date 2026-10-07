'use client';

import React from 'react';
import type { ConsoleOverviewStats } from '@/lib/server/console-queries';
import ConsolePageHeader from '../ConsolePageHeader';
import ConsoleSectionNav, { type ConsoleNavSection } from '../ConsoleSectionNav';
import OverviewRevenueKpis from './OverviewRevenueKpis';
import CommercialProgressionChart from './CommercialProgressionChart';
import SubscriptionDonutChart from './SubscriptionDonutChart';
import OverviewAcquisitionKpis from './OverviewAcquisitionKpis';
import RecentSignupsTable from './RecentSignupsTable';
import ProductUsagePanel from './ProductUsagePanel';
import LiveActivityFeed from './LiveActivityFeed';
import OverviewRetentionKpis from './OverviewRetentionKpis';
import RenewalRiskTable from './RenewalRiskTable';

interface ConsoleOverviewViewProps {
  stats: ConsoleOverviewStats;
}

const SECTIONS: ConsoleNavSection[] = [
  { id: 'section-revenue', label: 'Revenue & Plans', shortLabel: 'Revenue' },
  { id: 'section-growth', label: 'User Acquisition', shortLabel: 'Acquisition' },
  { id: 'section-engagement', label: 'Product Usage', shortLabel: 'Usage' },
  { id: 'section-retention', label: 'Retention & Renewals', shortLabel: 'Renewals' },
];

export default function ConsoleOverviewView({ stats }: ConsoleOverviewViewProps) {
  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Header (Breadcrumbs) */}
      <ConsolePageHeader pageTitle="Commercial Overview" />

      {/* 2. Floating Section Nav */}
      <ConsoleSectionNav sections={SECTIONS} />

      {/* 3. Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-10 max-w-[1600px] mx-auto w-full px-3 sm:px-6">
        {/* ========================================================= */}
        {/* SECTION 1: REVENUE VELOCITY & SUBSCRIPTIONS */}
        {/* ========================================================= */}
        <section id="section-revenue" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Revenue Velocity & Subscriptions</h2>
              <p className="section-subtitle">
                Recurring revenue trajectory, monthly seat monetization, and plan distribution
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-zinc-400">
                Billing Currency: <span className="text-white font-medium">EGP</span>
              </span>
            </div>
          </div>

          <OverviewRevenueKpis executive={stats.executive} />
          <CommercialProgressionChart
            monthlyData={stats.progression.monthly}
            daily30dData={stats.progression.daily30d}
          />
          <SubscriptionDonutChart
            distribution={stats.tierDistribution}
            totalUsers={stats.executive.totalUsers}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: ACQUISITION & USER PIPELINE */}
        {/* ========================================================= */}
        <section id="section-growth" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Acquisition & User Pipeline</h2>
              <p className="section-subtitle">
                Account registration pace, acquisition velocity, and member directory onboardings
              </p>
            </div>
          </div>

          <OverviewAcquisitionKpis
            executive={stats.executive}
            recentSignups={stats.recentSignups}
          />
          <RecentSignupsTable signups={stats.recentSignups} />
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: PRODUCT USAGE & ENGAGEMENT */}
        {/* ========================================================= */}
        <section id="section-engagement" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Product Usage & Feature Adoption</h2>
              <p className="section-subtitle">
                User engagement stickiness, active portfolio tracking, and real-time activity log
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <ProductUsagePanel
                featureAdoption={stats.featureAdoption}
                totalUsers={stats.executive.totalUsers}
              />
            </div>
            <div className="lg:col-span-7">
              <LiveActivityFeed events={stats.recentActivity} />
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: RETENTION, RENEWALS & CHURN RISK */}
        {/* ========================================================= */}
        <section id="section-retention" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Retention & Renewal Health</h2>
              <p className="section-subtitle">
                Upcoming subscription renewals, period expirations, and subscriber churn risk monitor
              </p>
            </div>
          </div>

          <OverviewRetentionKpis executive={stats.executive} />
          <RenewalRiskTable subscriptions={stats.atRiskSubscriptions} />
        </section>
      </div>
    </div>
  );
}
