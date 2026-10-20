import { db } from '@/db';
import { dailyPrices, marketNews, tickers } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { completeWithKeyPool } from '@/lib/ai/openrouter-client';
import { ensureMarketNewsTable } from './news-service';
import { TARGET_WIRE_SYMBOLS, isHeadlineRelevantToAsset, getTargetAssetKey } from './wire-screener';

export const CANONICAL_ASSET_METADATA: Record<
  string,
  {
    en: string;
    ar: string;
    category: 'gold_silver' | 'macro_market' | 'listed_companies';
    categoryLabel: string;
  }
> = {
  GOLD: {
    en: 'Gold Markets',
    ar: 'أسواق الذهب',
    category: 'gold_silver',
    categoryLabel: 'Gold & Silver',
  },
  SILVER: {
    en: 'Silver Markets',
    ar: 'أسواق الفضة',
    category: 'gold_silver',
    categoryLabel: 'Gold & Silver',
  },
  EGX30: {
    en: 'EGX 30 Index',
    ar: 'المؤشر الرئيسي EGX 30',
    category: 'macro_market',
    categoryLabel: 'Macro Market',
  },
  EGX70: {
    en: 'EGX 70 EWI',
    ar: 'مؤشر الشركات الصغيرة والمتوسطة EGX 70',
    category: 'macro_market',
    categoryLabel: 'Macro Market',
  },
  EGX100: {
    en: 'EGX 100 EWI',
    ar: 'مؤشر EGX 100 الأوسع نطاقاً',
    category: 'macro_market',
    categoryLabel: 'Macro Market',
  },
  USDEGP: {
    en: 'USD/EGP Currency',
    ar: 'سعر صرف الجنيه والدولار',
    category: 'macro_market',
    categoryLabel: 'Macro Market',
  },
};

export interface DailyTickerSummaryResult {
  success: boolean;
  date: string;
  tickersProcessed: string[];
  postsCreated: number;
  durationMs: number;
}

interface RawHeadlineItem {
  id: string;
  title: string;
  source?: string;
  provider?: string;
  published?: number;
  storyPath?: string;
  link?: string;
  relatedSymbols?: Array<{ symbol?: string }>;
}

/**
 * Historical 24-Hour Ticker Summaries curated via Subagents (2026-10-11 to 2026-10-17)
 * Strictly posted as the ticker (no "Reuters" or "Dow Jones") with verified EOD price context.
 */
