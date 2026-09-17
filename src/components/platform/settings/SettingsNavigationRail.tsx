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
    <div className="w-full min-w-0 relative hidden md:flex items-center gap-2 border-b border-white/[0.09] pb-3">
      <button
        type="button"
        onClick={() => onTabChange('profile')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md btn-typography transition-all cursor-pointer ${
          activeTab === 'profile'
            ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
        }`}
      >
        <User size={14} className={activeTab === 'profile' ? 'text-white' : 'text-white/40'} />
        <span>Account Profile</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('security')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md btn-typography transition-all cursor-pointer ${
          activeTab === 'security'
            ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
        }`}
      >
        <ShieldCheck size={14} className={activeTab === 'security' ? 'text-white' : 'text-white/40'} />
        <span>Security & PIN</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('devices')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md btn-typography transition-all cursor-pointer ${
          activeTab === 'devices'
            ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
        }`}
      >
        <Smartphone size={14} className={activeTab === 'devices' ? 'text-white' : 'text-white/40'} />
        <span>Connected Devices</span>
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-white/60">
          {Math.max(1, devicesCount)}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('alerts')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md btn-typography transition-all cursor-pointer ${
          activeTab === 'alerts'
            ? 'bg-white/[0.10] text-white border border-white/[0.15] shadow-sm'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
        }`}
      >
        <Bell size={14} className={activeTab === 'alerts' ? 'text-white' : 'text-white/40'} />
        <span>Monitored Tickers & Alerts</span>
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.06] text-white/60">
          {monitoredTickersCount}
        </span>
      </button>
    </div>
  );
}
