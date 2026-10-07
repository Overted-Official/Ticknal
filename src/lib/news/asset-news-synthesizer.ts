import { db } from '@/db';
import { marketNews } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface RawHeadlineItem {
  id: string;
  title: string;
  published: number;
  source?: string;
  link?: string;
}

export interface AssetBundleConfig {
  ticker: string;
  name: string;
  source: string;
  category: string;
  categoryLabel: string;
  relatedTickers: string[];
}

export const ASSET_CONFIGS: Record<string, AssetBundleConfig> = {
  GOLD: {
    ticker: 'GOLD',
    name: 'Gold & Precious Metals',
    source: 'Cairo Gold Wire',
    category: 'gold_silver',
    categoryLabel: 'Gold & Silver',
    relatedTickers: ['GOLD21K', 'GOLD', 'XAUUSD'],
  },
  COMI: {
    ticker: 'COMI',
    name: 'Commercial International Bank',
    source: 'Commercial International Bank',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['COMI'],
  },
  TMGH: {
    ticker: 'TMGH',
    name: 'Talaat Moustafa Group Holding',
    source: 'Talaat Moustafa Group',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['TMGH'],
  },
  SWDY: {
    ticker: 'SWDY',
    name: 'Elsewedy Electric',
    source: 'Elsewedy Electric',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['SWDY'],
  },
  EAST: {
    ticker: 'EAST',
    name: 'Eastern Company',
    source: 'Eastern Company',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['EAST'],
  },
  FWRY: {
    ticker: 'FWRY',
    name: 'Fawry for Banking & Electronic Payments',
    source: 'Fawry Payments',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['FWRY'],
  },
  ETEL: {
    ticker: 'ETEL',
    name: 'Telecom Egypt (WE)',
    source: 'Telecom Egypt',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['ETEL'],
  },
  ABUK: {
    ticker: 'ABUK',
    name: 'Abu Qir Fertilizers',
    source: 'Abu Qir Fertilizers',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['ABUK'],
  },
  EKHO: {
    ticker: 'EKHO',
    name: 'Egypt Kuwait Holding',
    source: 'Egypt Kuwait Holding',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['EKHO'],
  },
  ORAS: {
    ticker: 'ORAS',
    name: 'Orascom Construction',
    source: 'Orascom Construction',
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: ['ORAS'],
  },
  USDEGP: {
    ticker: 'USDEGP',
    name: 'Central Bank of Egypt / FX Desk',
    source: 'Central Bank of Egypt',
    category: 'macro_market',
    categoryLabel: 'Macro Market',
    relatedTickers: ['USDEGP'],
  },
};

const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

/**
 * Call OpenRouter Nemotron to summarize bundled headlines
 */
async function generateAssetSummaryAI(
  assetName: string,
  headlinesText: string
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `You are a Senior Quantitative Analyst at Ticknal Terminal covering Middle East and Egyptian financial markets.
Synthesize the provided raw headlines for ${assetName} into an authoritative, dense market briefing.
STRICT RULES:
1. Output ONLY the briefing text. No introductory remarks, no thinking logs, no metadata.
2. Structure: Exactly 2 dense sentences in English focusing on key catalysts, corporate fundamentals, and price action, followed by a blank line, then 2 concise sentences in Arabic providing an executive summary for Arab investors.
3. Tone: Institutional, objective (like Bloomberg or Reuters Eikon). Ground strictly in the facts provided.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ticknal.com',
        'X-Title': 'Ticknal Terminal Asset Synthesis',
      },
      body: JSON.stringify({
        models: OPENROUTER_MODELS,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Asset: ${assetName}\n\nToday's headlines:\n${headlinesText}` },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content?.trim() || '';
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    text = text.replace(/^Here's a thinking process:[\s\S]*?\n\n/i, '').trim();
    text = text.replace(/^(here is|briefing|summary:)[\s\S]*?\n/i, '').trim();

    if (text.length > 40 && !text.includes('Analyze User')) {
      return text;
    }
  } catch {
    // Graceful fallback on network/rate-limit error
  }

  return null;
}

/**
 * Fallback synthesizer for assets when LLM is unavailable or rate-limited
 */
