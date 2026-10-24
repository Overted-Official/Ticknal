import { db } from '@/db';
import { marketNews } from '@/db/schema';
import crypto from 'crypto';
import { completeWithKeyPool } from '@/lib/ai/openrouter-client';
import { ensureMarketNewsTable } from './news-service';

export interface InstitutionalCollectorOptions {
  startDate?: Date;
  endDate?: Date;
  maxAiSynthesized?: number;
  dryRun?: boolean; // When true, synthesizes and returns briefings WITHOUT writing to DB
}

export interface SynthesizedBriefing {
  id: string;
  clusterTheme: string;
  institution: string;
  topic: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  impactMetric: string;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  urgencyScore: number;
  tickers: string[];
  sourceAttribution: string;
  primaryUrl: string;
  articlesCount: number;
  publishedAt: Date;
}

export interface InstitutionalSyncResult {
  success: boolean;
  totalRawFetched: number;
  afterNoiseFilter: number;
  clustersIdentified: number;
  briefingsSynthesized: SynthesizedBriefing[];
  insertedCount: number;
  durationMs: number;
  error?: string;
}

interface RawRssArticle {
  title: string;
  link: string;
  pubDateStr: string;
  parsedDate: Date;
  source: string;
  snippet: string;
}

function parseJsonSafely(raw: string): any {
  if (!raw) return null;
  const cleaned = raw.trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}

    try {
      const sanitized = jsonMatch[0]
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      return JSON.parse(sanitized);
    } catch {}
  }
  return null;
}

/**
 * Deep-clean HTML tags, entities, and formatting junk from RSS descriptions
 */
function cleanRssText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;[^&]+&gt;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filter out retail consumer news, bank branch promotions, and daily local currency chatter
 */
function isRetailNoise(text: string): boolean {
  const lower = text.toLowerCase();
  const noisePhrases = [
    'سعر الريال',
    'سعر اليورو',
    'سعر الذهب اليوم',
    'أسعار الذهب اليوم',
    'شهادات ادخار',
    'شهادات الادخار',
    'مسابقة',
    'عروض مجانية',
    'اليوم العالمي للادخار',
    'ختام التعاملات',
    'بداية التعاملات',
    'تحديث في ختام',
    'عيار 21',
    'عيار 24',
    'عيار 18',
    'gold price today',
    'فروع البنك',
    'حسابات التوفير',
  ];
  return noisePhrases.some((p) => lower.includes(p));
}

