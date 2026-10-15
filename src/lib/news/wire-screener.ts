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
  // EGX Key Equities & Blue Chips
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
  'EGX:CERA',
  'EGX:HELI',
  'EGX:MNHD',
  'EGX:JUFO',
  'EGX:SKPC',
  'EGX:OCDI',
  'EGX:PHDC',
  'EGX:CIEB',
  'EGX:ADIB',
  'EGX:ALCN',
  'EGX:EFID',
  'EGX:BTFH',
  'EGX:CLHO',
  'EGX:ORWE',
  'EGX:PRDC',
  'EGX:POUL',
  // EGX Benchmark Indices
  'EGX:EGX30',
  'EGX:EGX70',
  'EGX:EGX100',
  // Bullion & Precious Metals (Local & Global)
  'TVC:GOLD',
  'OANDA:XAUUSD',
  'TVC:SILVER',
  'OANDA:XAGUSD',
  // Central Bank & Macro Currency
  'FX_IDC:USDEGP',
];

export const ASSET_RELEVANCE_KEYWORDS: Record<string, string[]> = {
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
  CERA: ['cleopatra', 'سيراميكا كليوباترا', 'cera'],
  HELI: ['heliopolis', 'مصر الجديدة للإسكان', 'هليوبوليس', 'heli'],
  MNHD: ['madinet masr', 'مدينة مصر', 'مدينة نصر', 'mnhd'],
  JUFO: ['juhayna', 'جهينة', 'jufo', 'ألبان', 'عصائر'],
  SKPC: ['sidi kerir', 'سيدى كرير', 'skpc', 'بتروكيماويات'],
  OCDI: ['sodic', 'سوديك', 'ocdi'],
  PHDC: ['palm hills', 'بالم هيلز', 'phdc'],
  CIEB: ['crédit agricole', 'كريدي أجريكول', 'cieb'],
  ADIB: ['adib', 'أبوظبي الإسلامي', 'مصرف أبوظبي'],
  ALCN: ['alexandria containers', 'إسكندرية لتداول الحاويات', 'alcn'],
  EFID: ['edita', 'إيديتا', 'efid'],
  BTFH: ['beltone', 'بلتون', 'btfh'],
  CLHO: ['cleopatra hospital', 'مستشفى كليوباترا', 'clho'],
  ORWE: ['oriental weavers', 'النساجون الشرقيون', 'orwe'],
  PRDC: ['pioneers', 'بايونيرز', 'prdc'],
  POUL: ['cairo poultry', 'القاهرة للدواجن', 'poul'],
  EGX30: ['egx', 'egx30', 'بورصة مصر', 'البورصة المصرية', 'مؤشر', 'أسهم مصر'],
  EGX70: ['egx70', 'مؤشر الشركات الصغيرة', 'السبعيني', 'egx 70'],
  EGX100: ['egx100', 'egx 100', 'المؤشر المئوي'],
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

export function isNoiseHeadline(title: string): boolean {
  const lower = (title || '').toLowerCase();
  const NOISE_PATTERNS = [
    'delivery intentions breakdown',
    'delivery intentions',
    'comex gold delivery',
    'comex silver delivery',
    'settlement prices',
    'daily settlement',
    'routine notice',
    'collateral intentions',
    'margin requirements change',
    'open interest changes',
    'cftc commitments of traders',
    'cot report summary',
    'intentions breakdown',
    'notice of delivery',
    'bulletin board',
    'calendar notice',
    'intraday targets/key levels',
  ];
  return NOISE_PATTERNS.some((p) => lower.includes(p));
}

export interface FinancialCatalyst {
  isCatalyst: boolean;
  type: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  takeaway: string;
}

export function evaluateFinancialCatalyst(title: string, assetKey: string, lang: 'en' | 'ar'): FinancialCatalyst {
  const t = (title || '').toLowerCase();

  // 1. Contract / Deal / Project / Order Backlog
  const contractKeywords = [
    'contract', 'project', 'signs', 'jv', 'expansion', 'agreement', 'awarded', 'tender',
    'عقد', 'مشروع', 'اتفاقية', 'توسع', 'شراكة', 'ترسية', 'تحالف', 'صفقة', 'توقيع'
  ];
  if (contractKeywords.some((k) => t.includes(k))) {
    return {
      isCatalyst: true,
      type: lang === 'ar' ? 'عقد وتوسع تشغيلي' : 'Contract & Order Backlog',
      sentiment: 'bullish',
      takeaway: lang === 'ar'
        ? 'توسع في العمليات التشغيلية والتعاقدات الرأسمالية يعزز التدفقات النقدية المستقبلية.'
        : 'Material operational backlog expansion and corporate contract execution.'
    };
  }

  // 2. Earnings / Financials / Dividends
  const earningsKeywords = [
    'earnings', 'profit', 'revenue', 'dividend', 'net income', 'q1', 'q2', 'q3', 'q4', 'results',
    'أرباح', 'إيرادات', 'توزيعات', 'كوبون', 'نتائج أعمال', 'صافي ربح'
  ];
  if (earningsKeywords.some((k) => t.includes(k))) {
    const isDecline = t.includes('declines') || t.includes('drops') || t.includes('falls') || t.includes('تراجع') || t.includes('انخفاض') || t.includes('خسائر');
    return {
      isCatalyst: true,
      type: lang === 'ar' ? 'نتائج مالية وتوزيعات' : 'Earnings & Financial Results',
      sentiment: isDecline ? 'bearish' : 'bullish',
      takeaway: lang === 'ar'
        ? (isDecline ? 'تراجع في الربحية قد يضغط على مضاعفات التقييم على المدى القريب.' : 'نمو في الأرباح التشغيلية يدعم هوامش الربحية والتوزيعات النقدية.')
        : (isDecline ? 'Financial compression may pressure valuation multiples in the short term.' : 'Stronger operating margins and earnings accretion support fundamental valuation.')
    };
  }

  // 3. Central Bank / Macro / Inflation / Currency
  const macroKeywords = [
    'cbe', 'central bank', 'interest rate', 'rate hike', 'rate cut', 'inflation', 'cpi', 'devaluation',
    'المركزي', 'البنك المركزي', 'الفائدة', 'تثبيت الفائدة', 'رفع الفائدة', 'خفض الفائدة', 'التضخم', 'تعويم', 'سعر الصرف', 'احتياطي'
  ];
  if (macroKeywords.some((k) => t.includes(k)) || assetKey === 'USDEGP') {
    const isInflationHigh = t.includes('hot') || t.includes('high') || t.includes('ارتفاع') || t.includes('تسارع');
    return {
      isCatalyst: true,
      type: lang === 'ar' ? 'سياسة نقدية واقتصاد كلي' : 'Monetary Policy & Macro',
      sentiment: isInflationHigh ? 'bearish' : 'neutral',
      takeaway: lang === 'ar'
        ? 'تحركات السياسة النقدية ومعدلات التضخم تنعكس مباشرة على تكلفة التمويل وتقييم الأصول.'
        : 'Central bank monetary stance and inflation dynamics directly guide sovereign liquidity and asset yields.'
    };
  }

  // 4. M&A / Acquisitions / Capital Structure
  const maKeywords = [
    'acquisition', 'merger', 'acquire', 'buyout', 'takeover', 'stake', 'rights issue',
    'استحواذ', 'اندماج', 'زيادة رأس مال', 'حصة', 'شراء أسهم'
  ];
  if (maKeywords.some((k) => t.includes(k))) {
    return {
      isCatalyst: true,
      type: lang === 'ar' ? 'صفقات واستحواذات' : 'M&A & Corporate Action',
      sentiment: 'bullish',
      takeaway: lang === 'ar'
        ? 'إعادة هيكلة الملكية أو صفقات الاستحواذ تعيد تسعير السهم وفق القيمة العادلة.'
        : 'Strategic ownership realignment and M&A pricing catalyst.'
    };
  }

  // 5. Commodities (Gold & Silver) Price Action & Strategic Forecasts
  if (assetKey === 'GOLD' || assetKey === 'SILVER') {
    const metalCatalystKeywords = [
      'slides', 'falls', 'drops', 'slumps', 'surges', 'jumps', 'rises', 'record', 'forecast', 'target',
      'hits', 'cpi', 'inflation', 'fed', 'dollar', 'sees', 'reaching', 'يهبط', 'يتراجع', 'يقفز', 'يرتفع', 'مستوى قياسي', 'توقعات'
    ];
    if (metalCatalystKeywords.some((k) => t.includes(k))) {
      const isUp = t.includes('surges') || t.includes('jumps') || t.includes('rises') || t.includes('reaches') || t.includes('reaching') || t.includes('ارتفاع') || t.includes('يقفز');
      return {
        isCatalyst: true,
        type: lang === 'ar' ? 'تحركات المعادن الثمينة' : 'Precious Metals Catalyst',
        sentiment: isUp ? 'bullish' : 'bearish',
        takeaway: lang === 'ar'
          ? (isUp ? 'طلب قوي على التحوط يدعم تسعير السبائك كملاذ آمن.' : 'ضغوط أسعار الفائدة وقوة العملة تدفع لتصحيح سعري مؤقت.')
          : (isUp ? 'Safe-haven flight and hedging flows support bullion pricing momentum.' : 'Monetary yield pressures drive near-term bullion re-pricing and consolidation.')
      };
    }
  }

  return {
    isCatalyst: false,
    type: 'Market Wire',
    sentiment: 'neutral',
    takeaway: ''
  };
}

export function isHeadlineRelevantToAsset(title: string, assetKey: string): boolean {
  if (isNoiseHeadline(title)) return false;
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

  // 5. Screen each candidate: OpenRouter Quantitative Analyst Gate with Resilient Fallback
  // Story cluster deduplication: max 2 stories per asset per catalyst type within 24h
  const storyClusterCount = new Map<string, number>();

  for (const wire of candidateWires) {
    const eod = eodMap.get(wire.assetKey);
    const closeStr = eod ? `${eod.close} EGP` : '';
    const changeStr = eod ? `${eod.changePct >= 0 ? '+' : ''}${eod.changePct}%` : '';
    const volStr = eod && eod.volume > 0 ? `${Math.round(eod.volume).toLocaleString()} shares` : '';
    const marketCtx = eod ? `Last Close: ${closeStr} (${changeStr})${volStr ? ` | Vol: ${volStr}` : ''}` : '';

    const isArabic = /[\u0600-\u06FF]/.test(wire.title);
    const lang = isArabic ? 'ar' : 'en';
    const catalyst = evaluateFinancialCatalyst(wire.title, wire.assetKey, lang);

    // Filter out procedural noise or non-catalyst wires
    if (isNoiseHeadline(wire.title)) {
      droppedNoise++;
      continue;
    }

    // Cluster key to prevent 5 identical syndicated inflation/gold headlines
    const clusterKey = `${wire.assetKey}:${catalyst.type}`;
    const countInCluster = storyClusterCount.get(clusterKey) || 0;
    if (countInCluster >= 2) {
      droppedNoise++;
      continue;
    }

    let finalSummary = '';
    let finalSentiment = catalyst.sentiment;

    // OpenRouter Quantitative Analyst Persona Prompt
    const systemPrompt = `You are a senior quantitative analyst and expert Egyptian equity trader at Ticknal.
Analyze breaking market news wires and filter out noise. Respond ONLY with a 1-2 sentence quantitative summary (max 500 chars) highlighting the fundamental catalyst, financial impact, and strategic takeaway for traders, OR respond with ONLY the exact single word "irrelevant".`;

    const userPrompt = `Asset: ${wire.assetKey}
Context: ${marketCtx || 'N/A'}
Headline: "${wire.title}"
Source: ${wire.source}
Published: ${wire.publishedAt.toISOString()}

Respond ONLY with a 1-2 sentence quantitative summary (max 500 chars) if valuable, OR respond with ONLY "irrelevant".`;

    try {
      const completion = await completeWithKeyPool({
        systemPrompt,
        userPrompt,
        fallbackText: '__FALLBACK__',
        temperature: 0.1,
        maxTokens: 180,
        timeoutMs: 6000,
        validateOutput: (text: string) => {
          const lower = text.toLowerCase().trim();
          if (
            lower === 'irrelevant' ||
            lower === 'useless' ||
            lower.startsWith('irrelevant') ||
            lower.startsWith('useless')
          ) {
            return true;
          }
          if (
            lower.includes('the user wants') ||
            lower.includes('analyze the content') ||
            lower.includes('routine report') ||
            lower.includes('procedural data')
          ) {
            return false;
          }
          return text.length >= 25;
        },
      });

      const responseText = (completion.text || '').trim();
      const lower = responseText.toLowerCase();

      // If AI successfully ran and explicitly deemed it irrelevant/noise:
      if (
        completion.source === 'ai_generated' &&
        (lower === 'irrelevant' ||
          lower === 'useless' ||
          lower.startsWith('irrelevant') ||
          lower.startsWith('useless') ||
          lower.includes('the user wants') ||
          lower.includes('analyze the content'))
      ) {
        droppedNoise++;
        continue;
      }

      // If AI produced a valid quantitative summary:
      if (
        completion.source === 'ai_generated' &&
        responseText.length >= 25 &&
        responseText !== '__FALLBACK__'
      ) {
        finalSummary = responseText.slice(0, 500);
        if (
          lower.includes('bullish') ||
          lower.includes('growth') ||
          lower.includes('surge') ||
          lower.includes('jump') ||
          lower.includes('ارتفاع') ||
          lower.includes('مكاسب')
        ) {
          finalSentiment = 'bullish';
        } else if (
          lower.includes('bearish') ||
          lower.includes('decline') ||
          lower.includes('drop') ||
          lower.includes('slump') ||
          lower.includes('تراجع') ||
          lower.includes('خسائر')
        ) {
          finalSentiment = 'bearish';
        }
      }
    } catch {
      // AI call timed out or failed; proceed to smart quantitative fallback
    }

    // Smart Quantitative Fallback:
    // If AI was offline or rate-limited, NEVER drop material catalysts!
    if (!finalSummary) {
      if (!catalyst.isCatalyst && wire.assetKey !== 'USDEGP' && wire.assetKey !== 'GOLD' && wire.assetKey !== 'SILVER') {
        droppedNoise++;
        continue;
      }

      const ctxPhrase = marketCtx
        ? (isArabic ? ` السياق الفني: إغلاق ${closeStr} (${changeStr})${volStr ? `، حجم ${volStr}` : ''}. ` : ` Market Context: Close ${closeStr} (${changeStr})${volStr ? ` | Vol: ${volStr}` : ''}. `)
        : ' ';

      finalSummary = isArabic
        ? `[${wire.assetKey}] ${catalyst.type}: ${wire.title}.${ctxPhrase}${catalyst.takeaway}`.slice(0, 500)
        : `[${wire.assetKey}] ${catalyst.type}: ${wire.title}.${ctxPhrase}${catalyst.takeaway}`.slice(0, 500);
    }

    // Record cluster count
    storyClusterCount.set(clusterKey, countInCluster + 1);

    await db
      .insert(marketNews)
      .values({
        id: wire.id,
        title: wire.title,
        summary: finalSummary,
        content: null,
        category: wire.category,
        categoryLabel: wire.categoryLabel,
        tickers: [wire.assetKey],
        sentiment: finalSentiment,
        source: wire.source,
        sourceUrl: wire.sourceUrl,
        importance: wire.assetKey === 'USDEGP' || wire.assetKey === 'GOLD' ? 'high' : 'normal',
        readTime: '1 min read',
        publishedAt: wire.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    inserted++;
  }

  return {
    success: true,
    screened,
    inserted,
    droppedNoise,
    durationMs: Date.now() - startTime,
  };
}
