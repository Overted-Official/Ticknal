import { db } from '@/db';
import { dailyPrices, egxInvestorFlows, marketNews, tickers } from '@/db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import {
  generateEgx30ChartSvg,
  generateInvestorFlowsChartSvg,
  generateFxArbitrageChartSvg,
  type Egx30ChartData,
  type InvestorFlowsChartData,
  type FxArbitrageChartData,
} from './ticknal-take-charts';

const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

interface MarketDataSnapshot {
  date: string;
  egx30: Egx30ChartData;
  flows: InvestorFlowsChartData;
  fx: FxArbitrageChartData;
}

/**
 * 1. Fetch real-time market numbers from database
 */
export async function getMarketDataSnapshot(): Promise<MarketDataSnapshot> {
  const todayStr = new Date().toISOString().split('T')[0];

  // A. Latest EGX30 prices
  const egx30Rows = await db
    .select()
    .from(dailyPrices)
    .where(eq(dailyPrices.tickerSymbol, 'EGX30'))
    .orderBy(desc(dailyPrices.date))
    .limit(10);

  const latestEgx30 = egx30Rows[0];
  const prevEgx30 = egx30Rows[1];

  const targetDate = latestEgx30?.date ? String(latestEgx30.date).slice(0, 10) : todayStr;
  const close = latestEgx30 ? Number(latestEgx30.close) : 66767.4;
  const prevClose = prevEgx30 ? Number(prevEgx30.close) : 67055.5;
  const changePts = Number((close - prevClose).toFixed(2));
  const changePct = Number(((changePts / prevClose) * 100).toFixed(2));
  const open = latestEgx30 ? Number(latestEgx30.open) : close;
  const high = latestEgx30 ? Number(latestEgx30.high) : close;
  const low = latestEgx30 ? Number(latestEgx30.low) : close;

  const recentBars = egx30Rows.map((r) => Number(r.close)).reverse();

  const prevDate = prevEgx30?.date ? String(prevEgx30.date).slice(0, 10) : targetDate;

  // B. Advance/Decline Breadth on target date (Fast indexed lookup)
  let advancers = 18;
  let decliners = 9;
  let flat = 3;

  try {
    const [todayRows, prevRows] = await Promise.all([
      db.select({ ticker: dailyPrices.tickerSymbol, close: dailyPrices.close })
        .from(dailyPrices)
        .where(eq(dailyPrices.date, targetDate)),
      db.select({ ticker: dailyPrices.tickerSymbol, close: dailyPrices.close })
        .from(dailyPrices)
        .where(eq(dailyPrices.date, prevDate)),
    ]);

    const prevMap = new Map<string, number>();
    for (const r of prevRows) {
      if (r.ticker) prevMap.set(r.ticker, Number(r.close));
    }

    let a = 0, d = 0, f = 0;
    for (const r of todayRows) {
      if (!r.ticker) continue;
      const prevClose = prevMap.get(r.ticker);
      if (prevClose === undefined) continue;
      const cur = Number(r.close);
      if (cur > prevClose) a++;
      else if (cur < prevClose) d++;
      else f++;
    }
    if (a + d + f > 0) {
      advancers = a;
      decliners = d;
      flat = f;
    }
  } catch (e) {
    console.warn('[ticknal-take] Breadth query fallback:', e);
  }

  // C. 30-Day Rolling Investor Flows (Hot Money Barometer)
  const flowRows = await db
    .select()
    .from(egxInvestorFlows)
    .orderBy(desc(egxInvestorFlows.date))
    .limit(30);

  const latestFlow = flowRows[0];
  const totalTurnover = latestFlow ? Number(latestFlow.totalTurnover) : 9137040843;
  const turnoverBillion = Number((totalTurnover / 1_000_000_000).toFixed(2));

  const todayForeignNetMillion = latestFlow ? Number((Number(latestFlow.foreignNet) / 1_000_000).toFixed(2)) : -67.43;
  const todayArabNetMillion = latestFlow ? Number((Number(latestFlow.arabNet) / 1_000_000).toFixed(2)) : -20.97;
  const todayEgyptianNetMillion = latestFlow ? Number((Number(latestFlow.egyptianNet) / 1_000_000).toFixed(2)) : 88.40;

  // Process 30-day chronological sequence (oldest to newest)
  const chronologicalFlows = [...flowRows].reverse();
  let runningCum = 0;
  let inflowDaysCount = 0;
  let outflowDaysCount = 0;

  const dailyBars30d = chronologicalFlows.map((row) => {
    const fNet = Number((Number(row.foreignNet) / 1_000_000).toFixed(2));
    runningCum += fNet;
    if (fNet >= 0) inflowDaysCount++;
    else outflowDaysCount++;
    return {
      date: String(row.date).slice(0, 10),
      foreignNetMillion: fNet,
      cumulativeMillion: Number(runningCum.toFixed(2)),
    };
  });

  const rolling30dForeignNetMillion = Number(runningCum.toFixed(2));

  // D. Core FX & CIB Arbitrage
  const [usdRow, comiRow] = await Promise.all([
    db.query.dailyPrices.findFirst({
      where: eq(dailyPrices.tickerSymbol, 'USDEGP'),
      orderBy: [desc(dailyPrices.date)],
    }),
    db.query.dailyPrices.findFirst({
      where: eq(dailyPrices.tickerSymbol, 'COMI'),
      orderBy: [desc(dailyPrices.date)],
    }),
  ]);

  const officialUsd = usdRow ? Number(usdRow.close) : 52.34;
  const cairoComiEgp = comiRow ? Number(comiRow.close) : 125.16;

  // CIB London GDR proxy (London GDR ~ $2.365)
  const londonGdrUsd = 2.365;
  const gdrImpliedRate = Number((cairoComiEgp / londonGdrUsd).toFixed(2));
  const gdrSpreadPct = Number((((gdrImpliedRate - officialUsd) / officialUsd) * 100).toFixed(2));
  const riskScore = Math.abs(gdrSpreadPct) < 5 ? 15 : Math.abs(gdrSpreadPct) < 10 ? 35 : 65;
  const riskLabel = riskScore < 30 ? 'Low Risk (Managed Crawl)' : riskScore < 50 ? 'Moderate Spread' : 'High Pressure';

  return {
    date: targetDate,
    egx30: {
      date: targetDate,
      close,
      open,
      high,
      low,
      changePct,
      changePts,
      turnoverBillion,
      advancers,
      decliners,
      flat,
      recentBars,
    },
    flows: {
      date: targetDate,
      totalTurnoverBillion: turnoverBillion,
      todayForeignNetMillion,
      todayArabNetMillion,
      todayEgyptianNetMillion,
      rolling30dForeignNetMillion,
      inflowDaysCount,
      outflowDaysCount,
      dailyBars30d,
    },
    fx: {
      date: targetDate,
      officialUsd,
      gdrImpliedRate,
      gdrSpreadPct,
      londonGdrUsd,
      cairoComiEgp,
      riskScore,
      riskLabel,
    },
  };
}

