'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, Landmark } from 'lucide-react';
import OrdersTable from '@/components/platform/OrdersTable';
import BankAccountsLedgerView from '@/components/platform/BankAccountsLedgerView';
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
    { label: 'Stock Positions', value: 'positions' as const, icon: Wallet },
    { label: 'Bank Accounts & Ledger', value: 'banks' as const, icon: Landmark },
  ];

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-tv-base text-tv-text select-none">
      {/* Unified Responsive Top Navigation Rail */}
      <div className="w-full shrink-0 h-11 px-4 md:px-6 flex items-center justify-between border-b border-white/[0.08] bg-black/95 backdrop-blur-md z-30 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleTabChange(item.value)}
                className={`h-7.5 px-3 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap select-none shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'bg-white/[0.05] text-white/50 hover:text-white/80 hover:bg-white/[0.09] border border-white/[0.05]'
                }`}
              >
                <Icon
                  size={13}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? 'text-black' : 'text-white/40'}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Views with Instant Zero-Latency Switch & Touch Swiping */}
      <div {...swipeHandlers} className="flex-1 h-full min-h-0 relative overflow-hidden touch-pan-y">
        <div className={`absolute inset-0 flex flex-col ${currentTab === 'positions' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          <div className="flex-1 h-full min-h-0 overflow-y-auto">
            <OrdersTable />
          </div>
        </div>

        <div className={`absolute inset-0 flex flex-col ${currentTab === 'banks' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          <BankAccountsLedgerView usdRate={usdRate} hideTopRail={true} />
        </div>
      </div>
    </div>
  );
}
