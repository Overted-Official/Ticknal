import {
  getCachedTickers,
  getCachedRecentPrices,
  getCachedDailyPrices,
} from '@/lib/data-cache';

export interface LandingMarqueeTicker {
  symbol: string;
  name: string;
  logo: string | null;
  price: number;
  change: number;
}

export interface LandingCoverageAsset {
  symbol: string;
  name: string;
  sector: string;
  price: string;
  unit?: string;
  change: number;
  badge: string;
  points: number[];
  logoUrl: string;
  type?: 'stock' | 'fund' | 'metal';
}

export interface LandingCoverageCard {
  id: string;
  category: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  accentColor: string;
  items: LandingCoverageAsset[];
}

/**
 * Retrieves the full universe of 293 EGX equity tickers with their latest
 * price and 1D percentage change, utilizing server-level memory caching.
 */
export async function getLandingMarqueeTickers(): Promise<LandingMarqueeTicker[]> {
  try {
    const [allTickers, recentPrices] = await Promise.all([
      getCachedTickers(),
      getCachedRecentPrices(),
    ]);

    const priceMap = new Map<string, { latest: number; prev: number }>();
    for (const p of recentPrices) {
      const sym = (p.ticker_symbol || p.tickerSymbol) as string;
      if (!sym) continue;
      if (!priceMap.has(sym)) {
        priceMap.set(sym, { latest: 0, prev: 0 });
      }
      const entry = priceMap.get(sym)!;
      const rn = Number(p.rn);
      const close = Number(p.close);
      if (rn === 1) entry.latest = close;
      if (rn === 2) entry.prev = close;
    }

    // Filter to the 293 active EGX equities (excluding funds, indices, macro benchmarks)
    const equities = allTickers.filter(
      (t) =>
        t.exchange === 'EGX' &&
        t.sector !== 'Funds' &&
        t.sector !== 'Indices' &&
        t.sector !== 'Macro'
    );

    return equities.map((t) => {
      const priceInfo = priceMap.get(t.symbol) || { latest: 0, prev: 0 };
      const latest = priceInfo.latest || 0;
      const prev = priceInfo.prev || 0;
      const change =
        prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0;

      return {
        symbol: t.symbol,
        name: t.companyName || t.symbol,
        logo: t.logoUrl || null,
        price: latest,
        change,
      };
    });
  } catch (error) {
    console.error('Failed to query landing marquee tickers from database:', error);
    return [];
  }
}

interface TargetAssetConfig {
  symbol: string;
  name: string;
  sector: string;
  unit?: string;
  logoUrl: string;
  type: 'stock' | 'fund' | 'metal';
}

interface TargetCategoryConfig {
  id: string;
  category: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  accentColor: string;
  assets: TargetAssetConfig[];
}

/**
 * Retrieves live database pricing, historical 30-day sparkline closes, and real logos
 * for the 3 landing page coverage cards (Equities, Funds, Precious Metals).
 */
