'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsolePageHeader from '../ConsolePageHeader';
import ConsoleSectionNav, { type ConsoleNavSection } from '../ConsoleSectionNav';
import UsersDirectoryKpis from './UsersDirectoryKpis';
import UserTierBarChart from './UserTierBarChart';
import UserDirectoryScreener from './UserDirectoryScreener';
import ConsoleUserDetailDrawer from './ConsoleUserDetailDrawer';
import ConsoleUserAcquisitionSection from './acquisition/ConsoleUserAcquisitionSection';
import type { ConsoleUsersPageData, ConsoleUserRowItem } from '@/lib/server/console-queries';

interface ConsoleUsersViewProps {
  data: ConsoleUsersPageData;
}

const SECTIONS: ConsoleNavSection[] = [
  { id: 'section-users-metrics', label: 'Users Overview', shortLabel: 'Overview' },
  { id: 'section-users-directory', label: 'Members', shortLabel: 'Members' },
  { id: 'section-acquisition-intelligence', label: 'Acquisition & Intelligence', shortLabel: 'Acquisition' },
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
        {/* SECTION 1: USERS OVERVIEW */}
        {/* ========================================================= */}
        <section id="section-users-metrics" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Users Overview</h2>
              <p className="section-subtitle">
                Consolidated member metrics, paying subscriber volume, and YTD tier progression
              </p>
            </div>
          </div>

          <UsersDirectoryKpis kpis={data.kpis} />

          <UserTierBarChart users={data.users} />
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: MEMBERS */}
        {/* ========================================================= */}
        <section id="section-users-directory" className="section-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="section-title">Members</h2>
              <p className="section-subtitle">
                Inspect customer profiles, subscription tiers, renewal timelines, usage, and open positions
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
        {/* SECTION 3: ACQUISITION & GROWTH INTELLIGENCE */}
        {/* ========================================================= */}
        {data.acquisitionStats && (
          <ConsoleUserAcquisitionSection initialStats={data.acquisitionStats} />
        )}
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
