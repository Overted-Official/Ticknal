'use client';

import React from 'react';
import { ArrowRightLeft, Plus } from '@/components/ui/icon-library';
import PageHeader from '@/components/platform/ui/PageHeader';

interface WalletBanksHeaderProps {
  onLogTransaction: () => void;
  onAddAccount: () => void;
}

export default function WalletBanksHeader({
  onLogTransaction,
  onAddAccount,
}: WalletBanksHeaderProps) {
  return (
    <PageHeader
      title="Accounts"
      description="Cash balances, brokerage accounts, and transaction activity."
      actions={(
        <>
          <button type="button" onClick={onLogTransaction} className="btn-token btn-primary btn-compact">
            <ArrowRightLeft size={14} strokeWidth={2.2} />
            <span>Log Transaction / Transfer</span>
          </button>
          <button type="button" onClick={onAddAccount} className="btn-token btn-secondary btn-compact">
            <Plus size={14} strokeWidth={2} />
            <span>New Account</span>
          </button>
        </>
      )}
    />
  );
}
