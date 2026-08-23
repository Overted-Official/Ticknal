'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import AddOrderModal, { InitialOrderData } from '@/components/platform/AddOrderModal';
import { Layers, Sparkles } from '@/components/ui/icon-library';

export type Opportunity = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  strategyId?: string;
  strategyLabel?: string;
  strategyShortName?: string;
  strategyBadgeClassName?: string;
  signal: {
    signal: string;
    level?: string;
    date: string;
    price: number;
    reasoning?: string;
    exitReason?: string;
    entryReason?: string;
  };
};

function formatSignal(sig: string) {
  if (sig === 'SELL_TP') return 'Take profit';
  if (sig === 'SELL_SL') return 'Stop loss';
  if (sig === 'SELL') return 'Sell';
  if (sig === 'BUY') return 'Buy';
  return sig.charAt(0).toUpperCase() + sig.slice(1).toLowerCase();
}

export default function OpportunityTable({
  opportunities,
  emptyText,
  compact = false,
  showFilter = true,
}: {
  opportunities: Opportunity[];
  emptyText: string;
  compact?: boolean;
  showFilter?: boolean;
}) {
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [strategyFilter, setStrategyFilter] = useState<'ALL' | 'psi' | 'thoth_egx_macro'>('ALL');

  // Extract unique strategies present
  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      if (o.strategyId) set.add(o.strategyId);
    });
    return Array.from(set);
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    if (strategyFilter === 'ALL') return opportunities;
    return opportunities.filter((o) => (o.strategyId || 'psi') === strategyFilter);
  }, [opportunities, strategyFilter]);

  const initialOrderData: InitialOrderData | null = selectedOpp ? {
    symbol: selectedOpp.symbol,
    companyName: selectedOpp.companyName,
    signal: selectedOpp.signal.signal,
    price: selectedOpp.signal.price,
    date: selectedOpp.signal.date || new Date().toISOString().split('T')[0]
  } : null;

  return (
    <>
      {/* Optional Strategy Filter Pill Bar */}
      {showFilter && availableStrategies.length > 1 && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-2 border-b border-plt-border-soft bg-plt-hover">
          <button
            type="button"
            onClick={() => setStrategyFilter('ALL')}
            className={`px-2 py-2 rounded-xl text-mini font-medium transition-all ${
              strategyFilter === 'ALL'
                ? 'bg-plt-hover text-plt-text font-medium shadow-sm'
                : 'text-plt-muted hover:text-plt-text'
            }`}
          >
            All ({opportunities.length})
          </button>
          {availableStrategies.includes('psi') && (
            <button
              type="button"
              onClick={() => setStrategyFilter('psi')}
              className={`px-2 py-2 rounded-xl text-mini font-medium transition-all ${
                strategyFilter === 'psi'
                  ? 'bg-plt-info/20 text-plt-info border border-plt-info/30 font-medium shadow-sm'
                  : 'text-plt-muted hover:text-plt-info'
              }`}
            >
              PSI ({opportunities.filter((o) => (o.strategyId || 'psi') === 'psi').length})
            </button>
          )}
          {availableStrategies.includes('thoth_egx_macro') && (
            <button
              type="button"
              onClick={() => setStrategyFilter('thoth_egx_macro')}
              className={`px-2 py-2 rounded-xl text-mini font-medium transition-all ${
                strategyFilter === 'thoth_egx_macro'
                  ? 'bg-plt-violet/20 text-plt-violet border border-plt-violet/30 font-medium shadow-sm'
                  : 'text-plt-muted hover:text-plt-violet'
              }`}
            >
              THOTH 3.7P ({opportunities.filter((o) => o.strategyId === 'thoth_egx_macro').length})
            </button>
          )}
        </div>
      )}



      {/* Mobile View (Cards) */}
      <div className="md:hidden flex flex-col space-y-2 p-4">
        {filteredOpportunities.length === 0 ? (
          <div className="empty-state text-xs font-normal">{emptyText}</div>
        ) : (
          filteredOpportunities.map((item) => (
            <div key={`${item.symbol}-${item.strategyId ?? 'psi'}-${item.signal.date}`} className="surface-widget-soft">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-plt-hover flex items-center justify-center overflow-hidden shrink-0 border border-plt-border">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain bg-transparent" />
                    ) : (
                      <span className="text-compact font-medium text-plt-text">
                        {item.symbol.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/invest?ticker=${item.symbol}&view=chart&timeframe=D`} className="font-medium text-plt-text hover:text-white text-xs">
                        {item.symbol.replace('.CA', '')}
                      </Link>
                      {item.strategyShortName && (
                        <span className={`text-micro tabular-nums font-medium px-2 leading-none min-h-6 inline-flex items-center rounded-xl border ${item.strategyBadgeClassName || 'bg-plt-hover text-plt-subtle border-plt-border'}`}>
                          {item.strategyShortName}
                        </span>
                      )}
                    </div>
                    {!compact && <div className="text-mini text-plt-muted">{item.companyName || item.sector}</div>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOpp(item)}
                  className={`rounded-xl px-2 py-2 text-mini font-medium transition-all ${
                    item.signal.signal === 'BUY'
                      ? 'bg-plt-profit/15 text-plt-profit border border-plt-profit-border hover:bg-plt-profit/25'
                      : 'bg-plt-risk/15 text-plt-risk border border-plt-risk-border hover:bg-plt-risk/25'
                  }`}
                >
                  {formatSignal(item.signal.signal)}
                </button>
              </div>
              <div className="flex justify-between items-end mt-2 pt-2 border-t border-plt-border-soft">
                <div className="text-mini text-plt-muted tabular-nums">{item.signal.date}</div>
                <div className="text-right">
                  <div className={`tabular-nums font-medium text-xs ${item.signal.signal === 'BUY' ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {item.signal.price.toFixed(2)} £
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block w-full overflow-y-auto max-h-[340px] custom-scrollbar">
        <table className="w-full text-left text-xs text-plt-text border-separate border-spacing-y-1 font-sans">
          <thead className="sticky top-0 bg-plt-base z-10">
            <tr className="text-plt-muted text-[10px] font-semibold uppercase tracking-wider">
              <th className="px-3 py-2">Ticker</th>
              <th className="px-3 py-2">Strategy</th>
              {!compact && <th className="px-3 py-2">Sector</th>}
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOpportunities.length === 0 ? (
              <tr>
                <td colSpan={compact ? 5 : 6} className="px-3 py-8 text-center text-plt-muted text-xs">
                  {emptyText}
                </td>
              </tr>
            ) : (
              filteredOpportunities.map((item) => (
                <tr key={`${item.symbol}-${item.strategyId ?? 'psi'}-${item.signal.date}`} className="hover:bg-plt-hover/50 transition-colors group">
                  <td className="px-3 py-2 whitespace-nowrap rounded-l-xl">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-plt-card/90 border border-plt-border-soft flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-xs">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain bg-transparent" />
                        ) : (
                          <span className="text-[10px] font-bold text-plt-info font-sans">
                            {item.symbol.substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/invest?ticker=${item.symbol}&view=chart&timeframe=D`} className="font-semibold text-xs text-plt-text group-hover:text-white transition-colors">
                          {item.symbol.replace('.CA', '')}
                        </Link>
                        {!compact && <span className="text-[10px] text-plt-muted truncate max-w-32">{item.companyName}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[10px] tabular-nums font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                      item.strategyBadgeClassName || 'bg-plt-info/10 text-plt-info'
                    }`}>
                      {item.strategyShortName || 'PSI'}
                    </span>
                  </td>
                  {!compact && <td className="px-3 py-2 whitespace-nowrap text-plt-muted text-[11px]">{item.sector}</td>}
                  <td className="px-3 py-2 whitespace-nowrap text-plt-muted tabular-nums text-[11px]">{item.signal.date}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-right tabular-nums text-xs font-semibold ${item.signal.signal === 'BUY' ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {item.signal.price.toFixed(2)} £
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right rounded-r-xl">
                    <button
                      onClick={() => setSelectedOpp(item)}
                      className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        item.signal.signal === 'BUY'
                          ? 'bg-plt-profit/15 text-plt-profit hover:bg-plt-profit/25'
                          : 'bg-plt-risk/15 text-plt-risk hover:bg-plt-risk/25'
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