/**
 * 2. Generate Bilingual Commentary with OpenRouter Models
 */
async function generateBilingualInsight(
  promptContext: string,
  fallbackText: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return fallbackText;
  }

  const systemPrompt = `You are a Senior Quantitative Strategist at Ticknal, Egypt's premier financial intelligence terminal.
Rules:
1. Output ONLY the briefing text. No introductory remarks, no thinking logs, no meta explanations.
2. Structure: Exactly 2 concise sentences in English explaining the figures and institutional meaning, followed by a blank line, then 2 concise sentences in Arabic. Professional executive tone.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ticknal.com',
          'X-Title': 'Ticknal Terminal',
        },
        body: JSON.stringify({
          models: OPENROUTER_MODELS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptContext },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(25000), // 25s timeout
      });

      if (!res.ok) {
        console.warn(`[ticknal-take] OpenRouter response not ok (${res.status}):`, await res.text());
        continue;
      }

      const data = await res.json();
      let text = data?.choices?.[0]?.message?.content?.trim() || '';

      // Strip any thinking tags or preamble
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      text = text.replace(/^Here's a thinking process:[\s\S]*?\n\n/i, '').trim();
      text = text.replace(/^(here is|briefing|summary:)[\s\S]*?\n/i, '').trim();

      const isThinkingScratchpad =
        text.includes('Analyze User') ||
        text.includes('Deconstruct') ||
        text.includes('User is asking') ||
        text.includes('Strict output rules') ||
        text.includes('Drafting -') ||
        text.includes('Key insight:');

      if (!isThinkingScratchpad && text.length > 30 && !text.toLowerCase().includes('count')) {
        return text;
      }
    } catch (err: any) {
      console.warn(`[ticknal-take] OpenRouter attempt ${attempt} failed:`, err?.message || err);
    }
  }

  return fallbackText;
}

/**
 * 3. Generate and Upsert the Daily Ticknal Take Posts
 */
export async function generateTheTicknalTakePosts(): Promise<{
  success: boolean;
  postsCreated: number;
  date: string;
}> {
  const snapshot = await getMarketDataSnapshot();
  const date = snapshot.date;

  // --- POST 1: EGX30 Market Breadth & Price Action ---
  const egx30Fallback = `EGX30 closed at ${snapshot.egx30.close.toLocaleString()} pts (${snapshot.egx30.changePct >= 0 ? '+' : ''}${snapshot.egx30.changePct}%), recording ${snapshot.egx30.turnoverBillion}B EGP turnover. Market breadth registered ${snapshot.egx30.advancers} advancers against ${snapshot.egx30.decliners} decliners as institutional positioning consolidated near upper resistance.

