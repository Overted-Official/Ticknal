'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Heart,
  Bookmark,
  ExternalLink,
  Building2,
  Landmark,
  Coins,
  TrendingUp,
  Layers,
  Maximize2,
  Share2,
  Download,
} from '@/components/ui/icon-library';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import NewsImageLightbox from './NewsImageLightbox';
import SocialShareModal from './SocialShareModal';
import { resolveLocalizedChartSvgVariants } from '@/lib/news/ticknal-take-charts';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';

interface FeedPostProps {
  item: MarketNewsItemDTO;
  asOf?: string;
  isTargetItem?: boolean;
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

  // 1. Ticknal take (renders authentic Ticknal brand mark)
  if (cat === 'ticknal_take' || cat === 'pulse' || src.includes('ticknal')) {
    return {
      name: 'Ticknal take',
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

  // 9. MOPCO (MFPC)
  if (firstTicker === 'MFPC' || src.includes('mfpc') || src.includes('mopco')) {
    return {
      name: 'MOPCO',
      handle: '@MFPC',
      avatarUrl: TRADINGVIEW_LOGOS.ESRS,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 10. Golden Pyramids Plaza (GPPL)
  if (firstTicker === 'GPPL' || src.includes('gppl') || src.includes('golden pyramids')) {
    return {
      name: 'Golden Pyramids Plaza',
      handle: '@GPPL',
      avatarUrl: undefined,
      fallbackIcon: <Building2 className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 11. EGX 30 Index
  if (firstTicker === 'EGX30' || src === 'egx30') {
    return {
      name: 'EGX 30 Index',
      handle: '@EGX30',
      avatarUrl: TRADINGVIEW_LOGOS.EGX30,
      fallbackIcon: <TrendingUp className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 12. Silver Wire & Markets
  if (firstTicker === 'SILVER' || firstTicker === 'SILV999' || src === 'silver') {
    return {
      name: 'Silver Markets',
      handle: '@SILVER',
      avatarUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-zinc-300" />,
      verified: true,
    };
  }

  // 13. Gold Wire & Markets
  if (cat === 'gold_silver' || cat.includes('bullion') || firstTicker.includes('GOLD') || firstTicker === 'GC1!' || src === 'gold') {
    return {
      name: 'Gold Markets',
      handle: '@GOLD',
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

function formatRelativeTime(isoString: string, asOf?: string): string {
  try {
    const diffMs = (asOf ? new Date(asOf).getTime() : Date.now()) - new Date(isoString).getTime();
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

function parseBilingualContent(rawText: string): { en: string; ar: string; hasBoth: boolean } {
  if (!rawText) return { en: '', ar: '', hasBoth: false };

  const paragraphs = rawText
    .split(/\s*---AR---\s*|\s*\|\|\|\s*|\n\s*\n/)
    .map((p) => p.replace(/---AR---/g, '').trim())
    .filter(Boolean);
  const arabicCharCount = (str: string) => (str.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCharCount = (str: string) => (str.match(/[a-zA-Z]/g) || []).length;

  const arParagraphs: string[] = [];
  const enParagraphs: string[] = [];

  for (const p of paragraphs) {
    const arCount = arabicCharCount(p);
    const enCount = latinCharCount(p);

    if (arCount > 0 && arCount >= enCount) {
      arParagraphs.push(p);
    } else {
      enParagraphs.push(p);
    }
  }

  const en = enParagraphs.join('\n\n').trim();
  const ar = arParagraphs.join('\n\n').trim();

  return {
    en,
    ar,
    hasBoth: Boolean(en && ar),
  };
}

const TICKNAL_TAKE_AR_TITLES: Record<string, string> = {
  'Hot Money Status: 30-Day Foreign & Arab Flow Trajectory':
    'الأموال الساخنة: هل يشتري أم يبيع الأجانب والعرب اليوم؟',
  'Daily Trade Summary: EGX 30, 70 & 100 Index Performance':
    'حصاد الجلسة: كيف أغلقت مؤشرات البورصة المصرية اليوم؟',
  'Market Breadth: Advance / Decline Participation Health':
    'ميزان الجلسة: حركة الأسهم الصاعدة والهابطة',
  'Gainers & Losers: Top Session Movers & Liquidity Focus':
    'قائمة الرابحين والخاسرين: أين ذهبت سيولة الأسهم اليوم؟',
  'USD/EGP Update: Shadow Proxies & Devaluation Pressure':
    'حقيقة سعر الدولار: تقييم الضغوط على الجنيه ومؤشر مخاطر التعويم',
};

function cleanWireText(raw: string, title?: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/\*\*/g, '')
    .replace(/^\[[A-Z0-9_/]+\]\s*[^:]{2,35}:\s*/i, '')
    .trim();

  if (title) {
    const cleanTitle = title.split(/\s*---AR---\s*|\s*\|\|\|\s*/)[0].trim();
    if (cleanTitle && cleaned.startsWith(cleanTitle)) {
      const remainder = cleaned.slice(cleanTitle.length).replace(/^[.\s—–-]+/, '').trim();
      if (remainder.length >= 20) {
        cleaned = remainder;
      }
    }
  }
  return cleaned;
}

export default function FeedPost({
  item,
  asOf,
  isTargetItem = false,
  onSelectTicker,
  onBookmarkClick,
}: FeedPostProps) {
  const { locale } = useTranslation();
  const [avatarError, setAvatarError] = useState(false);
  const [postImageError, setPostImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [altLang, setAltLang] = useState(false);

  const meta = resolveSourceMeta(item);
  const timeAgo = formatRelativeTime(item.publishedAt, asOf);

  // Parse bilingual content without artificial truncation
  const rawText = cleanWireText(item.summary || item.title, item.title);
  const { en, ar, hasBoth } = useMemo(() => parseBilingualContent(rawText), [rawText]);

  // Determine active text and direction according to locale and user toggle
  let displayText = rawText;
  let textDir: 'ltr' | 'rtl' = 'ltr';

  if (hasBoth) {
    const showArabic = (locale === 'ar' && !altLang) || (locale !== 'ar' && altLang);
    displayText = showArabic ? ar : en;
    textDir = showArabic ? 'rtl' : 'ltr';
  } else if (ar && !en) {
    displayText = ar;
    textDir = 'rtl';
  } else if (en) {
    displayText = en;
    textDir = 'ltr';
  }

  const isArabic = hasBoth
    ? ((locale === 'ar' && !altLang) || (locale !== 'ar' && altLang))
    : (locale === 'ar');

  const displayTitle = useMemo(() => {
    const parts = (item.title || '').split(/\s*---AR---\s*|\s*\|\|\|\s*/);
    const enTitle = (parts[0] || '').trim();
    const arTitle = (parts[1] || item.content || TICKNAL_TAKE_AR_TITLES[enTitle] || '').trim();
    if (isArabic && arTitle) {
      return arTitle;
    }
    return enTitle;
  }, [item.title, item.content, isArabic]);

  const titleDir: 'ltr' | 'rtl' = /[\u0600-\u06FF]/.test(displayTitle) ? 'rtl' : 'ltr';
  const showTitleHeadline =
    Boolean(displayTitle) &&
    displayTitle.toLowerCase() !== displayText.toLowerCase() &&
    !displayText.toLowerCase().startsWith(displayTitle.toLowerCase());

  const { wideUrl, squareUrl } = useMemo(() => {
    return resolveLocalizedChartSvgVariants(item.imageUrl, isArabic ? 'ar' : 'en');
  }, [item.imageUrl, isArabic]);

  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | undefined>(undefined);

  const [origin, setOrigin] = useState('https://ticknal.com');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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
    <article
      id={item.id}
      data-post-id={item.id}
      className={cn(
        'p-4 sm:p-5 sm:py-4.5 border-b border-plt-border-soft transition-colors font-sans select-none',
        isTargetItem
          ? 'bg-[#1d9bf0]/[0.05] ring-1 ring-[#1d9bf0]/40'
          : 'hover:bg-plt-hover'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Left: Scaled circular avatar (36px) with authentic Ticknal logo mark for Ticknal Take */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-plt-base ring-1 ring-plt-border shrink-0 flex items-center justify-center">
          {meta.isTicknalTake ? (
            <span className="w-full h-full flex items-center justify-center bg-plt-base text-plt-text rounded-full p-2" title="Ticknal">
              <svg viewBox="5 6 54 54" className="w-full h-full" fill="none">
                <path
                  fill="currentColor"
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
          <div className="flex items-start sm:items-center justify-between gap-2 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 min-w-0">
              {/* Display Name & Verified Blue Badge */}
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-semibold text-plt-text text-[13px] sm:text-[12.5px] truncate">
                  {meta.isTicknalTake ? (locale === 'ar' ? 'نبض تكنال' : 'Ticknal take') : meta.name}
                </span>

                {meta.verified && (
                  <svg
                    viewBox="0 0 22 22"
                    aria-label="Verified"
                    className="w-3.5 h-3.5 text-[#1d9bf0] fill-current shrink-0"
                  >
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274.1084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.136 2.136 5.477-5.477 1.294 1.294-6.771 6.777z" />
                  </svg>
                )}
              </div>

              {/* Handle + Timestamp (below name on phone, inline on desktop) */}
              <div className="flex items-center gap-1.5 text-plt-faint text-[11.5px] sm:text-[12px] font-normal">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTicker?.(meta.handle.replace(/^@/, ''));
                  }}
                  className="text-plt-faint hover:text-[#1d9bf0] truncate cursor-pointer transition-colors"
                  title={`Filter by ${meta.handle}`}
                >
                  {meta.handle}
                </button>

                <span className="text-plt-faint text-[11px]">·</span>

                <time className="text-plt-faint tabular-nums shrink-0 font-normal">
                  {timeAgo}
                </time>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isTargetItem && (
                <span className="text-[10px] text-[#1d9bf0] bg-[#1d9bf0]/10 border border-[#1d9bf0]/25 px-1.5 py-0.5 rounded font-medium shrink-0">
                  {locale === 'ar' ? 'منشور مشارك' : 'Shared Post'}
                </span>
              )}

              {/* Category Pill: Completely removed for Ticknal take */}
              {!meta.isTicknalTake && item.categoryLabel !== 'Ticknal take' && item.categoryLabel !== 'The Ticknal Take' && item.categoryLabel && (
                <span className="text-[10px] text-plt-muted bg-plt-hover px-1.5 py-0.5 rounded border border-plt-border-soft font-normal shrink-0">
                  {item.categoryLabel}
                </span>
              )}
            </div>
          </div>

          {/* Unified Post Headline + Body with dynamic language resolution and zero cutoff */}
          <div className="mt-2 select-text font-sans space-y-1">
            {showTitleHeadline && (
              <h3
                className="text-[13px] sm:text-[13px] font-semibold text-plt-text leading-snug"
                dir={titleDir}
              >
                {displayTitle}
              </h3>
            )}
            <p
              className="text-[12.5px] sm:text-[12px] text-plt-subtle leading-[1.65] font-normal whitespace-pre-line"
              dir={textDir}
            >
              {displayText}
            </p>

            {hasBoth && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAltLang(!altLang);
                  }}
                  className="text-[11px] text-plt-faint hover:text-[#1d9bf0] transition-colors cursor-pointer select-none inline-flex items-center gap-1"
                >
                  <span>
                    {locale === 'ar'
                      ? altLang
                        ? '← العودة إلى العربية'
                        : 'View in English →'
                      : altLang
                      ? '← View in English'
                      : 'عرض بالعربية →'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Responsive Dual-Variant Media Card:
              - Phone (<640px): 1:1 square container + 1:1 square SVG chart (1080×1080)
              - Desktop (>=640px): 16:9 wide container + 16:9 wide SVG chart (1200×675) */}
          {(wideUrl || squareUrl) && !postImageError && (
            <>
              {/* Phone 1:1 Square Container + 1:1 Square Image */}
              {squareUrl && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLightboxUrl(squareUrl);
                    setIsLightboxOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveLightboxUrl(squareUrl);
                      setIsLightboxOpen(true);
                    }
                  }}
                  className="sm:hidden mt-3.5 rounded-xl overflow-hidden border border-plt-border-soft hover:border-plt-border bg-black w-full aspect-square relative cursor-zoom-in group/img transition-all"
                  title="Tap to view chart in full screen"
                >
                  <img
                    src={squareUrl}
                    alt={displayTitle || item.title || 'Market Chart'}
                    className="w-full h-full object-cover block bg-black"
                    loading="lazy"
                    onError={(err) => {
                      console.warn('[FeedPost] Failed to load mobile square chart image for:', item.id, err);
                      setPostImageError(true);
                    }}
                  />
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-plt-base/80 backdrop-blur-sm border border-plt-border text-plt-subtle text-[11px] font-sans flex items-center gap-1.5 opacity-80 shadow-md pointer-events-none">
                    <Maximize2 size={12} className="text-plt-subtle" />
                  </div>
                </div>
              )}

              {/* Desktop 16:9 Wide Container + 16:9 Wide Image */}
              {wideUrl && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLightboxUrl(wideUrl);
                    setIsLightboxOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveLightboxUrl(wideUrl);
                      setIsLightboxOpen(true);
                    }
                  }}
                  className="hidden sm:block mt-3.5 rounded-xl overflow-hidden border border-plt-border-soft hover:border-plt-border bg-black w-full aspect-[16/9] relative cursor-zoom-in group/img transition-all"
                  title="Click to view chart in full screen"
                >
                  <img
                    src={wideUrl}
                    alt={displayTitle || item.title || 'Market Chart'}
                    className="w-full h-full object-cover block bg-black transition-transform duration-200 group-hover/img:scale-[1.008]"
                    loading="lazy"
                    onError={(err) => {
                      console.warn('[FeedPost] Failed to load desktop wide chart image for:', item.id, err);
                      setPostImageError(true);
                    }}
                  />
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-plt-base/80 backdrop-blur-sm border border-plt-border text-plt-subtle group-hover/img:text-plt-text group-hover/img:bg-plt-base/90 group-hover/img:border-plt-border text-[11px] font-sans flex items-center gap-1.5 transition-all opacity-80 group-hover/img:opacity-100 shadow-md pointer-events-none">
                    <Maximize2 size={12} className="text-plt-subtle" />
                    <span className="hidden sm:inline">View chart</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fullscreen Interactive Lightbox Modal */}
          {(activeLightboxUrl || wideUrl || squareUrl) && (
            <NewsImageLightbox
              isOpen={isLightboxOpen}
              imageUrl={activeLightboxUrl || wideUrl || squareUrl || ''}
              title={displayTitle || item.title}
              sourceName={meta.isTicknalTake ? (locale === 'ar' ? 'نبض تكنال' : 'Ticknal take') : meta.name}
              onClose={() => setIsLightboxOpen(false)}
            />
          )}

          {/* Action Buttons Row: Clean dark outline action buttons without fake reaction numbers */}
          <div className="mt-3.5 pt-2.5 border-t border-plt-border-soft flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            {/* 1. Like Action Button */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={cn(
                'h-7 w-7 rounded-[8px] border transition-all flex items-center justify-center bg-plt-base hover:bg-plt-hover cursor-pointer select-none shrink-0',
                isLiked
                  ? 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                  : 'border-plt-border hover:border-plt-border-soft text-plt-subtle hover:text-plt-text'
              )}
              title={isLiked ? 'Unlike post' : 'Like post'}
            >
              <Heart
                size={13.5}
                fill={isLiked ? 'currentColor' : 'none'}
                className={isLiked ? 'text-rose-500 shrink-0' : 'text-plt-subtle shrink-0'}
              />
            </button>

            {/* 2. Save Action Button */}
            <button
              type="button"
              onClick={handleToggleSave}
              className={cn(
                'h-7 w-7 rounded-[8px] border transition-all flex items-center justify-center bg-plt-base hover:bg-plt-hover cursor-pointer select-none shrink-0',
                isSaved
                  ? 'border-amber-400/40 text-amber-400 bg-amber-400/10'
                  : 'border-plt-border hover:border-plt-border-soft text-plt-subtle hover:text-plt-text'
              )}
              title={isSaved ? 'Remove bookmark' : 'Bookmark disclosure'}
            >
              <Bookmark
                size={13.5}
                fill={isSaved ? 'currentColor' : 'none'}
                className={isSaved ? 'text-amber-400 shrink-0' : 'text-plt-subtle shrink-0'}
              />
            </button>

            {/* 3. Social Popover (Radix Popover with Rich Card Preview, PNG Image + Text + Redirect Link) */}
            <SocialShareModal
              item={item}
              displayTitle={displayTitle}
              displayText={displayText}
              isArabic={isArabic}
              wideUrl={wideUrl}
              squareUrl={squareUrl}
            />

            {/* 5. Official Filing Button: Icon-only on mobile (28x28), full text on desktop */}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-7 sm:w-auto sm:px-2.5 rounded-[8px] border border-plt-border bg-plt-base hover:bg-plt-hover hover:border-plt-border-soft transition-all flex items-center justify-center sm:justify-start gap-1.5 text-plt-text cursor-pointer select-none ml-auto shrink-0"
                title="View official filing"
              >
                <ExternalLink size={13} className="text-plt-subtle shrink-0" />
                <span className="hidden sm:inline text-[11.5px] font-medium">Filing ↗</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
