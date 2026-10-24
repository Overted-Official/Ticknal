'use client';

import React, { useState } from 'react';
import { Check, Edit2, X } from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import { formatCleanAccountTitle } from '@/lib/utils/format-bank-name';
import { toast } from '@/components/ui/sonner';

interface AccountBalanceCardProps {
  account: BankAccount;
  usdRate?: number;
  isArabic?: boolean;
  onBalanceUpdated?: (accountId: number, newBalance: number) => void;
}

function getAccountBadge(bankShort: string, accountType?: string): string {
  const clean = (bankShort || '').trim();
  if (!clean) return 'ACC';
  if (clean.length <= 3) return clean.toUpperCase();
  const upper = clean.toUpperCase();
  if (upper.includes('MISR')) return 'BM';
  if (upper.includes('AHLI') || upper.includes('NBE') || upper.includes('NATIONAL BANK')) return 'NBE';
  if (upper.includes('CAIRO') || upper.includes('BDC')) return 'BDC';
  if (upper.includes('COMMERCIAL') || upper.includes('CIB')) return 'CIB';
  if (upper.includes('THNDR')) return 'TH';
  if (upper.includes('VODAFONE')) return 'VF';
  if (upper.includes('INSTAPAY')) return 'IP';
  if (upper.includes('ETISALAT')) return 'ET';
  if (upper.includes('ORANGE')) return 'OG';
  if (upper.includes('CASH')) return 'CSH';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
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
  const badge = getAccountBadge(bankShort, account.accountType);

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

  const formattedBalance = currentBalance.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={`account-pill-card group relative flex items-center gap-2.5 px-3 py-2 rounded-full border border-border-subtle hover:border-border-default bg-black hover:bg-white/[0.04] transition-all shrink-0 select-none ${
        isEditing ? 'border-brand-blue bg-white/[0.03]' : ''
      }`}
    >
      {/* Left Circular Badge */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-surface-raised text-text-primary border border-border-subtle group-hover:border-border-default transition-colors">
        {badge}
      </div>

      {/* Right Account Info Block or Inline Edit */}
      {isEditing ? (
        <div className="flex items-center gap-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
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
            className="w-full min-w-0 px-1.5 py-0.5 text-xs font-bold text-text-primary bg-surface-raised border border-brand-blue rounded-md outline-none tabular-nums"
            placeholder="0.00"
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 rounded-md bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shrink-0 cursor-pointer"
            title={isArabic ? 'حفظ (Enter)' : 'Save (Enter)'}
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
            className="p-1 rounded-md border border-border-subtle hover:bg-white/10 text-text-muted transition-colors shrink-0 cursor-pointer"
            title={isArabic ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {/* Top Line: Name + Currency + Optional Sub-label */}
          <div className="flex items-center gap-1 leading-none min-w-0">
            <span className="text-xs font-medium text-text-primary tracking-tight whitespace-nowrap truncate">
              {bankShort}
            </span>
            <span className="text-[10px] font-semibold text-text-muted shrink-0 uppercase">
              {account.currency}
            </span>
            {subName && (
              <span className="text-text-muted text-[10px] opacity-60 truncate shrink-0 max-w-[55px]">
                • {subName}
              </span>
            )}
          </div>

          {/* Bottom Line: Formatted Balance + Quick Edit Pencil on Hover */}
          <div className="flex items-center justify-between gap-1 mt-1 leading-none min-w-0">
            <div
              className="flex items-center gap-1 min-w-0 truncate"
              title={isUsd ? `≈ ${Math.round(egpValue).toLocaleString()} ${isArabic ? 'ج.م' : 'EGP'}` : undefined}
            >
              <span className="text-xs font-bold text-text-primary tabular-nums truncate">
                {formattedBalance}
              </span>
              <span className="text-[9px] font-medium text-text-muted uppercase tracking-tight shrink-0">
                {isUsd ? 'USD' : (isArabic ? 'ج.م' : 'EGP')}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBalanceInput(String(currentBalance));
                setIsEditing(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-text-primary transition-opacity cursor-pointer shrink-0"
              title={isArabic ? 'تحديث الرصيد سريعاً' : 'Quick update balance'}
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