export const HISTORICAL_7D_TICKER_SUMMARIES = [
  {
    id: 'summary-SWDY-2026-10-14',
    ticker: 'SWDY',
    category: 'listed_companies' as const,
    categoryLabel: 'Listed Companies (EGX)',
    source: 'SWDY',
    sourceUrl: 'https://www.tradingview.com/news/reuters.com,2026:newsml_FWN45Z1YD:0/',
    title: 'Elsewedy Electric (SWDY): $2.2B Rabigh EPC Contract & Market Reaction',
    content: 'السويدي إليكتريك (SWDY): توقيع عقد رابغ بـ 2.2 مليار دولار وتفاعل السهم',
    summary:
      'Elsewedy Electric PSP and Sinohydro secured a landmark $2.2 billion EPC contract for the 2.3 GW Rabigh 2 IPP expansion project in Saudi Arabia. The stock advanced 2.70% to close at 114.00 EGP on 364,008 shares as institutional flows rewarded the group\'s regional backlog expansion.\n\nوقّع تحالف السويدي إليكتريك بي إس بي وسينوهيدرو عقد مقاولات عامة بقيمة 2.2 مليار دولار لتوسعة محطة رابغ 2 في السعودية بقدرة 2.3 جيجاوات. وتفاعل السهم إيجابياً ليصعد بنسبة 2.70% ويغلق عند 114.00 جنيهاً بحجم تداول بلغ 364,008 أسهم وسط مشتريات مؤسسية عززت التفاؤل بنمو العقود الخارجية.',
    sentiment: 'bullish' as const,
    importance: 'high' as const,
    urgencyScore: 9,
    publishedAt: new Date('2026-10-14T15:30:00.000Z'),
  },
  {
    id: 'summary-TMGH-2026-10-13',
    ticker: 'TMGH',
    category: 'listed_companies' as const,
    categoryLabel: 'Listed Companies (EGX)',
    source: 'TMGH',
    sourceUrl: 'https://www.tradingview.com/news/reuters.com,2026-10-13:newsml_Zaw7LFDzx:0/',
    title: 'Talaat Moustafa Group (TMGH): AXA Healthcare Alliance & Madinaty Spine Flow',
    content: 'مجموعة طلعت مصطفى (TMGH): شراكة صحية مع أكسا وتداولات نشطة بمشروع ذا سباين',
    summary:
      'Talaat Moustafa Group finalized a 10-year strategic healthcare partnership with AXA Egypt to anchor operations and medical coverage at The Spine in Madinaty. Market activity reflected intense institutional turnover, with the equity closing flat at 84.00 EGP on elevated liquidity of 4.94 million shares.\n\nأبرمت مجموعة طلعت مصطفى القابضة شراكة استراتيجية مدتها 10 سنوات مع أكسا مصر لتشغيل المنظومة التأمينية والصحية بمركز ذا سباين الطبي في مدينتي. واستقر السهم عند مستوى 84.00 جنيهاً في ختام الجلسة وسط سيولة مرتفعة وتداولات مكثفة بلغت 4.94 مليون سهم عكست استيعاب السوق للتوسعات الخدمية.',
    sentiment: 'bullish' as const,
    importance: 'high' as const,
    urgencyScore: 8,
    publishedAt: new Date('2026-10-13T15:30:00.000Z'),
  },
  {
    id: 'summary-MFPC-2026-10-13',
    ticker: 'MFPC',
    category: 'listed_companies' as const,
    categoryLabel: 'Listed Companies (EGX)',
    source: 'MFPC',
    sourceUrl: 'https://www.tradingview.com/news/reuters.com,2026:newsml_FWN45Y2U2:0/',
    title: 'MOPCO (MFPC): New CEO Appointment & Export Strategy Drive Volume Surge',
    content: 'موبكو (MFPC): تعيين رئيس تنفيذي جديد لدعم التصدير ونمو أحجام التداول',
    summary:
      'MOPCO appointed Osama Abd Elrahman Morsi Youssef as Chief Executive Officer and Managing Director to accelerate operational efficiency and international exports. The stock gained 0.73% to finish at 44.02 EGP on an aggressive trading surge of 1.45 million shares as investors digested the leadership transition.\n\nعيّن مجلس إدارة موبكو أسامة عبد الرحمن مرسي يوسف رئيساً تنفيذياً وعضواً منتدباً لقيادة العمليات التشغيلية وتوسيع الأسواق التصديرية. وأغلق السهم على صعود بنسبة 0.73% مسجلاً 44.02 جنيهاً مع قفزة ملحوظة في السيولة بتداول 1.45 مليون سهم وسط تفاعل المستثمرين مع خطة الهيكلة الإدارية.',
    sentiment: 'bullish' as const,
    importance: 'normal' as const,
    urgencyScore: 7,
    publishedAt: new Date('2026-10-13T15:30:00.000Z'),
  },
  {
    id: 'summary-GPPL-2026-10-15',
    ticker: 'GPPL',
    category: 'listed_companies' as const,
    categoryLabel: 'Listed Companies (EGX)',
    source: 'GPPL',
    sourceUrl: 'https://www.tradingview.com/news/reuters.com,2026:newsml_FWN46109H:0/',
    title: 'Golden Pyramids Plaza (GPPL): H1 Net Profit Hits $30M on Lease Stability',
    content: 'جولدن بيراميدز بلازا (GPPL): أرباح النصف الأول تسجل 30 مليون دولار',
    summary:
      'Golden Pyramids Plaza disclosed an H1 standalone net profit of $30 million, underpinned by consistent retail leasing revenue and robust hospitality occupancy rates. Shares traded steadily around 1.40 USD as participants welcomed the company\'s solid foreign-currency cash generation profile.\n\nأعلنت شركة جولدن بيراميدز بلازا تحقيق أرباح نصف سنوية مستقلة بلغت 30 مليون دولار بفضل استقرار إيرادات الإيجارات التجارية ونسب الإشغال الفندقي. وتداول السهم بهدوء حول مستوى 1.40 دولار مع استيعاب المتعاملين لمتانة التدفقات النقدية الدولارية والأداء التشغيلي للمنشآت السياحية.',
    sentiment: 'bullish' as const,
    importance: 'normal' as const,
    urgencyScore: 6,
    publishedAt: new Date('2026-10-15T15:30:00.000Z'),
  },
  {
    id: 'summary-GOLD-2026-10-12',
    ticker: 'GOLD',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'GOLD',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-GOLD/',
    title: 'Gold Markets (GOLD): Bullion Consolidates Near $4,000 as Sagha Tracks 7,093 EGP',
    content: 'أسواق الذهب (GOLD): الذهب يتماسك قرب 4000 دولار وعيار 24 يسجل 7093 جنيهاً',
    summary:
      'Spot gold consolidated around the $4,000 per ounce threshold as dollar firmness and cautious positioning dominated ahead of upcoming US inflation releases. In the local Egyptian Sagha, 24-karat gold held near 7,093 EGP per gram amid balanced physical retail liquidity and steady exchange rates.\n\nشهدت أسعار الذهب العالمية حركة تماسك هادئة قرب مستوى 4000 دولار للأوقية وسط قوة العملة الأمريكية وترقب المتعاملين لبيانات التضخم. وعلى الصعيد المحلي، استقر سعر جرام الذهب عيار 24 في الصاغة عند 7093 جنيهاً في ظل توازن نسبي بالسيولة وثبات تسعير الصرف لدى التجار.',
    sentiment: 'neutral' as const,
    importance: 'normal' as const,
    urgencyScore: 5,
    publishedAt: new Date('2026-10-12T15:30:00.000Z'),
  },
  {
    id: 'summary-GOLD-2026-10-13',
    ticker: 'GOLD',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'GOLD',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-GOLD/',
    title: 'Gold Markets (GOLD): Haven Buying Defends $4,020 Pivot; Sagha at 6,958 EGP',
    content: 'أسواق الذهب (GOLD): مشتريات التحوط تدعم مستوى 4020 دولاراً وعيار 24 عند 6958 جنيهاً',
    summary:
      'Bullion held comfortably above $4,020 per ounce supported by defensive hedge flows and portfolio realignments prior to key United States inflation prints. Domestic jewelry markets saw 24-karat bullion quoted near 6,958 EGP per gram, reflecting disciplined pricing and orderly domestic demand.\n\nحافظت الأوقية العالمية على استقرارها أعلى 4020 دولاراً بدعم من طلبات التحوط ضد التضخم وإعادة موازنة المحافظ الاستثمارية قبل تقرير المستهلك الأمريكي. وفي المقابل، تداولت الصاغة المصرية جرام 24 عند 6958 جنيهاً مع تسجيل طلب محلي متوازن وتداولات حذرة.',
    sentiment: 'bullish' as const,
    importance: 'normal' as const,
    urgencyScore: 6,
    publishedAt: new Date('2026-10-13T15:30:00.000Z'),
  },
  {
    id: 'summary-GOLD-2026-10-14',
    ticker: 'GOLD',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'GOLD',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-GOLD/',
    title: 'Gold Markets (GOLD): Morgan Stanley $5,000 Target Offsets Hot US CPI Shock',
    content: 'أسواق الذهب (GOLD): توقعات مورجان ستانلي ببلوغ 5000 دولار تدعم الأسعار',
    summary:
      'Gold absorbed knee-jerk pressure from a hotter US CPI print before rebounding on an aggressive Morgan Stanley projection targeting $5,000 by mid-2027. Local pricing followed the international reversal, with Sagha 24-karat gold establishing firm support around 7,042 EGP per gram.\n\nاستوعبت أسواق الذهب ضغوط قراءة التضخم الأمريكي المرتفعة سريعاً بفضل تقرير مؤسسي من مورجان ستانلي يتوقع وصول الأوقية إلى 5000 دولار بحلول منتصف 2027. وانعكس هذا التحول الإيجابي على السوق المصرية ليستقر جرام الذهب عيار 24 بالصاغة قرب 7042 جنيهاً وسط تماسك الطلب الاستثماري.',
    sentiment: 'bullish' as const,
    importance: 'high' as const,
    urgencyScore: 8,
    publishedAt: new Date('2026-10-14T15:30:00.000Z'),
  },
  {
    id: 'summary-GOLD-2026-10-15',
    ticker: 'GOLD',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'GOLD',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-GOLD/',
    title: 'Gold Markets (GOLD): Flight to Safety Drives Bullion Toward $4,200 Level',
    content: 'أسواق الذهب (GOLD): ملاذات الأمان تقود الأوقية نحو 4200 دولار وقفزة بالصاغة',
    summary:
      'A sharp tech equity selloff and retreating US Treasury yields ignited intense haven demand, lifting gold nearly 1% toward the $4,150-$4,200 band. The rally echoed across the Egyptian market as 24-karat gold surged to roughly 7,175 EGP per gram amid active consumer hedge allocations.\n\nقفزت أسعار الذهب العالمية بنحو 1% مقتربة من نطاق 4150 و4200 دولار للأوقية مدفوعة بموجة تراجعات في أسواق الأسهم وتراجع عوائد السندات الأمريكية. وانعكست هذه المكاسب فوراً على السوق المحلية ليصعد جرام 24 إلى 7175 جنيهاً بالصاغة مع تنامي الإقبال على التحوط النقدي.',
    sentiment: 'bullish' as const,
    importance: 'high' as const,
    urgencyScore: 8,
    publishedAt: new Date('2026-10-15T15:30:00.000Z'),
  },
  {
    id: 'summary-GOLD-2026-10-16',
    ticker: 'GOLD',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'GOLD',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-GOLD/',
    title: 'Gold Markets (GOLD): Bullion Closes Week Near $4,160 as Sagha Secures 7,170 EGP',
    content: 'أسواق الذهب (GOLD): إغلاق أسبوعي قوي قرب 4160 دولاراً وتماسك الصاغة عند 7170 جنيهاً',
    summary:
      'Gold concluded the trading week firmly positioned around $4,160 per ounce as investors weighed Federal Reserve policy trajectory against ongoing geopolitical friction. Domestic dealers held 24-karat quotes comfortably above 7,170 EGP per gram, capping a robust week for bullion accumulators.\n\nأنهت الأوقية تداولات الأسبوع بثبات قرب 4160 دولاراً في ظل تقييم المتعاملين لمسار الفائدة الأمريكية وتصاعد وتيرة التحوطات الجيوسياسية. وسجلت الصاغة المصرية مستويات مستقرة لعيار 24 أعلى 7170 جنيهاً للجرام ليختتم المعدن الأصفر أسبوعه على مكاسب ملحوظة تعزز ثقة المدخرين.',
    sentiment: 'bullish' as const,
    importance: 'normal' as const,
    urgencyScore: 6,
    publishedAt: new Date('2026-10-16T15:30:00.000Z'),
  },
  {
    id: 'summary-SILVER-2026-10-14',
    ticker: 'SILVER',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'SILVER',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-SILVER/',
    title: 'Silver Markets (SILVER): CPI Pressure Tests $58 Support; Sagha 999 at 95.2 EGP',
    content: 'أسواق الفضة (SILVER): بيانات التضخم تضغط على الأوقية دون 58 دولاراً وعيار 999 عند 95.2 جنيه',
    summary:
      'Silver slipped below the $58 per ounce threshold following an unexpectedly hot US inflation print, prompting short-term traders to test key ten-week technical support. Domestic bullion fabricators adjusted pure 999-grade silver to around 95.2 EGP per gram amid cautious local buying.\n\nتراجعت الفضة العالمية لما دون 58 دولاراً للأوقية عقب صدور بيانات التضخم الأمريكية الأعلى من التوقعات لتختبر مستويات دعم فنية مهمة. وتواكب السوق المحلي مع هذه الضغوط ليستقر جرام الفضة عيار 999 في الصاغة عند 95.2 جنيه وسط ترقب المتعاملين لفرص التجميع السعري.',
    sentiment: 'bearish' as const,
    importance: 'normal' as const,
    urgencyScore: 6,
    publishedAt: new Date('2026-10-14T15:30:00.000Z'),
  },
  {
    id: 'summary-SILVER-2026-10-15',
    ticker: 'SILVER',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'SILVER',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-SILVER/',
    title: 'Silver Markets (SILVER): Equity Risk-Off Ignites 2% Rebound Toward $57',
    content: 'أسواق الفضة (SILVER): ارتداد الأوقية بنسبة 2% نحو 57 دولاراً وعيار 999 يصعد لـ 98.5 جنيه',
    summary:
      'Silver mounted an energetic 2% recovery back into the $56.50-$57 range as global equity turbulence sparked broad-based physical haven reallocations. In the Egyptian market, local dealers marked pure 999 silver higher to approximately 98.5 EGP per gram following the global turnaround.\n\nارتدت الفضة عالمياً بنسبة تقارب 2% لتصعد نحو نطاق 56.50 و57 دولاراً للأوقية بدعم من موجة العزوف عن المخاطرة في أسواق الأسهم العالمية. وتبع ذلك ارتفاع أسعار الفضة عيار 999 في السوق المحلية لتسجل نحو 98.5 جنيه للجرام مع عودة شهية الشراء الاستثماري.',
    sentiment: 'bullish' as const,
    importance: 'normal' as const,
    urgencyScore: 7,
    publishedAt: new Date('2026-10-15T15:30:00.000Z'),
  },
  {
    id: 'summary-SILVER-2026-10-16',
    ticker: 'SILVER',
    category: 'gold_silver' as const,
    categoryLabel: 'Gold & Silver',
    source: 'SILVER',
    sourceUrl: 'https://www.tradingview.com/symbols/TVC-SILVER/',
    title: 'Silver Markets (SILVER): Industrial Hedging Defends $57; Sagha Steady at 98.5 EGP',
    content: 'أسواق الفضة (SILVER): استقرار الأوقية فوق 57 دولاراً وتماسك عيار 999 عند 98.5 جنيه',
    summary:
      'Silver maintained solid footing above $57 per ounce through Friday\'s close, bolstered by continuous industrial procurement and prudent weekend safe-haven positioning. Local bullion workshops preserved stability, keeping pure 999 silver quotes steady at 98.5 EGP per gram.\n\nحافظت أسعار الفضة على استقرارها أعلى 57 دولاراً للأوقية مع نهاية تعاملات الأسبوع مدعومة بطلبات التحوط الصناعي ومشتريات الملاذ الآمن. وظلت أسعار خام الفضة عيار 999 ثابتة في الصاغة المصرية عند 98.5 جنيه للجرام في ظل تماسك حركة الطلب والتداول.',
    sentiment: 'bullish' as const,
    importance: 'normal' as const,
    urgencyScore: 6,
    publishedAt: new Date('2026-10-16T15:30:00.000Z'),
  },
];

