'use client';

import React, { useState } from 'react';
import {
  Heart,
  Bookmark,
  ExternalLink,
  Building2,
  Landmark,
  Coins,
  TrendingUp,
  Layers,
} from '@/components/ui/icon-library';
import { cn } from '@/lib/utils';
import SocialButton from '@/components/ui/social-button';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';

interface FeedPostProps {
  item: MarketNewsItemDTO;
  onSelectTicker?: (ticker: string) => void;
  onBookmarkClick?: (feature: string) => void;
}

interface SourceMeta {
  name: string;
  handle: string;
  avatarUrl?: string;
  fallbackIcon: React.ReactNode;
  verified: boolean;
  isTicknalTake?: boolean;
}

const TRADINGVIEW_LOGOS: Record<string, string> = {
  COMI: 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg',
  TMGH: 'https://s3-symbol-logo.tradingview.com/t-m-g.svg',
  SWDY: 'https://s3-symbol-logo.tradingview.com/elswedy-electric.svg',
  FWRY: 'https://s3-symbol-logo.tradingview.com/fawry-for-banking-technology-and-electronic-payment.svg',
  EAST: 'https://s3-symbol-logo.tradingview.com/eastern-company.svg',
  ESRS: 'https://s3-symbol-logo.tradingview.com/basic-materials--big.svg',
  ETEL: 'https://s3-symbol-logo.tradingview.com/telecom-egypt.svg',
  ORAS: 'https://s3-symbol-logo.tradingview.com/orascom-construction-plc.svg',
  AMOC: 'https://s3-symbol-logo.tradingview.com/alexandria-mineral-oils-company.svg',
  'GC1!': 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  GOLD21K: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  'USD/EGP': 'https://s3-symbol-logo.tradingview.com/country/US.svg',
  EGX30: 'https://s3-symbol-logo.tradingview.com/country/EG.svg',
  EGX70: 'https://s3-symbol-logo.tradingview.com/country/EG.svg',
};

