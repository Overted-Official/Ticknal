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
  KORA: 'https://s3-symbol-logo.tradingview.com/korra.svg',
  ARAB: 'https://s3-symbol-logo.tradingview.com/arab-developers-holding.svg',
  PHDC: 'https://s3-symbol-logo.tradingview.com/palm-hills-developments-sae.svg',
  PHGC: 'https://s3-symbol-logo.tradingview.com/palm-hills-developments-sae.svg',
  BTFH: 'https://s3-symbol-logo.tradingview.com/belton-financial.svg',
  HRHO: 'https://s3-symbol-logo.tradingview.com/egyptian-financial-hermes-company.svg',
  CCAP: 'https://s3-symbol-logo.tradingview.com/citadel-capital-common-shares.svg',
  ADIB: 'https://s3-symbol-logo.tradingview.com/abu-dhabi-islamic-bank-egypt.svg',
  CIEB: 'https://s3-symbol-logo.tradingview.com/credit-agricole-egypt.svg',
  EKHO: 'https://s3-symbol-logo.tradingview.com/egypt-kuwait-holding.svg',
  ORWE: 'https://s3-symbol-logo.tradingview.com/oriental-weavers.svg',
  MNHD: 'https://s3-symbol-logo.tradingview.com/madinet-masr-housing-and-development.svg',
  MASR: 'https://s3-symbol-logo.tradingview.com/madinet-masr-housing-and-development.svg',
  OCDI: 'https://s3-symbol-logo.tradingview.com/sixth-of-october-development-and-investment-sodic.svg',
  PRDC: 'https://s3-symbol-logo.tradingview.com/pioneers-properties-for-urban-development-common-shares.svg',
  ELEC: 'https://s3-symbol-logo.tradingview.com/electro-cable-egypt.svg',
  GBCO: 'https://s3-symbol-logo.tradingview.com/gb-corp.svg',
  VALU: 'https://s3-symbol-logo.tradingview.com/valu.svg',
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

export const EGX_CANONICAL_NAMES: Record<string, string> = {
  COMI: 'Commercial International Bank (CIB)',
  TMGH: 'Talaat Moustafa Group Holding',
  SWDY: 'Elsewedy Electric',
  EAST: 'Eastern Company',
  FWRY: 'Fawry for Banking Technology',
  ETEL: 'Telecom Egypt',
  ABUK: 'Abou Kir Fertilizers',
  MFPC: 'Misr Fertilizers Production (MOPCO)',
  SKPC: 'Sidi Kerir Petrochemicals (SIDPEC)',
  HELI: 'Heliopolis Housing',
  POUL: 'Cairo Poultry Co.',
  ARAB: 'Arab Developers Holding',
  ESRS: 'Ezz Steel',
  ORAS: 'Orascom Construction',
  AMOC: 'Alexandria Mineral Oils (AMOC)',
  ISPH: 'Ibnsina Pharma',
  JUFO: 'Juhayna Food Industries',
  ALCN: 'Alexandria Containers & Goods',
  GPPL: 'Golden Pyramids Plaza',
  CERA: 'Ceramica Remas',
  PRDC: 'Pioneers Properties for Urban Development',
  PHGC: 'Palm Hills Developments',
  PHDC: 'Palm Hills Developments',
  BTFH: 'Beltone Holding',
  HRHO: 'EFG Holding',
  CCAP: 'Qalaa Holdings',
  ADIB: 'Abu Dhabi Islamic Bank - Egypt',
  CIEB: 'Credit Agricole Egypt',
  FAIT: 'Faisal Islamic Bank of Egypt',
  EKHO: 'Egypt Kuwait Holding',
  ORWE: 'Oriental Weavers',
  MNHD: 'Madinet Masr',
  MASR: 'Madinet Masr',
  OCDI: 'SODIC',
  KORA: 'Korra Holding',
  NIPH: 'Nile Pharmaceuticals',
  SPMD: 'Speed Medical',
  PRMH: 'Prime Holding',
  HALN: 'Halwani Brothers',
  KABO: 'El Nasr Clothing & Textiles (KABO)',
  EASB: 'Eastern National Bank',
  CPME: 'Chemical Industries Development (CID)',
  ELEC: 'Electro Cable Egypt',
  RUBX: 'Rubex Plastics',
  TWSA: 'Taamir Mortgage Finance',
  GBCO: 'GB Corp',
  VALU: 'Valu',
};

const WIRE_SOURCES_SET = new Set([
  'reuters',
  'dow jones',
  'dow jones newswires',
  'djn',
  'zawya',
  'arabictrader',
  'trading economics',
  'bloomberg',
  'zacks',
  'asharq',
  'mubasher',
  'moneycontrol',
  'market wire',
  'cnbc',
]);

export function isWireSourceName(src?: string | null): boolean {
  if (!src) return false;
  const s = src.toLowerCase().trim();
  return WIRE_SOURCES_SET.has(s) || Array.from(WIRE_SOURCES_SET).some((w) => s.includes(w));
}

export interface SourceMeta {
  name: string;
  handle: string;
  avatarUrl?: string;
  fallbackIcon: React.ReactNode;
  verified: boolean;
  isTicknalTake?: boolean;
}