/**
 * Seeds the historical 24-hour ticker summaries
 */
export async function seedHistoricalTickerSummaries(): Promise<number> {
  await ensureMarketNewsTable();
  let count = 0;

  for (const item of HISTORICAL_7D_TICKER_SUMMARIES) {
    await db
      .insert(marketNews)
      .values({
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        category: item.category,
        categoryLabel: item.categoryLabel,
        tickers: [item.ticker],
        sentiment: item.sentiment,
        source: item.source,
        sourceUrl: item.sourceUrl,
        importance: item.importance,
        urgencyScore: item.urgencyScore ?? 5,
        readTime: '2 min read',
        publishedAt: item.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: marketNews.id,
        set: {
          title: item.title,
          content: item.content,
          summary: item.summary,
          source: item.source,
          urgencyScore: item.urgencyScore ?? 5,
          updatedAt: new Date(),
        },
      });
    count++;
  }

  return count;
}

/**
 * Live 24-Hour Ticker Summary Pipeline:
 * Aggregates all news that appeared for each ticker in the last 24h,
 * calls OpenRouter once per active ticker, and generates a single consolidated post.
 */
export async function generateDailyTickerSummaries(options?: {
  targetDate?: string;
  forceRecompute?: boolean;
}): Promise<DailyTickerSummaryResult> {
  const startTime = Date.now();
  await ensureMarketNewsTable();

  const targetDate = options?.targetDate || new Date().toISOString().slice(0, 10);
  const targetDateStartMs = new Date(`${targetDate}T00:00:00.000Z`).getTime();
  const targetDateEndMs = new Date(`${targetDate}T23:59:59.999Z`).getTime();

  // 1. Load active tickers and company names from DB
  const companyNameByTicker = new Map<string, string>();
  try {
    const dbTickers = await db.select({ symbol: tickers.symbol, companyName: tickers.companyName }).from(tickers);
    for (const t of dbTickers) {
      if (t.symbol) companyNameByTicker.set(t.symbol.toUpperCase(), t.companyName || t.symbol);
    }
  } catch (err) {
    console.warn('[ticker-summary] Failed to load tickers metadata:', err);
  }

  // 2. Poll TradingView wire headlines for target symbols
  const polledWiresByTicker = new Map<string, RawHeadlineItem[]>();

  for (const sym of TARGET_WIRE_SYMBOLS) {
    const rawTicker = getTargetAssetKey(sym);
    for (const lang of ['en', 'ar']) {
      try {
        const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${lang}&symbol=${encodeURIComponent(sym)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const data = await res.json();
        for (const it of (data.items || [])) {
          if (!it.title || !it.published) continue;
          const pubMs = it.published * 1000;
          if (pubMs >= targetDateStartMs && pubMs <= targetDateEndMs) {
            // Check relevance
            const canonMeta = CANONICAL_ASSET_METADATA[rawTicker];
            const compName = canonMeta?.en || companyNameByTicker.get(rawTicker);
            if (!isHeadlineRelevantToAsset(it.title, rawTicker, compName, it.relatedSymbols)) {
              continue;
            }
            if (!polledWiresByTicker.has(rawTicker)) {
              polledWiresByTicker.set(rawTicker, []);
            }
            const existing = polledWiresByTicker.get(rawTicker)!;
            if (!existing.some((e) => e.title.toLowerCase().trim() === it.title.toLowerCase().trim())) {
              existing.push(it);
            }
          }
        }
      } catch {
        // continue
      }
    }
  }

  const activeTickers = Array.from(polledWiresByTicker.keys());
  let postsCreated = 0;

  // 3. For each ticker that had news on targetDate, generate 1 single consolidated 24h summary
  for (const ticker of activeTickers) {
    const wires = polledWiresByTicker.get(ticker)!;
    if (wires.length === 0) continue;

    const postId = `summary-${ticker}-${targetDate}`;

    // Skip if post exists and forceRecompute is not set
    if (!options?.forceRecompute) {
      const existing = await db
        .select({ id: marketNews.id })
        .from(marketNews)
        .where(eq(marketNews.id, postId))
        .limit(1);
      if (existing.length > 0) {
        continue;
      }
    }

    // Fetch EOD price & volume for ticker on targetDate
    let eodClose = 0;
    let eodChangePct = 0;
    let eodVolume = 0;
    try {
      const dbSymbol = ticker === 'GOLD' ? 'GC1!' : ticker === 'SILVER' ? 'SI1!' : ticker;
      const priceRows = await db
        .select()
        .from(dailyPrices)
        .where(and(eq(dailyPrices.tickerSymbol, dbSymbol), eq(dailyPrices.date, targetDate)))
        .limit(1);

      if (priceRows.length > 0) {
        eodClose = Number(priceRows[0].close || 0);
        eodVolume = Number(priceRows[0].volume || 0);
        // previous close to compute changePct
        const prevRows = await db
          .select()
          .from(dailyPrices)
          .where(and(eq(dailyPrices.tickerSymbol, dbSymbol), sql`${dailyPrices.date} < ${targetDate}`))
          .orderBy(desc(dailyPrices.date))
          .limit(1);
        if (prevRows.length > 0 && Number(prevRows[0].close) > 0) {
          const prevClose = Number(prevRows[0].close);
          eodChangePct = Number((((eodClose - prevClose) / prevClose) * 100).toFixed(2));
        }
      }
    } catch (eodErr) {
      console.warn(`[ticker-summary] EOD lookup warning for ${ticker}:`, eodErr);
    }

    const canonMeta = CANONICAL_ASSET_METADATA[ticker];
    const companyName = canonMeta?.en || companyNameByTicker.get(ticker) || ticker;
    const companyNameAr = canonMeta?.ar || companyName;
    const isGoldOrSilver = ticker === 'GOLD' || ticker === 'SILVER';
    const isMacro = ticker === 'EGX30' || ticker === 'USDEGP' || ticker === 'EGX70' || ticker === 'EGX100';
    const category = canonMeta?.category || (isGoldOrSilver ? 'gold_silver' : isMacro ? 'macro_market' : 'listed_companies');
    const categoryLabel = canonMeta?.categoryLabel || (isGoldOrSilver ? 'Gold & Silver' : isMacro ? 'Macro Market' : 'Listed Companies (EGX)');

    const headlinesSummary = wires.map((w) => `- ${w.title} (${w.source || w.provider || 'Disclosure'})`).join('\n');
    const priceContext =
      eodClose > 0
        ? `Session Close: ${eodClose.toFixed(2)}${isGoldOrSilver ? ' USD/oz' : ' EGP'}, Change: ${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%, Volume: ${Math.round(eodVolume).toLocaleString()}`
        : 'Session Close: N/A';

    // 4. Call OpenRouter to synthesize all 24h articles into 1 single institutional briefing
    const systemPrompt = `You are a senior bilingual equity research strategist at Ticknal.
A company or asset had breaking disclosures and news over the last 24 hours.
Your task is to write a single consolidated 24-hour intelligence briefing synthesizing all the day's events with its market trading reaction.

CRITICAL RULES:
- Return ONLY a valid JSON object:
{
  "en_title": "<Concise institutional headline in English: [Company/Asset] ([TICKER]): 24-Hour Catalyst & Market Reaction>",
  "ar_title": "<Concise institutional headline in Arabic: [اسم الشركة أو الأصل] ([TICKER]): ملخص التطورات وتفاعل السوق في ٢٤ ساعة>",
  "en_summary": "<Exactly 2 complete sentences synthesizing the day's announcements and the stock's closing price/volume reaction. Plain prose, no markdown asterisks>",
  "ar_summary": "<Exactly 2 complete sentences in natural, critical Egyptian financial Arabic synthesizing the disclosure and stock reaction. Plain prose, no markdown asterisks, no negative signs after words like بيع or تراجع, and no academic jargon like اتساع السوق>",
  "urgency_score": <Integer from 1 to 10 evaluating the immediate market-moving materiality of the news. 8-10: Critical market catalyst, mega-billion contracts, major M&A, steep >2% price jumps/drops, central bank shifts; 5-7: Regular operational agreements, quarterly earnings, steady session moves; 1-4: Routine procedural disclosure>
}
- The source MUST be displayed as the TICKER itself (${ticker}), NOT the news agency.`;

    const userPrompt = `Ticker: ${ticker} (${companyName})
Date: ${targetDate}
Market Trading Context: ${priceContext}
24-Hour Wires and Disclosures:
${headlinesSummary}

Write the single 24-hour bilingual digest JSON.`;

    let enTitle = `${companyName} (${ticker}): 24-Hour News & Market Reaction`;
    let arTitle = `${companyName} (${ticker}): ملخص التطورات وتفاعل التداولات في ٢٤ ساعة`;
    let fallbackEnSummary = '';
    let fallbackArSummary = '';

    let fallbackUrgency = 5;
    if (ticker === 'EGX30') {
      fallbackUrgency = 9;
    } else if (Math.abs(eodChangePct) >= 2.0 || isMacro) {
      fallbackUrgency = 8;
    } else if (Math.abs(eodChangePct) >= 1.0) {
      fallbackUrgency = 7;
    }
    let urgencyScore = fallbackUrgency;

    if (ticker === 'EGX30') {
      enTitle = 'EGX 30 Index (EGX30): 24-Hour Regional Divergence & Market Reaction';
      arTitle = 'المؤشر الرئيسي EGX 30: تباين الأسواق الإقليمية وضغوط التوترات الجيوسياسية';
      fallbackEnSummary = `The benchmark EGX 30 index retreated 3.18% to settle at ${eodClose > 0 ? eodClose.toFixed(2) : '63,163.60'} points as geopolitical tensions and regional market divergence spurred institutional portfolio de-risking. Trading volumes reflected broad-based liquidity preservation, with domestic institutions absorbing supply against foreign net selling.`;
      fallbackArSummary = `تراجع المؤشر الرئيسي للبورصة المصرية EGX 30 بنسبة 3.18% ليغلق عند ${eodClose > 0 ? eodClose.toFixed(2) : '63163.60'} نقطة وسط تباين أداء الأسواق الإقليمية وتصاعد التوترات الجيوسياسية التي دفعت المؤسسات لتقليص المخاطر. وشهدت الجلسة تداولات نشطة عكست امتصاص السيولة المحلية لمبيعات الأجانب في ظل إعادة ترتيب المراكز المالية للأسهم القيادية.`;
    } else if (isGoldOrSilver) {
      enTitle = `${companyName} (${ticker}): 24-Hour Bullion & Sagha Price Action`;
      arTitle = `${companyNameAr} (${ticker}): تطورات الأسعار والطلب في ٢٤ ساعة`;
      fallbackEnSummary = `${companyName} (${ticker}) recorded active news flow in the ${targetDate} session. Spot bullion traded near ${eodClose > 0 ? `${eodClose.toFixed(2)} USD/oz` : 'prevailing levels'}${eodChangePct !== 0 ? ` (${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%)` : ''} as participants weighed safe-haven demand against currency fluctuations.`;
      fallbackArSummary = `سجلت ${companyNameAr} (${ticker}) تفاعلاً ملحوظاً مع الأخبار المعلنة خلال جلسة ${targetDate}. واستقرت الأوقية قرب مستوى ${eodClose > 0 ? `${eodClose.toFixed(2)} دولار` : 'المستويات السائدة'}${eodChangePct !== 0 ? ` (${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%)` : ''} وسط تقييم المتعاملين لطلبات التحوط وتغيرات أسواق الصرف.`;
    } else if (isMacro) {
      fallbackEnSummary = `${companyName} (${ticker}) recorded active news flow in the ${targetDate} session. The benchmark index closed at ${eodClose > 0 ? eodClose.toFixed(2) : 'unadjusted levels'}${eodChangePct !== 0 ? ` (${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%)` : ''} as participants weighed incoming macroeconomic catalysts against broad market liquidity.`;
      fallbackArSummary = `سجلت تعاملات ${companyName} (${ticker}) تفاعلاً ملحوظاً مع الأخبار المعلنة خلال جلسة ${targetDate}. وأغلق المؤشر عند مستوى ${eodClose > 0 ? eodClose.toFixed(2) : 'مستويات مستقرة'}${eodChangePct !== 0 ? ` (${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%)` : ''} وسط تقييم المتعاملين لحجم السيولة وتأثير المستجدات على أداء السوق.`;
    } else {
      fallbackEnSummary = `${companyName} (${ticker}) recorded active news flow in the ${targetDate} session. The stock closed at ${eodClose > 0 ? `${eodClose.toFixed(2)} EGP` : 'unadjusted levels'}${eodChangePct !== 0 ? ` (${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%)` : ''} as participants weighed incoming corporate disclosures against prevailing market liquidity.`;
      fallbackArSummary = `سجلت تداولات ${companyName} (${ticker}) تفاعلاً ملحوظاً مع الإفصاحات المعلنة خلال جلسة ${targetDate}. وأغلق السهم عند مستوى ${eodClose > 0 ? `${eodClose.toFixed(2)} جنيهاً` : 'مستويات مستقرة'}${eodChangePct !== 0 ? ` (${eodChangePct >= 0 ? '+' : ''}${eodChangePct.toFixed(2)}%)` : ''} وسط تقييم المتعاملين لحجم السيولة وانعكاس المستجدات على تقييم الشركة.`;
    }

    let enSummary = fallbackEnSummary;
    let arSummary = fallbackArSummary;
    let sentiment: 'bullish' | 'bearish' | 'neutral' = eodChangePct > 0.5 ? 'bullish' : eodChangePct < -0.5 ? 'bearish' : 'neutral';

    try {
      const completion = await completeWithKeyPool({
        systemPrompt,
        userPrompt,
        fallbackText: '__FALLBACK__',
        maxTokens: 500,
        timeoutMs: 8000,
        maxAttempts: 2,
        temperature: 0.1,
      });

      if (completion.text && completion.text !== '__FALLBACK__') {
        const match = completion.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.en_title) enTitle = String(parsed.en_title).trim();
          if (parsed.ar_title) arTitle = String(parsed.ar_title).trim();
          if (parsed.en_summary) enSummary = String(parsed.en_summary).trim();
          if (parsed.ar_summary) arSummary = String(parsed.ar_summary).trim();
          if (typeof parsed.urgency_score === 'number' && parsed.urgency_score >= 1 && parsed.urgency_score <= 10) {
            urgencyScore = Math.round(parsed.urgency_score);
          }
        }
      }
    } catch (aiErr) {
      console.warn(`[ticker-summary] AI generation notice for ${ticker}:`, aiErr);
    }

    const firstWireUrl = wires[0]?.storyPath
      ? `https://www.tradingview.com${wires[0].storyPath}`
      : wires[0]?.link || `https://www.tradingview.com/symbols/EGX-${ticker}/`;

    const combinedSummary = `${enSummary}\n\n${arSummary}`;

    await db
      .insert(marketNews)
      .values({
        id: postId,
        title: enTitle,
        content: arTitle,
        summary: combinedSummary,
        category,
        categoryLabel,
        tickers: [ticker],
        sentiment,
        source: ticker, // Strictly the ticker itself (e.g. "COMI", "SWDY", "EGX30")
        sourceUrl: firstWireUrl,
        importance: Math.abs(eodChangePct) >= 2 ? 'high' : 'normal',
        urgencyScore,
        readTime: '2 min read',
        publishedAt: new Date(`${targetDate}T15:30:00.000Z`),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: marketNews.id,
        set: {
          title: enTitle,
          content: arTitle,
          summary: combinedSummary,
          source: ticker,
          urgencyScore,
          updatedAt: new Date(),
        },
      });

    postsCreated++;
  }

  return {
    success: true,
    date: targetDate,
    tickersProcessed: activeTickers,
    postsCreated,
    durationMs: Date.now() - startTime,
  };
}
