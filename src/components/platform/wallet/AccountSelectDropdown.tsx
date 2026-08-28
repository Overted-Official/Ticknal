'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ChevronDown, Check, Landmark } from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import { formatCleanAccountTitle } from '@/lib/format-bank-name';

interface AccountSelectDropdownProps {
  accounts: BankAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  placeholder?: string;
  excludeAccountId?: string;
}

export default function AccountSelectDropdown({
  accounts,
  selectedAccountId,
  onSelectAccount,
  placeholder = 'Select Bank Account...',
  excludeAccountId,
}: AccountSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  const filteredAccounts = useMemo(() => {
    if (!excludeAccountId) return accounts;
    return accounts.filter((a) => String(a.id) !== String(excludeAccountId));
  }, [accounts, excludeAccountId]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => String(a.id) === String(selectedAccountId)) || null;
  }, [accounts, selectedAccountId]);

  const selectedMeta = selectedAccount ? formatCleanAccountTitle(selectedAccount) : null;
  const isUsd = selectedAccount?.currency === 'USD';
  const selBal = selectedAccount ? Number(selectedAccount.balance) || 0 : 0;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 w-full flex items-center justify-between px-3 rounded-xl border text-left text-xs font-sans transition-all cursor-pointer ${
          isOpen
            ? 'bg-white/[0.06] border-white/40 ring-1 ring-white/10 text-plt-text'
            : 'bg-white/[0.04] border-plt-border-soft hover:border-plt-border-strong text-plt-text'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedAccount && selectedMeta ? (
            <>
              {/* Bank Logo */}
              <div className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shrink-0 overflow-hidden relative">
                {selectedAccount.bankLogoUrl ? (
                  <Image
                    src={selectedAccount.bankLogoUrl}
                    alt={selectedMeta.bankShort}
                    width={20}
                    height={20}
                    className="w-full h-full object-contain p-0.5"
                    unoptimized
                  />
                ) : (
                  <Landmark size={12} className="text-plt-muted" />
                )}
              </div>

              {/* Bank Short Name & Sub-name */}
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-bold text-xs text-plt-text tracking-tight shrink-0">
                  {selectedMeta.bankShort}
                </span>
                <span className="text-[11px] text-plt-muted truncate">
                  {selectedMeta.subName}
                </span>
              </div>

              {/* Currency Tag */}
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider shrink-0 font-sans ${
                  isUsd
                    ? 'bg-plt-info/15 text-plt-info border border-plt-info/30'
                    : 'bg-plt-profit/15 text-plt-profit border border-plt-profit/30'
                }`}
              >
                {selectedAccount.currency}
              </span>

              {selectedAccount.isDefaultExpense && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-plt-warning/15 text-plt-warning border border-plt-warning/30 shrink-0 font-sans inline-flex items-center gap-0.5">
                  ⭐ Main
                </span>
              )}
            </>
          ) : (
            <span className="text-plt-muted truncate font-sans">{placeholder}</span>
          )}
        </div>

        {/* Far Right: Balance & Chevron */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {selectedAccount && (
            <span
              className={`font-bold tabular-nums text-xs font-sans ${
                isUsd ? 'text-plt-info' : 'text-plt-profit'
              }`}
            >
              {isUsd ? '$' : ''}
              {selBal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {!isUsd ? ' £' : ''}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-plt-muted transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-plt-text' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[70] bg-[#121216] border border-white/[0.14] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-2xl max-h-64 overflow-y-auto custom-scrollbar">
          {filteredAccounts.length === 0 ? (
            <div className="py-4 text-center text-xs text-plt-muted font-sans">
              No accounts available
            </div>
          ) : (
            filteredAccounts.map((acc) => {
              const meta = formatCleanAccountTitle(acc);
              const isSelected = String(acc.id) === String(selectedAccountId);
              const accUsd = acc.currency === 'USD';
              const bal = Number(acc.balance) || 0;

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(String(acc.id));
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-white/[0.08] text-white'
                      : 'hover:bg-white/[0.05] text-plt-text'
                  }`}
                >
                  {/* Left: Logo + Short Name + Sub-name + Currency Tag */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center shrink-0 overflow-hidden relative">
                      {acc.bankLogoUrl ? (
                        <Image
                          src={acc.bankLogoUrl}
                          alt={meta.bankShort}
                          width={20}
                          height={20}
                          className="w-full h-full object-contain p-0.5"
                          unoptimized
                        />
                      ) : (
                        <Landmark size={12} className="text-plt-muted" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-bold text-xs text-white tracking-tight shrink-0">
                        {meta.bankShort}
                      </span>
                      <span className="text-[11px] text-plt-muted truncate group-hover:text-plt-text transition-colors">
                        {meta.subName}
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider shrink-0 font-sans ${
                        accUsd
                          ? 'bg-plt-info/15 text-plt-info border border-plt-info/30'
                          : 'bg-plt-profit/15 text-plt-profit border border-plt-profit/30'
                      }`}
                    >
                      {acc.currency}
                    </span>

                    {acc.isDefaultExpense && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-plt-warning/15 text-plt-warning border border-plt-warning/30 shrink-0 font-sans inline-flex items-center gap-0.5">
                        ⭐ Main
                      </span>
                    )}
                  </div>

                  {/* Right: Balance + Checkmark */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-bold tabular-nums text-xs font-sans ${
                        accUsd ? 'text-plt-info' : 'text-plt-profit'
                      }`}
                    >
                      {accUsd ? '$' : ''}
                      {bal.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {!accUsd ? ' £' : ''}
                    </span>

                    {isSelected && (
                      <Check size={14} className="text-plt-profit shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}