import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { marketNews } from '@/db/schema';
import https from 'https';
import { synthesizeAssetNewsBundle, ASSET_CONFIGS, type RawHeadlineItem } from './asset-news-synthesizer';

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
  'EGX:EAST',
  'EGX:FWRY',
  'EGX:TMGH',
  'EGX:SWDY',
  'EGX:ETEL',
  'EGX:ABUK',
  'EGX:EKHO',
  'EGX:ORAS',
  'FX_IDC:USDEGP',
  'TVC:GOLD',
  'OANDA:XAUUSD',
];

/**
 * Specific company and catalyst keywords to ensure absolute precision when digesting headlines
 */
const ASSET_RELEVANCE_KEYWORDS: Record<string, string[]> = {
  COMI: ['cib', 'comi', 'تجاري', 'التجاري الدولي', 'بنك تجاري', 'mnt', 'eroglu'],
  EAST: ['eastern', 'الشرقية للدخان', 'ايسترن كومباني', 'إيسترن', 'دخان', 'سجائر', 'تبغ'],
  FWRY: ['fawry', 'فوري', 'مدفوعات', 'congineer', 'al-futtaim'],
  TMGH: ['talaat', 'moustafa', 'طلعت مصطفى', 'tmgh', 'southmed', 'مدينتي', 'بن سويلم'],
  SWDY: ['elsewedy', 'sewedy', 'السويدي', 'swdy', 'كابلات'],
  ETEL: ['telecom egypt', 'we', 'المصرية للاتصالات', 'etel', 'اتصالات'],
  ABUK: ['abu qir', 'أبو قير', 'abuk', 'أسمدة'],
  EKHO: ['ekho', 'kuwait holding', 'القابضة المصرية الكويتية', 'كويتية'],
  ORAS: ['orascom', 'أوراسكوم', 'oras', 'إنشاءات'],
  GOLD: ['gold', 'xau', 'ذهب', 'الذهب', 'سبائك', 'أونصة', 'bullion', 'silver', 'فضة'],
  USDEGP: ['pound', 'جنيه', 'usd/egp', 'مركزي', 'تضخم', 'cbe', 'dollar', 'دولار', 'تعويم', 'فائدة', 'سعر الصرف'],
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
function getTargetAssetKey(sym: string): string | null {
  const clean = cleanTicker(sym);
  if (clean === 'GOLD' || clean === 'XAUUSD') return 'GOLD';
  if (clean === 'USDEGP') return 'USDEGP';
  if (ASSET_CONFIGS[clean]) return clean;
  return null;
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
 * High-Performance Continuous Market Wire Sync Service:
 * Ingests live external market wires from TradingView, cleans & bundles them by asset,
 * digests them via OpenRouter Nemotron AI, and posts them under the respective asset identity.
 */
export async function syncExternalTradingViewNews(): Promise<NewsSyncResult> {
  const startTime = Date.now();
  let totalPolled = 0;
  let inserted = 0;
  const updated = 0;

  const seenIds = new Set<string>();
  const seenNormTitles = new Set<string>();

  try {
    // 1. Build concurrent polling tasks for English and Arabic wires
    const fetchTasks: Array<{ lang: string; sym: string }> = [];
    for (const lang of ['en', 'ar']) {
      for (const sym of TARGET_EXTERNAL_NEWS_SYMBOLS) {
        fetchTasks.push({ lang, sym });
      }
    }

    // 2. Fetch all symbol feeds concurrently in parallel (~300ms)
    const fetchResults = await Promise.allSettled(
      fetchTasks.map(async ({ lang, sym }) => {
        const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${lang}&symbol=${encodeURIComponent(sym)}`;
        const resp = await fetchJson(url, 5000);
        return { sym, items: resp?.items || [] };
      })
    );

    // 3. Bucket headlines strictly into curated asset targets with precision keyword relevance
    const assetBuckets: Record<string, RawHeadlineItem[]> = {};

    for (const res of fetchResults) {
      if (res.status !== 'fulfilled') continue;
      const { sym, items } = res.value;
      const assetKey = getTargetAssetKey(sym);
      if (!assetKey) continue;

      totalPolled += items.length;

      for (const it of items) {
        if (!it.id || seenIds.has(it.id)) continue;
        seenIds.add(it.id);

        // Discard stories that don't specifically mention the asset or its operations
        if (!isHeadlineRelevantToAsset(it.title || '', assetKey)) continue;

        // Deduplicate repetitive variations
        const normTitle = normalizeHeadline(it.title || '');
        if (seenNormTitles.has(normTitle)) continue;
        seenNormTitles.add(normTitle);

        if (!assetBuckets[assetKey]) assetBuckets[assetKey] = [];
        assetBuckets[assetKey].push({
          id: `tv-${it.id}`.slice(0, 64),
          title: it.title,
          published: it.published ? it.published : Math.floor(Date.now() / 1000),
          source: it.source || it.provider || 'TradingView Wire',
          link: it.link || (it.storyPath ? `https://www.tradingview.com${it.storyPath}` : undefined),
        });
      }
    }

    // 4. Synthesize bundled asset posts concurrently in parallel (~3-5s)
    const synthesisTasks = Object.entries(assetBuckets).map(async ([assetKey, headlines]) => {
      if (!headlines || headlines.length === 0) return false;
      try {
        return await synthesizeAssetNewsBundle(assetKey, headlines);
      } catch (err: any) {
        console.warn(`[news-sync] Failed to synthesize bundle for ${assetKey}:`, err?.message);
        return false;
      }
    });

    const synthResults = await Promise.allSettled(synthesisTasks);
    for (const r of synthResults) {
      if (r.status === 'fulfilled' && r.value) {
        inserted++;
      }
    }

    // 5. Purge any non-tracked or legacy rogue IDs to ensure clean database state
    try {
      await db.execute(sql`
        DELETE FROM public.market_news
        WHERE id LIKE 'asset-%'
          AND id NOT LIKE 'asset-comi-%'
          AND id NOT LIKE 'asset-gold-%'
          AND id NOT LIKE 'asset-east-%'
          AND id NOT LIKE 'asset-fwry-%'
          AND id NOT LIKE 'asset-tmgh-%'
          AND id NOT LIKE 'asset-swdy-%'
          AND id NOT LIKE 'asset-etel-%'
          AND id NOT LIKE 'asset-abuk-%'
          AND id NOT LIKE 'asset-ekho-%'
          AND id NOT LIKE 'asset-oras-%'
          AND id NOT LIKE 'asset-usdegp-%';
      `);
    } catch (cleanErr: any) {
      console.warn('[news-sync] Cleanup query notice:', cleanErr?.message);
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
