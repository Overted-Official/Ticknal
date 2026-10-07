'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsolePageHeader from '../ConsolePageHeader';
import ConsoleSectionNav, { type ConsoleNavSection } from '../ConsoleSectionNav';
import SubscriptionMonetizationKpis from './SubscriptionMonetizationKpis';
import SubscriptionBillingLedger from './SubscriptionBillingLedger';
import SubscriptionRenewalPipeline from './SubscriptionRenewalPipeline';
import SubscriptionPlansMatrix from './SubscriptionPlansMatrix';
import ConsoleUserDetailDrawer from '../users/ConsoleUserDetailDrawer';
import type {
  ConsoleSubscriptionsPageData,
  ConsoleUserRowItem,
} from '@/lib/server/console-queries';

interface ConsoleSubscriptionsViewProps {
  data: ConsoleSubscriptionsPageData;
}

const SECTIONS: ConsoleNavSection[] = [
  { id: 'section-subs-metrics', label: 'Revenue KPIs', shortLabel: 'KPIs' },
  { id: 'section-subs-ledger', label: 'Billing Ledger', shortLabel: 'Ledger' },
  { id: 'section-subs-renewals', label: 'Renewal Pipeline', shortLabel: 'Renewals' },
  { id: 'section-subs-plans', label: 'Pricing Plans', shortLabel: 'Plans' },
];

export default function ConsoleSubscriptionsView({ data }: ConsoleSubscriptionsViewProps) {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<ConsoleUserRowItem | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Header (Breadcrumbs) */}
      <ConsolePageHeader pageTitle="Subscriptions & Billing" />

      {/* 2. Floating Section Nav */}
      <ConsoleSectionNav sections={SECTIONS} />

      {/* 3. Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-10 max-w-[1600px] mx-auto w-full px-3 sm:px-6">
        {/* ========================================================= */}
        {/* SECTION 1: MONETIZATION KPIS & REVENUE TRAJECTORY */}
        {/* ========================================================= */}
        <section id="section-subs-metrics" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Subscriptions & Revenue Trajectory</h2>
              <p className="section-subtitle">
                Monthly recurring revenue run, active paid licenses, and tier pricing specifications
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-zinc-400">
                Billing Currency: <span className="text-white font-medium">EGP</span>
              </span>
            </div>
          </div>

          <SubscriptionMonetizationKpis
            kpis={data.kpis}
            tierSummary={data.tierSummary}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: CUSTOMER BILLING LEDGER */}
        {/* ========================================================= */}
        <section id="section-subs-ledger" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Customer Billing Ledger</h2>
              <p className="section-subtitle">
                Individual subscriber status, billing cycles, payment gateways, and manual license grants
              </p>
            </div>
            <span className="text-[11px] text-zinc-400 tabular-nums self-start sm:self-auto">
              Ledger Size: <span className="text-white font-medium">{data.subscriptions.length} entries</span>
            </span>
          </div>

          <SubscriptionBillingLedger
            subscriptions={data.subscriptions}
            onSelectUser={setActiveUser}
            onRefresh={handleRefresh}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: RENEWAL PIPELINE & CHURN PREVENTION */}
        {/* ========================================================= */}
        <section id="section-subs-renewals" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Renewal Pipeline & Churn Prevention</h2>
              <p className="section-subtitle">
                Upcoming expirations, scheduled monthly renewals, and auto-renew cancellation flags
              </p>
            </div>
          </div>

          <SubscriptionRenewalPipeline
            renewalPipeline={data.renewalPipeline}
            onSelectUser={setActiveUser}
            onRefresh={handleRefresh}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: COMMERCIAL PRICING PLANS & PACKAGING MATRIX */}
        {/* ========================================================= */}
        <section id="section-subs-plans" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Pricing & Commercial Packaging Matrix</h2>
              <p className="section-subtitle">
                Current platform plan tiers, feature entitlements, live subscriber volumes, and yields
              </p>
            </div>
          </div>

          <SubscriptionPlansMatrix tierSummary={data.tierSummary} />
        </section>
      </div>

      {/* Customer Support Detail Drawer */}
      {activeUser && (
        <ConsoleUserDetailDrawer
          user={activeUser}
          onClose={() => setActiveUser(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
