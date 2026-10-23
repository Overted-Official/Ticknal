'use client';

import React, { useState } from 'react';
import { Check, Edit2, X, Landmark, Wallet, CreditCard, DollarSign } from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import { formatCleanAccountTitle } from '@/lib/utils/format-bank-name';
import { toast } from '@/components/ui/sonner';

interface AccountBalanceCardProps {
  account: BankAccount;
  usdRate?: number;
  isArabic?: boolean;
  onBalanceUpdated?: (accountId: number, newBalance: number) => void;
}

export default function AccountBalanceCard({
  account,
  usdRate = 50.2,
  isArabic = false,
  onBalanceUpdated,
}: AccountBalanceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(account.balance ?? '0'));
  const [isSaving, setIsSaving] = useState(false);

  const { bankShort, subName } = formatCleanAccountTitle(account);
  const currentBalance = Number(account.balance) || 0;
  const isUsd = account.currency === 'USD';
  const egpValue = isUsd ? currentBalance * usdRate : currentBalance;

  // Icon mapping by account type
  const getAccountIcon = () => {
    const type = (account.accountType || '').toUpperCase();
    if (isUsd) return <DollarSign className="w-4 h-4 text-emerald-400" />;
    if (type.includes('WALLET') || type.includes('CASH')) return <Wallet className="w-4 h-4 text-brand-blue" />;
    if (type.includes('BROKER')) return <CreditCard className="w-4 h-4 text-amber-400" />;
    return <Landmark className="w-4 h-4 text-purple-400" />;
  };

  const handleSave = async () => {
    const num = Number(balanceInput);
    if (!Number.isFinite(num)) {
      toast.error(isArabic ? 'يرجى إدخال رقم صحيح' : 'Please enter a valid number');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/banks/accounts/${account.id}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, balance: num }),
      });

      if (!res.ok) throw new Error('Failed to update balance');

      setIsEditing(false);
      onBalanceUpdated?.(account.id, num);
      toast.success(
        isArabic ? `تم تحديث رصيد ${bankShort}` : `Updated ${bankShort} balance`
      );
    } catch {
      toast.error(isArabic ? 'فشل تحديث الرصيد' : 'Failed to update balance');
    } finally {
      setIsSaving(false);
    }
  };

  const formatMoney = (val: number, cur: string) => {
    const formatted = val.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${cur === 'EGP' && isArabic ? 'ج.م' : cur}`;
  };

  const updatedAt = account.updatedAt ? new Date(account.updatedAt) : null;
  const daysAgo = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="relative p-4 rounded-xl border border-white/10 bg-transparent hover:border-white/20 hover:bg-white/[0.02] transition-all flex flex-col justify-between font-sans group">
      {/* Top Header: Account Info & Quick Edit Toggle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-raised border border-white/10 flex items-center justify-center shrink-0">
            {getAccountIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text-primary truncate">
              {bankShort}
            </h4>
            <p className="text-[11px] text-text-muted truncate">
              {subName || account.accountType}
            </p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-text-secondary shrink-0">
          {account.currency}
        </span>
      </div>

      {/* Middle: Live Balance or Inline Input */}
      <div className="mt-3.5 mb-2">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              autoFocus
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full px-2.5 py-1.5 text-base font-bold text-text-primary bg-surface-raised border border-brand-blue rounded-lg outline-none tabular-nums font-sans"
              placeholder="0.00"
              disabled={isSaving}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 rounded-lg bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shrink-0 cursor-pointer"
              title={isArabic ? 'حفظ (Enter)' : 'Save (Enter)'}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-text-muted transition-colors shrink-0 cursor-pointer"
              title={isArabic ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg sm:text-xl font-bold text-text-primary tabular-nums tracking-tight">
                {formatMoney(currentBalance, account.currency)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBalanceInput(String(currentBalance));
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-text-primary transition-opacity cursor-pointer"
                title={isArabic ? 'تحديث الرصيد سريعاً' : 'Quick update balance'}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {isUsd && (
              <span className="text-[11px] text-text-muted tabular-nums mt-0.5">
                ≈ {formatMoney(egpValue, 'EGP')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Status / Inline Update Action */}
      <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-white/[0.06]">
        <span>
          {daysAgo === null || daysAgo === 0
            ? (isArabic ? 'تم التحديث اليوم' : 'Updated today')
            : (isArabic ? `منذ ${daysAgo} يوم` : `${daysAgo}d ago`)}
        </span>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setBalanceInput(String(currentBalance));
              setIsEditing(true);
            }}
            className="text-[11px] font-semibold text-brand-blue hover:text-brand-blue-hover transition-colors cursor-pointer"
          >
            {isArabic ? 'تحديث الرصيد' : 'Quick Update'}
          </button>
        )}
      </div>
    </div>
  );
}
