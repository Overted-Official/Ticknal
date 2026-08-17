'use client';

import React from 'react';
import Image from 'next/image';
import { Landmark } from 'lucide-react';

export type BankDistributionItem = {
  id: number;
  name: string;
  bankName: string;
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
  return (
    <div className="glass-panel rounded-xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Landmark size={16} className="text-sky-400" />
          Bank-by-Bank Allocation Matrix
        </h3>
      </div>

      {distribution.length === 0 ? (
        <div className="py-6 text-center text-xs text-white/40">
          No bank accounts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {distribution.map((b) => (
            <div key={b.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-white/[0.05] flex items-center justify-center overflow-hidden shrink-0">
                    {b.logoUrl ? (
                      <Image src={b.logoUrl} alt={b.bankName} width={24} height={24} className="object-contain" unoptimized />
                    ) : (
                      <Landmark size={14} className="text-white/40" />
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-white truncate">{b.name}</h4>
                    <p className="text-[10px] text-white/40 truncate">{b.bankName}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-white/50">{b.percentage.toFixed(1)}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
                />
              </div>

              <div className="flex items-baseline justify-between text-[11px] font-mono pt-1">
                <span className="text-white/40">{b.currency}</span>
                <span className="text-white font-bold">
                  {b.currency === 'USD' ? '$' : ''}
                  {b.rawBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {b.currency === 'EGP' ? ' EGP' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