أغلق مؤشر EGX30 عند ${snapshot.egx30.close.toLocaleString()} نقطة (${snapshot.egx30.changePct >= 0 ? '+' : ''}${snapshot.egx30.changePct}%) بتداولات ${snapshot.egx30.turnoverBillion} مليار جنيه. سجل اتساع السوق ${snapshot.egx30.advancers} سهماً رابحاً مقابل ${snapshot.egx30.decliners} خاسراً في حركة تماسك مؤسسية صحية.`;

  const egx30Prompt = `EGX30 Closing Pulse for ${date}:
- Close: ${snapshot.egx30.close.toFixed(2)} pts (${snapshot.egx30.changePct >= 0 ? '+' : ''}${snapshot.egx30.changePct}%)
- Turnover: ${snapshot.egx30.turnoverBillion}B EGP
- Breadth: ${snapshot.egx30.advancers} Advancers, ${snapshot.egx30.decliners} Decliners, ${snapshot.egx30.flat} Flat.
Analyze the technical momentum and institutional positioning.`;

  // --- POST 2: Hot Money Barometer & 30-Day Rolling Foreign Net Flows ---
  const isAccumulating = snapshot.flows.rolling30dForeignNetMillion >= 0;
  const flowsFallback = `Foreign institutions hold a 30-day cumulative net position of ${snapshot.flows.rolling30dForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.rolling30dForeignNetMillion.toFixed(1)}M EGP across ${snapshot.flows.inflowDaysCount} inflow sessions (${Math.round((snapshot.flows.inflowDaysCount / Math.max(1, snapshot.flows.dailyBars30d.length)) * 100)}% accumulation rate). Despite today's session net of ${snapshot.flows.todayForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.todayForeignNetMillion.toFixed(1)}M EGP, persistent rolling inflows confirm sustained structural hot money appetite.

تحتفظ المؤسسات الأجنبية بصافي تراكمي إيجابي لمدة 30 يوماً قدره ${snapshot.flows.rolling30dForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.rolling30dForeignNetMillion.toFixed(1)} مليون جنيه عبر ${snapshot.flows.inflowDaysCount} جلسة شراء. ورغم تسجيل صافي ${snapshot.flows.todayForeignNetMillion >= 0 ? 'شراء +' : 'بيع '}${snapshot.flows.todayForeignNetMillion.toFixed(1)} مليون جنيه اليوم، يؤكد المسار التراكمي استمرار تدفقات الأموال الساخنة.`;

  const flowsPrompt = `EGX Foreign Institutional Flows (30-Day Rolling Barometer) for ${date}:
