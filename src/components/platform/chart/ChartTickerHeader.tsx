'use client';

import React, { useMemo } from 'react';
import { Globe } from '@/components/ui/icon-library';
import type { ChartData } from './types';
import type { WatchlistItem } from '@/components/platform/RightSidebar';
import { formatVolume } from './utils';
import { useTranslation } from '@/lib/i18n';

interface ChartTickerHeaderProps {
  symbol?: string;
  companyName?: string;
  logoUrl?: string | null;
  timeframe?: string;
  watchlist?: WatchlistItem[];
  activeCandle: ChartData | null;
  currency?: string;
}

export default function ChartTickerHeader({
  symbol = 'COMI.CA',
  companyName,
  logoUrl,
  timeframe = '1D',
  watchlist = [],
  activeCandle,
  currency = 'EGP',
}: ChartTickerHeaderProps) {
  const { locale } = useTranslation();
  const displaySymbol = symbol.replace('.CA', '');
  const currentTickerItem = useMemo(() => {
    return (
      watchlist.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()) ?? {
        symbol,
        companyName: companyName || displaySymbol,
        price: '',
        changePct: '',
        isUp: false,
        logoUrl: logoUrl ?? null,
      }
    );
  }, [watchlist, symbol, companyName, displaySymbol, logoUrl]);

  const open = activeCandle?.open ?? 0;
  const high = activeCandle?.high ?? 0;
  const low = activeCandle?.low ?? 0;
  const close = activeCandle?.close ?? 0;
  const volume = activeCandle?.volume ?? 0;

  const diff = close - open;
  const diffPct = open > 0 ? (diff / open) * 100 : 0;
  const isUp = diff >= 0;

  const currencyDisplay =
    currency.toUpperCase() === 'EGP' && locale === 'ar'
      ? 'ج.م'
      : currency.toUpperCase();

  return (
    <div className="absolute top-2.5 start-3 z-20 pointer-events-none select-none flex flex-col gap-0.5">
      {/* Top Row: Logo + Company Name / Symbol · Timeframe · Currency */}
      <div className="flex items-center gap-1.5 text-start">
        <div className="w-4 h-4 rounded-full flex items-center justify-center overflow-hidden shrink-0 text-white">
          {currentTickerItem.logoUrl ? (
            <img
              src={currentTickerItem.logoUrl}
              alt={displaySymbol}
              className="ticker-logo-image ticker-logo-fill"
            />
          ) : (
            <Globe size={14} className="text-text-muted" />
          )}
        </div>

        <span className="text-[13px] font-semibold text-text-primary tracking-tight flex items-center gap-1">
          <span className="truncate max-w-[240px] sm:max-w-none">
            {currentTickerItem.companyName || displaySymbol}
          </span>
          <span className="text-text-muted font-normal text-xs shrink-0">
            · {timeframe} · {currencyDisplay}
          </span>
        </span>
      </div>

      {/* Bottom Row: OHLCV + Change Metrics */}
      {activeCandle && (
        <div className="flex items-center gap-2 font-sans text-[10px] sm:text-[11px] leading-tight tabular-nums overflow-x-auto no-scrollbar max-w-[calc(100vw-24px)]">
          {activeCandle.time && (
            <span className="text-white/70 font-medium bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-[9px] shrink-0">
              {String(activeCandle.time)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <span className="text-text-muted font-sans text-[10px] sm:text-[11px]">
              {locale === 'ar' ? 'اف:' : 'O'}
            </span>
            <span className="text-text-primary font-medium">{open.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-text-muted font-sans text-[10px] sm:text-[11px]">
              {locale === 'ar' ? 'أع:' : 'H'}
            </span>
            <span className="text-text-primary font-medium">{high.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-text-muted font-sans text-[10px] sm:text-[11px]">
              {locale === 'ar' ? 'أد:' : 'L'}
            </span>
            <span className="text-text-primary font-medium">{low.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-text-muted font-sans text-[10px] sm:text-[11px]">
              {locale === 'ar' ? 'إغ:' : 'C'}
            </span>
            <span className="text-text-primary font-medium">{close.toFixed(2)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <span className="text-text-muted font-sans text-[11px]">
              {locale === 'ar' ? 'حجم:' : 'Vol'}
            </span>
            <span className="text-text-primary font-medium">{formatVolume(volume)}</span>
          </div>

          <div className={`font-semibold shrink-0 ${isUp ? 'text-profit-num' : 'text-loss-num'}`}>
            {isUp ? '+' : ''}{diff.toFixed(2)} ({isUp ? '+' : ''}{diffPct.toFixed(2)}%)
          </div>
        </div>
      )}
    </div>
  );
}
