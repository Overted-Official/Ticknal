'use client';

import Link from 'next/link';
import { useState } from 'react';
import AddOrderModal, { InitialOrderData } from '@/components/platform/AddOrderModal';

// Need to match the Opportunity type from page.tsx
export type Opportunity = {
  symbol: string;
  companyName: string;
  sector: string;
  signal: {
    signal: string;
    level: string;
    date: string;
    price: number;
    reasoning?: string;
  };
};

function formatSignal(sig: string) {
  if (sig === 'SELL_TP') return 'TAKE PROFIT';
  if (sig === 'SELL_SL') return 'STOP LOSS';
  if (sig === 'SELL') return 'SELL';
  return sig;
}

export default function OpportunityTable({
  opportunities,
  emptyText,
  compact = false,
}: {
  opportunities: Opportunity[];
  emptyText: string;
  compact?: boolean;
}) {
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  const initialOrderData: InitialOrderData | null = selectedOpp ? {
    symbol: selectedOpp.symbol,
    companyName: selectedOpp.companyName,
    signal: selectedOpp.signal.signal,
    price: selectedOpp.signal.price,
    date: selectedOpp.signal.date || new Date().toISOString().split('T')[0]
  } : null;

  return (
    <>
      {/* Mobile View (Cards) */}
      <div className="md:hidden flex flex-col space-y-2 p-2">
        {opportunities.length === 0 ? (
          <div className="p-4 text-center text-tv-muted">{emptyText}</div>
        ) : (
          opportunities.map((item) => (
            <div key={`${item.symbol}-${item.signal.date}`} className="bg-tv-base rounded-tv-lg border border-tv-border p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-weight-medium text-tv-text hover:text-tv-accent text-sm">
                    {item.symbol}
                  </Link>
                  {!compact && <div className="text-[11px] text-tv-muted">{item.sector}</div>}
                </div>
                <button 
                  onClick={() => setSelectedOpp(item)}
                  className={`rounded-tv-sm px-4 py-1 text-[11px] font-weight-medium transition-colors ${item.signal.signal === 'BUY' ? 'bg-tv-up hover:bg-tv-up/90 text-black' : 'bg-tv-down hover:bg-tv-down/90 text-white'}`}
                >
                  {formatSignal(item.signal.signal)}
                </button>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-[10px] text-tv-muted">{item.signal.date}</div>
                <div className="text-right">
                  <div className="text-[10px] text-tv-muted">{item.signal.level}</div>
                  <div className={`font-weight-medium ${item.signal.signal === 'BUY' ? 'text-tv-up' : 'text-tv-down'}`}>
                    {item.signal.price.toFixed(2)} EGP
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block w-full">
        <table className="w-full text-left text-sm text-tv-text">
          <thead className="bg-tv-surface sticky top-0 z-10 border-b border-tv-border text-xs uppercase text-tv-muted">
            <tr>
              <th className="px-5 py-3 font-weight-medium">Ticker</th>
              {!compact && <th className="px-5 py-3 font-weight-medium">Sector</th>}
              <th className="px-5 py-3 font-weight-medium">Date</th>
              <th className="px-5 py-3 font-weight-medium">Level</th>
              <th className="px-5 py-3 font-weight-medium text-right">Price</th>
              <th className="px-5 py-3 font-weight-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tv-border bg-tv-base">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={compact ? 5 : 6} className="px-5 py-8 text-center text-tv-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              opportunities.map((item) => (
                <tr key={`${item.symbol}-${item.signal.date}`} className="hover:bg-tv-hover transition-colors group">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-weight-medium text-tv-text group-hover:text-tv-accent transition-colors">
                      {item.symbol}
                    </Link>
                    {!compact && <div className="text-xs text-tv-muted truncate max-w-[150px]">{item.companyName}</div>}
                  </td>
                  {!compact && <td className="px-5 py-3 whitespace-nowrap text-tv-muted">{item.sector}</td>}
                  <td className="px-5 py-3 whitespace-nowrap text-tv-muted">{item.signal.date}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-tv-muted">{item.signal.level}</td>
                  <td className={`px-5 py-3 whitespace-nowrap text-right font-weight-medium ${item.signal.signal === 'BUY' ? 'text-tv-up' : 'text-tv-down'}`}>
                    {item.signal.price.toFixed(2)} EGP
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <button 
                      onClick={() => setSelectedOpp(item)}
                      className={`rounded-tv-sm px-4 py-1.5 text-xs font-weight-medium transition-colors ${item.signal.signal === 'BUY' ? 'bg-tv-up hover:bg-tv-up/90 text-black' : 'bg-tv-down hover:bg-tv-down/90 text-white'}`}
                    >
                      {formatSignal(item.signal.signal)}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddOrderModal
        isOpen={!!selectedOpp}
        onClose={() => setSelectedOpp(null)}
        initialData={initialOrderData}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
