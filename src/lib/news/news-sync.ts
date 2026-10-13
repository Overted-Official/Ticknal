import { db } from '@/db';
import { marketNews } from '@/db/schema';
import { sql } from 'drizzle-orm';
import https from 'https';
import crypto from 'crypto';

/**
 * Standard HTTP GET with custom headers and timeout
 */
function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
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
 * Curated universe of Egyptian Equities & Macro Proxies to poll for live market wires
 */
export const TARGET_EXTERNAL_NEWS_SYMBOLS = [
  'EGX:COMI',
  'EGX:TMGH',
  'EGX:SWDY',
  'EGX:EAST',
  'EGX:FWRY',
  'EGX:ETEL',
  'EGX:ABUK',
  'EGX:EKHO',
  'EGX:ORAS',
  'EGX:ESRS',
  'EGX:HRHO',
  'EGX:MFPC',
  'EGX:ISPH',
  'EGX:AMOC',
  'EGX:EGX30',
  'TVC:GOLD',
  'OANDA:XAUUSD',
  'FX_IDC:USDEGP',
];

/**
 * Specific company and catalyst keywords to ensure absolute precision when digesting headlines
 */
const ASSET_RELEVANCE_KEYWORDS: Record<string, string[]> = {
  COMI: ['cib', 'comi', 'تجاري', 'التجاري الدولي', 'بنك تجاري', 'cib_adr', 'eroglu', 'mnt'],
  TMGH: ['talaat', 'moustafa', 'طلعت مصطفى', 'tmgh', 'southmed', 'مدينتي', 'بن سويلم', 'roshn', 'spine', 'axa'],
  SWDY: ['elsewedy', 'sewedy', 'السويدي', 'swdy', 'كابلات'],
  EAST: ['eastern', 'الشرقية للدخان', 'ايسترن كومباني', 'إيسترن', 'دخان', 'سجائر', 'تبغ'],
  FWRY: ['fawry', 'فوري', 'مدفوعات', 'congineer'],
  ETEL: ['telecom egypt', 'we', 'المصرية للاتصالات', 'etel', 'اتصالات'],
  ABUK: ['abu qir', 'أبو قير', 'abuk', 'أسمدة'],
  EKHO: ['ekho', 'kuwait holding', 'القابضة المصرية الكويتية', 'كويتية'],
  ORAS: ['orascom', 'أوراسكوم', 'oras', 'إنشاءات'],
  ESRS: ['ezz', 'حديد عز', 'esrs', 'صلب'],
  HRHO: ['hermes', 'هيرميس', 'hrho', 'efg'],
  MFPC: ['mopco', 'موبكو', 'mfpc', 'مصر لإنتاج الأسمدة'],
  ISPH: ['ibnsina', 'ابن سينا', 'isph', 'أدوية'],
  AMOC: ['amoc', 'أموك', 'إسكندرية للزيوت', 'بترول'],
  EGX30: ['egx', 'egx30', 'بورصة مصر', 'البورصة المصرية', 'مؤشر', 'أسهم مصر', 'gulf', 'الخليج'],
  GOLD: ['gold', 'xau', 'ذهب', 'الذهب', 'سبائك', 'أونصة', 'bullion', 'silver', 'فضة'],
  USDEGP: ['pound', 'جنيه', 'usd/egp', 'مركزي', 'تضخم', 'cbe', 'dollar', 'دولار', 'تعويم', 'فائدة', 'سعر الصرف', 'احتياطي'],
};

/**
 * Strip provider prefix (e.g. EGX:COMI -> COMI, TVC:GOLD -> GOLD)
 */
function cleanTicker(sym: string): string {
  if (!sym) return '';
  return sym.replace(/^(EGX|TVC|FX_IDC|NASDAQ|NYSE|LSE|OANDA|COMEX|MCX|BIST|ADX|DFM|TADAWUL):/, '').toUpperCase();
}

/**
 * Map polled symbol to one of our strictly tracked asset keys
 */