function resolveSourceMeta(item: MarketNewsItemDTO): SourceMeta {
  const src = item.source.toLowerCase();
  const cat = item.category.toLowerCase();
  const firstTicker = item.tickers?.[0]?.toUpperCase().replace(/^[@$]/, '') || '';

  // 1. The Ticknal Take (renders authentic Ticknal brand mark)
  if (cat === 'ticknal_take' || cat === 'pulse' || src.includes('ticknal')) {
    return {
      name: 'The Ticknal Take',
      handle: '@TICKNAL',
      avatarUrl: '/logo-white.svg',
      fallbackIcon: (
        <span className="w-full h-full flex items-center justify-center bg-black rounded-full p-2">
          <svg viewBox="5 6 54 54" className="w-full h-full" fill="none">
            <path
              fill="#FFFFFF"
              d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z"
            />
          </svg>
        </span>
      ),
      verified: true,
      isTicknalTake: true,
    };
  }

  // 2. Specific Major Wire Publishers
  if (src.includes('reuters')) {
    return {
      name: 'Reuters',
      handle: firstTicker ? `@${firstTicker}` : '@REUTERS',
      avatarUrl: firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined,
      fallbackIcon: <span className="text-[11px] font-bold text-amber-400">R</span>,
      verified: true,
    };
  }

  if (src.includes('dow jones') || src.includes('djn')) {
    return {
      name: 'Dow Jones Newswires',
      handle: firstTicker ? `@${firstTicker}` : '@DOWJONES',
      avatarUrl: firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined,
      fallbackIcon: <span className="text-[11px] font-bold text-blue-400">DJ</span>,
      verified: true,
    };
  }

  if (src.includes('zawya')) {
    return {
      name: 'Zawya',
      handle: firstTicker ? `@${firstTicker}` : '@ZAWYA',
      avatarUrl: firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined,
      fallbackIcon: <span className="text-[11px] font-bold text-emerald-400">Z</span>,
      verified: true,
    };
  }

  if (src.includes('arabictrader')) {
    return {
      name: 'ArabicTrader',
      handle: firstTicker ? `@${firstTicker}` : '@ARABIC_TRADER',
      avatarUrl: firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined,
      fallbackIcon: <span className="text-[11px] font-bold text-emerald-400">AT</span>,
      verified: true,
    };
  }

  if (src.includes('trading economics')) {
    return {
      name: 'Trading Economics',
      handle: firstTicker ? `@${firstTicker}` : '@TE',
      avatarUrl: firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined,
      fallbackIcon: <span className="text-[11px] font-bold text-cyan-400">TE</span>,
      verified: true,
    };
  }

  // 3. Central Bank of Egypt
  if (src.includes('central bank') || src.includes('cbe')) {
    return {
      name: 'Central Bank of Egypt',
      handle: '@CBE',
      avatarUrl: 'https://s3-symbol-logo.tradingview.com/country/EG.svg',
      fallbackIcon: <Landmark className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 3. Commercial International Bank
  if (firstTicker === 'COMI' || firstTicker === 'CIB_ADR' || src.includes('commercial international bank') || src.includes('cib')) {
    return {
      name: 'CIB Egypt',
      handle: '@COMI',
      avatarUrl: TRADINGVIEW_LOGOS.COMI,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 4. Talaat Moustafa Group
  if (firstTicker === 'TMGH' || src.includes('talaat moustafa')) {
    return {
      name: 'TMG Holding',
      handle: '@TMGH',
      avatarUrl: TRADINGVIEW_LOGOS.TMGH,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 5. Elsewedy Electric
  if (firstTicker === 'SWDY' || src.includes('elsewedy')) {
    return {
      name: 'Elsewedy Electric',
      handle: '@SWDY',
      avatarUrl: TRADINGVIEW_LOGOS.SWDY,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 6. Eastern Company
  if (firstTicker === 'EAST' || src.includes('eastern')) {
    return {
      name: 'Eastern Company',
      handle: '@EAST',
      avatarUrl: TRADINGVIEW_LOGOS.EAST,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 7. Fawry
  if (firstTicker === 'FWRY' || src.includes('fawry')) {
    return {
      name: 'Fawry Payments',
      handle: '@FWRY',
      avatarUrl: TRADINGVIEW_LOGOS.FWRY,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 8. Investment Funds
  if (cat === 'funds' || firstTicker === 'AZG' || src.includes('azimut')) {
    return {
      name: src.includes('ci') ? 'CI Capital Asset Management' : 'Azimut Egypt',
      handle: firstTicker ? `@${firstTicker}` : '@FUNDS',
      avatarUrl: undefined,
      fallbackIcon: <TrendingUp className="w-3.5 h-3.5 text-[#00BCE6]" />,
      verified: true,
    };
  }

  // 9. Gold & Silver Wire
  if (cat === 'gold_silver' || cat.includes('bullion') || firstTicker.includes('GOLD') || firstTicker === 'GC1!') {
    return {
      name: src.includes('london') || src.includes('lbma') ? 'London Bullion Market' : 'Cairo Gold Wire',
      handle: '@GOLD21K',
      avatarUrl: TRADINGVIEW_LOGOS['GC1!'],
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-amber-300" />,
      verified: true,
    };
  }

  const genericLogo = firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined;

  return {
    name: item.source,
    handle: firstTicker ? `@${firstTicker}` : '@MARKET',
    avatarUrl: genericLogo,
    fallbackIcon: <Layers className="w-3.5 h-3.5 text-zinc-300" />,
    verified: false,
  };
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return '1h';
  }
}

function getDeterministicCount(id: string, base: number, variance: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return base + Math.abs(hash % variance);
}

export default function FeedPost({
  item,
  onSelectTicker,
  onBookmarkClick,
}: FeedPostProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [postImageError, setPostImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const baseLikeCount = React.useMemo(() => getDeterministicCount(item.id, 9, 15), [item.id]);
  const baseSaveCount = React.useMemo(() => getDeterministicCount(item.id + '_s', 4, 10), [item.id]);
  const shareCount = React.useMemo(() => getDeterministicCount(item.id + '_sh', 2, 6), [item.id]);

  const likeCount = isLiked ? baseLikeCount + 1 : baseLikeCount;
  const saveCount = isSaved ? baseSaveCount + 1 : baseSaveCount;

  const meta = resolveSourceMeta(item);
  const timeAgo = formatRelativeTime(item.publishedAt);
  const primaryTicker = item.tickers?.[0]?.replace(/^[@$]/, '') || meta.handle.replace(/^@/, '');

  // Unified single body text without title/body split, capped at 500 characters
  const rawText = item.summary || item.title;
  const postText =
    rawText.length > 500
      ? `${rawText.slice(0, 497)}...`
      : rawText;

  const itemUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/news?item=${encodeURIComponent(item.id)}`
      : `https://ticknal.com/news?item=${encodeURIComponent(item.id)}`;

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onBookmarkClick?.('Bookmark Disclosures');
  };

  return (
    <article className="p-4 sm:p-5 sm:py-4.5 border-b border-white/[0.06] transition-colors hover:bg-white/[0.02] font-sans select-none">
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Left: Scaled circular avatar (36px) with authentic Ticknal logo mark for Ticknal Take */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-black ring-1 ring-white/10 shrink-0 flex items-center justify-center">
          {meta.isTicknalTake ? (
            <span className="w-full h-full flex items-center justify-center bg-black rounded-full p-2" title="Ticknal">
              <svg viewBox="5 6 54 54" className="w-full h-full" fill="none">
                <path
                  fill="#FFFFFF"
                  d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z"
                />
              </svg>
            </span>
          ) : meta.avatarUrl && !avatarError ? (
            <img
              src={meta.avatarUrl}
              alt={meta.name}
              className="w-full h-full object-cover rounded-full"
              onError={() => setAvatarError(true)}
              loading="lazy"
            />
          ) : (
            meta.fallbackIcon
          )}
        </div>

        {/* Right: Post stream content */}
        <div className="flex-1 min-w-0">
          {/* Post Header Row */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {/* Display Name */}
              <span className="font-medium text-white text-[12.5px] truncate">
                {meta.name}
              </span>

              {/* Verified Blue Badge */}
              {meta.verified && (
                <svg
                  viewBox="0 0 22 22"
                  aria-label="Verified"
                  className="w-3 h-3 text-[#1d9bf0] fill-current shrink-0"
                >
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.136 2.136 5.477-5.477 1.294 1.294-6.771 6.777z" />
                </svg>
              )}

              {/* Ticker / Symbol Handle (@COMI) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTicker?.(meta.handle.replace(/^@/, ''));
                }}
                className="text-zinc-500 hover:text-[#1d9bf0] text-[12px] truncate font-normal cursor-pointer transition-colors"
                title={`Filter by ${meta.handle}`}
              >
                {meta.handle}
              </button>

              <span className="text-zinc-600 text-[11px]">·</span>

              {/* Timestamp */}
              <time className="text-zinc-500 text-[11.5px] tabular-nums shrink-0 font-normal">
                {timeAgo}
              </time>
            </div>

            {/* Quiet Category Pill on far right */}
            <span className="text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] font-normal shrink-0">
              {item.categoryLabel}
            </span>
          </div>

          {/* Unified Post Body: All in 12px font size, smaller weight, no title/body split */}
          <p className="text-[12px] text-zinc-300 leading-[1.65] font-normal select-text mt-2 whitespace-pre-line" dir="auto">
            {postText}
          </p>

          {/* Attached Full-Width Media Card (if image exists) */}
          {item.imageUrl && !postImageError && (
            <div className="mt-3.5 rounded-xl overflow-hidden border border-white/[0.08] bg-black max-h-[360px] w-full flex items-center justify-center">
              <img
                src={item.imageUrl}
                alt=""
                className="w-full h-auto max-h-[360px] object-contain bg-black"
                loading="lazy"
                onError={() => setPostImageError(true)}
              />
            </div>
          )}

          {/* Action Buttons Row: Styled as dark outline capsule buttons matching user reference image */}
          <div className="mt-3.5 pt-2.5 border-t border-white/[0.04] flex items-center gap-2.5 flex-wrap">
            {/* 1. Like Capsule Button (replaces Chart button) */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={cn(
                'h-7 px-2.5 rounded-[8px] border transition-all flex items-center gap-1.5 bg-black hover:bg-white/[0.06] cursor-pointer select-none',
                isLiked
                  ? 'border-rose-500/40 text-rose-400'
                  : 'border-white/15 hover:border-white/30 text-white'
              )}
              title={isLiked ? 'Unlike post' : 'Like post'}
            >
              <Heart
                size={13}
                fill={isLiked ? 'currentColor' : 'none'}
                className={isLiked ? 'text-rose-500 shrink-0' : 'text-zinc-300 shrink-0'}
              />
              <span className="text-[11.5px] font-medium tabular-nums text-white">
                {likeCount}
              </span>
            </button>

            {/* 2. Save Capsule Button */}
            <button
              type="button"
              onClick={handleToggleSave}
              className={cn(
                'h-7 px-2.5 rounded-[8px] border transition-all flex items-center gap-1.5 bg-black hover:bg-white/[0.06] cursor-pointer select-none',
                isSaved
                  ? 'border-amber-400/40 text-amber-400'
                  : 'border-white/15 hover:border-white/30 text-white'
              )}
              title={isSaved ? 'Remove bookmark' : 'Bookmark disclosure'}
            >
              <Bookmark
                size={13}
                fill={isSaved ? 'currentColor' : 'none'}
                className={isSaved ? 'text-amber-400 shrink-0' : 'text-zinc-300 shrink-0'}
              />
              <span className="text-[11.5px] font-medium tabular-nums text-white">
                {saveCount}
              </span>
            </button>

            {/* 3. Share Button: Animated Framer Motion SocialButton */}
            <SocialButton
              variant="compact"
              url={itemUrl}
              title={item.title}
              shareCount={shareCount}
            />

            {/* 4. Official Filing Capsule Button (if sourceUrl exists) */}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-7 px-2.5 rounded-[8px] border border-white/15 bg-black hover:bg-white/[0.06] hover:border-white/30 transition-all flex items-center gap-1.5 text-white cursor-pointer select-none ml-auto"
                title="View official filing"
              >
                <ExternalLink size={13} className="text-zinc-300 shrink-0" />
                <span className="text-[11.5px] font-medium">Filing ↗</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