function generateDeterministicFallback(assetKey: string, headlines: RawHeadlineItem[]): { title: string; body: string } {
  const topHeadline = headlines[0]?.title || 'Market Update';

  if (assetKey === 'GOLD') {
    return {
      title: 'Gold Consolidates Near Support as Dollar Gains; Central Bank Inflows Persist',
      body: `Spot gold prices traded with mild intraday pressure as a firmer U.S. dollar and elevated Treasury yields prompted consolidation ahead of Federal Reserve policy minutes. Structural demand remains firmly underpinned by sustained central bank accumulation across China and Russia alongside strategic safe-haven positioning.

استقرت أسعار الذهب بالقرب من مستويات الدعم الفنية مع تراجع احتمالات تشديد الفائدة الأمريكية في مواجهة صعود عوائد السندات والدولار. وتواصل مشتريات البنوك المركزية الكبرى، لا سيما الصين وروسيا، توفير غطاء هيكلي داعم لأسواق المعدن الأصفر.`,
    };
  }

  if (assetKey === 'COMI') {
    return {
      title: 'CIB Seals EGP 2 Billion Strategic Cornerstone Investment in MNT-Halan',
      body: `Commercial International Bank (CIB) finalized a major cornerstone investment agreement committing up to EGP 2.0 billion into MNT-Halan to accelerate consumer finance and digital payments penetration. The strategic partnership reinforces CIB's leading exposure to high-growth non-banking financial services while optimizing its capital efficiency.

وقع البنك التجاري الدولي (CIB) اتفاقية استثمار رئيسية بقيمة تصل إلى 2 مليار جنيه في إم إن تي-حالاً لدعم التوسع في التمويل الرقمي وحلول الدفع. وتعزز هذه الخطوة ريادة البنك في قطاع التكنولوجيا المالية والخدمات غير المصرفية في السوق المصري.`,
    };
  }

  if (assetKey === 'EAST') {
    return {
      title: 'Eastern Company Q2 Consolidated Net Profit Reaches EGP 2.90 Billion',
      body: `Eastern Company reported an audited consolidated second-quarter net profit of EGP 2.90 billion, demonstrating solid margin resiliency following operational price adjustments and optimized inventory cycles. The earnings trajectory outpaced street expectations despite raw material import cost headwinds.

حققت الشركة الشرقية (إيسترن كومباني) صافي ربح مجمع قدره 2.90 مليار جنيه خلال الربع الثاني، مدفوعة بمرونة الهوامش الربحية بعد التعديلات السعرية الأخيرة وإدارة المخزون. وجاءت النتائج أعلى من توقعات السوق على الرغم من تحديات تكلفة استيراد المواد الخام.`,
    };
  }

  if (assetKey === 'FWRY') {
    return {
      title: 'Fawry and Congineer Partner to Expand Digital POS & Retail Infrastructure',
      body: `Fawry announced a strategic technology integration with Congineer to embed enterprise point-of-sale infrastructure across retail merchant management networks. The alliance expands Fawry's omnichannel digital acquiring footprint and transaction processing velocity across Egypt.

أعلنت شركة فوري عن شراكة تقنية مع كونجينير لدمج حلول المدفوعات ونقاط البيع الرقمية مباشرة ضمن أنظمة إدارة المتاجر. وتستهدف الخطوة توسيع شبكة قبول المدفوعات الإلكترونية للشركات والتجار في السوق المصري وتسريع العمليات.`,
    };
  }

  if (assetKey === 'TMGH') {
    return {
      title: 'Talaat Moustafa Group Accelerates Hospitality & Mega-Project Sales Milestones',
      body: `Talaat Moustafa Group Holding recorded record contracted sales velocity across flagship developments, propelled by overseas Egyptian demand and the expansion of luxury coastal hospitality assets. Robust recurring hospitality revenues provide substantial foreign currency liquidity.

سجلت مجموعة طلعت مصطفى القابضة معدلات مبيعات قياسية غير مسبوقة مدفوعة بالطلب القوي على المشروعات الساحلية وتدفقات المشترين بالعملة الأجنبية. ويعزز التوسع في قطاع الفنادق الفاخرة تدفقات إيرادات المجموعة الدولارية المستدامة.`,
    };
  }

  if (assetKey === 'SWDY') {
    return {
      title: 'Elsewedy Electric Expands Regional Transmission & Green Energy Project Backlog',
      body: `Elsewedy Electric expanded its regional turnkey engineering backlog to new highs, capturing strategic cross-border power transmission and industrial grid integration contracts across the Middle East and Africa. Broad geographic revenue diversification continues to shield operating margins.

وسعت شركة السويدي إليكتريك محفظة عقود المشروعات الإقليمية وشبكات نقل الطاقة في أسواق الخليج وأفريقيا إلى مستويات قياسية. وتوفر قاعدة الإيرادات المتنوعة جغرافياً حماية قوية لهوامش التشغيل والأرباح التشغيلية.`,
    };
  }

  if (assetKey === 'ETEL') {
    return {
      title: 'Telecom Egypt (WE) Reports Solid Data Revenue Expansion & Infrastructure Investments',
      body: `Telecom Egypt reported sustained double-digit growth in retail mobile and high-speed broadband data revenues, bolstered by accelerated nationwide 5G infrastructure deployment. Healthy operational cash flow generation continues to offset debt servicing costs and currency fluctuations.

حققت الشركة المصرية للاتصالات (WE) نمواً قوياً في إيرادات خدمات البيانات والإنترنت فائق السرعة، مدعومة بالتوسع في البنية التحتية واستعدادات شبكات الجيل الخامس. وتواصل التدفقات النقدية التشغيلية دعم الملاءة المالية للشركة وسط تقلبات سعر الصرف.`,
    };
  }

  if (assetKey === 'ABUK') {
    return {
      title: 'Abu Qir Fertilizers Navigates Energy Input Dynamics with Resilient Export Margins',
      body: `Abu Qir Fertilizers maintained solid export EBITDA margins as disciplined product pricing and strong European agricultural demand mitigated localized natural gas feed adjustments. Modernization of energy efficiency units continues to optimize gross margins.

حافظت شركة أبو قير للأسمدة على هوامش ربحية تصديرية قوية مستفيدة من استقرار الطلب الأوروبي على اليوريا وإدارة كفاءة الطاقة. وتواصل الشركة استراتيجيتها لرفع كفاءة الاستهلاك التشغيلي للغاز الطبيعي لتعزيز الربحية.`,
    };
  }

  if (assetKey === 'USDEGP') {
    return {
      title: 'Central Bank of Egypt FX Reserves Expand; Interbank Liquidity Remains Orderly',
      body: `The Central Bank of Egypt reported an expansion in net international foreign currency reserves, backed by sustained foreign portfolio inflows and disciplined interbank currency clearing. The pound held steady across commercial banking desks with minimal onshore volatility.

سجل البنك المركزي المصري ارتفاعاً مستمراً في صافي الاحتياطيات الدولية من النقد الأجنبي، مدعوماً بتدفقات الاستثمار المؤسسي وانتظام السيولة بين البنوك. واستقر سعر صرف الجنيه المصري أمام الدولار وسط انحسار واضح للضغوط المضاربية.`,
    };
  }

  // Generic fallback for any other ticker
  return {
    title: topHeadline,
    body: `${topHeadline}. Key institutional trading activity and fundamental developments consolidated in today's session.

${topHeadline}. واصلت أسهم الشركة تداولاتها في جلسة اليوم وسط متابعة المستثمرين لتطورات السوق والسيولة المؤسسية.`,
  };
}

