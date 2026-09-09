'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type DashboardOrder } from '../../DashboardInvestmentsView';
import { type Opportunity } from '@/components/platform/OpportunityTable';

interface DashboardPositionsCardProps {
  orders: DashboardOrder[];
  exitSignals?: Opportunity[];
}

export default function DashboardPositionsCard({ orders, exitSignals }: DashboardPositionsCardProps) {
  const { isPrivacy } = usePrivacyMode();
  const [isExpandedMobile, setIsExpandedMobile] = useState(true);

  const exitSignalsMap = useMemo(() => {
    const map = new Map<string, Opportunity>();
    if (!exitSignals) return map;
    for (const sig of exitSignals) {
      const sym = sig.symbol.replace('.CA', '').trim().toUpperCase();
      map.set(sym, sig);
    }
    return map;
  }, [exitSignals]);

  const formatMoney = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) {
      if (value === 0) return '****** £';
      const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
      return `${sign}****** £`;
    }
    if (value === 0) return '0.00 £';
    const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted} £`;
  };

  const formatPrice = (value: number): string => {
    if (isPrivacy) return '****** £';
    return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;
  };

  return (
    <div className="card-widget select-none flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-3 border-b border-plt-border-soft cursor-pointer md:cursor-default"
        onClick={() => setIsExpandedMobile(!isExpandedMobile)}
      >
        <div>
          <h2 className="widget-title flex items-center gap-2">
            Active Positions
            <span className="md:hidden text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-plt-hover text-plt-muted font-sans font-normal">
              {orders.length}
            </span>
          </h2>
          <p className="widget-subtitle mt-0.5">
            Summary of currently open portfolio holdings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/positions"
            onClick={(e) => e.stopPropagation()}
            className="btn-token btn-secondary btn-compact"
          >
            All Positions →
          </Link>
          <button
            type="button"
            className="md:hidden p-1 text-plt-muted hover:text-plt-text"
            aria-label="Toggle active positions"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpandedMobile ? 'rotate-180 text-plt-text' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className={`${isExpandedMobile ? 'block' : 'hidden'} md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar pt-2`}>
        {/* Desktop View */}
        <div className="hidden md:block">
          <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
            <thead className="sticky top-0 bg-plt-base z-10">
              <tr className="text-plt-muted text-[10px] font-semibold uppercase tracking-wider">
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Entry</th>
                <th className="py-2 px-3 text-right">Current</th>
                <th className="py-2 px-3 text-right">Position Value</th>
                <th className="py-2 px-3 text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-plt-muted text-xs font-sans">
                    No active open positions
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const cleanSymbol = order.tickerSymbol.replace('.CA', '').trim().toUpperCase();
                  const exitSignal = exitSignalsMap.get(cleanSymbol);

                  return (
                    <tr key={order.id} className="hover:bg-plt-hover/50 transition-colors group">
                      <td className="py-2 px-3 rounded-l-xl">
                        <div className="flex items-center gap-2.5">
                          <PositionLogo logoUrl={order.logoUrl} symbol={order.tickerSymbol} />
                          <div className="min-w-0">
                            <Link
                              href={`/invest?ticker=${order.tickerSymbol}&view=chart&timeframe=D`}
                              className="font-semibold text-xs text-plt-text group-hover:text-white transition-colors font-sans block"
                            >
                              {order.tickerSymbol}
                            </Link>
                            <div className="text-[10px] text-plt-muted truncate max-w-28 font-sans">
                              {order.companyName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {exitSignal ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-plt-risk/15 text-plt-risk border border-plt-risk/30 shadow-xs cursor-default"
                            title={`${exitSignal.strategyShortName || 'Strategy'} exit trigger on ${exitSignal.signal.date}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-plt-risk animate-pulse" />
                            <span>SELL</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-plt-card border border-plt-border-soft text-plt-muted cursor-default"
                            title="Strategy status: HOLD (No sell signal in the last 5 days)"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                            <span>HOLD</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <div className="text-plt-text text-xs font-sans">{formatPrice(order.entryPrice)}</div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <div className="text-plt-text text-xs font-sans font-medium">{formatPrice(order.currentPrice)}</div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-plt-text text-xs font-sans font-semibold">
                        {formatPrice(order.currentPrice * order.quantity)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums rounded-r-xl">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          order.profitLoss >= 0
                            ? 'text-plt-profit bg-plt-profit/10'
                            : 'text-plt-risk bg-plt-risk/10'
                        }`}>
                          {formatMoney(order.profitLoss, true)} ({order.profitLossPct.toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-2">
          {orders.length === 0 ? (
            <div className="py-6 text-center text-plt-muted text-xs font-sans">
              No active open positions
            </div>
          ) : (
            orders.slice(0, 6).map((order) => {
              const cleanSymbol = order.tickerSymbol.replace('.CA', '').trim().toUpperCase();
              const exitSignal = exitSignalsMap.get(cleanSymbol);

              return (
                <div key={order.id} className="flex items-center justify-between p-2.5 rounded-xl bg-plt-card border border-plt-border-soft">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-plt-hover flex items-center justify-center overflow-hidden shrink-0 border border-plt-border-soft">
                      {order.logoUrl ? (
                        <img src={order.logoUrl} alt={order.tickerSymbol} className="ticker-logo-image ticker-logo-fill" />
                      ) : (
                        <span className="text-xs font-semibold text-plt-text font-sans">
                          {order.tickerSymbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/invest?ticker=${order.tickerSymbol}&view=chart&timeframe=D`} className="font-semibold text-xs text-plt-text hover:text-white font-sans">
                          {order.tickerSymbol}
                        </Link>
                        {exitSignal ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-plt-risk/15 text-plt-risk border border-plt-risk/30">
                            <span className="w-1 h-1 rounded-full bg-plt-risk animate-pulse" />
                            <span>SELL</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-mono font-medium bg-plt-card border border-plt-border-soft text-plt-muted">
                            <span className="w-1 h-1 rounded-full bg-emerald-400/80" />
                            <span>HOLD</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-plt-muted truncate font-sans">{order.companyName}</div>
                    </div>
                  </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-plt-text font-sans">{formatPrice(order.currentPrice * order.quantity)}</div>
                  <span className={`text-[11px] font-semibold font-sans ${order.profitLoss >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {formatMoney(order.profitLoss, true)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}

function PositionLogo({
  logoUrl,
  symbol,
}: {
  logoUrl?: string | null;
  symbol: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className="w-7 h-7 rounded-lg bg-plt-card/90 border border-plt-border-soft flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-xs">
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image ticker-logo-fill"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-lg bg-plt-card/90 border border-plt-border-soft flex items-center justify-center text-[10px] font-bold text-plt-info shrink-0 shadow-xs select-none">
      {symbol.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}
    </div>
  );
}
