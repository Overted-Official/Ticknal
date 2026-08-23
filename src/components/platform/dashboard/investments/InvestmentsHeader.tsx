'use client';

import React from 'react';
import Link from 'next/link';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import TestNotificationButton from '@/components/platform/TestNotificationButton';

export default function InvestmentsHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-2 shrink-0 select-none">
      <div>
        <h1 className="page-title mb-1">
          Investments Dashboard
        </h1>
        <p className="page-subtitle">
          Portfolio performance and real-time PSI trading intelligence
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <PrivacyToggleButton />
        <TestNotificationButton />
        <Link
          href="/wallet?tab=positions"
          className="btn-token btn-secondary btn-compact"
        >
          <span>Manage Positions</span>
          <span className="text-white/40">→</span>
        </Link>
        <Link
          href="/invest"
          className="btn-token btn-primary btn-compact"
        >
          <span>Open Invest</span>
          <span className="text-plt-text-inverse">→</span>
        </Link>
      </div>
    </div>
  );
}
