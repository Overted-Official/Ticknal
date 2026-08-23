'use client';

import React from 'react';
import Link from 'next/link';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';

export default function BanksHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-2 shrink-0 select-none">
      <div>
        <h1 className="page-title mb-1">
          Bank Accounts & Liquidity
        </h1>
        <p className="page-subtitle truncate">
          Multi-currency cash flows & bank liquidity
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <PrivacyToggleButton />
        <Link
          href="/wallet?tab=banks"
          className="btn-token btn-secondary btn-compact"
        >
          <span>Manage Accounts</span>
          <span className="text-white/40">→</span>
        </Link>
      </div>
    </div>
  );
}
