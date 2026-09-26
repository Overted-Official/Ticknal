'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { resolveStrategyMeta, type StrategyMeta } from './StrategySwitcher';

export interface GroupedMarketSignal {
  symbol: string;
  cleanSymbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  strategies: Array<StrategyMeta & { id: string }>;
  signalPrice: number;
  signalDate?: string;
  barsAgo?: number | null;
  metrics?: {
    buyHoldReturn?: number | null;
    alpha?: number | null;
    totalReturn?: number | null;
    winRate?: number | null;
    [key: string]: any;
  } | null;
  rawOpportunities?: Opportunity[];
}

interface MarketSignalRowItemProps {
  item?: GroupedMarketSignal | Opportunity;
  opp?: Opportunity;
  formatPrice?: (p: number) => string;
}

export default function MarketSignalRowItem({
  item,
  opp,
  formatPrice,
}: MarketSignalRowItemProps) {
  const signalData = (item || opp)!;
  const [imgError, setImgError] = useState(false);

  const isGrouped = 'strategies' in signalData;
  const cleanSymbol = isGrouped
    ? signalData.cleanSymbol
    : signalData.symbol.replace('.CA', '').trim().toUpperCase();

  const initial = cleanSymbol.slice(0, 2);

  const strategies: Array<StrategyMeta & { id: string }> = isGrouped
    ? signalData.strategies
    : [resolveStrategyMeta(signalData.strategyId, signalData.strategyShortName)];

  const price = isGrouped
    ? signalData.signalPrice
    : signalData.signal.price;

  const defaultFormatPrice = (val: number) =>
    `${Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} £`;

  const formattedPrice = formatPrice
    ? formatPrice(price)
    : defaultFormatPrice(price);

  const metrics = signalData.metrics;
  const ytdVal = metrics?.buyHoldReturn;
  let metricText = '';
  let metricColor = 'text-text-muted';

  if (typeof ytdVal === 'number' && Number.isFinite(ytdVal)) {
    if (Math.abs(ytdVal) < 0.05) {
      metricText = '0.0% YTD';
      metricColor = 'text-text-muted';
    } else {
      const isPos = ytdVal > 0;
      metricText = `${isPos ? '+' : ''}${ytdVal.toFixed(1)}% YTD`;
      metricColor = isPos ? 'text-profit-chart' : 'text-loss-chart';
    }
  } else if (typeof metrics?.alpha === 'number' && Number.isFinite(metrics.alpha)) {
    const isPos = metrics.alpha >= 0;
    metricText = `${isPos ? '+' : ''}${metrics.alpha.toFixed(1)}% Alpha`;
    metricColor = isPos ? 'text-profit-chart' : 'text-loss-chart';
  } else if (typeof metrics?.totalReturn === 'number' && Number.isFinite(metrics.totalReturn)) {
    const isPos = metrics.totalReturn >= 0;
    metricText = `${isPos ? '+' : ''}${metrics.totalReturn.toFixed(1)}% Return`;
    metricColor = isPos ? 'text-profit-chart' : 'text-loss-chart';
  }

  const barsAgo = isGrouped
    ? signalData.barsAgo
    : (signalData.signal as any)?.barsAgo ?? (signalData as any)?.signalAgeBars ?? null;

  const rawSignalDate = isGrouped ? signalData.signalDate : signalData.signal?.date;

  let timeAgoText = '';
  if (typeof barsAgo === 'number') {
    if (barsAgo === 0) {
      timeAgoText = 'Today';
    } else if (barsAgo === 1) {
      timeAgoText = '1 session ago';
    } else {
      timeAgoText = `${barsAgo} sessions ago`;
    }
  } else if (rawSignalDate) {
    timeAgoText = rawSignalDate;
  }

  return (
    <Link
      href={`/charts?ticker=${signalData.symbol}&timeframe=D`}
      className="py-2.5 px-2 flex items-center justify-between hover:bg-surface-active/30 transition-colors group cursor-pointer border-b border-border-subtle/70 rounded-lg"
    >
      {/* Left: Avatar + Symbol & Company + Strategy Badges */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="w-8 h-8 rounded-full border border-white/10 bg-surface-active flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs text-text-primary">
          {signalData.logoUrl && !imgError ? (
            <img
              src={signalData.logoUrl}
              alt={cleanSymbol}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-bold text-text-primary group-hover:text-brand-blue transition-colors truncate">
              {cleanSymbol}
            </span>
            {strategies.map((strat) => (
              <span
                key={strat.id}
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 ${
                  strat.badgeBg || 'bg-brand-blue/15 text-brand-blue border-brand-blue/30'
                }`}
              >
                {strat.shortName}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-zinc-300 font-normal truncate max-w-[130px] sm:max-w-[200px]">
              {signalData.companyName || cleanSymbol}
            </span>
            <span className="text-[11px] text-text-muted font-normal truncate">
              · {signalData.sector || 'Equities'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Signal Price + Performance Metric & Signal Age + Aligned BUY Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pl-2">
        <div className="text-right flex flex-col items-end">
          <div className="text-[13px] font-semibold text-text-primary tabular-nums">
            {formattedPrice}
          </div>
          <div className="text-[10px] font-medium tabular-nums mt-0.5 flex items-center justify-end gap-1.5 whitespace-nowrap">
            {timeAgoText && (
              <span
                className="text-zinc-400 font-medium"
                title={rawSignalDate ? `Signal date: ${rawSignalDate}` : undefined}
              >
                {timeAgoText}
              </span>
            )}
            {timeAgoText && metricText && (
              <span className="text-text-faint">·</span>
            )}
            {metricText ? (
              <span className={metricColor}>
                {metricText}
              </span>
            ) : (
              <span className="text-text-muted">
                Buy Signal
              </span>
            )}
          </div>
        </div>

        {/* Buy Action Button */}
        <div className="w-[68px] shrink-0 flex justify-end">
          <div className="w-[64px] py-1 text-center rounded-[6px] text-xs font-semibold transition-all shadow-xs border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 group-hover:bg-profit-chart group-hover:text-white">
            Buy
          </div>
        </div>
      </div>
    </Link>
  );
}
