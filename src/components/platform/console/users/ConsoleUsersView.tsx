'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsolePageHeader from '../ConsolePageHeader';
import ConsoleSectionNav, { type ConsoleNavSection } from '../ConsoleSectionNav';
import UsersDirectoryKpis from './UsersDirectoryKpis';
import UserDirectoryScreener from './UserDirectoryScreener';
import UserCohortsPanel from './UserCohortsPanel';
import ConsoleUserDetailDrawer from './ConsoleUserDetailDrawer';
import type { ConsoleUsersPageData, ConsoleUserRowItem } from '@/lib/server/console-queries';

interface ConsoleUsersViewProps {
  data: ConsoleUsersPageData;
}

const SECTIONS: ConsoleNavSection[] = [
  { id: 'section-users-metrics', label: 'Directory KPIs', shortLabel: 'KPIs' },
  { id: 'section-users-directory', label: 'Member Directory', shortLabel: 'Directory' },
  { id: 'section-users-segments', label: 'Segments & Cohorts', shortLabel: 'Cohorts' },
];

export default function ConsoleUsersView({ data }: ConsoleUsersViewProps) {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<ConsoleUserRowItem | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Header (Breadcrumbs) */}
      <ConsolePageHeader pageTitle="User Directory" />

      {/* 2. Floating Section Nav */}
      <ConsoleSectionNav sections={SECTIONS} />

      {/* 3. Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-10 max-w-[1600px] mx-auto w-full px-3 sm:px-6">
        {/* ========================================================= */}
        {/* SECTION 1: DIRECTORY KPIS */}
        {/* ========================================================= */}
        <section id="section-users-metrics" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Directory Overview & Roster KPIs</h2>
              <p className="section-subtitle">
                Consolidated member metrics, paying subscriber volume, and privileged staff roles
              </p>
            </div>
          </div>

          <UsersDirectoryKpis kpis={data.kpis} />
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: MEMBER DIRECTORY SCREENER */}
        {/* ========================================================= */}
        <section id="section-users-directory" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Member Directory Screener</h2>
              <p className="section-subtitle">
                Inspect customer profiles, subscription tiers, renewal timelines, and device reach
              </p>
            </div>
          </div>

          <UserDirectoryScreener
            users={data.users}
            onSelectUser={setActiveUser}
            onRefresh={handleRefresh}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: CUSTOMER COHORTS & PLAN TIERS */}
        {/* ========================================================= */}
        <section id="section-users-segments" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Customer Cohorts & Plan Tiers</h2>
              <p className="section-subtitle">
                Historical monthly signup conversion and active subscriber tier distribution
              </p>
            </div>
          </div>

          <UserCohortsPanel
            cohorts={data.cohorts}
            tierDistribution={data.tierDistribution}
            totalUsers={data.kpis.totalUsers}
          />
        </section>
      </div>

      {/* User Support Deep-Dive Drawer */}
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
