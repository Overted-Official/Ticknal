'use client';

import React from 'react';
import { User, ShieldCheck, Smartphone, Bell } from '@/components/ui/icon-library';

export type SettingsTabType = 'profile' | 'security' | 'devices' | 'alerts';

interface SettingsNavigationRailProps {
  activeTab: SettingsTabType;
  onTabChange: (tab: SettingsTabType) => void;
  devicesCount: number;
  monitoredTickersCount: number;
}

export default function SettingsNavigationRail({
  activeTab,
  onTabChange,
  devicesCount,
  monitoredTickersCount,
}: SettingsNavigationRailProps) {
  return (
    <div className="w-full min-w-0 relative hidden md:flex items-center gap-6 border-b border-border-subtle overflow-x-auto no-scrollbar">
      <button
        type="button"
        onClick={() => onTabChange('profile')}
        className={`flex items-center gap-2 pb-3 -mb-[1px] text-xs sm:text-[13px] tracking-tight transition-colors cursor-pointer border-b-2 ${
          activeTab === 'profile'
            ? 'text-white font-semibold border-white'
            : 'text-text-muted hover:text-text-secondary font-medium border-transparent'
        }`}
      >
        <User size={15} className={activeTab === 'profile' ? 'text-white' : 'text-text-muted'} />
        <span>Account Profile</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('security')}
        className={`flex items-center gap-2 pb-3 -mb-[1px] text-xs sm:text-[13px] tracking-tight transition-colors cursor-pointer border-b-2 ${
          activeTab === 'security'
            ? 'text-white font-semibold border-white'
            : 'text-text-muted hover:text-text-secondary font-medium border-transparent'
        }`}
      >
        <ShieldCheck size={15} className={activeTab === 'security' ? 'text-white' : 'text-text-muted'} />
        <span>Security & PIN</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('devices')}
        className={`flex items-center gap-2 pb-3 -mb-[1px] text-xs sm:text-[13px] tracking-tight transition-colors cursor-pointer border-b-2 ${
          activeTab === 'devices'
            ? 'text-white font-semibold border-white'
            : 'text-text-muted hover:text-text-secondary font-medium border-transparent'
        }`}
      >
        <Smartphone size={15} className={activeTab === 'devices' ? 'text-white' : 'text-text-muted'} />
        <span>Connected Devices</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums border ${
          activeTab === 'devices'
            ? 'bg-surface-active text-white border-border-default'
            : 'bg-black text-text-muted border-border-subtle'
        }`}>
          {Math.max(1, devicesCount)}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('alerts')}
        className={`flex items-center gap-2 pb-3 -mb-[1px] text-xs sm:text-[13px] tracking-tight transition-colors cursor-pointer border-b-2 ${
          activeTab === 'alerts'
            ? 'text-white font-semibold border-white'
            : 'text-text-muted hover:text-text-secondary font-medium border-transparent'
        }`}
      >
        <Bell size={15} className={activeTab === 'alerts' ? 'text-white' : 'text-text-muted'} />
        <span>Monitored Tickers & Alerts</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums border ${
          activeTab === 'alerts'
            ? 'bg-surface-active text-white border-border-default'
            : 'bg-black text-text-muted border-border-subtle'
        }`}>
          {monitoredTickersCount}
        </span>
      </button>
    </div>
  );
}