function getTargetAssetKey(sym: string): string {
  const clean = cleanTicker(sym);
  if (clean === 'GOLD' || clean === 'XAUUSD') return 'GOLD';
  if (clean === 'USDEGP') return 'USDEGP';
  return clean;
}

/**
 * Determine whether a polled headline is genuinely relevant to the specified asset
 */
function isHeadlineRelevantToAsset(title: string, assetKey: string): boolean {
  const t = (title || '').toLowerCase();
  const keywords = ASSET_RELEVANCE_KEYWORDS[assetKey];
  if (!keywords || keywords.length === 0) return true;
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

function normalizeHeadline(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 60);
}

function generateNewsId(rawId: string): string {
  const clean = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
  if (clean.length <= 58) {
    return `tv-${clean}`;
  }
  const hash = crypto.createHash('md5').update(rawId).digest('hex');
  return `tv-${clean.slice(0, 24)}-${hash}`;
}

function cleanSourceName(rawSource?: string, rawProvider?: string): string {
  const src = (rawSource || rawProvider || '').trim();
  const lower = src.toLowerCase();
  if (lower.includes('reuters')) return 'Reuters';
  if (lower.includes('zawya')) return 'Zawya';
  if (lower.includes('dow jones') || lower.includes('djn')) return 'Dow Jones Newswires';
  if (lower.includes('trading economics')) return 'Trading Economics';
  if (lower.includes('arabictrader')) return 'ArabicTrader';
  if (lower.includes('zacks')) return 'Zacks';
  if (lower.includes('bloomberg')) return 'Bloomberg';
  if (lower.includes('asharq')) return 'Asharq Business';
  if (lower.includes('mubasher') || lower.includes('مباشر')) return 'Mubasher';
  if (lower.includes('moneycontrol')) return 'Moneycontrol';
  return src || 'Market Wire';
}

function getCategoryForAsset(assetKey: string, title: string): { category: string; categoryLabel: string } {
  const t = (title || '').toLowerCase();
  if (t.includes('صندوق') || t.includes('صناديق') || t.includes('وثائق') || t.includes('fund') || t.includes('etf')) {
    return { category: 'funds', categoryLabel: 'Investment Funds' };
  }
  if (assetKey === 'GOLD' || assetKey === 'XAUUSD') {
    return { category: 'gold_silver', categoryLabel: 'Gold & Silver' };
  }
  if (assetKey === 'USDEGP' || t.includes('cbe') || t.includes('مركزي') || t.includes('تضخم') || t.includes('احتياطي')) {
    return { category: 'macro_market', categoryLabel: 'Macro Market' };
  }
  return { category: 'listed_companies', categoryLabel: 'Listed Companies (EGX)' };
}

function detectSentiment(title: string): 'bullish' | 'bearish' | 'neutral' {
  const t = (title || '').toLowerCase();
  const bullishWords = [
    'rises', 'surges', 'jumps', 'gains', 'soars', 'record', 'advances', 'profit rises', 'higher',
    'expansion', 'positive', 'ارتفاع', 'صعود', 'نمو', 'مكاسب', 'أرباح', 'قفزة', 'طفرة', 'توسع',
  ];
  const bearishWords = [
    'falls', 'drops', 'plunges', 'slumps', 'slides', 'declines', 'loss', 'losses', 'deficit', 'lower',
    'negative', 'تراجع', 'انخفاض', 'هبوط', 'خسائر', 'انكماش', 'عجز',
  ];
  if (bullishWords.some((w) => t.includes(w))) return 'bullish';
  if (bearishWords.some((w) => t.includes(w))) return 'bearish';
  return 'neutral';
}

