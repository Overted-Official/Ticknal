'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Landmark } from 'lucide-react';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import OrdersTable from '@/components/platform/OrdersTable';

export default function WalletPositionsWrapper() {
  const router = useRouter();

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden">
      <SubNavTopRail
        activeTab="positions"
        onChange={(val) => router.push(`/wallet?tab=${val}`)}
        items={[
          { label: 'Stock Positions', value: 'positions', icon: Wallet },
          { label: 'Bank Accounts & Ledger', value: 'banks', icon: Landmark },
        ]}
      />
      <div className="flex-1 h-full min-h-0 overflow-y-auto">
        <OrdersTable />
      </div>
    </div>
  );
}
