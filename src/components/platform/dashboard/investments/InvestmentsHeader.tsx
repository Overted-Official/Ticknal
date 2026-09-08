'use client';

import React from 'react';
import Link from 'next/link';
import TestNotificationButton from '@/components/platform/TestNotificationButton';
import PageHeader from '@/components/platform/ui/PageHeader';

export default function InvestmentsHeader() {
  return (
    <PageHeader
      title="Investment Performance"
      description="Portfolio performance, position attribution, and strategy outcomes."
      actions={(
        <>
          <TestNotificationButton />
          <Link href="/wallet?tab=positions" className="btn-token btn-secondary btn-compact">
            <span>Manage Positions</span>
            <span className="text-white/40">→</span>
          </Link>
          <Link href="/invest" className="btn-token btn-primary btn-compact">
            <span>Open Invest</span>
            <span className="text-plt-text-inverse">→</span>
          </Link>
        </>
      )}
    />
  );
}
