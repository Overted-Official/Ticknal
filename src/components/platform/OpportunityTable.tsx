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
      <div className="md:hidden flex flex-col space-y-2 p-3">
        {opportunities.length === 0 ? (
          <div className="p-6 text-center text-white/40 text-xs font-normal">{emptyText}</div>
        ) : (
          opportunities.map((item) => (
            <div key={`${item.symbol}-${item.signal.date}`} className="bg-transparent rounded-md border border-white/[0.09] p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.09]">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain bg-transparent" />
                    ) : (
                      <span className="text-[9px] font-bold text-white">
                        {item.symbol.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-semibold text-white hover:text-plt-orange text-xs">
                      {item.symbol.replace('.CA', '')}
                    </Link>
                    {!compact && <div className="text-[10px] text-white/40">{item.sector}</div>}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOpp(item)}
                  className={`rounded-[4px] px-2.5 py-0.5 text-[10px] font-medium transition-all ${
                    item.signal.signal === 'BUY' 
                      ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25 hover:bg-[#22c55e]/25' 
                      : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/25 hover:bg-[#ef4444]/25'
                  }`}
                >
                  {formatSignal(item.signal.signal)}
                </button>
              </div>
              <div className="flex justify-between items-end mt-2 pt-2 border-t border-white/[0.04]">
                <div className="text-[10px] text-white/40 font-mono">{item.signal.date}</div>
                <div className="text-right">
                  <div className={`font-mono font-semibold text-xs ${item.signal.signal === 'BUY' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
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
        <table className="w-full text-left text-xs text-white">
          <thead className="bg-transparent border-b border-white/[0.09] text-[11px] font-medium text-white/30">
            <tr>
              <th className="px-6 py-3.5">Ticker</th>
              {!compact && <th className="px-6 py-3.5">Sector</th>}
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5 text-right">Price</th>
              <th className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={compact ? 4 : 5} className="px-6 py-8 text-center text-white/40 text-xs">
                  {emptyText}
                </td>
              </tr>
            ) : (
              opportunities.map((item) => (
                <tr key={`${item.symbol}-${item.signal.date}`} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.09]">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain bg-transparent" />
                        ) : (
                          <span className="text-[9px] font-bold text-white">
                            {item.symbol.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/charts?ticker=${item.symbol}&timeframe=D`} className="font-semibold text-xs text-white group-hover:text-plt-orange transition-colors">
                          {item.symbol.replace('.CA', '')}
                        </Link>
                        {!compact && <span className="text-[10px] text-white/40 truncate max-w-[130px]">{item.companyName}</span>}
                      </div>
                    </div>
                  </td>
                  {!compact && <td className="px-6 py-3.5 whitespace-nowrap text-white/50 text-[11px]">{item.sector}</td>}
                  <td className="px-6 py-3.5 whitespace-nowrap text-white/40 font-mono text-[11px]">{item.signal.date}</td>
                  <td className={`px-6 py-3.5 whitespace-nowrap text-right font-mono text-xs font-semibold ${item.signal.signal === 'BUY' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {item.signal.price.toFixed(2)} EGP
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    <button
                      onClick={() => setSelectedOpp(item)}
                      className={`inline-block rounded-[4px] px-2.5 py-0.5 text-[10px] font-medium transition-all ${
                        item.signal.signal === 'BUY' 
                          ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25 hover:bg-[#22c55e]/25' 
                          : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/25 hover:bg-[#ef4444]/25'
                      }`}
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