function detectImportance(title: string): 'critical' | 'high' | 'normal' {
  const t = (title || '').toLowerCase();
  const criticalWords = ['devaluation', 'تعويم', 'فائدة', 'rate cut', 'rate hike', 'emergency', 'قرار عاجل'];
  if (criticalWords.some((w) => t.includes(w))) return 'critical';
  const highWords = ['q1', 'q2', 'q3', 'q4', 'annual', 'earnings', 'profit', 'acquisition', 'partner', 'invest', 'أرباح', 'استحواذ', 'صفقة', 'شراكة', 'مشروع'];
  if (highWords.some((w) => t.includes(w))) return 'high';
  return 'normal';
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
 * High-Performance Continuous Market Wire Sync Service:
 * Ingests live, authentic external market wires directly from institutional providers
 * (Reuters, Zawya, Dow Jones, Trading Economics) with real publication timestamps,
 * strict relevance checking, and bulletproof deduplication.
 */
export async function syncExternalTradingViewNews(): Promise<NewsSyncResult> {
  const startTime = Date.now();
  let totalPolled = 0;
  let inserted = 0;
  const updated = 0;

  try {
    // 1. Purge legacy or synthetic fake asset-* posts to ensure 100% authentic database state
    try {
      await db.execute(sql`DELETE FROM public.market_news WHERE id LIKE 'asset-%';`);
    } catch (cleanErr: any) {
      console.warn('[news-sync] Cleanup query notice:', cleanErr?.message);
    }

    // 2. Pre-load recent published titles from the database for cross-sync deduplication
    const existingRows = await db
      .select({ title: marketNews.title })
      .from(marketNews)
      .where(sql`${marketNews.publishedAt} > NOW() - INTERVAL '30 days'`);
    const seenTitles = new Set<string>(existingRows.map((r) => normalizeHeadline(r.title)));

    // 3. Build concurrent polling tasks for English and Arabic wires
    const fetchTasks: Array<{ lang: string; sym: string }> = [];
    for (const lang of ['ar', 'en']) {
      for (const sym of TARGET_EXTERNAL_NEWS_SYMBOLS) {
        fetchTasks.push({ lang, sym });
      }
    }

    // 4. Fetch all symbol feeds concurrently in parallel (~300-500ms)
    const fetchResults = await Promise.allSettled(
      fetchTasks.map(async ({ lang, sym }) => {
        const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${lang}&symbol=${encodeURIComponent(sym)}`;
        const resp = await fetchJson(url, 5000);
        return { sym, items: resp?.items || [] };
      })
    );

    const seenIds = new Set<string>();
    const validRecords: any[] = [];

    for (const res of fetchResults) {
      if (res.status !== 'fulfilled') continue;
      const { sym, items } = res.value;
      const assetKey = getTargetAssetKey(sym);
      totalPolled += items.length;

      for (const item of items) {
        if (!item.id || !item.title) continue;

        const newsId = generateNewsId(item.id);
        if (seenIds.has(newsId)) continue;
        seenIds.add(newsId);

        // Discard stories that don't specifically mention the asset or its operations
        if (!isHeadlineRelevantToAsset(item.title, assetKey)) continue;

        // Deduplicate syndicated and repetitive variations across languages and symbols
        const norm = normalizeHeadline(item.title);
        if (seenTitles.has(norm)) continue;
        seenTitles.add(norm);

        const publishedAt = item.published ? new Date(item.published * 1000) : new Date();
        const source = cleanSourceName(item.source, item.provider);
        const { category, categoryLabel } = getCategoryForAsset(assetKey, item.title);
        const sentiment = detectSentiment(item.title);
        const importance = detectImportance(item.title);
        const sourceUrl = item.storyPath
          ? `https://www.tradingview.com${item.storyPath}`
          : (item.link || 'https://www.tradingview.com');

        validRecords.push({
          id: newsId,
          title: item.title.trim(),
          summary: item.title.trim(),
          content: null,
          category,
          categoryLabel,
          tickers: [assetKey],
          sentiment,
          source,
          sourceUrl,
          importance,
          impactMetric: `${assetKey} Market Wire`,
          readTime: '2 min read',
          publishedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // 5. Batch insert new authentic records with conflict avoidance
    const CHUNK_SIZE = 50;
    for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + CHUNK_SIZE);
      const res = await db
        .insert(marketNews)
        .values(chunk)
        .onConflictDoNothing({ target: marketNews.id })
        .returning({ id: marketNews.id });
      inserted += res.length;
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
