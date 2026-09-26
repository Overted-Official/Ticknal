'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { StockPerformanceItem } from '@/lib/sectors-math';
import { LineChart } from '@/components/ui/icon-library';

export interface SectorConstituentRowItemProps {
  stock: StockPerformanceItem;
  benchmarkReturn: number;
  onSelectTicker?: (symbol: string) => void;
}

export default function SectorConstituentRowItem({
  stock,
  benchmarkReturn,
  onSelectTicker,
}: SectorConstituentRowItemProps) {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = stock.symbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);
  const alpha = stock.returnPct - benchmarkReturn;
  const isAlphaPositive = alpha >= 0;
  const isReturnPositive = stock.returnPct >= 0;

  const turnoverDisplay = useMemo(() => {
    if (stock.turnover >= 1_000_000_000) {
      return `${(stock.turnover / 1_000_000_000).toFixed(1)}B`;
    }
    if (stock.turnover >= 1_000_000) {
      return `${(stock.turnover / 1_000_000).toFixed(1)}M`;
    }
    return `${(stock.turnover / 1_000).toFixed(0)}K`;
  }, [stock.turnover]);

  return (
    <div
      onClick={() => onSelectTicker?.(stock.symbol)}
      className="py-2.5 px-1.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors group border-b border-white/[0.06] last:border-b-0 outline-none select-none cursor-pointer"
    >
      {/* Left: Circular Avatar + Stacked Name & Ticker */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
            isAlphaPositive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-white/[0.04] text-neutral-300 border-white/10'
          }`}
        >
          {stock.logoUrl && !imgError ? (
            <img
              src={stock.logoUrl}
              alt={stock.symbol}
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
            <span className="text-[13px] font-medium text-text-primary truncate max-w-[120px] sm:max-w-[160px] group-hover:text-brand-blue transition-colors">
              {stock.companyName || cleanSymbol}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="badge-symbol">{cleanSymbol}</span>
            <span className="text-[11px] text-text-muted font-normal truncate">
              · {stock.endPrice.toFixed(2)} EGP
            </span>
          </div>
        </div>
      </div>

      {/* Right: Alpha + Return & Turnover Metrics + Chart Icon Button */}
      <div className="flex items-center gap-3 shrink-0 pl-2">
        <div className="text-right flex flex-col items-end">
          <div
            className={`text-[13px] font-semibold tabular-nums ${
              isAlphaPositive ? 'text-profit-num' : 'text-loss-num'
            }`}
          >
            {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}% α
          </div>
          <div className="text-[11px] font-medium tabular-nums text-right mt-0.5 flex items-center justify-end gap-1.5 whitespace-nowrap">
            <span className={isReturnPositive ? 'text-profit-chart' : 'text-loss-chart'}>
              {stock.returnPct > 0 ? '+' : ''}{stock.returnPct.toFixed(1)}%
            </span>
            <span className="text-text-faint">·</span>
            <span className="text-text-muted">{turnoverDisplay}</span>
          </div>
        </div>

        {/* Action Button: compact icon button */}
        <Link
          href={`/charts?symbol=${cleanSymbol}`}
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer shrink-0"
          title={`Open ${cleanSymbol} Chart`}
        >
          <LineChart size={14} />
        </Link>
      </div>
    </div>
  );
}
