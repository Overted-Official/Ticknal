import { db } from '@/db';
import { dailyPrices, marketNews } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import https from 'https';
import crypto from 'crypto';
import { completeWithKeyPool } from '@/lib/ai/openrouter-client';
import { ensureMarketNewsTable } from './news-service';

/**
 * Standard HTTPS GET with timeout
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

export const TARGET_WIRE_SYMBOLS = [
  // EGX Key Equities & Indices
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
  'EGX:EGX70',
  // Bullion & Precious Metals (Local & Global)
  'TVC:GOLD',
  'OANDA:XAUUSD',
  'TVC:SILVER',
  'OANDA:XAGUSD',
  // Central Bank & Macro Currency
  'FX_IDC:USDEGP',
];

const ASSET_RELEVANCE_KEYWORDS: Record<string, string[]> = {
  COMI: ['cib', 'comi', 'تجاري', 'التجاري الدولي', 'بنك تجاري', 'cib_adr'],
  TMGH: ['talaat', 'moustafa', 'طلعت مصطفى', 'tmgh', 'southmed', 'مدينتي'],
  SWDY: ['elsewedy', 'sewedy', 'السويدي', 'swdy', 'كابلات'],
  EAST: ['eastern', 'الشرقية للدخان', 'ايسترن كومباني', 'إيسترن', 'دخان', 'سجائر'],
  FWRY: ['fawry', 'فوري', 'مدفوعات'],
  ETEL: ['telecom egypt', 'we', 'المصرية للاتصالات', 'etel', 'اتصالات'],
  ABUK: ['abu qir', 'أبو قير', 'abuk', 'أسمدة'],
  EKHO: ['ekho', 'kuwait holding', 'القابضة المصرية الكويتية'],
  ORAS: ['orascom', 'أوراسكوم', 'oras', 'إنشاءات'],
  ESRS: ['ezz', 'حديد عز', 'esrs', 'صلب'],
  HRHO: ['hermes', 'هيرميس', 'hrho', 'efg'],
  MFPC: ['mopco', 'موبكو', 'mfpc', 'مصر لإنتاج الأسمدة'],
  ISPH: ['ibnsina', 'ابن سينا', 'isph', 'أدوية'],
  AMOC: ['amoc', 'أموك', 'إسكندرية للزيوت', 'بترول'],
  EGX30: ['egx', 'egx30', 'بورصة مصر', 'البورصة المصرية', 'مؤشر', 'أسهم مصر'],
  EGX70: ['egx70', 'مؤشر الشركات الصغيرة', 'السبعيني', 'egx 70'],
  GOLD: ['gold', 'xau', 'ذهب', 'الذهب', 'سبائك', 'أونصة', 'صاغة', 'عيار 21', 'عيار 24'],
  SILVER: ['silver', 'xag', 'فضة', 'الفضة'],
  USDEGP: ['pound', 'جنيه', 'usd/egp', 'مركزي', 'تضخم', 'cbe', 'dollar', 'دولار', 'تعويم', 'فائدة', 'سعر الصرف', 'احتياطي'],
};

function cleanTicker(sym: string): string {
  if (!sym) return '';
  return sym.replace(/^(EGX|TVC|FX_IDC|NASDAQ|NYSE|LSE|OANDA|COMEX|MCX|BIST|ADX|DFM|TADAWUL):/, '').toUpperCase();
}

function getTargetAssetKey(sym: string): string {
  const clean = cleanTicker(sym);
  if (clean === 'GOLD' || clean === 'XAUUSD') return 'GOLD';
  if (clean === 'SILVER' || clean === 'XAGUSD') return 'SILVER';
  if (clean === 'USDEGP') return 'USDEGP';
  return clean;
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
  return src || 'Market Wire';
}

function getCategoryForAsset(assetKey: string, title: string): { category: string; categoryLabel: string } {
  const t = (title || '').toLowerCase();
  if (assetKey === 'GOLD' || assetKey === 'SILVER') {
    return { category: 'gold_silver', categoryLabel: 'Gold & Silver' };
  }
  if (assetKey === 'USDEGP' || t.includes('cbe') || t.includes('مركزي') || t.includes('تضخم') || t.includes('احتياطي')) {
    return { category: 'macro_market', categoryLabel: 'Macro Market' };
  }
  return { category: 'listed_companies', categoryLabel: 'Listed Companies (EGX)' };
}

function isHeadlineRelevantToAsset(title: string, assetKey: string): boolean {
  const t = (title || '').toLowerCase();
  const keywords = ASSET_RELEVANCE_KEYWORDS[assetKey];
  if (!keywords || keywords.length === 0) return true;
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

export interface WireScreenResult {
  success: boolean;
  screened: number;
  inserted: number;
  droppedNoise: number;
  durationMs: number;
}

/**
 * Phase 1: Screen & Ingest Wires from the Last 24 Hours with Quantitative AI Gate
 */
