'use client';

import Link from 'next/link';
import { useState } from 'react';
import AddOrderModal, { InitialOrderData } from '@/components/platform/AddOrderModal';

// Need to match the Opportunity type from page.tsx
export type Opportunity = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  signal: {
    signal: string;
    level?: string;
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
          <div className="p-4 text-center text-tv-muted text-[12px] font-normal">{emptyText}</div>
        ) : (
          opportunities.map((item) => (
            <div key={`${item.symbol}-${item.signal.date}`} className="bg-tv-base rounded-tv-lg border border-tv-border p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-tv-surface flex items-center justify-center overflow-hidden shrink-0 border border-tv-border">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-medium text-tv-muted">
                        {item.symbol.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-medium text-tv-text hover:text-tv-accent text-[12px]">
                      {item.symbol}
                    </Link>
                    {!compact && <div className="text-[12px] font-light text-tv-muted">{item.sector}</div>}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOpp(item)}
                  className={`rounded-tv-sm px-4 py-1 text-[12px] font-medium transition-colors ${item.signal.signal === 'BUY' ? 'bg-tv-up hover:bg-tv-up/90 text-black' : 'bg-tv-down hover:bg-tv-down/90 text-white'}`}
                >
                  {formatSignal(item.signal.signal)}
                </button>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[12px] font-light text-tv-muted">{item.signal.date}</div>
                <div className="text-right">
                  <div className={`font-medium text-[12px] ${item.signal.signal === 'BUY' ? 'text-tv-up' : 'text-tv-down'}`}>
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
        <table className="w-full text-left text-[12px] text-tv-text">
          <thead className="bg-tv-surface sticky top-0 z-10 border-b border-tv-border text-[12px] uppercase text-tv-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Ticker</th>
              {!compact && <th className="px-5 py-3 font-medium">Sector</th>}
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium text-right">Price</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tv-border bg-tv-base">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={compact ? 4 : 5} className="px-5 py-8 text-center text-tv-muted text-[12px] font-normal">
                  {emptyText}
                </td>
              </tr>
            ) : (
              opportunities.map((item) => (
                <tr key={`${item.symbol}-${item.signal.date}`} className="hover:bg-tv-hover transition-colors group">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-tv-surface flex items-center justify-center overflow-hidden shrink-0 border border-tv-border">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-medium text-tv-muted">
                            {item.symbol.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-medium text-[12px] text-tv-text group-hover:text-tv-accent transition-colors">
                          {item.symbol}
                        </Link>
                        {!compact && <div className="text-[12px] font-light text-tv-muted truncate max-w-[150px]">{item.companyName}</div>}
                      </div>
                    </div>
                  </td>
                  {!compact && <td className="px-5 py-3 whitespace-nowrap text-tv-muted text-[12px] font-normal">{item.sector}</td>}
                  <td className="px-5 py-3 whitespace-nowrap text-tv-muted text-[12px] font-normal">{item.signal.date}</td>
                  <td className={`px-5 py-3 whitespace-nowrap text-right text-[12px] font-medium ${item.signal.signal === 'BUY' ? 'text-tv-up' : 'text-tv-down'}`}>
                    {item.signal.price.toFixed(2)} EGP
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <button 
                      onClick={() => setSelectedOpp(item)}
                      className={`rounded-tv-sm px-4 py-1.5 text-[12px] font-medium transition-colors ${item.signal.signal === 'BUY' ? 'bg-tv-up hover:bg-tv-up/90 text-black' : 'bg-tv-down hover:bg-tv-down/90 text-white'}`}
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
