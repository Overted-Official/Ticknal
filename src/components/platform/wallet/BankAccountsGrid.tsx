'use client';

import React from 'react';
import Image from 'next/image';
import { CreditCard, Landmark, Trash2 } from 'lucide-react';
import { type BankAccount } from '@/types/bank';

interface BankAccountsGridProps {
  accounts: BankAccount[];
  onOpenAddModal: () => void;
  onDeleteAccount: (id: number) => void;
}

export default function BankAccountsGrid({
  accounts,
  onOpenAddModal,
  onDeleteAccount,
}: BankAccountsGridProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
          Connected Bank Accounts ({accounts.length})
        </h2>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3">
          <Landmark size={36} className="text-white/20" />
          <p className="text-sm text-white/60">No bank accounts added yet.</p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition shadow-lg shadow-emerald-500/10"
          >
            + Add Your First Bank Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {accounts.map((acc) => {
            const bal = Number(acc.balance);
            const isUsd = acc.currency === 'USD';

            return (
              <div
                key={acc.id}
                className="glass-panel rounded-xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all relative overflow-hidden"
              >
                {/* Header: Bank Logo + Name + Account Type */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {acc.bankLogoUrl ? (
                        <Image
                          src={acc.bankLogoUrl}
                          alt={acc.bankName || acc.accountName}
                          width={36}
                          height={36}
                          className="object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Landmark size={20} className="text-white/40" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                        {acc.accountName}
                      </h3>
                      <p className="text-[11px] text-white/40 line-clamp-1">
                        {acc.bankName || acc.customBankName || 'Egyptian Bank'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isUsd
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {acc.currency}
                  </span>
                </div>

                {/* Balance & Actions */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] text-white/40 font-medium uppercase">Balance</div>
                    <div className="text-lg md:text-xl font-bold font-mono text-white tracking-tight">
                      {isUsd ? '$' : ''}
                      {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {!isUsd ? ' EGP' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-1.5 rounded bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition"
                      title="Delete Account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
