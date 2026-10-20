import React from 'react';
import { Landmark, Coins, TrendingUp } from '@/components/ui/icon-library';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';

export const TRADINGVIEW_LOGOS: Record<string, string> = {
  COMI: 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg',
  TMGH: 'https://s3-symbol-logo.tradingview.com/t-m-g.svg',
  SWDY: 'https://s3-symbol-logo.tradingview.com/elswedy-electric.svg',
  FWRY: 'https://s3-symbol-logo.tradingview.com/fawry-for-banking-technology-and-electronic-payment.svg',
  EAST: 'https://s3-symbol-logo.tradingview.com/eastern-company.svg',
  ESRS: 'https://s3-symbol-logo.tradingview.com/basic-materials--big.svg',
  ETEL: 'https://s3-symbol-logo.tradingview.com/telecom-egypt.svg',
  ORAS: 'https://s3-symbol-logo.tradingview.com/orascom-construction-plc.svg',
  AMOC: 'https://s3-symbol-logo.tradingview.com/alexandria-mineral-oils-company.svg',
  MFPC: 'https://s3-symbol-logo.tradingview.com/misr-fretilizers-production-company-mopco.svg',
  HELI: 'https://s3-symbol-logo.tradingview.com/heliopolis-housing.svg',
  SKPC: 'https://s3-symbol-logo.tradingview.com/sidi-kerir-petrochemicals-sidpec.svg',
  POUL: 'https://s3-symbol-logo.tradingview.com/cairo-poultry.svg',
  ABUK: 'https://s3-symbol-logo.tradingview.com/abou-kir-fertilizers.svg',
  GPPL: 'https://s3-symbol-logo.tradingview.com/golden-pyramids-plaza.svg',
  CERA: 'https://s3-symbol-logo.tradingview.com/the-arab-ceramic-co-ceramica-remas.svg',
  JUFO: 'https://s3-symbol-logo.tradingview.com/juhayna-food-industries.svg',
  ISPH: 'https://s3-symbol-logo.tradingview.com/ibnsina-pharma.svg',
  ALCN: 'https://s3-symbol-logo.tradingview.com/alexandria-containers-and-goods.svg',
  'GC1!': 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  GOLD: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  GOLD21K: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  GOLD24K: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  XAUUSD: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
  'SI1!': 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  SILVER: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  SILV999: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  XAGUSD: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
  'USD/EGP': 'https://s3-symbol-logo.tradingview.com/country/US.svg',
  USDEGP: 'https://s3-symbol-logo.tradingview.com/country/US.svg',
  EGX30: 'https://s3-symbol-logo.tradingview.com/country/EG.svg',
  EGX70: 'https://s3-symbol-logo.tradingview.com/country/EG.svg',
  EGX100: 'https://s3-symbol-logo.tradingview.com/country/EG.svg',
};

export interface SourceMeta {
  name: string;
  handle: string;
  avatarUrl?: string;
  fallbackIcon: React.ReactNode;
  verified: boolean;
  isTicknalTake?: boolean;
}