export async function getLandingCoverageCardsData(): Promise<LandingCoverageCard[]> {
  try {
    const [allTickers, recentPrices] = await Promise.all([
      getCachedTickers(),
      getCachedRecentPrices(),
    ]);

    const tickerMap = new Map(allTickers.map((t) => [t.symbol, t]));
    const priceMap = new Map<string, { latest: number; prev: number }>();
    for (const p of recentPrices) {
      const sym = (p.ticker_symbol || p.tickerSymbol) as string;
      if (!sym) continue;
      if (!priceMap.has(sym)) {
        priceMap.set(sym, { latest: 0, prev: 0 });
      }
      const entry = priceMap.get(sym)!;
      const rn = Number(p.rn);
      const close = Number(p.close);
      if (rn === 1) entry.latest = close;
      if (rn === 2) entry.prev = close;
    }

    const targetConfigs: TargetCategoryConfig[] = [
      // 1. Equities
      {
        id: 'equities',
        category: 'Egyptian Equities',
        subtitle: 'Top performing EGX stocks by monthly return',
        ctaText: 'See all Egyptian stocks',
        ctaHref: '/markets',
        accentColor: '#089981',
        assets: [
          {
            symbol: 'SWDY',
            name: 'Elsewedy Electric',
            sector: 'Industrial Goods',
            unit: 'EGP',
            logoUrl: 'https://s3-symbol-logo.tradingview.com/elswedy-electric.svg',
            type: 'stock',
          },
          {
            symbol: 'TMGH',
            name: 'Talaat Moustafa Group',
            sector: 'Real Estate',
            unit: 'EGP',
            logoUrl: 'https://s3-symbol-logo.tradingview.com/t-m-g.svg',
            type: 'stock',
          },
          {
            symbol: 'COMI',
            name: 'Commercial International Bank',
            sector: 'Banking',
            unit: 'EGP',
            logoUrl: 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg',
            type: 'stock',
          },
        ],
      },
      // 2. Funds
      {
        id: 'funds',
        category: 'Mutual & Money Market Funds',
        subtitle: 'Top performing funds across Egyptian asset managers',
        ctaText: 'See all mutual funds',
        ctaHref: '/markets',
        accentColor: '#00E5FF',
        assets: [
          {
            symbol: 'ADF',
            name: 'Al Ahly Dahab Fund',
            sector: 'Gold Fund',
            unit: 'EGP',
            logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777587912769-0m35y8f5lyg.png',
            type: 'fund',
          },
          {
            symbol: 'AZG',
            name: 'Azimut Gold Fund',
            sector: 'Islamic Sharia Gold',
            unit: 'EGP',
            logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777538713543-q0uscbyqpyh.png',
            type: 'fund',
          },
          {
            symbol: 'AFB',
            name: 'NBE Fund 1 (Balanced)',
            sector: 'Balanced Growth',
            unit: 'EGP',
            logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777508615629-t9msj6qwgbk.png',
            type: 'fund',
          },
        ],
      },
      // 3. Metals (Strictly Gold and Silver)
      {
        id: 'metals',
        category: 'Precious Metals & Bullion',
        subtitle: 'Real-time Egyptian physical bullion benchmarks',
        ctaText: 'See all precious metals',
        ctaHref: '/markets',
        accentColor: '#f59e0b',
        assets: [
          {
            symbol: 'GC1!',
            name: 'Gold',
            sector: 'Precious Metals',
            unit: 'EGP / g',
            logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
            type: 'metal',
          },
          {
            symbol: 'SI1!',
            name: 'Silver',
            sector: 'Precious Metals',
            unit: 'EGP / g',
            logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
            type: 'metal',
          },
        ],
      },
    ];

    const allSymbols = targetConfigs.flatMap((c) => c.assets.map((a) => a.symbol));
    const historyResults = await Promise.all(
      allSymbols.map(async (sym) => {
        try {
          const prices = await getCachedDailyPrices(sym, 30);
          return { sym, prices: prices || [] };
        } catch {
          return { sym, prices: [] };
        }
      })
    );

    const historyMap = new Map<string, any[]>();
    for (const { sym, prices } of historyResults) {
      historyMap.set(sym, prices);
    }

    const cards: LandingCoverageCard[] = targetConfigs.map((cfg) => {
      const items: LandingCoverageAsset[] = cfg.assets.map((asset) => {
        const historyRows = historyMap.get(asset.symbol) || [];
        const closes = historyRows
          .map((r) => Number(r.close))
          .filter((v) => !isNaN(v) && v > 0);

        const priceInfo = priceMap.get(asset.symbol);
        const ticker = tickerMap.get(asset.symbol);

        const latestPriceNum =
          closes.length > 0
            ? closes[closes.length - 1]
            : priceInfo?.latest || (ticker?.price ? Number(ticker.price) : 0);

        const oldestPriceNum = closes.length > 1 ? closes[0] : latestPriceNum;
        const changePct =
          oldestPriceNum > 0
            ? Number((((latestPriceNum - oldestPriceNum) / oldestPriceNum) * 100).toFixed(2))
            : priceInfo?.prev && priceInfo.prev > 0
            ? Number((((latestPriceNum - priceInfo.prev) / priceInfo.prev) * 100).toFixed(2))
            : 0;

        const formattedPrice =
          latestPriceNum >= 1000
            ? latestPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : latestPriceNum > 0
            ? latestPriceNum.toFixed(2)
            : '—';

        // Extract last 16-24 closes for smooth sparkline
        const sparklinePoints =
          closes.length >= 2 ? closes.slice(-20) : [latestPriceNum, latestPriceNum];

        return {
          symbol: asset.symbol,
          name: asset.name,
          sector: asset.sector,
          price: formattedPrice,
          unit: asset.unit || 'EGP',
          change: changePct,
          badge: asset.symbol,
          points: sparklinePoints,
          logoUrl: asset.logoUrl || ticker?.logoUrl || '',
          type: asset.type,
        };
      });

      return {
        id: cfg.id,
        category: cfg.category,
        subtitle: cfg.subtitle,
        ctaText: cfg.ctaText,
        ctaHref: cfg.ctaHref,
        accentColor: cfg.accentColor,
        items,
      };
    });

    return cards;
  } catch (err) {
    console.error('Error querying coverage cards data:', err);
    return [];
  }
}
