import { db, schema } from '@/db';
import { marketNews } from '@/db/schema';
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
  impactMetric?: string | null;
  readTime: string;
  imageUrl?: string | null;
  publishedAt: string;
}

export interface NewsQueryFilters {
  category?: string;
  ticker?: string;
  query?: string;
  limit?: number;
  offset?: number;
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
        impact_metric VARCHAR(100),
        read_time VARCHAR(30) DEFAULT '2 min read' NOT NULL,
        image_url TEXT,
        published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      ALTER TABLE public.market_news ADD COLUMN IF NOT EXISTS image_url TEXT;
      CREATE INDEX IF NOT EXISTS market_news_category_idx ON public.market_news(category);
      CREATE INDEX IF NOT EXISTS market_news_published_at_idx ON public.market_news(published_at);
      CREATE INDEX IF NOT EXISTS market_news_sentiment_idx ON public.market_news(sentiment);
    `);

    isTableInitialized = true;
  } catch (err) {
    console.error('[news-service] Failed to ensure market_news table:', err);
  }
}

export async function getMarketNewsItems(filters: NewsQueryFilters = {}) {
  await ensureMarketNewsTable();

  const { category, ticker, query, limit = 50, offset = 0 } = filters;

  // Query all news items ordered by publication timestamp descending
  const rows = await db
    .select()
    .from(marketNews)
    .orderBy(desc(marketNews.publishedAt));

  // Compute category statistics from all records in database
  const allCategoriesCount: Record<string, number> = {
    all: rows.length,
    ticknal_take: 0,
    macro_market: 0,
    listed_companies: 0,
    funds: 0,
    gold_silver: 0,
  };

  const tickerMentions: Record<string, number> = {};

  for (const row of rows) {
    const rowCat = row.category;
    for (const [key, aliases] of Object.entries(CATEGORY_MAP)) {
      if (aliases.includes(rowCat)) {
        allCategoriesCount[key] = (allCategoriesCount[key] || 0) + 1;
        break;
      }
    }

    const tickersArr = Array.isArray(row.tickers) ? row.tickers : [];
    for (const t of tickersArr) {
      tickerMentions[t] = (tickerMentions[t] || 0) + 1;
    }
  }

  // Filter based on criteria
  let filtered = rows;

  if (category && category !== 'all') {
    const allowed = CATEGORY_MAP[category] || [category];
    filtered = filtered.filter((r) => allowed.includes(r.category));
  }

  if (ticker) {
    const cleanTicker = ticker.toUpperCase().replace(/^[@$]/, '');
    filtered = filtered.filter((r) => {
      const tickersArr = Array.isArray(r.tickers) ? r.tickers : [];
      return tickersArr.some((t) => String(t).toUpperCase().replace(/^[@$]/, '').includes(cleanTicker));
    });
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

  const paginated = filtered.slice(offset, offset + limit);

  // Map to client DTO
  const items: MarketNewsItemDTO[] = paginated.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    content: r.content,
    category: r.category as MarketNewsItemDTO['category'],
    categoryLabel: r.categoryLabel,
    tickers: Array.isArray(r.tickers) ? r.tickers : [],
    sentiment: r.sentiment as MarketNewsItemDTO['sentiment'],
    source: r.source,
    sourceUrl: r.sourceUrl,
    importance: r.importance as MarketNewsItemDTO['importance'],
    impactMetric: r.impactMetric,
    readTime: r.readTime,
    imageUrl: r.imageUrl ?? null,
    publishedAt: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : String(r.publishedAt),
  }));

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
      { id: 'ticknal_take', label: 'The Ticknal Take', count: allCategoriesCount.ticknal_take },
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
