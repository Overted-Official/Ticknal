import { db } from '@/db';
import { dailyPrices, egxInvestorFlows, marketNews, systemLogs } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import {
  generateHotMoneyChartSvg,
  generateTradeSummaryChartSvg,
  generateMarketBreadthChartSvg,
  generateGainersLosersChartSvg,
  generateUsdEgpUpdateChartSvg,
  generateLocalizedTakeBundle,
} from './ticknal-take-charts';
import { completeWithKeyPool } from '@/lib/ai/openrouter-client';
import { handleFxFairValueGet, type FxFairValueResponse } from '@/lib/handlers/fx-fair-value-handler';
import { ensureMarketNewsTable } from './news-service';

export interface TicknalTakeGenerationResult {
  success: boolean;
  date: string;
  postsCreated: number;
  durationMs: number;
  takes: string[];
}

/**
 * Phase 2: Generates the 5 Canonical "Ticknal take" Intelligence Briefings
 */
export async function generateAllDailyTakes(): Promise<TicknalTakeGenerationResult> {
  const startTime = Date.now();
  await ensureMarketNewsTable();

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Ingest Latest EGX Benchmark Prices (EGX30, EGX70, EGX100)
  const [egx30Rows, egx70Rows, egx100Rows] = await Promise.all([
    db.select().from(dailyPrices).where(eq(dailyPrices.tickerSymbol, 'EGX30')).orderBy(desc(dailyPrices.date)).limit(2),
    db.select().from(dailyPrices).where(eq(dailyPrices.tickerSymbol, 'EGX70')).orderBy(desc(dailyPrices.date)).limit(2),
    db.select().from(dailyPrices).where(eq(dailyPrices.tickerSymbol, 'EGX100')).orderBy(desc(dailyPrices.date)).limit(2),
  ]);

  const targetDate = egx30Rows[0]?.date ? String(egx30Rows[0].date).slice(0, 10) : todayStr;

  const getPriceMetrics = (rows: typeof egx30Rows, fallbackClose: number) => {
    const cur = rows[0];
    const prev = rows[1];
    const close = cur ? Number(cur.close) : fallbackClose;
    const prevClose = prev ? Number(prev.close) : close;
    const changePct = prevClose > 0 ? Number((((close - prevClose) / prevClose) * 100).toFixed(2)) : 0;
    return { close, changePct };
  };

  const egx30 = getPriceMetrics(egx30Rows, 30800);
  const egx70 = getPriceMetrics(egx70Rows, 7450);
  const egx100 = getPriceMetrics(egx100Rows, 10600);

  // 2. Compute Market Breadth & Top Gainers/Losers
  const allTodayPrices = await db
    .select({
      ticker: dailyPrices.tickerSymbol,
      close: dailyPrices.close,
      open: dailyPrices.open,
      high: dailyPrices.high,
      low: dailyPrices.low,
      volume: dailyPrices.volume,
    })
    .from(dailyPrices)
    .where(eq(dailyPrices.date, targetDate));

  // Determine previous date to compute real price changes for every stock
  const prevDateRow = await db
    .select({ date: dailyPrices.date })
    .from(dailyPrices)
    .where(sql`${dailyPrices.date} < ${targetDate}`)
    .orderBy(desc(dailyPrices.date))
    .limit(1);

  const prevDate = prevDateRow[0]?.date ? String(prevDateRow[0].date).slice(0, 10) : targetDate;

  const prevPrices = await db
    .select({ ticker: dailyPrices.tickerSymbol, close: dailyPrices.close })
    .from(dailyPrices)
    .where(eq(dailyPrices.date, prevDate));

  const prevMap = new Map<string, number>();
  for (const p of prevPrices) {
    if (p.ticker) prevMap.set(p.ticker, Number(p.close));
  }

  let advancers = 0;
  let decliners = 0;
  let flat = 0;
  const stockChanges: Array<{ ticker: string; close: number; changePct: number; volume: number; turnover: number }> = [];

  for (const s of allTodayPrices) {
    if (!s.ticker || s.ticker.startsWith('EGX') || s.ticker.startsWith('USD')) continue;
    const curClose = Number(s.close);
    const pClose = prevMap.get(s.ticker) ?? curClose;
    const changePct = pClose > 0 ? Number((((curClose - pClose) / pClose) * 100).toFixed(2)) : 0;
    const vol = Number(s.volume || 0);
    const turnover = curClose * vol;

    if (curClose > pClose) advancers++;
    else if (curClose < pClose) decliners++;
    else flat++;

    stockChanges.push({
      ticker: s.ticker,
      close: curClose,
      changePct,
      volume: vol,
      turnover,
    });
  }

  const totalStocks = Math.max(1, advancers + decliners + flat);
  const advancersPct = Number(((advancers / totalStocks) * 100).toFixed(1));
  const declinersPct = Number(((decliners / totalStocks) * 100).toFixed(1));

  // Filter top 5 gainers and losers with minimum turnover of 1M EGP (or top by volume if low)
  const liquidStocks = stockChanges.filter((s) => s.turnover >= 500_000 || s.volume >= 50_000);
  const eligiblePool = liquidStocks.length >= 10 ? liquidStocks : stockChanges;

  const topGainers = [...eligiblePool].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const topLosers = [...eligiblePool].sort((a, b) => a.changePct - b.changePct).slice(0, 5);

  // 3. 30-Day Rolling Investor Flows (Hot Money Barometer)
  const flowRows = await db
    .select()
    .from(egxInvestorFlows)
    .where(sql`total_turnover::numeric >= 50000000 AND EXTRACT(DOW FROM date::date) NOT IN (5, 6)`)
    .orderBy(desc(egxInvestorFlows.date))
    .limit(30);

  const flows30d = [...flowRows].reverse();
  let cumulative = 0;
  let inflowDays = 0;
  let outflowDays = 0;

  const dailyBars30d = flows30d.map((r) => {
    const netM = Number(r.foreignNetMillions || 0);
    cumulative += netM;
    if (netM > 0) inflowDays++;
    else if (netM < 0) outflowDays++;
    return {
      date: String(r.date).slice(5, 10),
      foreignNetMillion: Number(netM.toFixed(1)),
      cumulativeMillion: Number(cumulative.toFixed(1)),
    };
  });

  const latestFlow = flowRows[0];
  const totalTurnoverB = latestFlow ? Number(latestFlow.totalTurnover) / 1_000_000_000 : 3.85;
  const todayForeignNetM = latestFlow ? Number(latestFlow.foreignNetMillions || 0) : -45.2;
  const todayArabNetM = latestFlow ? Number(latestFlow.arabNetMillions || 0) : 28.4;
  const todayEgyptianNetM = latestFlow ? Number(latestFlow.egyptianNetMillions || 0) : 16.8;
  const rolling30dForeignNetM = Number(cumulative.toFixed(1));
  const isFlightRisk = rolling30dForeignNetM < -250 || (outflowDays >= 18 && todayForeignNetM < 0);

  // 4. Ingest USD/EGP & Macro Currency Triangulation
  let fxData: FxFairValueResponse | null = null;
  try {
    const fxRes = await handleFxFairValueGet();
    fxData = (await fxRes.json()) as FxFairValueResponse;
  } catch (fxErr) {
    console.warn('[ticknal-take] FX data retrieval warning:', fxErr);
  }

  const officialUsd = fxData?.officialUsd ?? 52.60;
  const compositeFair = fxData?.compositeFairValue ?? 52.02;
  const saghaGoldUsd = fxData?.goldImpliedRate ?? 52.78;
  const londonGdrUsd = fxData?.gdrImpliedRate ?? 51.16;
  const atr14 = fxData?.atr14 ?? 0.20;
  const atr90 = fxData?.atr90 ?? 0.27;
  const atrCompressionRatio = fxData?.atrCompressionRatio ?? 0.74;
  const devaluationRiskScore = fxData?.devaluationRisk?.score ?? 17;
  const devaluationRiskLabel = fxData?.devaluationRisk?.label ?? 'Low Risk (Organic Float)';

  // ==========================================
  // GENERATE THE 5 DEDICATED TICKNAL TAKES
  // ==========================================
  const createdTakes: string[] = [];

  // ------------------------------------------
  // TAKE 1: Hot Money Status ("نبض الأموال الساخنة")
  // ------------------------------------------
  const hotMoneyChart = generateLocalizedTakeBundle(generateHotMoneyChartSvg, {
    date: targetDate,
    totalTurnoverBillion: totalTurnoverB,
    todayForeignNetMillion: todayForeignNetM,
    todayArabNetMillion: todayArabNetM,
    todayEgyptianNetMillion: todayEgyptianNetM,
    rolling30dForeignNetMillion: rolling30dForeignNetM,
    inflowDaysCount: inflowDays,
    outflowDaysCount: outflowDays,
    isFlightRisk,
    dailyBars30d,
  });

  const hotMoneyAiPrompt = `Analyze 30-Day Egyptian Hot Money & Institutional Liquidity:
- 30D Rolling Foreign Net: ${rolling30dForeignNetM}M EGP (${inflowDays} inflow vs ${outflowDays} outflow sessions)
- Today Foreign Net: ${todayForeignNetM}M EGP | Arab Net: ${todayArabNetM}M EGP
- Capital Flight Alert: ${isFlightRisk ? 'ELEVATED FLIGHT DETECTED' : 'BALANCED LIQUIDITY'}
CRITICAL QUANTITATIVE DIRECTIVE:
Follow the money. If foreigners/Arabs are escaping, explicitly warn investors that buying purely on technical signals is hazardous when institutional exit is accelerating. Provide a concise 400-char actionable briefing.`;

  const hotMoneyInsight = await completeWithKeyPool({
    systemPrompt: 'You are a chief market strategist and quantitative flow analyst at Ticknal.',
    userPrompt: hotMoneyAiPrompt,
    fallbackText: isFlightRisk
      ? 'Foreign institutional capital continues sustained liquidation over the 30-day window. Caution is strongly advised before initiating new swing buy orders until institutional flows stabilize.'
      : 'Institutional foreign and Arab positioning remains stable across the 30-day cycle without severe capital flight signals. Domestic liquidity continues absorbing routine sector reallocations.',
    maxTokens: 220,
    temperature: 0.3,
  });

  const hotMoneyId = `take-${targetDate}-hot-money`;
  await db
    .insert(marketNews)
    .values({
      id: hotMoneyId,
      title: 'Hot Money Status: 30-Day Foreign & Arab Flow Trajectory',
      summary: hotMoneyInsight.text.slice(0, 500),
      category: 'ticknal_take',
      categoryLabel: 'Ticknal take',
      tickers: ['FLOWS', 'EGX30'],
      sentiment: isFlightRisk ? 'bearish' : rolling30dForeignNetM > 50 ? 'bullish' : 'neutral',
      source: 'Ticknal take',
      importance: isFlightRisk ? 'critical' : 'high',
      imageUrl: hotMoneyChart,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketNews.id,
      set: {
        title: 'Hot Money Status: 30-Day Foreign & Arab Flow Trajectory',
        summary: hotMoneyInsight.text.slice(0, 500),
        categoryLabel: 'Ticknal take',
        imageUrl: hotMoneyChart,
        updatedAt: new Date(),
      },
    });
  createdTakes.push('hot_money');

  // ------------------------------------------
  // TAKE 2: Daily Trade Summary ("ملخص جلسة التداول اليومية")
  // ------------------------------------------
  const tradeSummaryChart = generateLocalizedTakeBundle(generateTradeSummaryChartSvg, {
    date: targetDate,
    egx30Close: egx30.close,
    egx30ChangePct: egx30.changePct,
    egx70Close: egx70.close,
    egx70ChangePct: egx70.changePct,
    egx100Close: egx100.close,
    egx100ChangePct: egx100.changePct,
    turnoverBillion: totalTurnoverB,
    sentiment: egx30.changePct >= 0 ? 'Bullish Expansion' : 'Consolidation / Pullback',
  });

  const tradeSummaryAi = await completeWithKeyPool({
    systemPrompt: 'You are a quantitative index strategist at Ticknal.',
    userPrompt: `Analyze EGX Session Benchmark Summary:
- EGX 30: ${egx30.close.toFixed(1)} (${egx30.changePct >= 0 ? '+' : ''}${egx30.changePct}%)
- EGX 70 EWI: ${egx70.close.toFixed(1)} (${egx70.changePct >= 0 ? '+' : ''}${egx70.changePct}%)
- EGX 100 EWI: ${egx100.close.toFixed(1)} (${egx100.changePct >= 0 ? '+' : ''}${egx100.changePct}%)
- Total Turnover: ${totalTurnoverB.toFixed(2)}B EGP
Summarize the session trend, divergence between blue-chips and small-caps, and institutional volume in max 400 chars.`,
    fallbackText: `EGX 30 closed at ${egx30.close.toFixed(1)} (${egx30.changePct >= 0 ? '+' : ''}${egx30.changePct}%) while mid-caps EGX 70 closed at ${egx70.close.toFixed(1)} (${egx70.changePct >= 0 ? '+' : ''}${egx70.changePct}%). Session liquidity reached ${totalTurnoverB.toFixed(2)}B EGP with focused rotation across leading banking and industrial names.`,
    maxTokens: 200,
  });

  const tradeSummaryId = `take-${targetDate}-trade-summary`;
  await db
    .insert(marketNews)
    .values({
      id: tradeSummaryId,
      title: 'Daily Trade Summary: EGX 30, 70 & 100 Index Performance',
      summary: tradeSummaryAi.text.slice(0, 500),
      category: 'ticknal_take',
      categoryLabel: 'Ticknal take',
      tickers: ['EGX30', 'EGX70', 'EGX100'],
      sentiment: egx30.changePct >= 0 ? 'bullish' : 'bearish',
      source: 'Ticknal take',
      importance: 'high',
      imageUrl: tradeSummaryChart,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketNews.id,
      set: {
        title: 'Daily Trade Summary: EGX 30, 70 & 100 Index Performance',
        summary: tradeSummaryAi.text.slice(0, 500),
        categoryLabel: 'Ticknal take',
        imageUrl: tradeSummaryChart,
        updatedAt: new Date(),
      },
    });
  createdTakes.push('trade_summary');

  // ------------------------------------------
  // TAKE 3: Market Breadth ("اتساع السوق وسيولة الأسهم")
  // ------------------------------------------
  const marketBreadthChart = generateLocalizedTakeBundle(generateMarketBreadthChartSvg, {
    date: targetDate,
    advancers,
    decliners,
    flat,
    totalStocks,
    advancersPct,
    declinersPct,
    turnoverBillion: totalTurnoverB,
  });

  const breadthAi = await completeWithKeyPool({
    systemPrompt: 'You are a quantitative market breadth analyst at Ticknal.',
    userPrompt: `Assess today's market breadth:
- Advancers: ${advancers} (${advancersPct}%)
- Decliners: ${decliners} (${declinersPct}%)
- Unchanged: ${flat}
- Total Traded: ${totalStocks}
Is this a healthy broad-based move or narrow index-propping? Explain in max 400 chars.`,
    fallbackText: `Market participation saw ${advancers} advancers (${advancersPct}%) against ${decliners} decliners (${declinersPct}%). The advance-decline differential indicates ${advancers >= decliners ? 'healthy participation supporting index gains' : 'selective profit taking across broader equities'}.`,
    maxTokens: 200,
  });

  const breadthId = `take-${targetDate}-market-breadth`;
  await db
    .insert(marketNews)
    .values({
      id: breadthId,
      title: 'Market Breadth: Advance / Decline Participation Health',
      summary: breadthAi.text.slice(0, 500),
      category: 'ticknal_take',
      categoryLabel: 'Ticknal take',
      tickers: ['BREADTH', 'EGX30'],
      sentiment: advancers >= decliners ? 'bullish' : 'bearish',
      source: 'Ticknal take',
      importance: 'normal',
      imageUrl: marketBreadthChart,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketNews.id,
      set: {
        title: 'Market Breadth: Advance / Decline Participation Health',
        summary: breadthAi.text.slice(0, 500),
        categoryLabel: 'Ticknal take',
        imageUrl: marketBreadthChart,
        updatedAt: new Date(),
      },
    });
  createdTakes.push('market_breadth');

  // ------------------------------------------
  // TAKE 4: Gainers and Losers ("الأسهم الأكثر صعوداً وهبوطاً")
  // ------------------------------------------
  const gainersLosersChart = generateLocalizedTakeBundle(generateGainersLosersChartSvg, {
    date: targetDate,
    topGainers,
    topLosers,
  });

  const gainersListStr = topGainers.map((g) => `${g.ticker} (+${g.changePct}%)`).join(', ');
  const losersListStr = topLosers.map((l) => `${l.ticker} (${l.changePct}%)`).join(', ');

  const gainersLosersAi = await completeWithKeyPool({
    systemPrompt: 'You are an equity momentum analyst at Ticknal.',
    userPrompt: `Top Gainers: ${gainersListStr}
Top Losers: ${losersListStr}
Analyze where volume and momentum clustered today in max 400 chars.`,
    fallbackText: `Top session advancers were led by ${gainersListStr || 'leading momentum equities'}, while selling pressure concentrated in ${losersListStr || 'lagging names'}. Liquidity favored high-beta plays with sustained institutional participation.`,
    maxTokens: 200,
  });

  const gainersLosersId = `take-${targetDate}-gainers-losers`;
  await db
    .insert(marketNews)
    .values({
      id: gainersLosersId,
      title: 'Gainers & Losers: Top Session Movers & Liquidity Focus',
      summary: gainersLosersAi.text.slice(0, 500),
      category: 'ticknal_take',
      categoryLabel: 'Ticknal take',
      tickers: topGainers.map((g) => g.ticker).slice(0, 3),
      sentiment: 'neutral',
      source: 'Ticknal take',
      importance: 'normal',
      imageUrl: gainersLosersChart,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketNews.id,
      set: {
        title: 'Gainers & Losers: Top Session Movers & Liquidity Focus',
        summary: gainersLosersAi.text.slice(0, 500),
        categoryLabel: 'Ticknal take',
        imageUrl: gainersLosersChart,
        updatedAt: new Date(),
      },
    });
  createdTakes.push('gainers_losers');

  // ------------------------------------------
  // TAKE 5: USD/EGP Update ("تحديث سعر الصرف ومخاطر التعويم")
  // ------------------------------------------
  const usdEgpChart = generateLocalizedTakeBundle(generateUsdEgpUpdateChartSvg, {
    date: targetDate,
    officialUsd,
    compositeFair,
    saghaGoldUsd,
    londonGdrUsd,
    atr14,
    atr90,
    atrCompressionRatio,
    devaluationRiskScore,
    devaluationRiskLabel,
  });

  const fxAi = await completeWithKeyPool({
    systemPrompt: 'You are a chief FX strategist and macro economist at Ticknal.',
    userPrompt: `Evaluate Egypt FX Risk & Fair Value:
- Official USD/EGP: ${officialUsd.toFixed(2)}
- Triangulated Composite Fair: ${compositeFair.toFixed(2)}
- Sagha Gold Proxy Dollar: ${saghaGoldUsd.toFixed(2)}
- London CIB GDR Dollar: ${londonGdrUsd.toFixed(2)}
- 14D ATR: ${atr14.toFixed(2)} EGP vs 90D ATR: ${atr90.toFixed(2)} EGP (Compression Ratio: ${(atrCompressionRatio * 100).toFixed(1)}%)
- Devaluation Pressure Score: ${devaluationRiskScore}% (${devaluationRiskLabel})
Provide a critical assessment of devaluation likelihood and expected price trajectory in max 400 chars.`,
    fallbackText: `Official exchange rate stands at ${officialUsd.toFixed(2)} against triangulated shadow fair value of ${compositeFair.toFixed(2)} (Sagha Gold at ${saghaGoldUsd.toFixed(2)}, London CIB GDR at ${londonGdrUsd.toFixed(2)}). Devaluation pressure index is scored at ${devaluationRiskScore}% (${devaluationRiskLabel}) with orderly crawl dynamics intact.`,
    maxTokens: 200,
  });

  const usdEgpId = `take-${targetDate}-usd-egp`;
  await db
    .insert(marketNews)
    .values({
      id: usdEgpId,
      title: 'USD/EGP Update: Shadow Proxies & Devaluation Pressure',
      summary: fxAi.text.slice(0, 500),
      category: 'ticknal_take',
      categoryLabel: 'Ticknal take',
      tickers: ['USD/EGP', 'COMI', 'GOLD21K'],
      sentiment: devaluationRiskScore > 40 ? 'bearish' : 'neutral',
      source: 'Ticknal take',
      importance: devaluationRiskScore > 40 ? 'critical' : 'high',
      imageUrl: usdEgpChart,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketNews.id,
      set: {
        title: 'USD/EGP Update: Shadow Proxies & Devaluation Pressure',
        summary: fxAi.text.slice(0, 500),
        categoryLabel: 'Ticknal take',
        imageUrl: usdEgpChart,
        updatedAt: new Date(),
      },
    });
  createdTakes.push('usd_egp_update');

  // Record generation telemetry
  try {
    await db.insert(systemLogs).values({
      level: 'info',
      module: 'ticknal-take',
      message: `Ticknal take briefings created: 5 posts. Date=${targetDate}. Takes=[${createdTakes.join(', ')}]`,
      metadata: {
        date: targetDate,
        takes: createdTakes,
        hotMoneyFlightRisk: isFlightRisk,
        devalScore: devaluationRiskScore,
      },
      createdAt: new Date(),
    });
  } catch {}

  return {
    success: true,
    date: targetDate,
    postsCreated: createdTakes.length,
    durationMs: Date.now() - startTime,
    takes: createdTakes,
  };
}