function parseRssXml(xml: string): RawRssArticle[] {
  const items: RawRssArticle[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

    let title = cleanRssText((titleMatch ? titleMatch[1] : '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'));
    const link = (linkMatch ? linkMatch[1] : '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    const pubDateStr = (pubDateMatch ? pubDateMatch[1] : '').trim();
    let source = cleanRssText((sourceMatch ? sourceMatch[1] : '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'));
    const snippet = cleanRssText((descMatch ? descMatch[1] : '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'));

    if (!source && title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts.pop() || '';
      title = parts.join(' - ');
    }

    const parsedDate = new Date(pubDateStr);
    if (title && !isNaN(parsedDate.getTime()) && !isRetailNoise(`${title} ${snippet}`)) {
      items.push({
        title,
        link,
        pubDateStr,
        parsedDate,
        source: source || 'Financial Press',
        snippet,
      });
    }
  }
  return items;
}

async function fetchRssFeed(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

interface ArticleCluster {
  clusterKey: string;
  theme: string;
  articles: RawRssArticle[];
  latestDate: Date;
}

/**
 * Cluster raw articles into cohesive institutional macro topics
 */
function clusterMacroArticles(articles: RawRssArticle[]): ArticleCluster[] {
  const clustersMap = new Map<string, ArticleCluster>();

  for (const article of articles) {
    const text = `${article.title} ${article.snippet}`.toLowerCase();

    let clusterKey = '';
    let theme = '';

    // Cluster 1: Sovereign Credit Rating Actions (Moody's, Fitch, S&P)
    if (
      text.includes('moody') ||
      text.includes('موديز') ||
      text.includes('fitch') ||
      text.includes('فيتش') ||
      (text.includes('rating') && text.includes('egypt') && (text.includes('upgrade') || text.includes('outlook'))) ||
      (text.includes('تصنيف') && text.includes('مصر') && (text.includes('رفع') || text.includes('إيجابية')))
    ) {
      const yearMonth = article.parsedDate.toISOString().slice(0, 7);
      clusterKey = `sovereign_rating:${yearMonth}`;
      theme = 'Sovereign Credit Rating Actions (Moody\'s / Fitch / S&P)';
    }
    // Cluster 2: S&P Global Purchasing Managers' Index (Egypt PMI)
    else if (
      text.includes('pmi') ||
      text.includes('مديري المشتريات') ||
      text.includes('purchasing managers')
    ) {
      const yearMonth = article.parsedDate.toISOString().slice(0, 7);
      clusterKey = `pmi_report:${yearMonth}`;
      theme = 'S&P Global Egypt Purchasing Managers\' Index (PMI)';
    }
    // Cluster 3: Investment Bank Macro Research (Goldman Sachs, Morgan Stanley, JPMorgan)
    else if (
      text.includes('goldman') ||
      text.includes('جولدمان') ||
      text.includes('morgan stanley') ||
      text.includes('مورجان ستانلي') ||
      text.includes('jpmorgan') ||
      text.includes('farouk soussa')
    ) {
      const yearMonth = article.parsedDate.toISOString().slice(0, 7);
      clusterKey = `bank_research:${yearMonth}`;
      theme = 'Investment Bank Macroeconomic Research (Goldman Sachs / Morgan Stanley)';
    }
    // Cluster 4: Central Bank of Egypt Monetary Policy & Macro Indicators
    else if (
      (text.includes('central bank') || text.includes('المركزي المصري') || text.includes('cbe')) &&
      (text.includes('monetary policy') ||
        text.includes('mpc') ||
        text.includes('interest rate') ||
        text.includes('حسم الفائدة') ||
        text.includes('remittance') ||
        text.includes('تحويلات') ||
        text.includes('reserves') ||
        text.includes('احتياطي'))
    ) {
      // Sub-cluster by week to avoid merging different meetings
      const weekBucket = article.parsedDate.toISOString().slice(0, 10);
      clusterKey = `cbe_macro:${weekBucket.slice(0, 7)}`;
      theme = 'Central Bank of Egypt (Monetary Policy & Foreign Currency Liquidity)';
    }

    if (!clusterKey) continue;

    if (!clustersMap.has(clusterKey)) {
      clustersMap.set(clusterKey, {
        clusterKey,
        theme,
        articles: [],
        latestDate: article.parsedDate,
      });
    }

    const cluster = clustersMap.get(clusterKey)!;
    cluster.articles.push(article);
    if (article.parsedDate > cluster.latestDate) {
      cluster.latestDate = article.parsedDate;
    }
  }

  return Array.from(clustersMap.values());
}

/**
 * High-Conviction Institutional Macro Pipeline:
 * Ingests, clusters, and synthesizes institutional research (S&P PMI, Goldman Sachs, Moody's, CBE)
 * with strict noise rejection and bilingual output.
 */
export async function syncInstitutionalMacroNews(
  options: InstitutionalCollectorOptions = {}
): Promise<InstitutionalSyncResult> {
  const startTime = Date.now();
  await ensureMarketNewsTable();

  const now = options.endDate || new Date();
  const startDate = options.startDate || new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const dryRun = options.dryRun ?? false;

  const prevDay = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const afterDateStr = prevDay.toISOString().slice(0, 10);

  // Curated queries targeting top-tier institutional entities & topics
  const queries = [
    `https://news.google.com/rss/search?q=(Egypt+PMI+OR+"S%26P+Global"+Egypt)+after:${afterDateStr}&hl=en-US&gl=US&ceid=US:en`,
    `https://news.google.com/rss/search?q=("Moody's"+OR+"Fitch"+OR+"Goldman+Sachs"+OR+"Morgan+Stanley"+OR+"Central+Bank+of+Egypt")+Egypt+after:${afterDateStr}&hl=en-US&gl=US&ceid=US:en`,
    `https://news.google.com/rss/search?q=(مصر+"موديز"+OR+"ستاندرد+آند+بورز"+OR+"جولدمان+ساكس"+OR+"البنك+المركزي+المصري"+الفائدة)+after:${afterDateStr}&hl=ar&gl=EG&ceid=EG:ar`,
  ];

  let totalRawFetched = 0;
  const rawArticles: RawRssArticle[] = [];

  for (const url of queries) {
    try {
      const xml = await fetchRssFeed(url);
      const items = parseRssXml(xml);
      totalRawFetched += items.length;
      rawArticles.push(...items);
    } catch (err: any) {
      console.warn('[institutional-collector] Fetch error:', err?.message);
    }
  }

  // Filter within date window
  const inWindow = rawArticles.filter(
    (item) => item.parsedDate >= startDate && item.parsedDate <= now
  );

  // Group into cohesive clusters
  const clusters = clusterMacroArticles(inWindow);

  // Pre-load existing IDs from DB to prevent re-inserting
  const existingRows = await db
    .select({ id: marketNews.id })
    .from(marketNews);
  const existingIds = new Set(existingRows.map((r) => r.id));

  const synthesizedBriefings: SynthesizedBriefing[] = [];
  let insertedCount = 0;

  for (const cluster of clusters) {
    if (cluster.articles.length === 0) continue;

    // Stable deterministic ID for the entire cluster event
    const clusterId = `macro-${crypto.createHash('md5').update(cluster.clusterKey).digest('hex').slice(0, 16)}`;
    if (existingIds.has(clusterId) && !dryRun) {
      continue;
    }

    // Format top cluster articles for AI synthesis
    const articlesSummaryText = cluster.articles
      .slice(0, 6)
      .map(
        (a, idx) =>
          `[${idx + 1}] Source: ${a.source} (${a.parsedDate.toISOString().slice(0, 10)})\nHeadline: "${a.title}"\nDetails: "${a.snippet}"`
      )
      .join('\n\n');

    const systemPrompt = `You are the Chief Macroeconomic Editor at Ticknal.
You receive a cluster of authentic news reports covering ONE specific macroeconomic event or catalyst in Egypt.
Analyze the entire cluster together.

Decision Rules:
1. If this cluster is routine consumer noise, daily local currency quotes, retail certificate chatter, or lacks institutional substance:
   Output ONLY: {"action": "DROP", "reason": "<why dropped>"}
2. If this cluster contains real, high-impact institutional macro intelligence (e.g. Sovereign rating upgrade, S&P PMI data release, CBE monetary policy consensus, major investment bank forecast):
   Output ONLY a strictly valid JSON object:
   {
     "action": "PUBLISH",
     "institution": "<Primary institution: e.g. 'Moody\\'s', 'S&P Global', 'Goldman Sachs', 'Central Bank of Egypt'>",
     "topic": "<Specific topic name>",
     "titleEn": "<Crisp institutional headline in English (max 90 chars)>",
     "titleAr": "<Crisp institutional headline in Arabic (max 90 chars)>",
     "summaryEn": "<2 sentences in English summarizing the consensus figures, institutional rationale, and macroeconomic impact>",
     "summaryAr": "<2 sentences in Arabic summarizing the consensus figures and macroeconomic impact>",
     "impactMetric": "<Numerical punchline, e.g. 'Rating: Upgraded to B3' or 'PMI: 47.2 (-0.8 pts)'>",
     "sentiment": "<'bullish' | 'neutral' | 'bearish'>",
     "urgencyScore": <number from 7 to 10>,
     "primaryTicker": "USDEGP"
   }`;

    const userPrompt = `Cluster Theme: ${cluster.theme}\nNumber of reporting sources: ${cluster.articles.length}\n\nIncoming Articles in Cluster:\n${articlesSummaryText}\n\nSynthesize the cluster:`;

    try {
      // Pacing delay (2.5s) to stay cleanly within OpenRouter free-tier rate limits
      await new Promise((r) => setTimeout(r, 2500));

      const completion = await completeWithKeyPool({
        systemPrompt,
        userPrompt,
        fallbackText: '{"action": "DROP"}',
        temperature: 0.1,
        maxTokens: 750,
        timeoutMs: 16000,
        maxAttempts: 3,
        validateOutput: (t: string) => t.includes('"action"'),
      });

      if (completion.source === 'ai_generated' && completion.text.includes('"action"')) {
        const parsed = parseJsonSafely(completion.text);
        if (parsed) {
          if (parsed.action === 'PUBLISH' && parsed.titleEn && (parsed.urgencyScore ?? 7) >= 7) {
            const sourcesList = Array.from(new Set(cluster.articles.map((a) => a.source)));
            const primaryUrl = cluster.articles[0]?.link || 'https://ticknal.com/news';
            const attribution = `${parsed.institution} (Reported by ${sourcesList.slice(0, 3).join(', ')})`;

            const briefing: SynthesizedBriefing = {
              id: clusterId,
              clusterTheme: cluster.theme,
              institution: parsed.institution,
              topic: parsed.topic || cluster.theme,
              titleEn: parsed.titleEn,
              titleAr: parsed.titleAr || parsed.titleEn,
              summaryEn: parsed.summaryEn,
              summaryAr: parsed.summaryAr || '',
              impactMetric: parsed.impactMetric || `${parsed.institution}: ${parsed.topic}`,
              sentiment: parsed.sentiment || 'neutral',
              urgencyScore: parsed.urgencyScore || 8,
              tickers: [parsed.primaryTicker || 'USDEGP', 'EGX30'],
              sourceAttribution: attribution,
              primaryUrl,
              articlesCount: cluster.articles.length,
              publishedAt: cluster.latestDate,
            };

            synthesizedBriefings.push(briefing);

            if (!dryRun) {
              const formattedTitle = `${briefing.titleEn} | ${briefing.titleAr}`;
              const formattedSummary = `${briefing.summaryEn}\n\n${briefing.summaryAr}`.trim();

              await db.insert(marketNews).values({
                id: briefing.id,
                title: formattedTitle,
                summary: formattedSummary,
                content: `${briefing.summaryEn}\n\n${briefing.summaryAr}`,
                category: 'macro_market',
                categoryLabel: 'Institutional Research',
                tickers: briefing.tickers,
                sentiment: briefing.sentiment,
                source: briefing.sourceAttribution,
                sourceUrl: briefing.primaryUrl,
                importance: briefing.urgencyScore >= 9 ? 'critical' : 'high',
                urgencyScore: briefing.urgencyScore,
                impactMetric: briefing.impactMetric,
                readTime: '2 min read',
                imageUrl: null,
                publishedAt: briefing.publishedAt,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              insertedCount++;
              existingIds.add(briefing.id);
            }
          }
        }
      }
    } catch (clusterErr: any) {
      console.warn(`[institutional-collector] Failed to synthesize cluster ${cluster.clusterKey}:`, clusterErr?.message);
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    totalRawFetched,
    afterNoiseFilter: inWindow.length,
    clustersIdentified: clusters.length,
    briefingsSynthesized: synthesizedBriefings,
    insertedCount,
    durationMs,
  };
}
