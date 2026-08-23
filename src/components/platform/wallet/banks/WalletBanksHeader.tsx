'use client';

import React from 'react';
import { ArrowRightLeft, Plus } from '@/components/ui/icon-library';

interface WalletBanksHeaderProps {
  onLogTransaction: () => void;
  onAddAccount: () => void;
}

export default function WalletBanksHeader({
  onLogTransaction,
  onAddAccount,
}: WalletBanksHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-2 shrink-0 select-none">
      <div>
        <h1 className="page-title mb-1">
          Bank Accounts & Ledger
        </h1>
        <p className="page-subtitle truncate">
          Multi-currency liquid reserves & cash flow ledger
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onLogTransaction}
          className="btn-token btn-primary btn-compact"
        >
          <ArrowRightLeft size={14} strokeWidth={2.2} />
          <span>Log Transaction / Transfer</span>
        </button>
        <button
          type="button"
          onClick={onAddAccount}
          className="btn-token btn-secondary btn-compact"
        >
          <Plus size={14} strokeWidth={2} />
          <span>New Account</span>
        </button>
      </div>
    </div>
  );
}
