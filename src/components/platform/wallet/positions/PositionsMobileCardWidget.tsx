'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatUiLabel } from '@/lib/format-ui-label';
import { MobileOrdersSkeleton } from '@/components/platform/OrdersSkeleton';
import {
  type GroupedOrder,
  formatPrice,
  formatQuantity,
  formatMoney,
} from './positionsTypes';

function TickerLogo({ symbol, logoUrl, size = 'md' }: { symbol: string; logoUrl?: string | null; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';

  return (
    <div className={`${sizeClasses} rounded-full bg-plt-card border border-plt-border-soft shrink-0 flex items-center justify-center overflow-hidden`}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image ticker-logo-fill"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold font-mono text-plt-text">
          {symbol.replace('.CA', '').slice(0, 2)}
        </span>
      )}
    </div>
  );
}

interface PositionsMobileCardWidgetProps {
  loading: boolean;
  sortedGroupedOrders: GroupedOrder[];
  filter: 'ALL' | 'OPEN' | 'CLOSED';
}

export default function PositionsMobileCardWidget({
  loading,
  sortedGroupedOrders,
  filter,
}: PositionsMobileCardWidgetProps) {
  return (
    <div className="md:hidden w-full min-w-0 relative flex flex-col space-y-3">
      {loading ? (
        <MobileOrdersSkeleton />
      ) : sortedGroupedOrders.length === 0 ? (
        <div className="p-10 text-center text-plt-muted text-xs font-sans">
          No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
        </div>
      ) : (
        sortedGroupedOrders.map((group) => {
          const isMulti = group.orders.length > 1;

          return (
            <div key={group.key} className="bg-plt-card border border-plt-border-soft rounded-xl p-4 space-y-3 w-full min-w-0">
              <div className="flex justify-between items-start border-b border-plt-border-soft pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/invest?ticker=${group.tickerSymbol}&view=chart&timeframe=D`}
                        className="font-bold text-plt-text hover:text-white text-xs font-sans"
                      >
                        {group.tickerSymbol.replace('.CA', '')}
                      </Link>
                      {isMulti && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-plt-hover text-plt-muted border border-plt-border-soft">
                          {group.orders.length} Lots
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-plt-muted truncate max-w-44 leading-tight mt-0.5 font-sans">
                      {group.companyName}
                    </div>
                  </div>
                </div>
                <span
                  className={`badge font-sans ${
                    group.status === 'OPEN'
                      ? 'badge-profit'
                      : 'badge-muted'
                  }`}
                >
                  {formatUiLabel(group.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div>
                  <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">
                    {isMulti ? 'Avg Entry' : 'Entry'}
                  </span>
                  <span className="text-plt-text font-semibold font-sans">{formatPrice(group.avgEntryPrice)}</span>
                  <span className="text-plt-muted text-[10px] block font-sans">
                    {isMulti ? `${group.firstEntryDate} → ${group.lastEntryDate}` : group.orders[0].entryDate}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">Current</span>
                  <span className="text-plt-text font-semibold font-sans">{formatPrice(group.currentPrice)}</span>
                  <span className="text-plt-muted text-[10px] block font-sans">Qty: {formatQuantity(group.totalQuantity)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-plt-border-soft pt-2 font-sans">
                <div>
                  <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">Mkt Value</span>
                  <span className="text-plt-text font-semibold font-sans">
                    {group.status === 'OPEN' ? formatPrice(group.totalMktValue) : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-plt-muted uppercase block mb-0.5 font-sans">Total P/L</span>
                  <span
                    className={`font-semibold font-sans ${
                      group.totalProfitLoss > 0
                        ? 'text-plt-profit'
                        : group.totalProfitLoss < 0
                        ? 'text-plt-risk'
                        : 'text-plt-muted'
                    }`}
                  >
                    {formatMoney(group.totalProfitLoss)}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
