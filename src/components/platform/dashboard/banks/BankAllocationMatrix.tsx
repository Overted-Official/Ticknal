'use client';

import React from 'react';
import Image from 'next/image';
import { Landmark } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type BankDistributionItem = {
  id: number;
  name: string;
  bankName: string;
  accountType: string;
  currency: string;
  rawBalance: number;
  egpVal: number;
  percentage: number;
  logoUrl?: string | null;
};

interface BankAllocationMatrixProps {
  distribution: BankDistributionItem[];
}

export default function BankAllocationMatrix({ distribution }: BankAllocationMatrixProps) {
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="card-widget select-none flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-plt-border-soft">
        <div>
          <h3 className="widget-title">
            Account-by-Account Allocation Matrix
          </h3>
          <p className="widget-subtitle mt-0.5">
            Distribution and percentage allocation across all connected bank and brokerage accounts
          </p>
        </div>
      </div>

      {distribution.length === 0 ? (
        <div className="py-8 text-center text-xs text-plt-muted font-sans">
          No accounts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {distribution.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl bg-plt-surface hover:bg-plt-hover/60 transition-all space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-plt-hover flex items-center justify-center overflow-hidden shrink-0 border border-plt-border-soft/60">
                    {b.logoUrl ? (
                      <Image src={b.logoUrl} alt={b.bankName} width={24} height={24} className="object-contain" unoptimized />
                    ) : (
                      <Landmark size={16} className="text-plt-muted" />
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-plt-text font-sans truncate">{b.name}</h4>
                    <p className="text-[10px] text-plt-muted font-sans truncate">
                      {['BROKERAGE', 'BROKER_CASH'].includes(b.accountType) ? 'Brokerage account' : b.bankName}
                    </p>
                  </div>
                </div>
                <span className="text-xs tabular-nums font-semibold text-plt-text font-sans shrink-0 ml-2">
                  {b.percentage.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-plt-hover h-1.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-plt-info h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
                />
              </div>

              <div className="flex items-baseline justify-between text-xs tabular-nums pt-0.5">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-plt-muted font-sans">
                  {b.currency}
                </span>
                <span className="text-plt-text font-semibold font-sans">
                  {isPrivacy ? (
                    <span className="tracking-wider">****** {b.currency}</span>
                  ) : (
                    <>
                      {b.currency === 'USD' ? '$' : ''}
                      {b.rawBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {b.currency === 'EGP' ? ' £' : ''}
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
