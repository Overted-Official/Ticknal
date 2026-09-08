'use client';

import React from 'react';
import Link from 'next/link';
import PageHeader from '@/components/platform/ui/PageHeader';

export default function BanksHeader() {
  return (
    <PageHeader
      title="Accounts"
      description="Cash balances, brokerage accounts, and transaction activity."
      actions={(
        <>
          <Link href="/wallet?tab=banks" className="btn-token btn-secondary btn-compact">
            <span>Manage Accounts</span>
            <span className="text-white/40">→</span>
          </Link>
        </>
      )}
    />
  );
}