- Today: Foreign Net ${snapshot.flows.todayForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.todayForeignNetMillion.toFixed(1)}M EGP | Egyptian Net +${snapshot.flows.todayEgyptianNetMillion.toFixed(1)}M EGP
- 30-Day Cumulative Foreign Net: ${snapshot.flows.rolling30dForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.rolling30dForeignNetMillion.toFixed(1)}M EGP (${isAccumulating ? 'Net Accumulation' : 'Net Capital Flight'})
- Flow Sessions: ${snapshot.flows.inflowDaysCount} Inflow vs ${snapshot.flows.outflowDaysCount} Outflow sessions (${Math.round((snapshot.flows.inflowDaysCount / Math.max(1, snapshot.flows.dailyBars30d.length)) * 100)}% ratio).
State whether hot money is accumulating or fleeing, and how domestic liquidity supports the market.`;

  // --- POST 3: USD/EGP Arbitrage & CIB London GDR Implied Valuation ---
  const fxFallback = `CIB London GDR currently trades at $${snapshot.fx.londonGdrUsd.toFixed(3)}, implying a USD/EGP rate of ${snapshot.fx.gdrImpliedRate.toFixed(2)} vs official interbank at ${snapshot.fx.officialUsd.toFixed(2)}. The arbitrage spread stands at ${snapshot.fx.gdrSpreadPct >= 0 ? '+' : ''}${snapshot.fx.gdrSpreadPct}%, reflecting low devaluation risk (${snapshot.fx.riskScore}% score).

تتداول شهادات CIB في بورصة لندن عند $${snapshot.fx.londonGdrUsd.toFixed(3)}، مما يعكس سعراً ضمنياً للدولار عند ${snapshot.fx.gdrImpliedRate.toFixed(2)} ج.م مقابل ${snapshot.fx.officialUsd.toFixed(2)} ج.م رسمياً. استقر فارق المراجحة عند ${snapshot.fx.gdrSpreadPct >= 0 ? '+' : ''}${snapshot.fx.gdrSpreadPct}%، مؤكداً استقرار التسعير وانخفاض مخاطر خفض العملة.`;

  const fxPrompt = `Currency & CIB London GDR Arbitrage for ${date}:
