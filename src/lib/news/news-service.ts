import { db, schema } from '@/db';
import { marketNews, tickers } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export type NewsCategory =
  | 'ticknal_take'
  | 'macro_market'
  | 'listed_companies'
  | 'funds'
  | 'gold_silver'
  // Legacy categories for backwards compatibility:
  | 'pulse'
  | 'egx_disclosures'
  | 'cbe_macro'
  | 'bullion_fx'
  | 'earnings'
  | 'sectors';

export interface MarketNewsItemDTO {
  id: string;
  title: string;
  summary: string;
  content?: string | null;
  category: NewsCategory;
  categoryLabel: string;
  tickers: string[];
  sentiment: 'bullish' | 'neutral' | 'bearish';
  source: string;
  sourceUrl?: string | null;
  importance: 'critical' | 'high' | 'normal';
  urgencyScore: number;
  impactMetric?: string | null;
  readTime: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  companyName?: string | null;
  publishedAt: string;
}

export interface NewsQueryFilters {
  category?: string;
  ticker?: string;
  query?: string;
  itemId?: string;
  minUrgency?: number;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export const CATEGORY_MAP: Record<string, string[]> = {
  ticknal_take: ['ticknal_take', 'pulse'],
  macro_market: ['macro_market', 'cbe_macro'],
  listed_companies: ['listed_companies', 'egx_disclosures', 'earnings', 'sectors'],
  funds: ['funds'],
  gold_silver: ['gold_silver', 'bullion_fx'],
};

let isTableInitialized = false;

// Ensure database table exists for market news disclosures
export async function ensureMarketNewsTable(): Promise<void> {
  if (isTableInitialized) return;

  try {
    // 1. Create table if not exists (raw SQL DDL for seamless offline PGlite & Postgres support)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS public.market_news (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT,
        category VARCHAR(50) NOT NULL,
        category_label VARCHAR(100) NOT NULL,
        tickers JSONB DEFAULT '[]'::jsonb NOT NULL,
        sentiment VARCHAR(20) DEFAULT 'neutral' NOT NULL,
        source VARCHAR(100) NOT NULL,
        source_url TEXT,
        importance VARCHAR(20) DEFAULT 'normal' NOT NULL,
        urgency_score INTEGER DEFAULT 5 NOT NULL,
        impact_metric VARCHAR(100),
        read_time VARCHAR(30) DEFAULT '2 min read' NOT NULL,
        image_url TEXT,
        published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      ALTER TABLE public.market_news ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE public.market_news ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 5;
      CREATE INDEX IF NOT EXISTS market_news_category_idx ON public.market_news(category);
      CREATE INDEX IF NOT EXISTS market_news_published_at_idx ON public.market_news(published_at);
      CREATE INDEX IF NOT EXISTS market_news_sentiment_idx ON public.market_news(sentiment);
      CREATE INDEX IF NOT EXISTS market_news_urgency_score_idx ON public.market_news(urgency_score);
    `);

    isTableInitialized = true;
  } catch (err) {
    console.error('[news-service] Failed to ensure market_news table:', err);
  }
}

export interface TickerMeta {
  logoUrl: string | null;
  companyName: string | null;
}

let tickerMetaCache: {
  expiresAt: number;
  map: Map<string, TickerMeta>;
} | null = null;

export async function getTickerMetaMap(): Promise<Map<string, TickerMeta>> {
  const now = Date.now();
  if (tickerMetaCache && tickerMetaCache.expiresAt > now) {
    return tickerMetaCache.map;
  }

  try {
    const rows = await db
      .select({
        symbol: tickers.symbol,
        companyName: tickers.companyName,
        logoUrl: tickers.logoUrl,
      })
      .from(tickers);

    const map = new Map<string, TickerMeta>();
    for (const r of rows) {
      if (r.symbol) {
        map.set(r.symbol.toUpperCase().trim(), {
          logoUrl: r.logoUrl ?? null,
          companyName: r.companyName ?? null,
        });
      }
    }

    tickerMetaCache = {
      expiresAt: now + 5 * 60 * 1000,
      map,
    };
    return map;
  } catch (err) {
    console.error('[news-service] Failed to fetch ticker meta map:', err);
    return tickerMetaCache?.map || new Map();
  }
}

export const MACRO_ASSET_LOGOS: Record<string, { logoUrl: string; companyName: string }> = {
  GOLD: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg', companyName: 'Gold Markets' },
  GOLD21K: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg', companyName: 'Sagha Gold 21K' },
  GOLD24K: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg', companyName: 'Sagha Gold 24K' },
  'GC1!': { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg', companyName: 'Gold Comex Futures' },
  XAUUSD: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg', companyName: 'Gold Spot' },
  SILVER: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg', companyName: 'Silver Markets' },
  SILV999: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg', companyName: 'Sagha Silver 999' },
  'SI1!': { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg', companyName: 'Silver Comex Futures' },
  XAGUSD: { logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg', companyName: 'Silver Spot' },
  'USD/EGP': { logoUrl: 'https://s3-symbol-logo.tradingview.com/country/US.svg', companyName: 'USD / EGP' },
  USDEGP: { logoUrl: 'https://s3-symbol-logo.tradingview.com/country/US.svg', companyName: 'USD / EGP' },
  EGX30: { logoUrl: 'https://s3-symbol-logo.tradingview.com/country/EG.svg', companyName: 'EGX 30 Index' },
  EGX70: { logoUrl: 'https://s3-symbol-logo.tradingview.com/country/EG.svg', companyName: 'EGX 70 EWI' },
  EGX100: { logoUrl: 'https://s3-symbol-logo.tradingview.com/country/EG.svg', companyName: 'EGX 100 EWI' },
  CBE: { logoUrl: 'https://s3-symbol-logo.tradingview.com/country/EG.svg', companyName: 'Central Bank of Egypt' },
};

export async function getMarketNewsItems(filters: NewsQueryFilters = {}) {
  await ensureMarketNewsTable();

  const { category, ticker, query, itemId, limit = 50, offset = 0, startDate, endDate } = filters;

  // Query all news items ordered by publication timestamp descending
  const rawRows = await db
    .select()
    .from(marketNews)
    .orderBy(desc(marketNews.publishedAt));

  // Deduplicate identical normalized wire headlines while preserving distinct daily Ticknal take briefings
  const seenNormHeadlines = new Set<string>();
  const rows: typeof rawRows = [];
  for (const row of rawRows) {
    const isTicknalTake =
      row.id.startsWith('take-') ||
      row.category === 'ticknal_take' ||
      row.category === 'pulse';
    const dedupKey = isTicknalTake
      ? `take:${row.id}`
      : row.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 60);
    if (seenNormHeadlines.has(dedupKey)) continue;
    seenNormHeadlines.add(dedupKey);
    rows.push(row);
  }

  // Pre-filter rows by date range if provided
  let timeFilteredRows = rows;
  if (startDate) {
    const startIso = `${startDate}T00:00:00.000Z`;
    timeFilteredRows = timeFilteredRows.filter((r) => {
      const pub = r.publishedAt instanceof Date ? r.publishedAt.toISOString() : String(r.publishedAt || '');
      return pub >= startIso || pub.slice(0, 10) >= startDate;
    });
  }
  if (endDate) {
    const endIso = `${endDate}T23:59:59.999Z`;
    timeFilteredRows = timeFilteredRows.filter((r) => {
      const pub = r.publishedAt instanceof Date ? r.publishedAt.toISOString() : String(r.publishedAt || '');
      return pub <= endIso || pub.slice(0, 10) <= endDate;
    });
  }

  // Compute category statistics from records matching the timeframe
  const allCategoriesCount: Record<string, number> = {
    all: timeFilteredRows.length,
    ticknal_take: 0,
    macro_market: 0,
    listed_companies: 0,
    funds: 0,
    gold_silver: 0,
  };

  const INTERNAL_PSEUDO_TICKERS = new Set(['FLOWS', 'BREADTH']);
  const normalizeDisplayTicker = (rawSym: string): string => {
    const up = String(rawSym).toUpperCase().replace(/^[@$]/, '').trim();
    if (up === 'GOLD' || up === 'GC1!' || up === 'XAUUSD') return 'GOLD21K';
    if (up === 'USDEGP') return 'USD/EGP';
    return up;
  };

  const tickerMentions: Record<string, number> = {};

  for (const row of timeFilteredRows) {
    const rowCat = row.category;
    for (const [key, aliases] of Object.entries(CATEGORY_MAP)) {
      if (aliases.includes(rowCat)) {
        allCategoriesCount[key] = (allCategoriesCount[key] || 0) + 1;
        break;
      }
    }

    const tickersArr = Array.isArray(row.tickers) ? row.tickers : [];
    for (const t of tickersArr) {
      const disp = normalizeDisplayTicker(t);
      if (!disp || INTERNAL_PSEUDO_TICKERS.has(disp)) continue;
      tickerMentions[disp] = (tickerMentions[disp] || 0) + 1;
    }
  }

  // Filter based on criteria
  let filtered = timeFilteredRows;

  if (category && category !== 'all') {
    const allowed = CATEGORY_MAP[category] || [category];
    filtered = filtered.filter((r) => allowed.includes(r.category));
  }

  if (ticker) {
    const cleanTicker = ticker.toUpperCase().replace(/^[@$]/, '').trim();
    if (cleanTicker === 'TICKNAL') {
      filtered = filtered.filter(
        (r) =>
          r.category === 'ticknal_take' ||
          r.category === 'pulse' ||
          r.source.toLowerCase().includes('ticknal')
      );
    } else {
      const aliasGroup = new Set<string>([cleanTicker]);
      if (['GOLD', 'GOLD21K', 'GC1!', 'XAUUSD'].includes(cleanTicker)) {
        ['GOLD', 'GOLD21K', 'GC1!', 'XAUUSD'].forEach((a) => aliasGroup.add(a));
      } else if (['SILVER', 'SI1!', 'XAGUSD'].includes(cleanTicker)) {
        ['SILVER', 'SI1!', 'XAGUSD'].forEach((a) => aliasGroup.add(a));
      } else if (['USD/EGP', 'USDEGP'].includes(cleanTicker)) {
        ['USD/EGP', 'USDEGP'].forEach((a) => aliasGroup.add(a));
      }

      filtered = filtered.filter((r) => {
        const tickersArr = Array.isArray(r.tickers) ? r.tickers : [];
        return tickersArr.some((t) => {
          const normT = String(t).toUpperCase().replace(/^[@$]/, '').trim();
          return aliasGroup.has(normT) || normT.includes(cleanTicker);
        });
      });
    }
  }

  if (query) {
    const cleanQuery = query.toLowerCase().replace(/^[@$]/, '');
    filtered = filtered.filter((r) => {
      const tickersArr = Array.isArray(r.tickers) ? r.tickers : [];
      return (
        r.title.toLowerCase().includes(cleanQuery) ||
        r.summary.toLowerCase().includes(cleanQuery) ||
        r.source.toLowerCase().includes(cleanQuery) ||
        tickersArr.some((t) => String(t).toLowerCase().replace(/^[@$]/, '').includes(cleanQuery))
      );
    });
  }

  if (itemId) {
    const targetItem = rows.find((r) => r.id === itemId);
    if (targetItem) {
      filtered = [targetItem, ...filtered.filter((r) => r.id !== itemId)];
    }
  }

  if (typeof filters.minUrgency === 'number') {
    filtered = filtered.filter((r) => {
      const isTake = r.category === 'ticknal_take' || r.id.startsWith('take-');
      const score = isTake
        ? Math.max(r.urgencyScore ?? 0, r.id.includes('market-snapshot') ? 10 : r.id.includes('hot-money') || r.id.includes('usd-egp') ? 9 : 8)
        : (r.urgencyScore ?? 5);
      return score >= filters.minUrgency!;
    });
  }

  const paginated = filtered.slice(offset, offset + limit);
  const tickerMap = await getTickerMetaMap();

  // Map to client DTO (guarantee title never contains raw ---AR--- separator)
  const items: MarketNewsItemDTO[] = paginated.map((r) => {
    const rawTitle = r.title || '';
    const titleParts = rawTitle.split(/\s*---AR---\s*|\s*\|\|\|\s*/);
    const cleanEnTitle = (titleParts[0] || rawTitle).trim();
    const cleanArTitle = (titleParts[1] || r.content || '').trim() || null;

    const rawTickers = Array.isArray(r.tickers) ? r.tickers : [];
    const firstTicker = rawTickers[0] ? String(rawTickers[0]).toUpperCase().replace(/^[@$]/, '').trim() : '';
    const sourceUpper = (r.source || '').toUpperCase().trim();

    // Determine target symbol to resolve brand logo and name
    let symbolToLookup = firstTicker;
    if (
      !symbolToLookup &&
      sourceUpper &&
      !['REUTERS', 'DOW JONES', 'DOW JONES NEWSWIRES', 'ZAWYA', 'ARABICTRADER', 'TRADING ECONOMICS', 'TICKNAL', 'TICKNAL TAKE'].includes(sourceUpper)
    ) {
      symbolToLookup = sourceUpper;
    }

    let resolvedLogoUrl: string | null = null;
    let resolvedCompanyName: string | null = null;

    if (r.category === 'ticknal_take' || r.category === 'pulse' || r.source.toLowerCase().includes('ticknal')) {
      resolvedLogoUrl = '/logo-white.svg';
      resolvedCompanyName = 'Ticknal take';
    } else if (symbolToLookup && MACRO_ASSET_LOGOS[symbolToLookup]) {
      resolvedLogoUrl = MACRO_ASSET_LOGOS[symbolToLookup].logoUrl;
      resolvedCompanyName = MACRO_ASSET_LOGOS[symbolToLookup].companyName;
    } else if (symbolToLookup && tickerMap.has(symbolToLookup)) {
      const meta = tickerMap.get(symbolToLookup)!;
      resolvedLogoUrl = meta.logoUrl;
      resolvedCompanyName = meta.companyName;
    } else if (sourceUpper && tickerMap.has(sourceUpper)) {
      const meta = tickerMap.get(sourceUpper)!;
      resolvedLogoUrl = meta.logoUrl;
      resolvedCompanyName = meta.companyName;
    }

    return {
      id: r.id,
      title: cleanEnTitle,
      summary: (r.summary || '').replace(/\s*---AR---\s*/g, '\n\n'),
      content: cleanArTitle,
      category: r.category as MarketNewsItemDTO['category'],
      categoryLabel: r.categoryLabel,
      tickers: Array.isArray(r.tickers) ? r.tickers : [],
      sentiment: r.sentiment as MarketNewsItemDTO['sentiment'],
      source: r.source,
      sourceUrl: r.sourceUrl,
      importance: r.importance as MarketNewsItemDTO['importance'],
      urgencyScore:
        r.category === 'ticknal_take' || r.id.startsWith('take-')
          ? Math.max(r.urgencyScore ?? 0, r.id.includes('market-snapshot') ? 10 : r.id.includes('hot-money') || r.id.includes('usd-egp') ? 9 : 8)
          : (r.urgencyScore ?? (r.importance === 'critical' ? 9 : r.importance === 'high' ? 8 : 5)),
      impactMetric: r.impactMetric,
      readTime: r.readTime,
      imageUrl: r.imageUrl ?? null,
      logoUrl: resolvedLogoUrl,
      companyName: resolvedCompanyName,
      publishedAt: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : String(r.publishedAt),
    };
  });

  const trendingTickers = Object.entries(tickerMentions)
    .sort((a, b) => b[1] - a[1])
    .map(([sym]) => sym.replace(/^[@$]/, ''))
    .slice(0, 10);

  return {
    items,
    total: filtered.length,
    updatedAt: new Date().toISOString(),
    categories: [
      { id: 'all', label: 'All Wire', count: allCategoriesCount.all },
      { id: 'ticknal_take', label: 'Ticknal take', count: allCategoriesCount.ticknal_take },
      { id: 'macro_market', label: 'Macro Market', count: allCategoriesCount.macro_market },
      { id: 'listed_companies', label: 'Listed Companies (EGX)', count: allCategoriesCount.listed_companies },
      { id: 'funds', label: 'Investment Funds', count: allCategoriesCount.funds },
      { id: 'gold_silver', label: 'Gold & Silver', count: allCategoriesCount.gold_silver },
    ],
    trendingTickers:
      trendingTickers.length > 0
        ? trendingTickers
        : ['COMI', 'TMGH', 'SWDY', 'FWRY', 'EAST', 'EGX30', 'GOLD21K', 'USD/EGP', 'CIB_ADR', 'AZG'],
  };
}

export async function createMarketNewsItem(item: Omit<typeof marketNews.$inferInsert, 'createdAt' | 'updatedAt'>) {
  await ensureMarketNewsTable();

  const [inserted] = await db
    .insert(marketNews)
    .values({
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return inserted;
}

export async function purgeLegacyNews(dryRun = false): Promise<{ deletedCount: number }> {
  await ensureMarketNewsTable();
  if (dryRun) {
    const countRes = await db.select({ count: sql<number>`count(*)` }).from(marketNews);
    return { deletedCount: Number(countRes[0]?.count ?? 0) };
  }
  const deleted = await db.delete(marketNews).returning({ id: marketNews.id });
  return { deletedCount: deleted.length };
}

