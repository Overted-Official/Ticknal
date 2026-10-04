'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { LandingMarqueeTicker } from '@/lib/server/landing-queries';
import { useTranslation } from '@/lib/i18n';

interface LandingTickerMarqueeProps {
  tickers: LandingMarqueeTicker[];
}

function TickerPill({ ticker }: { ticker: LandingMarqueeTicker }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const isPositive = ticker.change > 0;
  const isNegative = ticker.change < 0;

  return (
    <Link
      href={`/charts?ticker=${ticker.symbol}`}
      prefetch={false}
      className="group/pill inline-flex items-center justify-between gap-3.5 sm:gap-4 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0 select-none min-w-[260px] sm:min-w-[285px]"
      title={`${ticker.name} (${ticker.symbol}) - EGP ${ticker.price.toFixed(2)}`}
    >
      {/* Left: Circular Logo + Company Name & Symbol */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Strictly Circular Logo Avatar */}
        <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
          {ticker.logo && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ticker.logo}
              alt={ticker.symbol}
              className="w-full h-full object-contain p-1 rounded-full"
              loading="lazy"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-[11px] font-bold text-white/80 select-none font-sans">
              {ticker.symbol.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Text Details: Full Name on top, Symbol below */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs font-semibold text-white tracking-tight truncate max-w-[120px] sm:max-w-[150px] group-hover/pill:text-blue-400 transition-colors leading-tight font-sans">
            {ticker.name}
          </span>
          <span className="text-[11px] font-medium text-zinc-400 tracking-wide uppercase leading-tight mt-0.5 font-sans">
            {ticker.symbol}
          </span>
        </div>
      </div>

      {/* Right: Latest Price on top, 1D Change & Up/Down Arrow below */}
      <div className="flex flex-col items-end justify-center shrink-0 pl-1">
        <span className="text-xs font-bold text-white tabular-nums leading-tight font-sans">
          {ticker.price > 0 ? ticker.price.toFixed(2) : '—'}
        </span>
        <div className="flex items-center gap-1 mt-0.5 leading-tight">
          {isPositive ? (
            <span className="text-[9px] text-emerald-400 font-bold leading-none select-none">▲</span>
          ) : isNegative ? (
            <span className="text-[9px] text-rose-400 font-bold leading-none select-none">▼</span>
          ) : null}
          <span
            className={`text-[11px] font-semibold tabular-nums font-sans leading-none ${
              isPositive
                ? 'text-emerald-400'
                : isNegative
                ? 'text-rose-400'
                : 'text-zinc-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {ticker.change.toFixed(2)}%
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LandingTickerMarquee({ tickers }: LandingTickerMarqueeProps) {
  const { locale } = useTranslation();

  if (!tickers || tickers.length === 0) {
    return null;
  }

  // Optimize rail count: Take up to 75 diverse tickers (25 per rail)
  // which produces 50 pills per rail when duplicated - over 14,000px of seamless animation
  const maxItems = Math.min(tickers.length, 75);
  const activeTickers = tickers.slice(0, maxItems);
  const splitSize = Math.ceil(activeTickers.length / 3);

  const row1 = activeTickers.slice(0, splitSize);
  const row2 = activeTickers.slice(splitSize, splitSize * 2);
  const row3 = activeTickers.slice(splitSize * 2);

  return (
    <section id="markets" className="relative w-full bg-transparent pt-12 sm:pt-16 pb-10 sm:pb-14 select-none font-sans overflow-hidden">
      {/* Centered Section Header Formatted Matching Home Page */}
      <div className="flex flex-col items-center text-center gap-2 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
        <h2 className="section-title text-center text-white">
          {locale === 'ar'
            ? 'منصة واحدة لكل استثماراتك في مصر'
            : 'One Terminal for Every Asset in Egypt'}
        </h2>
        <p className="section-subtitle text-center text-zinc-400">
          {locale === 'ar'
            ? 'تحليلات بمستوى احترافي لأكتر من 290 سهم بالبورصة المصرية، و160 صندوق استثمار، والذهب والفضة، مع أهم مؤشرات الاقتصاد الكلي.'
            : 'Institutional analytics across 290+ EGX equities, 160+ investment funds, precious metals, and sovereign macro indicators.'}
        </p>
      </div>

      {/* Marquee Rails Container with Edge Fade Gradients - strictly dir="ltr" to ensure identical smooth movement across English and Arabic */}
      <div className="relative w-full overflow-hidden" dir="ltr">
        {/* Cinematic Left & Right Ambient Fade Gradients */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-44 bg-gradient-to-r from-black via-black/85 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-44 bg-gradient-to-l from-black via-black/85 to-transparent z-10" />

        {/* 3-Rail Staggered Marquee Wall (Slow, Luxurious, Readable Pace) */}
        <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
          {/* Rail 1: Leftward Marquee */}
          <div className="relative w-full overflow-hidden flex items-center">
            <div
              className="flex items-center gap-3 sm:gap-4 animate-marquee"
              style={{ animationDuration: '880s' }}
            >
              {row1.concat(row1).map((t, idx) => (
                <TickerPill key={`r1-${t.symbol}-${idx}`} ticker={t} />
              ))}
            </div>
          </div>

          {/* Rail 2: Rightward (Reverse) Marquee */}
          <div className="relative w-full overflow-hidden flex items-center">
            <div
              className="flex items-center gap-3 sm:gap-4 animate-marquee-reverse"
              style={{ animationDuration: '960s' }}
            >
              {row2.concat(row2).map((t, idx) => (
                <TickerPill key={`r2-${t.symbol}-${idx}`} ticker={t} />
              ))}
            </div>
          </div>

          {/* Rail 3: Leftward Marquee */}
          <div className="relative w-full overflow-hidden flex items-center">
            <div
              className="flex items-center gap-3 sm:gap-4 animate-marquee"
              style={{ animationDuration: '920s' }}
            >
              {row3.concat(row3).map((t, idx) => (
                <TickerPill key={`r3-${t.symbol}-${idx}`} ticker={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