export function resolveSourceMeta(item: MarketNewsItemDTO): SourceMeta {
  const cat = (item.category || '').toLowerCase();
  const src = (item.source || '').toLowerCase().trim();

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

  // 2. Resolve primary asset ticker (NO wire publisher overrides - poster is strictly the asset!)
  let rawTicker = item.tickers?.[0] ? String(item.tickers[0]).toUpperCase().replace(/^[@$]/, '').trim() : '';

  // If firstTicker is empty, try source if source is not a wire name
  if (!rawTicker && item.source && !isWireSourceName(item.source)) {
    rawTicker = item.source.toUpperCase().replace(/^[@$]/, '').trim();
  }

  // If still empty, infer from title or category
  const titleLower = (item.title || '').toLowerCase();
  if (!rawTicker) {
    if (cat === 'gold_silver' || titleLower.includes('silver') || titleLower.includes('فضة')) {
      rawTicker = titleLower.includes('silver') || titleLower.includes('فضة') ? 'SILVER' : 'GOLD21K';
    } else if (titleLower.includes('cbe') || titleLower.includes('مركزي')) {
      rawTicker = 'CBE';
    } else if (titleLower.includes('usd') || titleLower.includes('dollar') || titleLower.includes('دولار') || titleLower.includes('جنيه')) {
      rawTicker = 'USD/EGP';
    } else if (titleLower.includes('egx30') || titleLower.includes('egx 30')) {
      rawTicker = 'EGX30';
    } else if (titleLower.includes('egx70') || titleLower.includes('egx 70')) {
      rawTicker = 'EGX70';
    } else if (titleLower.includes('egx100') || titleLower.includes('egx 100')) {
      rawTicker = 'EGX100';
    }
  }

  // Normalize aliases for logo lookup
  let logoLookupKey = rawTicker;
  if (['GOLD', 'GOLD21K', 'GOLD24K', 'GC1!', 'XAUUSD'].includes(rawTicker)) {
    logoLookupKey = 'GOLD';
  } else if (['SILVER', 'SILV999', 'SI1!', 'XAGUSD'].includes(rawTicker)) {
    logoLookupKey = 'SILVER';
  } else if (['USDEGP', 'USD/EGP'].includes(rawTicker)) {
    logoLookupKey = 'USD/EGP';
  }

  const resolvedLogo = item.logoUrl || (logoLookupKey ? TRADINGVIEW_LOGOS[logoLookupKey] : undefined);

  // 3. Central Bank of Egypt
  if (rawTicker === 'CBE' || src.includes('central bank') || src.includes('cbe')) {
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
    ['GOLD', 'GOLD21K', 'GOLD24K', 'GC1!', 'XAUUSD'].includes(rawTicker) ||
    (cat === 'gold_silver' && !titleLower.includes('silver') && !titleLower.includes('فضة') && (titleLower.includes('gold') || titleLower.includes('ذهب') || src.includes('gold')))
  ) {
    return {
      name: 'Gold Markets',
      handle: '@GOLD21K',
      avatarUrl: TRADINGVIEW_LOGOS.GOLD,
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-amber-300" />,
      verified: true,
    };
  }

  // 5. Silver Markets
  if (
    ['SILVER', 'SILV999', 'SI1!', 'XAGUSD'].includes(rawTicker) ||
    (titleLower.includes('silver') || titleLower.includes('فضة') || src.includes('silver'))
  ) {
    return {
      name: 'Silver Markets',
      handle: '@SILVER',
      avatarUrl: TRADINGVIEW_LOGOS.SILVER,
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-zinc-300" />,
      verified: true,
    };
  }

  // 6. EGX Indices
  if (rawTicker.startsWith('EGX')) {
    return {
      name: `${rawTicker} Index`,
      handle: `@${rawTicker}`,
      avatarUrl: TRADINGVIEW_LOGOS[rawTicker] || TRADINGVIEW_LOGOS.EGX30,
      fallbackIcon: <TrendingUp className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 7. USD / EGP Currency
  if (rawTicker === 'USD/EGP' || rawTicker === 'USDEGP') {
    return {
      name: 'USD / EGP',
      handle: '@USD/EGP',
      avatarUrl: TRADINGVIEW_LOGOS['USD/EGP'],
      fallbackIcon: <Coins className="w-3.5 h-3.5 text-white" />,
      verified: true,
    };
  }

  // 8. Investment Funds
  if (cat === 'funds' || rawTicker === 'AZG' || src.includes('azimut')) {
    return {
      name: item.companyName && !isWireSourceName(item.companyName) ? item.companyName : (rawTicker === 'AZG' ? 'Azimut Egypt' : 'Investment Funds'),
      handle: rawTicker ? `@${rawTicker}` : '@FUNDS',
      avatarUrl: resolvedLogo,
      fallbackIcon: <TrendingUp className="w-3.5 h-3.5 text-[#00BCE6]" />,
      verified: true,
    };
  }

  // 9. Listed Egyptian Company / Asset
  // Strict rule: Poster name must ALWAYS be the asset name, NEVER the wire source name!
  const hasCleanCompanyName = Boolean(item.companyName && !isWireSourceName(item.companyName));
  const canonicalName = rawTicker ? EGX_CANONICAL_NAMES[rawTicker] : undefined;
  const displayName = canonicalName || (hasCleanCompanyName ? item.companyName! : (rawTicker ? `${rawTicker} (EGX)` : 'Egyptian Equities'));
  const displayHandle = rawTicker ? `@${rawTicker}` : '@MARKET';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'E';

  return {
    name: displayName,
    handle: displayHandle,
    avatarUrl: resolvedLogo,
    fallbackIcon: (
      <span className="text-[11px] font-bold text-white tabular-nums">
        {initial}
      </span>
    ),
    verified: Boolean(rawTicker || resolvedLogo),
  };
}