export async function screenAndIngestWires(): Promise<WireScreenResult> {
  const startTime = Date.now();
  await ensureMarketNewsTable();

  let screened = 0;
  let inserted = 0;
  let droppedNoise = 0;

  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const cutoffTimestamp = now - TWENTY_FOUR_HOURS_MS;

  // 1. Fetch pre-existing IDs & titles from database to avoid duplicates
  const existingRows = await db
    .select({ id: marketNews.id, title: marketNews.title })
    .from(marketNews)
    .where(sql`${marketNews.publishedAt} > NOW() - INTERVAL '7 days'`);

  const seenIds = new Set<string>(existingRows.map((r) => r.id));
  const seenTitles = new Set<string>(existingRows.map((r) => normalizeHeadline(r.title)));

  // 2. Concurrently poll TradingView wire feeds across English and Arabic
  const fetchTasks: Array<{ lang: string; sym: string }> = [];
  for (const lang of ['ar', 'en']) {
    for (const sym of TARGET_WIRE_SYMBOLS) {
      fetchTasks.push({ lang, sym });
    }
  }

  const fetchResults = await Promise.allSettled(
    fetchTasks.map(async ({ lang, sym }) => {
      const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${lang}&symbol=${encodeURIComponent(sym)}`;
      const resp = await fetchJson(url, 5000);
      return { sym, items: resp?.items || [] };
    })
  );

  // 3. Collect candidates strictly published within the last 24 hours
  interface WireItem {
    id: string;
    sym: string;
    assetKey: string;
    title: string;
    publishedAt: Date;
    source: string;
    sourceUrl: string;
    category: string;
    categoryLabel: string;
  }

  const candidateWires: WireItem[] = [];

  for (const res of fetchResults) {
    if (res.status !== 'fulfilled') continue;
    const { sym, items } = res.value;
    const assetKey = getTargetAssetKey(sym);

    for (const item of items) {
      if (!item.id || !item.title) continue;

      const pubTime = item.published ? item.published * 1000 : 0;
      // STRICT 24-HOUR FILTER
      if (pubTime < cutoffTimestamp) {
        continue;
      }

      const newsId = generateNewsId(item.id);
      if (seenIds.has(newsId)) continue;
      seenIds.add(newsId);

      const norm = normalizeHeadline(item.title);
      if (seenTitles.has(norm)) continue;
      seenTitles.add(norm);

      if (!isHeadlineRelevantToAsset(item.title, assetKey)) {
        continue;
      }

      const publishedAt = new Date(pubTime);
      const source = cleanSourceName(item.source, item.provider);
      const { category, categoryLabel } = getCategoryForAsset(assetKey, item.title);
      const sourceUrl = item.storyPath
        ? `https://www.tradingview.com${item.storyPath}`
        : item.link || 'https://www.tradingview.com';

      candidateWires.push({
        id: newsId,
        sym,
        assetKey,
        title: item.title.trim(),
        publishedAt,
        source,
        sourceUrl,
        category,
        categoryLabel,
      });
    }
  }

  screened = candidateWires.length;

  if (candidateWires.length === 0) {
    return {
      success: true,
      screened: 0,
      inserted: 0,
      droppedNoise: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // 4. Batch query latest EOD price rows for candidates
  const distinctAssets = Array.from(new Set(candidateWires.map((w) => w.assetKey)));
  const eodMap = new Map<string, { close: number; changePct: number; volume: number }>();

  try {
    for (const asset of distinctAssets) {
      const rows = await db
        .select()
        .from(dailyPrices)
        .where(eq(dailyPrices.tickerSymbol, asset))
        .orderBy(desc(dailyPrices.date))
        .limit(2);

      if (rows.length > 0) {
        const latest = rows[0];
        const prev = rows[1];
        const close = Number(latest.close);
        const prevClose = prev ? Number(prev.close) : close;
        const changePct = prevClose > 0 ? Number((((close - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        const volume = Number(latest.volume || 0);
        eodMap.set(asset, { close, changePct, volume });
      }
    }
  } catch (eodErr) {
    console.warn('[wire-screener] EOD context query warning:', eodErr);
  }

  // 5. Screen each candidate through OpenRouter Quantitative Analyst Persona
  for (const wire of candidateWires) {
    const eod = eodMap.get(wire.assetKey);
    const closeStr = eod ? `${eod.close} EGP` : 'N/A';
    const changeStr = eod ? `${eod.changePct >= 0 ? '+' : ''}${eod.changePct}%` : 'N/A';
    const volStr = eod ? `${eod.volume.toLocaleString()} shares` : 'N/A';

    const systemPrompt = `You are a senior quantitative analyst and expert Egyptian equity trader at Ticknal.
Your task is to analyze breaking market news wires and filter out noise.`;

    const userPrompt = `Asset: ${wire.assetKey}
Recent Market Context: Last Close: ${closeStr} | 1D Return: ${changeStr} | Volume: ${volStr}

Wire Title: "${wire.title}"
Source: ${wire.source}
Published: ${wire.publishedAt.toISOString()}

CRITICAL FILTER INSTRUCTION:
1. Determine whether this wire delivers genuine, actionable fundamental, operational, regulatory, or pricing value that directly impacts an investor or trader (e.g. earnings, major corporate contracts, central bank monetary policy, currency devaluation, strategic mergers/acquisitions).
2. If this wire is procedural noise, routine compliance delivery reports, generic market wrap headlines, or uninformative (e.g. "COMEX gold delivery intentions breakdown", routine collateral notices, boilerplate summaries):
   YOU MUST RESPOND ONLY WITH THE EXACT SINGLE WORD: "irrelevant"
3. ONLY IF this news provides clear, material fundamental value to an investor:
   Provide a concise quantitative summary in MAXIMUM 500 CHARACTERS.
   Focus strictly on: the key catalyst, financial impact, and strategic takeaway for traders.`;

    try {
      const completion = await completeWithKeyPool({
        systemPrompt,
        userPrompt,
        fallbackText: 'irrelevant',
        temperature: 0.2,
        maxTokens: 180,
        timeoutMs: 8000,
      });

      const responseText = (completion.text || '').trim();
      const lower = responseText.toLowerCase();

      // STRICT NOISE DROP GATE:
      // If AI responds with "irrelevant" or "useless" or empty, discard the wire immediately
      if (
        lower.startsWith('irrelevant') ||
        lower.startsWith('useless') ||
        lower.includes('irrelevant') ||
        responseText.length < 25
      ) {
        droppedNoise++;
        continue;
      }

      // Valid informative wire: constrain to max 500 characters
      const cleanSummary = responseText.slice(0, 500);

      // Detect sentiment from the AI summary and title
      const isBullish = lower.includes('bullish') || lower.includes('growth') || lower.includes('surge') || lower.includes('jump') || lower.includes('ارتفاع') || lower.includes('مكاسب');
      const isBearish = lower.includes('bearish') || lower.includes('decline') || lower.includes('drop') || lower.includes('slump') || lower.includes('تراجع') || lower.includes('خسائر');
      const sentiment = isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral';

      await db
        .insert(marketNews)
        .values({
          id: wire.id,
          title: wire.title,
          summary: cleanSummary,
          content: null,
          category: wire.category,
          categoryLabel: wire.categoryLabel,
          tickers: [wire.assetKey],
          sentiment,
          source: wire.source,
          sourceUrl: wire.sourceUrl,
          importance: 'normal',
          readTime: '1 min read',
          publishedAt: wire.publishedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      inserted++;
    } catch (aiErr) {
      console.warn(`[wire-screener] Error screening wire "${wire.title}":`, aiErr);
      droppedNoise++;
    }
  }

  return {
    success: true,
    screened,
    inserted,
    droppedNoise,
    durationMs: Date.now() - startTime,
  };
}
