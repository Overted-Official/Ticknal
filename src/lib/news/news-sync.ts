import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { marketNews } from '@/db/schema';
import https from 'https';

/**
 * Standard HTTP GET with custom headers and timeout
 */
function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e: any) {
            reject(new Error(`Failed to parse JSON response: ${e.message}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });
  });
}

/**
 * Universe of Egyptian Equities & Macro Proxies to poll for live market wires
 */
export const TARGET_EXTERNAL_NEWS_SYMBOLS = [
  'EGX:EGX30',
  'EGX:COMI',
  'EGX:TMGH',
  'EGX:SWDY',
  'EGX:FWRY',
  'EGX:EKHO',
  'EGX:ETEL',
  'EGX:EAST',
  'EGX:ABUK',
  'EGX:ORAS',
  'FX_IDC:USDEGP',
  'TVC:GOLD',
  'OANDA:XAUUSD',
];

/**
 * Classify headline into standard Ticknal news category
 */
function classifyNewsCategory(item: any, symbol: string): { category: string; categoryLabel: string } {
  const symStr = (symbol + ' ' + (item.relatedSymbols?.map((s: any) => s.symbol).join(' ') || '')).toUpperCase();
  const titleLower = (item.title || '').toLowerCase();

  if (symStr.includes('GOLD') || symStr.includes('XAU') || symStr.includes('SILVER') || titleLower.includes('gold') || titleLower.includes('الذهب')) {
    return { category: 'gold_silver', categoryLabel: 'Gold & Silver' };
  }
  if (
    symStr.includes('USDEGP') ||
    symStr.includes('EGX30') ||
    symStr.includes('CBE') ||
    titleLower.includes('inflation') ||
    titleLower.includes('تضخم') ||
    titleLower.includes('central bank') ||
    titleLower.includes('البنك المركزي') ||
    titleLower.includes('egx') ||
    titleLower.includes('بورصة مصر') ||
    titleLower.includes('البورصة المصرية')
  ) {
    return { category: 'macro_market', categoryLabel: 'Macro Market' };
  }
  if (symStr.includes('FUND') || titleLower.includes('fund') || titleLower.includes('صندوق')) {
    return { category: 'funds', categoryLabel: 'Investment Funds' };
  }
  return { category: 'listed_companies', categoryLabel: 'Listed Companies (EGX)' };
}

/**
 * Clean TradingView prefix (e.g. EGX:COMI -> COMI)
 */
function cleanTicker(sym: string): string {
  if (!sym) return '';
  return sym.replace(/^(EGX|TVC|FX_IDC|NASDAQ|NYSE|LSE|OANDA|COMEX|MCX|BIST):/, '');
}

/**
 * Infer quick sentiment from bilingual headline keywords
 */
function inferSentiment(title: string): 'bullish' | 'neutral' | 'bearish' {
  const t = (title || '').toLowerCase();
  const bullishKeywords = [
    'jump', 'surge', 'gain', 'rise', 'rebound', 'climb', 'soar', 'record profit', 'dividend', 'edges up',
    'ارتفاع', 'صعود', 'مكاسب', 'نمو', 'أرباح', 'توزيعات', 'انتعاش', 'يقفز'
  ];
  const bearishKeywords = [
    'drop', 'fall', 'slip', 'decline', 'slump', 'loss', 'tumble', 'crash', 'retreat', 'weekly drop',
    'هبوط', 'تراجع', 'انخفاض', 'خسائر', 'تراجع حاد', 'يتراجع', 'يهبط'
  ];

  if (bullishKeywords.some((kw) => t.includes(kw))) return 'bullish';
  if (bearishKeywords.some((kw) => t.includes(kw))) return 'bearish';
  return 'neutral';
}

/**
 * Filter out generic Gulf/GCC stories that Reuters tags with EGX30 without Egyptian content
 */
function isRelevantToEgypt(item: any, symbol: string): boolean {
  const title = (item.title || '').toLowerCase();

  // Global bullion/commodities wires are accepted
  if (symbol.includes('GOLD') || symbol.includes('XAU') || symbol.includes('SILVER')) {
    return true;
  }

  // If headline is about GCC/Gulf markets and does NOT mention Egypt, exclude it
  const isGccTopic =
    title.includes('بورصات الخليج') ||
    title.includes('أسواق الخليج') ||
    title.includes('الأسهم الخليجية') ||
    title.includes('gulf bourses') ||
    title.includes('gulf shares') ||
    title.includes('gulf markets') ||
    title.includes('saudi') ||
    title.includes('tadawul') ||
    title.includes('تداول') ||
    title.includes('دبي') ||
    title.includes('أبوظبي') ||
    title.includes('الكويت') ||
    title.includes('قطر') ||
    title.includes('البحرين') ||
    title.includes('مسقط') ||
    title.includes('عمان') ||
    title.includes('الرياض') ||
    title.includes('riyadh') ||
    title.includes('dubai') ||
    title.includes('abu dhabi') ||
    title.includes('kuwait') ||
    title.includes('qatar') ||
    title.includes('doha');

  const mentionsEgypt =
    title.includes('مصر') ||
    title.includes('المصري') ||
    title.includes('القاهرة') ||
    title.includes('egx') ||
    title.includes('egypt') ||
    title.includes('cairo') ||
    title.includes('cbe') ||
    title.includes('egp') ||
    title.includes('جنيه');

  if (isGccTopic && !mentionsEgypt) {
    return false;
  }

  return true;
}

function normalizeHeadline(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 50);
}

export interface NewsSyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  totalPolled: number;
  durationMs: number;
  error?: string;
}

/**
 * Continuous Sync Service: Ingests live external market wires from TradingView
 * (Reuters, Zawya, LSE, Dow Jones, ArabicTrader) into public.market_news.
 */
export async function syncExternalTradingViewNews(): Promise<NewsSyncResult> {
  const startTime = Date.now();
  let totalPolled = 0;
  let inserted = 0;
  let updated = 0;

  const seenIds = new Set<string>();
  const seenNormTitles = new Set<string>();
  const candidates: Array<typeof marketNews.$inferInsert> = [];

  try {
    for (const lang of ['en', 'ar']) {
      for (const sym of TARGET_EXTERNAL_NEWS_SYMBOLS) {
        const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${lang}&symbol=${encodeURIComponent(sym)}`;
        try {
          const resp = await fetchJson(url, 6000);
          const list = resp?.items || [];
          totalPolled += list.length;

          for (const it of list) {
            if (!it.id || seenIds.has(it.id)) continue;
            seenIds.add(it.id);

            // Filter out non-Egypt GCC wrap stories
            if (!isRelevantToEgypt(it, sym)) continue;

            // Deduplicate repetitive variations
            const normTitle = normalizeHeadline(it.title || '');
            if (seenNormTitles.has(normTitle)) continue;
            seenNormTitles.add(normTitle);

            const { category, categoryLabel } = classifyNewsCategory(it, sym);
            const rawTickers = (it.relatedSymbols || [])
              .map((s: any) => cleanTicker(s.symbol))
              .filter(Boolean);

            const primarySym = cleanTicker(sym);
            if (primarySym && !rawTickers.includes(primarySym)) {
              rawTickers.unshift(primarySym);
            }

            // Standardize ID (truncate to 64 chars max for varchar)
            const id = `tv-${it.id}`.slice(0, 64);
            const publishedAt = new Date(it.published * 1000);
            const sourceUrl = it.link || (it.storyPath ? `https://www.tradingview.com${it.storyPath}` : null);
            const sentiment = inferSentiment(it.title);

            candidates.push({
              id,
              title: it.title,
              summary: it.title,
              content: it.title,
              category,
              categoryLabel,
              tickers: rawTickers.slice(0, 5),
              sentiment,
              source: it.source || it.provider || 'TradingView Wire',
              sourceUrl,
              importance: it.urgency === 1 ? 'critical' : it.urgency === 2 ? 'high' : 'normal',
              impactMetric: rawTickers[0] ? `${rawTickers[0]} Live Wire` : null,
              readTime: '1 min read',
              publishedAt,
            });
          }
        } catch {
          // Continue gracefully if a single symbol endpoint encounters a transient issue
        }
      }
    }

    // Sort by publication timestamp descending
    candidates.sort((a, b) => {
      const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      return timeB - timeA;
    });

    // Batch upsert up to top 100 most recent stories
    const topBatch = candidates.slice(0, 100);

    for (const item of topBatch) {
      try {
        const existing = await db
          .select({ id: marketNews.id })
          .from(marketNews)
          .where(eq(marketNews.id, item.id))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(marketNews)
            .set({
              title: item.title,
              summary: item.summary,
              category: item.category,
              categoryLabel: item.categoryLabel,
              tickers: item.tickers,
              sentiment: item.sentiment,
              source: item.source,
              sourceUrl: item.sourceUrl,
              publishedAt: item.publishedAt,
              updatedAt: new Date(),
            })
            .where(eq(marketNews.id, item.id));
          updated++;
        } else {
          await db.insert(marketNews).values(item);
          inserted++;
        }
      } catch (err: any) {
        console.warn(`[news-sync] Failed to upsert article ${item.id}:`, err?.message);
      }
    }

    return {
      success: true,
      inserted,
      updated,
      totalPolled,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[news-sync] Critical failure during news sync:', error);
    return {
      success: false,
      inserted,
      updated,
      totalPolled,
      durationMs: Date.now() - startTime,
      error: error?.message || String(error),
    };
  }
}