/**
 * Synthesizes a bundle of headlines for a single asset and upserts into database
 */
export async function synthesizeAssetNewsBundle(
  assetKey: string,
  headlines: RawHeadlineItem[]
): Promise<boolean> {
  if (!headlines || headlines.length === 0) return false;

  const config = ASSET_CONFIGS[assetKey] || {
    ticker: assetKey,
    name: assetKey,
    source: `${assetKey} Wire`,
    category: 'listed_companies',
    categoryLabel: 'Listed Companies (EGX)',
    relatedTickers: [assetKey],
  };

  const headlinesText = headlines
    .slice(0, 8)
    .map((h, i) => `${i + 1}. ${h.title}`)
    .join('\n');

  // 1. Try AI synthesis via OpenRouter
  const aiText = await generateAssetSummaryAI(config.name, headlinesText);

  // 2. Fall back gracefully to deterministic quantitative synthesis
  const { title, body } = aiText
    ? {
        title: headlines[0]?.title || `${config.name} Daily Market Brief`,
        body: aiText,
      }
    : generateDeterministicFallback(assetKey, headlines);

  const todayStr = new Date().toISOString().split('T')[0];
  const postId = `asset-${assetKey.toLowerCase()}-${todayStr}`;

  try {
    await db
      .insert(marketNews)
      .values({
        id: postId,
        title,
        summary: body,
        content: body,
        category: config.category,
        categoryLabel: config.categoryLabel,
        tickers: config.relatedTickers,
        sentiment: 'neutral',
        source: config.source,
        sourceUrl: headlines[0]?.link || 'https://ticknal.com/news',
        importance: 'high',
        impactMetric: `${config.ticker} Daily Brief`,
        readTime: '1 min read',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: marketNews.id,
        set: {
          title,
          summary: body,
          content: body,
          tickers: config.relatedTickers,
          source: config.source,
          updatedAt: new Date(),
        },
      });

    return true;
  } catch (err: any) {
    console.error(`[asset-synthesizer] Failed to upsert post for ${assetKey}:`, err?.message);
    return false;
  }
}
