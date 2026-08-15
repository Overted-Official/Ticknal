'use client';

import Link from 'next/link';
import { useState } from 'react';
import AddOrderModal, { InitialOrderData } from '@/components/platform/AddOrderModal';

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
          <div className="p-4 text-center text-plt-muted text-[12px] font-normal">{emptyText}</div>
        ) : (
          opportunities.map((item) => (
            <div key={`${item.symbol}-${item.signal.date}`} className="bg-plt-card rounded-tv-lg border border-plt-border p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-plt-surface flex items-center justify-center overflow-hidden shrink-0 border border-plt-border">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain bg-transparent" />
                    ) : (
                      <span className="text-[12px] font-medium text-plt-muted">
                        {item.symbol.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-medium text-plt-text hover:text-plt-red text-[12px]">
                      {item.symbol}
                    </Link>
                    {!compact && <div className="text-[12px] font-light text-plt-muted">{item.sector}</div>}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOpp(item)}
                  className={`rounded-tv-sm px-4 py-1 text-[12px] font-medium transition-colors ${item.signal.signal === 'BUY' ? 'bg-plt-green hover:bg-plt-green/90 text-black' : 'bg-plt-red hover:bg-plt-red/90 text-white'}`}
                >
                  {formatSignal(item.signal.signal)}
                </button>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="text-[12px] font-light text-plt-muted">{item.signal.date}</div>
                <div className="text-right">
                  <div className={`font-medium text-[12px] ${item.signal.signal === 'BUY' ? 'text-plt-green' : 'text-plt-red'}`}>
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
        <table className="w-full text-left text-[12px] text-plt-text">
          <thead className="bg-plt-card sticky top-0 z-10 border-b border-plt-border text-[11px] uppercase text-plt-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Ticker</th>
              {!compact && <th className="px-5 py-3 font-medium">Sector</th>}
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium text-right">Price</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-plt-border bg-plt-surface">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={compact ? 4 : 5} className="px-5 py-8 text-center text-plt-muted text-[12px] font-normal">
                  {emptyText}
                </td>
              </tr>
            ) : (
              opportunities.map((item) => (
                <tr key={`${item.symbol}-${item.signal.date}`} className="hover:bg-plt-hover transition-colors group">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-plt-card flex items-center justify-center overflow-hidden shrink-0 border border-plt-border">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain bg-transparent" />
                        ) : (
                          <span className="text-[12px] font-medium text-plt-muted">
                            {item.symbol.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-medium text-[12px] text-plt-text group-hover:text-plt-red transition-colors">
                          {item.symbol}
                        </Link>
                        {!compact && <div className="text-[12px] font-light text-plt-muted truncate max-w-[150px]">{item.companyName}</div>}
                      </div>
                    </div>
                  </td>
                  {!compact && <td className="px-5 py-3 whitespace-nowrap text-plt-muted text-[12px] font-normal">{item.sector}</td>}
                  <td className="px-5 py-3 whitespace-nowrap text-plt-muted text-[12px] font-normal">{item.signal.date}</td>
                  <td className={`px-5 py-3 whitespace-nowrap text-right text-[12px] font-medium ${item.signal.signal === 'BUY' ? 'text-plt-green' : 'text-plt-red'}`}>
                    {item.signal.price.toFixed(2)} EGP
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right text-[12px] font-medium">
                    <button
                      onClick={() => setSelectedOpp(item)}
                      className={`inline-block rounded-tv-sm px-4 py-1 text-[12px] font-medium transition-colors shadow-sm ${item.signal.signal === 'BUY' ? 'bg-plt-green hover:bg-plt-green/90 text-black' : 'bg-plt-red hover:bg-plt-red/90 text-white'}`}
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

      {selectedOpp && initialOrderData && (
        <AddOrderModal
          isOpen={!!selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onSuccess={() => {
            setSelectedOpp(null);
            window.location.reload();
          }}
          initialData={initialOrderData}
        />
      )}
    </>
  );
}
