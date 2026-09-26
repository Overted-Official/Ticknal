'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { type HomeInvestmentOrder } from '../homeInvestmentsTypes';
import { type Opportunity } from '@/components/platform/OpportunityTable';

interface PositionRowItemProps {
  order: HomeInvestmentOrder;
  totalMarketValue: number;
  formatMoney: (val: number, showSign?: boolean) => string;
  isPrivacy: boolean;
  exitSignal?: Opportunity;
  showDetails?: boolean;
  onTickerClick: (order: HomeInvestmentOrder) => void;
  onSellClick: (order: HomeInvestmentOrder) => void;
}

export default function PositionRowItem({
  order,
  totalMarketValue,
  formatMoney,
  isPrivacy,
  exitSignal,
  showDetails = false,
  onTickerClick,
  onSellClick,
}: PositionRowItemProps) {
  const [imgError, setImgError] = useState(false);
  const positionVal = order.currentPrice * order.quantity;
  const weightPct = totalMarketValue > 0 ? (positionVal / totalMarketValue) * 100 : 0;
  const isPositive = order.profitLoss >= 0;
  const cleanSymbol = order.tickerSymbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTickerClick(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTickerClick(order);
        }
      }}
      className={`py-2.5 px-1.5 flex items-center justify-between hover:bg-surface-active/30 transition-colors group cursor-pointer border-b border-border-subtle/80 outline-none select-none ${
        exitSignal ? 'bg-rose-500/[0.03]' : ''
      }`}
    >
      {/* Left: Circular Avatar + Stacked Name & Ticker */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
            exitSignal
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-surface-active text-text-primary/90 border-white/5'
          }`}
        >
          {order.logoUrl && !imgError ? (
            <img
              src={order.logoUrl}
              alt={order.tickerSymbol}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-text-primary truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px] group-hover:text-brand-blue transition-colors">
              {order.companyName || cleanSymbol}
            </span>
            {exitSignal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
                SELL
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="badge-symbol">
              {cleanSymbol}
            </span>
            <span className="text-[11px] text-text-muted font-normal truncate">
              · {order.quantity.toLocaleString()} shares
              {showDetails ? ` @ ${order.entryPrice.toFixed(2)} £` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Value + P/L Metrics + Sell Action Button */}
      <div className="flex items-center gap-3 shrink-0 pl-2">
        <div className="text-right flex flex-col items-end">
          <div className="text-[13px] font-semibold text-text-primary tabular-nums">
            {formatMoney(positionVal)}
          </div>
          <div className="text-[11px] font-medium tabular-nums text-right mt-0.5 flex items-center justify-end gap-1.5 whitespace-nowrap">
            <span className="text-text-muted">{weightPct.toFixed(1)}%</span>
            <span className="text-text-faint">·</span>
            <span
              className={`font-semibold ${
                isPositive ? 'text-profit-chart' : 'text-loss-chart'
              }`}
            >
              {formatMoney(order.profitLoss, true)} ({isPositive ? '+' : ''}
              {order.profitLossPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Sell Action Button */}
        <div className="w-[68px] shrink-0 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSellClick(order);
            }}
            className={`w-[64px] py-1 text-center rounded-[6px] text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              exitSignal
                ? 'bg-loss-chart text-white hover:bg-loss-hover animate-pulse'
                : 'border border-rose-500/35 bg-rose-500/10 text-rose-400 hover:bg-loss-chart hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
}
