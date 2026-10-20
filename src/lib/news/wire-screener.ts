import { db } from '@/db';
import { dailyPrices, marketNews, tickers } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import https from 'https';
import crypto from 'crypto';
import { completeWithKeyPool } from '@/lib/ai/openrouter-client';
import { ensureMarketNewsTable } from './news-service';

/**
 * Standard HTTPS GET with hard wall-clock timeout (including body read)
 */
async function fetchJson(url: string, timeoutMs = 5000): Promise<any> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    const reqPromise = (async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      return await res.json();
    })();
    return await Promise.race([reqPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  EGX30: [
    'egx',
    'egx30',
    'egx 30',
    'egypt',
    'cairo',
    'بورصة مصر',
    'البورصة المصرية',
    'مؤشر البورصة المصرية',
    'المؤشر الرئيسي للبورصة المصرية',
    'المؤشر المصري',
    'أسهم مصر',
    'مصر',
  ],
  EGX70: ['egx70', 'مؤشر الشركات الصغيرة', 'السبعيني', 'egx 70'],
  EGX100: ['egx100', 'egx 100', 'المؤشر المئوي'],
  GOLD: ['gold', 'xau', 'ذهب', 'الذهب', 'سبائك', 'أونصة', 'صاغة', 'عيار 21', 'عيار 24'],
  SILVER: ['silver', 'xag', 'فضة', 'الفضة'],
  USDEGP: ['pound', 'جنيه', 'usd/egp', 'مركزي', 'تضخم', 'cbe', 'dollar', 'دولار', 'تعويم', 'فائدة', 'سعر الصرف', 'احتياطي'],
};

export function cleanTicker(sym: string): string {
  if (!sym) return '';
  return sym.replace(/^(EGX|TVC|FX_IDC|NASDAQ|NYSE|LSE|OANDA|COMEX|MCX|BIST|ADX|DFM|TADAWUL):/, '').toUpperCase();
}

export function getTargetAssetKey(sym: string): string {
  const clean = cleanTicker(sym);
  if (clean === 'GOLD' || clean === 'XAUUSD' || clean === 'GOLD24K' || clean === 'GOLD21K' || clean === 'GC1!') return 'GOLD';
  if (clean === 'SILVER' || clean === 'XAGUSD' || clean === 'SILV999' || clean === 'SI1!') return 'SILVER';
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
  if (t.includes('صندوق') || t.includes('صناديق') || t.includes('وثائق') || t.includes('أزيموت') || t.includes('azimut') || t.includes('fund') || t.includes('etf')) {
    return { category: 'funds', categoryLabel: 'Investment Funds' };
  }
  if (assetKey === 'GOLD' || assetKey === 'SILVER') {
    return { category: 'gold_silver', categoryLabel: 'Gold & Silver' };
  }
  if (
    assetKey === 'USDEGP' ||
    assetKey === 'EGX30' ||
    assetKey === 'EGX70' ||
    assetKey === 'EGX100' ||
    t.includes('cbe') ||
    t.includes('مركزي') ||
    t.includes('تضخم') ||
    t.includes('احتياطي')
  ) {
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
    'comex gold futures',
    'comex gold futs',
    'cftc commitments',
    'disaggregated commitments',
    'settlement prices',
    'daily settlement',
    'routine notice',
    'collateral intentions',
    'margin requirements change',
    'open interest changes',
    'cot report summary',
    'intentions breakdown',
    'notice of delivery',
    'bulletin board',
    'calendar notice',
    'intraday targets/key levels',
    'gold etf fofs',
    'indian households',
    'bengaluru',
    'urban company',
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

function extractTextFromAst(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextFromAst).join(' ');
  if (node.params?.text) return String(node.params.text);
  if (node.children) return extractTextFromAst(node.children);
  return '';
}

async function fetchTradingViewStoryBody(rawId: string, lang: 'en' | 'ar'): Promise<string> {
  if (!rawId) return '';
  try {
    const url = `https://news-headlines.tradingview.com/v2/story?id=${encodeURIComponent(rawId)}&lang=${lang}`;
    const story = await fetchJson(url, 3500);
    const astText = extractTextFromAst(story?.astDescription)
      .replace(/\s+/g, ' ')
      .trim();
    if (astText.length >= 25) {
      return astText.slice(0, 1200);
    }
    const shortDesc = String(story?.shortDescription || '').replace(/\s+/g, ' ').trim();
    return shortDesc.slice(0, 600);
  } catch {
    return '';
  }
}

export function isHeadlineRelevantToAsset(
  title: string,
  assetKey: string,
  companyName?: string,
  relatedSymbols?: Array<{ symbol?: string }>
): boolean {
  if (isNoiseHeadline(title)) return false;
  const t = (title || '').toLowerCase();

  // Reject headlines whose relatedSymbols point ONLY to non-Egyptian regional exchanges
  const relSyms = (relatedSymbols || [])
    .map((r) => String(r?.symbol || '').toUpperCase())
    .filter(Boolean);
  if (relSyms.length > 0) {
    const hasEgxSym = relSyms.some((s) => s.startsWith('EGX:'));
    const hasForeignGulfSym = relSyms.some((s) =>
      /^(TADAWUL|DFM|ADX|KSE|BIST|QSE|MSX|BHSE):/.test(s)
    );
    const mentionsEgypt =
      t.includes('egypt') ||
      t.includes('egx') ||
      t.includes('مصر') ||
      t.includes('المؤشر المصري') ||
      t.includes('البورصة المصرية') ||
      t.includes('المركزي المصري');
    if (hasForeignGulfSym && !hasEgxSym && !mentionsEgypt) {
      return false;
    }
    // If TradingView tagged a specific EGX stock (other than the generic EGX30 Gulf roundup tag), it is relevant
    if (assetKey !== 'EGX30' && relSyms.includes(`EGX:${assetKey}`)) {
      return true;
    }
  }

  const keywords = ASSET_RELEVANCE_KEYWORDS[assetKey];
  if (keywords && keywords.some((kw) => t.includes(kw.toLowerCase()))) {
    return true;
  }

  // Dynamic match against DB ticker symbol or company name
  if (assetKey.length >= 3 && t.includes(assetKey.toLowerCase())) {
    return true;
  }
  if (companyName) {
    const cleanName = companyName
      .toLowerCase()
      .replace(/\b(company|corp|inc|ltd|s\.a\.e|sae|group|holding|for|and|the|egypt)\b/g, '')
      .trim();
    const firstTwoWords = cleanName.split(/\s+/).filter((w) => w.length >= 3).slice(0, 2).join(' ');
    if (firstTwoWords.length >= 4 && t.includes(firstTwoWords)) {
      return true;
    }
  }

  return !keywords || keywords.length === 0;
}

export interface WireScreenResult {
  success: boolean;
  screened: number;
  inserted: number;
  droppedNoise: number;
  durationMs: number;
}

/**
 * Phase 1: Dynamically Discover Active Universe -> Extract Headline & Story Body -> Quantitative AI Gate -> Post
 */
export async function screenAndIngestWires(options?: { targetDateOnly?: string }): Promise<WireScreenResult> {
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

  // 2. Dynamically load DB EGX tickers & latest session's top volume/mover equities
  const companyNameBySymbol = new Map<string, string>();
  const dynamicPollSymbols = new Set<string>(TARGET_WIRE_SYMBOLS);

  try {
    const allDbTickers = await db
      .select({ symbol: tickers.symbol, companyName: tickers.companyName, exchange: tickers.exchange })
      .from(tickers);
    for (const row of allDbTickers) {
      if (row.symbol) {
        companyNameBySymbol.set(row.symbol.toUpperCase(), row.companyName || row.symbol);
      }
    }

    // Add top 12 volume leaders and top 8 absolute price movers from the latest EGX session
    const activeMovers = await db.execute(sql`
      WITH latest_session AS (
        SELECT MAX(date) AS max_date FROM daily_prices WHERE ticker_symbol = 'COMI'
      )
      SELECT dp.ticker_symbol
      FROM daily_prices dp
      JOIN latest_session ls ON dp.date = ls.max_date
      WHERE dp.ticker_symbol NOT IN ('EGX30', 'EGX70', 'EGX100', 'GC1!', 'SI1!', 'USDEGP')
      ORDER BY (COALESCE(dp.volume, 0) * COALESCE(dp.close, 0)) DESC
      LIMIT 15
    `);
    for (const row of activeMovers as any[]) {
      const sym = String(row?.ticker_symbol || '').trim().toUpperCase();
      if (sym && companyNameBySymbol.has(sym)) {
        dynamicPollSymbols.add(`EGX:${sym}`);
      }
    }
  } catch (dynErr) {
    console.warn('[wire-screener] Dynamic ticker discovery warning:', dynErr);
  }

  // 3. Concurrently poll TradingView wire feeds across English and Arabic
  const fetchTasks: Array<{ lang: 'en' | 'ar'; sym: string }> = [];
  for (const lang of ['en', 'ar'] as const) {
    for (const sym of dynamicPollSymbols) {
      fetchTasks.push({ lang, sym });
    }
  }

  const fetchResults = await Promise.allSettled(
    fetchTasks.map(async ({ lang, sym }) => {
      const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${lang}&symbol=${encodeURIComponent(sym)}`;
      const resp = await fetchJson(url, 5000);
      return { lang, sym, items: resp?.items || [] };
    })
  );

  // 4. Collect candidates strictly published within the last 24 hours (or targetDateOnly if specified)
  interface WireItem {
    id: string;
    rawId: string;
    lang: 'ar' | 'en';
    sym: string;
    assetKey: string;
    relatedEgxTickers: string[];
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
    const { lang, sym, items } = res.value;
    const polledAssetKey = getTargetAssetKey(sym);

    for (const item of items) {
      if (!item.id || !item.title) continue;

      const pubTime = item.published ? item.published * 1000 : 0;
      if (pubTime < cutoffTimestamp) {
        continue;
      }
      if (options?.targetDateOnly) {
        const pubDateIso = new Date(pubTime).toISOString().slice(0, 10);
        if (pubDateIso !== options.targetDateOnly) {
          continue;
        }
      }

      const newsId = generateNewsId(item.id);
      if (seenIds.has(newsId)) continue;

      const norm = normalizeHeadline(item.title);
      if (seenTitles.has(norm)) continue;

      // Dynamically extract any EGX:<SYM> tags from TradingView's relatedSymbols metadata
      const relEgxTickers: string[] = [];
      for (const rel of item.relatedSymbols || []) {
        const s = String(rel?.symbol || '').toUpperCase();
        if (s.startsWith('EGX:')) {
          const cleanSym = s.replace(/^EGX:/, '');
          if (cleanSym && !relEgxTickers.includes(cleanSym)) {
            relEgxTickers.push(cleanSym);
          }
        }
      }

      // If polled via an index (e.g. EGX30) but relatedSymbols identifies a specific EGX company, promote it
      const assetKey =
        (polledAssetKey === 'EGX30' || polledAssetKey === 'EGX70' || polledAssetKey === 'EGX100') &&
        relEgxTickers.length === 1 &&
        !['EGX30', 'EGX70', 'EGX100'].includes(relEgxTickers[0])
          ? relEgxTickers[0]
          : polledAssetKey;

      const companyName = companyNameBySymbol.get(assetKey);
      if (!isHeadlineRelevantToAsset(item.title, assetKey, companyName, item.relatedSymbols)) {
        continue;
      }

      seenIds.add(newsId);
      seenTitles.add(norm);

      const publishedAt = new Date(pubTime);
      const source = cleanSourceName(item.source, item.provider);
      const { category, categoryLabel } = getCategoryForAsset(assetKey, item.title);
      const sourceUrl = item.storyPath
        ? `https://www.tradingview.com${item.storyPath}`
        : item.link || 'https://www.tradingview.com';

      candidateWires.push({
        id: newsId,
        rawId: String(item.id),
        lang,
        sym,
        assetKey,
        relatedEgxTickers: relEgxTickers,
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

  // 5. Concurrently extract full wire story bodies (/v2/story) for candidates so AI digests real article text
  const storyBodyMap = new Map<string, string>();
  await Promise.allSettled(
    candidateWires.slice(0, 15).map(async (wire) => {
      const body = await fetchTradingViewStoryBody(wire.rawId, wire.lang);
      if (body) {
        storyBodyMap.set(wire.id, body);
      }
    })
  );

  // 6. Batch query latest EOD price rows for candidates (mapping GOLD -> GC1! and SILVER -> SI1!)
  const distinctAssets = Array.from(new Set(candidateWires.map((w) => w.assetKey)));
  const eodMap = new Map<string, { close: number; changePct: number; volume: number; unit: string }>();

  try {
    for (const asset of distinctAssets) {
      const dbSymbol = asset === 'GOLD' ? 'GC1!' : asset === 'SILVER' ? 'SI1!' : asset;
      const unit = asset === 'GOLD' || asset === 'SILVER' ? 'USD/oz' : 'EGP';
      const rows = await db
        .select()
        .from(dailyPrices)
        .where(eq(dailyPrices.tickerSymbol, dbSymbol))
        .orderBy(desc(dailyPrices.date))
        .limit(2);

      if (rows.length > 0) {
        const latest = rows[0];
        const prev = rows[1];
        const close = Number(latest.close);
        const prevClose = prev ? Number(prev.close) : close;
        const changePct = prevClose > 0 ? Number((((close - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        const volume = Number(latest.volume || 0);
        eodMap.set(asset, { close, changePct, volume, unit });
      }
    }
  } catch (eodErr) {
    console.warn('[wire-screener] EOD context query warning:', eodErr);
  }

  // 7. Screen each candidate: OpenRouter Quantitative Analyst Gate over Full Story Body + EOD Context
  const storyClusterCount = new Map<string, number>();

  for (const wire of candidateWires) {
    const eod = eodMap.get(wire.assetKey);
    const closeStr = eod ? `${eod.close} ${eod.unit}` : '';
    const changeStr = eod ? `${eod.changePct >= 0 ? '+' : ''}${eod.changePct}%` : '';
    const volStr = eod && eod.volume > 0 && eod.unit === 'EGP' ? `${Math.round(eod.volume).toLocaleString()} shares` : '';
    const marketCtx = eod ? `Last Close: ${closeStr} (${changeStr})${volStr ? ` | Vol: ${volStr}` : ''}` : '';

    const isArabic = /[\u0600-\u06FF]/.test(wire.title);
    const storyBody = storyBodyMap.get(wire.id) || '';
    const catalystEn = evaluateFinancialCatalyst(`${wire.title} ${storyBody}`, wire.assetKey, 'en');
    const catalystAr = evaluateFinancialCatalyst(`${wire.title} ${storyBody}`, wire.assetKey, 'ar');
    const isListedEgxCompany = wire.category === 'listed_companies' || wire.category === 'funds';

    // Filter out procedural noise; for commodities/FX require a recognized catalyst unless storyBody has substance
    if (isNoiseHeadline(wire.title) || (!catalystEn.isCatalyst && !isListedEgxCompany && storyBody.length < 60)) {
      droppedNoise++;
      continue;
    }

    // Cluster key: cap precious metals and EGX30 market roundups to 1 per day/catalyst so EN+AR duplicates merge
    const dateBucket = wire.publishedAt.toISOString().slice(0, 10);
    const clusterKey = `${wire.assetKey}:${dateBucket}:${catalystEn.type}`;
    const maxPerCluster =
      wire.assetKey === 'GOLD' || wire.assetKey === 'SILVER' || wire.assetKey === 'EGX30' ? 1 : 2;
    const countInCluster = storyClusterCount.get(clusterKey) || 0;
    if (countInCluster >= maxPerCluster) {
      droppedNoise++;
      continue;
    }

    let enTitle = isArabic ? '' : wire.title;
    let arTitle = isArabic ? wire.title : '';
    let enSummary = '';
    let arSummary = '';
    let finalSentiment = catalystEn.sentiment;

    // Enforce a strict 25-second wall-clock budget for AI calls so the route never hits serverless timeouts
    const aiBudgetRemaining = Date.now() - startTime < 25000;

    if (aiBudgetRemaining) {
      const companyLabel = companyNameBySymbol.get(wire.assetKey)
        ? `${wire.assetKey} (${companyNameBySymbol.get(wire.assetKey)})`
        : wire.assetKey;

      const systemPrompt = `You are a senior bilingual (English/Arabic) quantitative analyst and Egyptian equity strategist at Ticknal.
Digest the breaking market wire headline, full wire body, and latest EOD price context.
Rules:
1. If the story is routine procedural noise, unrelated to Egypt/EGX/Gold/Silver/USD-EGP, or has no actionable takeaway for investors, reply with ONLY the single word "irrelevant".
2. Otherwise, output exactly 4 labeled lines (no markdown asterisks **):
EN_TITLE: <concise institutional headline in English>
AR_TITLE: <concise institutional headline in Arabic>
EN_SUMMARY: <1-2 sentence quantitative summary in English citing exact figures from the wire body and EOD context>
AR_SUMMARY: <1-2 sentence quantitative summary in Arabic citing exact figures from the wire body and EOD context>`;

      const userPrompt = `Asset: ${companyLabel}
Market Context: ${marketCtx || 'N/A'}
Headline: "${wire.title}"
${storyBody ? `Wire Body: "${storyBody}"\n` : ''}Source: ${wire.source}

Reply with the 4 labeled lines (EN_TITLE, AR_TITLE, EN_SUMMARY, AR_SUMMARY) OR reply with ONLY "irrelevant".`;

      try {
        const completion = await completeWithKeyPool({
          systemPrompt,
          userPrompt,
          fallbackText: '__FALLBACK__',
          temperature: 0.1,
          maxTokens: 900,
          timeoutMs: 6500,
          maxAttempts: 2,
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
            return text.length >= 30 && /[.!?؟%)"»\]]$/.test(text.trim());
          },
        });

        const responseText = (completion.text || '').trim();
        const lower = responseText.toLowerCase();

        // If AI explicitly deemed it irrelevant/noise:
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

        // Parse 4-line bilingual output if present, or single-language summary
        if (
          completion.source === 'ai_generated' &&
          responseText.length >= 30 &&
          responseText !== '__FALLBACK__'
        ) {
          const enTitleMatch = responseText.match(/EN_TITLE:\s*(.+)/i);
          const arTitleMatch = responseText.match(/AR_TITLE:\s*(.+)/i);
          const enSumMatch = responseText.match(/EN_SUMMARY:\s*([\s\S]+?)(?=\nAR_SUMMARY:|$)/i);
          const arSumMatch = responseText.match(/AR_SUMMARY:\s*([\s\S]+)$/i);

          if (enSumMatch && arSumMatch) {
            if (enTitleMatch?.[1]) enTitle = enTitleMatch[1].trim().replace(/^["']|["']$/g, '');
            if (arTitleMatch?.[1]) arTitle = arTitleMatch[1].trim().replace(/^["']|["']$/g, '');
            enSummary = enSumMatch[1].trim().slice(0, 460);
            arSummary = arSumMatch[1].trim().slice(0, 460);
          } else if (/[\u0600-\u06FF]/.test(responseText)) {
            arSummary = responseText.slice(0, 460);
          } else {
            enSummary = responseText.slice(0, 460);
          }

          if (
            lower.includes('bullish') ||
            lower.includes('growth') ||
            lower.includes('surge') ||
            lower.includes('jump') ||
            lower.includes('secured') ||
            lower.includes('signed') ||
            lower.includes('ارتفاع') ||
            lower.includes('مكاسب') ||
            lower.includes('توقيع') ||
            lower.includes('نمو')
          ) {
            finalSentiment = 'bullish';
          } else if (
            lower.includes('bearish') ||
            lower.includes('decline') ||
            lower.includes('drop') ||
            lower.includes('slump') ||
            lower.includes('tumbles') ||
            lower.includes('تراجع') ||
            lower.includes('خسائر') ||
            lower.includes('انخفاض')
          ) {
            finalSentiment = 'bearish';
          }
        }
      } catch {
        // AI call timed out or failed; proceed to smart quantitative fallback
      }
    }

    // If AI didn't generate and the item had no recognized catalyst, drop rather than posting generic filler
    if (!enSummary && !arSummary && !catalystEn.isCatalyst) {
      droppedNoise++;
      continue;
    }

    // Ensure both EN and AR summaries & titles are populated so every post is 100% bilingual
    const enCtxPhrase = marketCtx
      ? ` Reference close: ${closeStr} (${changeStr})${volStr ? ` on volume of ${volStr}` : ''}.`
      : '';
    const arCtxPhrase = marketCtx
      ? ` الإغلاق المرجعي: ${closeStr} (${changeStr})${volStr ? ` بحجم تداول ${volStr}` : ''}.`
      : '';

    if (!enSummary) {
      enSummary = `${catalystEn.takeaway}${enCtxPhrase}`.trim().slice(0, 460);
    }
    if (!arSummary) {
      arSummary = `${catalystAr.takeaway}${arCtxPhrase}`.trim().slice(0, 460);
    }
    if (!enTitle) {
      enTitle = `${wire.assetKey}: ${catalystEn.type}`;
    }
    if (!arTitle) {
      arTitle = `${wire.assetKey}: ${catalystAr.type}`;
    }

    const bilingualSummary = `${enSummary}\n\n${arSummary}`;

    // Record cluster count
    storyClusterCount.set(clusterKey, countInCluster + 1);

    const tickersList =
      wire.assetKey === 'GOLD'
        ? ['GOLD21K', 'GOLD']
        : wire.assetKey === 'USDEGP'
        ? ['USD/EGP', 'USDEGP']
        : Array.from(new Set([wire.assetKey, ...wire.relatedEgxTickers])).slice(0, 4);

    await db
      .insert(marketNews)
      .values({
        id: wire.id,
        title: enTitle,
        content: arTitle,
        summary: bilingualSummary,
        category: wire.category,
        categoryLabel: wire.categoryLabel,
        tickers: tickersList,
        sentiment: finalSentiment,
        source: wire.source,
        sourceUrl: wire.sourceUrl,
        importance: wire.assetKey === 'USDEGP' || wire.assetKey === 'GOLD' || wire.assetKey === 'EGX30' ? 'high' : 'normal',
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

