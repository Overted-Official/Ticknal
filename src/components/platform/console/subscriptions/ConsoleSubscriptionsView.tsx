'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsolePageHeader from '../ConsolePageHeader';
import ConsoleSectionNav, { type ConsoleNavSection } from '../ConsoleSectionNav';
import SubscriptionMonetizationKpis from './SubscriptionMonetizationKpis';
import SubscriptionBillingLedger from './SubscriptionBillingLedger';
import PricingPlansSection from './pricing-plans/PricingPlansSection';
import ConsoleUserDetailDrawer from '../users/ConsoleUserDetailDrawer';
import type {
  ConsoleSubscriptionsPageData,
  ConsoleUserRowItem,
} from '@/lib/server/console-queries';

interface ConsoleSubscriptionsViewProps {
  data: ConsoleSubscriptionsPageData;
}

const SECTIONS: ConsoleNavSection[] = [
  { id: 'section-subs-overview', label: 'Subscriptions Overview', shortLabel: 'Overview' },
  { id: 'section-subs-ledger', label: 'Customer Billing & Ledger', shortLabel: 'Ledger' },
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

      {/* 2. Floating Section Nav (3 Focused Sections) */}
      <ConsoleSectionNav sections={SECTIONS} />

      {/* 3. Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-10 max-w-[1600px] mx-auto w-full px-3 sm:px-6">
        {/* ========================================================= */}
        {/* SECTION 1: SUBSCRIPTIONS OVERVIEW */}
        {/* ========================================================= */}
        <section id="section-subs-overview" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Subscriptions Overview</h2>
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
            subscriptions={data.subscriptions}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: CUSTOMER BILLING & LEDGER (WITH MERGED RENEWALS) */}
        {/* ========================================================= */}
        <section id="section-subs-ledger" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Customer Billing & Ledger</h2>
              <p className="section-subtitle">
                Subscriber status, renewal pipeline watch, billing cycles, and license management
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
        {/* SECTION 3: PRICING PLANS */}
        {/* ========================================================= */}
        <section id="section-subs-plans" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Pricing Plans</h2>
              <p className="section-subtitle">
                Live commercial tier packaging, quotas, feature allocations, and subscriber yields
              </p>
            </div>
          </div>

          <PricingPlansSection tierSummary={data.tierSummary} onRefresh={handleRefresh} />
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
