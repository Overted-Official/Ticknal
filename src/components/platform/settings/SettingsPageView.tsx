'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ShieldCheck, Smartphone, Bell } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import SettingsHeader from './SettingsHeader';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import { containerStagger, itemFadeInUp } from '@/lib/motion';

import SettingsNavigationRail, { type SettingsTabType } from './SettingsNavigationRail';
import UserProfileWidget, { type SettingsUserProfile } from './UserProfileWidget';
import PinSecurityCard from './PinSecurityCard';
import PushDevicesWidget, { type DeviceInfo } from './PushDevicesWidget';
import AlertTriggersWidget, { type MonitoredTicker, type TickerOption } from './AlertTriggersWidget';

export type { SettingsUserProfile, DeviceInfo, MonitoredTicker, TickerOption };

interface SettingsPageViewProps {
  userProfile: SettingsUserProfile;
  initialDevices: DeviceInfo[];
  initialMonitoredTickers: MonitoredTicker[];
  allTickers: TickerOption[];
}

const SETTINGS_TABS: SettingsTabType[] = ['profile', 'security', 'devices', 'alerts'];

export default function SettingsPageView({
  userProfile,
  initialDevices,
  initialMonitoredTickers,
  allTickers,
}: SettingsPageViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabType>('profile');

  const { swipeHandlers } = useSwipeableTabs({
    tabs: SETTINGS_TABS,
    activeTab,
    onTabChange: (newTab) => setActiveTab(newTab),
  });

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerStagger}
      className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-plt-base text-plt-text select-none"
    >
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as SettingsTabType)}
        userName={userProfile.name}
        userAvatarUrl={userProfile.avatarUrl || undefined}
        items={[
          { label: 'Profile', value: 'profile', icon: User },
          { label: 'Security & PIN', value: 'security', icon: ShieldCheck },
          { label: 'Devices', value: 'devices', icon: Smartphone, badge: initialDevices.length },
          { label: 'Alerts', value: 'alerts', icon: Bell, badge: initialMonitoredTickers.length },
        ]}
      />

      <div {...swipeHandlers} className="app-page page-sections-stack flex h-full min-h-0 w-full flex-1 overflow-y-auto pb-28 touch-pan-y md:pb-24 custom-scrollbar">
        {/* Top Header Banner */}
        <motion.div variants={itemFadeInUp} className="shrink-0 w-full min-w-0">
          <SettingsHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </motion.div>

        {/* Main Settings Canvas */}
        <div className="section-container w-full min-w-0 space-y-6 pt-1">
          {/* Navigation Tabs (Desktop Only) */}
          <motion.div variants={itemFadeInUp} className="w-full min-w-0">
            <SettingsNavigationRail
              activeTab={activeTab}
              onTabChange={setActiveTab}
              devicesCount={initialDevices.length}
              monitoredTickersCount={initialMonitoredTickers.length}
            />
          </motion.div>

          {/* TAB 1: ACCOUNT PROFILE */}
          {activeTab === 'profile' && (
            <motion.div variants={itemFadeInUp} className="w-full min-w-0">
              <UserProfileWidget userProfile={userProfile} />
            </motion.div>
          )}

          {/* TAB 2: SECURITY & PIN */}
          {activeTab === 'security' && (
            <motion.div variants={itemFadeInUp} className="w-full min-w-0">
              <PinSecurityCard />
            </motion.div>
          )}

          {/* TAB 3: CONNECTED DEVICES & SESSIONS */}
          {activeTab === 'devices' && (
            <motion.div variants={itemFadeInUp} className="w-full min-w-0">
              <PushDevicesWidget initialDevices={initialDevices} />
            </motion.div>
          )}

          {/* TAB 4: MONITORED TICKERS & ALERTS */}
          {activeTab === 'alerts' && (
            <motion.div variants={itemFadeInUp} className="w-full min-w-0">
              <AlertTriggersWidget
                initialMonitoredTickers={initialMonitoredTickers}
                allTickers={allTickers}
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
