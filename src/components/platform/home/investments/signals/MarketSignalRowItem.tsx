'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { type Opportunity } from '@/components/platform/OpportunityTable';

export interface GroupedMarketSignal {
  symbol: string;
  cleanSymbol: string;
  companyName: string;
  sector: string;
  rotationRegime?: Opportunity['rotationRegime'];
  logoUrl?: string | null;
  strategies: Array<{ id: string }>;
  signalPrice: number;
  signalDate?: string;
  barsAgo?: number | null;
  winningAlpha?: number | null;
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
}

const regimeColorClass: Record<NonNullable<Opportunity['rotationRegime']>, string> = {
  Leading: 'text-profit-chart',
  Improving: 'text-brand-blue',
  Weakening: 'text-amber-400',
  Lagging: 'text-loss-chart',
};

export default function MarketSignalRowItem({
  item,
  opp,
}: MarketSignalRowItemProps) {
  const signalData = (item || opp)!;
  const [imgError, setImgError] = useState(false);

  const isGrouped = 'strategies' in signalData;
  const cleanSymbol = isGrouped
    ? signalData.cleanSymbol
    : signalData.symbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);
  const metrics = signalData.metrics;
  const rotationRegime = signalData.rotationRegime;
  const alpha = isGrouped
    ? signalData.winningAlpha ?? metrics?.alpha ?? null
    : metrics?.alpha ?? null;
  const hasAlpha = typeof alpha === 'number' && Number.isFinite(alpha);

  const barsAgo = isGrouped
    ? signalData.barsAgo
    : (signalData.signal as any)?.barsAgo ?? (signalData as any)?.signalAgeBars ?? null;
  const rawSignalDate = isGrouped ? signalData.signalDate : signalData.signal?.date;

  let signalAgeText = '';
  if (typeof barsAgo === 'number') {
    signalAgeText = barsAgo === 0 ? 'Today' : `${barsAgo}D ago`;
  } else if (rawSignalDate) {
    signalAgeText = rawSignalDate;
  }

  return (
    <Link
      href={`/charts?ticker=${signalData.symbol}&timeframe=D`}
      className="group flex min-w-0 items-center gap-3 border-b border-border-subtle px-2 py-3 transition-colors hover:bg-surface-active/30"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-surface-active text-xs font-bold text-text-primary">
        {signalData.logoUrl && !imgError ? (
          <img
            src={signalData.logoUrl}
            alt={cleanSymbol}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[13px] font-semibold text-text-primary transition-colors group-hover:text-brand-blue">
            {signalData.companyName || cleanSymbol}
          </span>
          {signalAgeText && (
            <span
              className="shrink-0 text-[10px] font-medium tabular-nums text-text-muted"
              title={rawSignalDate ? `Signal date: ${rawSignalDate}` : undefined}
            >
              {signalAgeText}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex min-w-0 items-baseline justify-between gap-3 text-[11px]">
          <span className="min-w-0 truncate text-text-muted">
            <span className="font-semibold text-text-primary">{cleanSymbol}</span>
            <span className="px-1">•</span>
            <span>{signalData.sector || 'Equities'}</span>
            {rotationRegime && (
              <span className={`ml-1 ${regimeColorClass[rotationRegime]}`}>
                ({rotationRegime})
              </span>
            )}
          </span>

          <span className={`shrink-0 tabular-nums font-semibold ${hasAlpha && alpha! >= 0 ? 'text-profit-chart' : hasAlpha ? 'text-loss-chart' : 'text-text-muted'}`}>
            {hasAlpha ? `${alpha! >= 0 ? '+' : ''}${alpha!.toFixed(1)}% α` : '— α'}
          </span>
        </div>
      </div>
    </Link>
  );
}
