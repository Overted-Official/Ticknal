'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import WalletPositionsPageView from './WalletPositionsPageView';
import WalletBankAccountsPageView from './WalletBankAccountsPageView';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

interface WalletPageViewProps {
  initialTab?: string;
  usdRate?: number;
}

export default function WalletPageView({
  initialTab = 'positions',
  usdRate = 50.20,
}: WalletPageViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const normalizeTab = (val?: string | null): 'positions' | 'transactions' => {
    if (!val) return initialTab === 'banks' || initialTab === 'transactions' ? 'transactions' : 'positions';
    if (['banks', 'accounts', 'ledger', 'transactions'].includes(val)) return 'transactions';
    return 'positions';
  };

  const [currentTab, setCurrentTab] = useState<'positions' | 'transactions'>(() => {
    return normalizeTab(searchParams?.get('tab'));
  });

  const { swipeHandlers } = useSwipeableTabs({
    tabs: ['positions', 'transactions'] as const,
    activeTab: currentTab,
    onTabChange: (newTab) => handleTabChange(newTab),
  });

  // Sync internal state if URL search param changes from external navigation
  useEffect(() => {
    const urlTab = searchParams?.get('tab');
    if (urlTab) {
      setCurrentTab(normalizeTab(urlTab));
    }
  }, [searchParams]);

  const handleTabChange = (newTab: 'positions' | 'transactions') => {
    if (newTab === currentTab) return;
    setCurrentTab(newTab);
    // Instant client-side URL sync without full server round-trip
    window.history.replaceState(null, '', `/wallet?tab=${newTab}`);
  };

  const navItems = [
    { label: 'Stock Positions', value: 'positions', icon: Wallet },
    { label: 'Cash & Transactions', value: 'transactions', icon: Landmark },
  ];

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-plt-base text-plt-text select-none">
      {/* Responsive Top Navigation Rail (Mobile Only) */}
      <SubNavTopRail
        items={navItems}
        activeTab={currentTab}
        onChange={(val) => handleTabChange(val as 'positions' | 'transactions')}
      />

      {/* Main Tab Views with Instant Zero-Latency Switch & Touch Swiping */}
      <div {...swipeHandlers} className="flex-1 h-full min-h-0 relative overflow-hidden touch-pan-y">
        <div className={`absolute inset-0 flex flex-col ${currentTab === 'positions' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          <WalletPositionsPageView />
        </div>

        <div className={`absolute inset-0 flex flex-col ${currentTab === 'transactions' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          <WalletBankAccountsPageView usdRate={usdRate} />
        </div>
      </div>
    </div>
  );
}
