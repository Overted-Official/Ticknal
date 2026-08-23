'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import WalletPositionsView from '@/components/platform/wallet/WalletPositionsView';
import WalletBankAccountsView from '@/components/platform/wallet/WalletBankAccountsView';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

interface WalletClientViewProps {
  initialTab?: string;
  usdRate?: number;
}

export default function WalletClientView({
  initialTab = 'positions',
  usdRate = 50.20,
}: WalletClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentTab, setCurrentTab] = useState<'positions' | 'banks'>(() => {
    const urlTab = searchParams?.get('tab');
    if (urlTab === 'banks' || urlTab === 'positions') return urlTab;
    return initialTab === 'banks' ? 'banks' : 'positions';
  });

  const { swipeHandlers } = useSwipeableTabs({
    tabs: ['positions', 'banks'] as const,
    activeTab: currentTab,
    onTabChange: (newTab) => handleTabChange(newTab),
  });

  // Sync internal state if URL search param changes from external navigation
  useEffect(() => {
    const urlTab = searchParams?.get('tab');
    if (urlTab === 'banks' || urlTab === 'positions') {
      setCurrentTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: 'positions' | 'banks') => {
    if (newTab === currentTab) return;
    setCurrentTab(newTab);
    // Instant client-side URL sync without full server round-trip
    window.history.replaceState(null, '', `/wallet?tab=${newTab}`);
  };

  const navItems = [
    { label: 'Stock Positions', value: 'positions', icon: Wallet },
    { label: 'Bank Accounts & Ledger', value: 'banks', icon: Landmark },
  ];

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-plt-base text-plt-text select-none">
      {/* Responsive Top Navigation Rail (Mobile Only) */}
      <SubNavTopRail
        items={navItems}
        activeTab={currentTab}
        onChange={(val) => handleTabChange(val as 'positions' | 'banks')}
      />

      {/* Main Tab Views with Instant Zero-Latency Switch & Touch Swiping */}
      <div {...swipeHandlers} className="flex-1 h-full min-h-0 relative overflow-hidden touch-pan-y">
        <div className={`absolute inset-0 flex flex-col ${currentTab === 'positions' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          <WalletPositionsView />
        </div>

        <div className={`absolute inset-0 flex flex-col ${currentTab === 'banks' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          <WalletBankAccountsView usdRate={usdRate} />
        </div>
      </div>
    </div>
  );
}