export function resolveSourceMeta(item: MarketNewsItemDTO): SourceMeta {
  const src = item.source.toLowerCase();
  const cat = item.category.toLowerCase();
  const firstTicker = item.tickers?.[0]?.toUpperCase().replace(/^[@$]/, '') || '';
  const resolvedLogo = item.logoUrl || (firstTicker ? TRADINGVIEW_LOGOS[firstTicker] : undefined);

  // 1. Ticknal take (renders authentic Ticknal brand mark)
  if (cat === 'ticknal_take' || cat === 'pulse' || src.includes('ticknal') || item.id.startsWith('take-')) {
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
      avatarUrl: resolvedLogo,
      fallbackIcon: <span className="text-[11px] font-bold text-amber-400 tabular-nums">R</span>,
      verified: true,
    };
  }

  if (src.includes('dow jones') || src.includes('djn')) {
    return {
      name: 'Dow Jones Newswires',
      handle: firstTicker ? `@${firstTicker}` : '@DOWJONES',
      avatarUrl: resolvedLogo,
      fallbackIcon: <span className="text-[11px] font-bold text-blue-400 tabular-nums">DJ</span>,
      verified: true,
    };
  }

  if (src.includes('zawya')) {
    return {
      name: 'Zawya',
      handle: firstTicker ? `@${firstTicker}` : '@ZAWYA',
      avatarUrl: resolvedLogo,
      fallbackIcon: <span className="text-[11px] font-bold text-emerald-400 tabular-nums">Z</span>,
      verified: true,
    };
  }

  if (src.includes('arabictrader')) {
    return {
      name: 'ArabicTrader',
      handle: firstTicker ? `@${firstTicker}` : '@ARABIC_TRADER',
      avatarUrl: resolvedLogo,
      fallbackIcon: <span className="text-[11px] font-bold text-emerald-400 tabular-nums">AT</span>,
      verified: true,
    };
  }

  if (src.includes('trading economics')) {
    return {
      name: 'Trading Economics',
      handle: firstTicker ? `@${firstTicker}` : '@TE',
      avatarUrl: resolvedLogo,
      fallbackIcon: <span className="text-[11px] font-bold text-cyan-400 tabular-nums">TE</span>,
      verified: true,
    };
  }

  // 3. Central Bank of Egypt
  if (src.includes('central bank') || src.includes('cbe') || firstTicker === 'CBE') {
    return {
      name: 'Central Bank of Egypt',
      handle: '@CBE',
      avatarUrl: TRADINGVIEW_LOGOS.EGX30,
      fallbackIcon: <Landmark className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 4. Gold Markets
  if (
    cat === 'gold_silver' &&
    (firstTicker.includes('GOLD') || firstTicker === 'GC1!' || firstTicker === 'XAUUSD' || src.includes('gold') || src.includes('xauusd'))
  ) {
    return {
      name: item.companyName || 'Gold Markets',
      handle: '@GOLD',
      avatarUrl: TRADINGVIEW_LOGOS.GOLD,
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-amber-300" />,
      verified: true,
    };
  }

  // 5. Silver Markets
  if (
    cat === 'gold_silver' &&
    (firstTicker.includes('SILV') || firstTicker === 'SI1!' || firstTicker === 'XAGUSD' || src.includes('silver') || src.includes('xagusd'))
  ) {
    return {
      name: item.companyName || 'Silver Markets',
      handle: '@SILVER',
      avatarUrl: TRADINGVIEW_LOGOS.SILVER,
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-zinc-300" />,
      verified: true,
    };
  }

  // 6. EGX Indices
  if (firstTicker.startsWith('EGX') || src.startsWith('egx')) {
    const idxKey = firstTicker || item.source.toUpperCase();
    return {
      name: item.companyName || `${idxKey} Index`,
      handle: `@${idxKey}`,
      avatarUrl: TRADINGVIEW_LOGOS[idxKey] || TRADINGVIEW_LOGOS.EGX30,
      fallbackIcon: <TrendingUp className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 7. USD / EGP Currency
  if (firstTicker === 'USD/EGP' || firstTicker === 'USDEGP' || src.includes('usd/egp') || src.includes('usdegp')) {
    return {
      name: item.companyName || 'USD / EGP',
      handle: '@USD/EGP',
      avatarUrl: TRADINGVIEW_LOGOS['USD/EGP'],
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 8. Investment Funds
  if (cat === 'funds' || firstTicker === 'AZG' || src.includes('azimut')) {
    return {
      name: item.companyName || (src.includes('ci') ? 'CI Capital Asset Management' : 'Azimut Egypt'),
      handle: firstTicker ? `@${firstTicker}` : '@FUNDS',
      avatarUrl: resolvedLogo,
      fallbackIcon: <TrendingUp className="w-3.5 h-3.5 text-[#00BCE6]" />,
      verified: true,
    };
  }

  // 9. Any Listed Egyptian Company (HELI, SKPC, POUL, ABUK, SWDY, TMGH, COMI, MFPC, GPPL, etc.)
  const companyName = item.companyName || (firstTicker && item.source !== firstTicker ? item.source : undefined);
  const displayName = companyName || item.source || firstTicker || 'Egyptian Equities';
  const displayHandle = firstTicker ? `@${firstTicker}` : (item.source ? `@${item.source.replace(/^@/, '')}` : '@MARKET');
  const initial = (displayName || firstTicker || 'C').trim().charAt(0).toUpperCase();

  return {
    name: displayName,
    handle: displayHandle,
    avatarUrl: resolvedLogo,
    fallbackIcon: (
      <span className="text-[11px] font-bold text-white tabular-nums">
        {initial}
      </span>
    ),
    verified: Boolean(firstTicker || resolvedLogo),
  };
}