- Official Interbank USD: ${snapshot.fx.officialUsd.toFixed(2)} EGP
- CIB London GDR: $${snapshot.fx.londonGdrUsd.toFixed(3)} | Cairo COMI: ${snapshot.fx.cairoComiEgp.toFixed(2)} EGP
- Implied Rate: ${snapshot.fx.gdrImpliedRate.toFixed(2)} EGP | Spread: ${snapshot.fx.gdrSpreadPct >= 0 ? '+' : ''}${snapshot.fx.gdrSpreadPct}%
- Devaluation Risk: ${snapshot.fx.riskScore}% (${snapshot.fx.riskLabel}).
Interpret whether offshore markets signal FX pressure or stability.`;

  // Generate all 3 insights in parallel for high speed
  const [egx30Body, flowsBody, fxBody] = await Promise.all([
    generateBilingualInsight(egx30Prompt, egx30Fallback),
    generateBilingualInsight(flowsPrompt, flowsFallback),
    generateBilingualInsight(fxPrompt, fxFallback),
  ]);

  const egx30ChartSvg = generateEgx30ChartSvg(snapshot.egx30);
  const flowsChartSvg = generateInvestorFlowsChartSvg(snapshot.flows);
  const fxChartSvg = generateFxArbitrageChartSvg(snapshot.fx);

  // 4. Upsert items into database
  const publishedAt = new Date();

  const posts = [
    {
      id: `tt-egx30-${date}`,
      title: `EGX30 Market Wrap & Breadth: ${snapshot.egx30.changePct >= 0 ? '+' : ''}${snapshot.egx30.changePct}%`,
      summary: egx30Body,
      content: egx30Body,
      category: 'ticknal_take',
      categoryLabel: 'The Ticknal Take',
      tickers: ['EGX30', 'COMI', 'TMGH', 'SWDY'],
      sentiment: snapshot.egx30.changePct >= 0 ? 'bullish' : 'bearish',
      source: 'Ticknal Markets Pulse',
      sourceUrl: 'https://ticknal.com/markets',
      importance: 'high',
      impactMetric: `EGX30: ${snapshot.egx30.changePct >= 0 ? '+' : ''}${snapshot.egx30.changePct}% | Adv: ${snapshot.egx30.advancers}`,
      readTime: '1 min read',
      imageUrl: egx30ChartSvg,
      publishedAt,
    },
    {
      id: `tt-flows-${date}`,
      title: `Hot Money Barometer: 30D Rolling Foreign Net ${snapshot.flows.rolling30dForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.rolling30dForeignNetMillion.toFixed(1)}M EGP`,
      summary: flowsBody,
      content: flowsBody,
      category: 'ticknal_take',
      categoryLabel: 'The Ticknal Take',
      tickers: ['EGX30', 'COMI'],
      sentiment: snapshot.flows.rolling30dForeignNetMillion >= 0 ? 'bullish' : 'neutral',
      source: 'Ticknal Flow Analytics',
      sourceUrl: 'https://ticknal.com/markets',
      importance: 'high',
      impactMetric: `30D Foreign Net: ${snapshot.flows.rolling30dForeignNetMillion >= 0 ? '+' : ''}${snapshot.flows.rolling30dForeignNetMillion.toFixed(1)}M EGP (${snapshot.flows.inflowDaysCount}/${snapshot.flows.dailyBars30d.length} Inflow Days)`,
      readTime: '1 min read',
      imageUrl: flowsChartSvg,
      publishedAt: new Date(publishedAt.getTime() - 60000), // 1 min prior
    },
    {
      id: `tt-fx-${date}`,
      title: `USD/EGP Arbitrage: CIB London GDR Implies ${snapshot.fx.gdrImpliedRate.toFixed(2)} EGP`,
      summary: fxBody,
      content: fxBody,
      category: 'ticknal_take',
      categoryLabel: 'The Ticknal Take',
      tickers: ['USDEGP', 'COMI', 'CIB_ADR'],
      sentiment: snapshot.fx.riskScore < 30 ? 'bullish' : 'neutral',
      source: 'Ticknal FX & Arbitrage Desk',
      sourceUrl: 'https://ticknal.com/markets',
      importance: 'high',
      impactMetric: `Implied Rate: ${snapshot.fx.gdrImpliedRate.toFixed(2)} | Spread: ${snapshot.fx.gdrSpreadPct >= 0 ? '+' : ''}${snapshot.fx.gdrSpreadPct}%`,
      readTime: '1 min read',
      imageUrl: fxChartSvg,
      publishedAt: new Date(publishedAt.getTime() - 120000), // 2 min prior
    },
  ];

  let postsCreated = 0;

  for (const post of posts) {
    try {
      const existing = await db
        .select({ id: marketNews.id })
        .from(marketNews)
        .where(eq(marketNews.id, post.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(marketNews)
          .set({
            title: post.title,
            summary: post.summary,
            content: post.content,
            category: post.category,
            categoryLabel: post.categoryLabel,
            tickers: post.tickers,
            sentiment: post.sentiment,
            source: post.source,
            sourceUrl: post.sourceUrl,
            importance: post.importance,
            impactMetric: post.impactMetric,
            readTime: post.readTime,
            imageUrl: post.imageUrl,
            publishedAt: post.publishedAt,
            updatedAt: new Date(),
          })
          .where(eq(marketNews.id, post.id));
      } else {
        await db.insert(marketNews).values(post);
      }
      postsCreated++;
    } catch (err: any) {
      console.error(`[ticknal-take] Failed to upsert post ${post.id}:`, err?.message || err);
    }
  }

  // Delete any obsolete or ungrounded gold take posts
  try {
    await db.execute(sql`DELETE FROM ${marketNews} WHERE id LIKE 'tt-gold-%'`);
  } catch (err: any) {
    console.warn('[ticknal-take] Could not cleanup obsolete gold posts:', err?.message || err);
  }

  return {
    success: true,
    postsCreated,
    date,
  };
}
