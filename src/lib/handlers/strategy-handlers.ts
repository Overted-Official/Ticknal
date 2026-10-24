import { NextResponse } from 'next/server';
import { getCachedDailyPrices, getCachedHourlyPrices } from '@/lib/data-cache';
import { resolvePsiParamsAsync } from '@/strategies/Typhon/typhonParameterStore';
import {
  normalizeTickerSymbol,
  type PriceBar,
} from '@/strategies/Typhon/typhonStrategy';
import { runFullStrategyBacktest } from '@/strategies/Typhon/typhonBacktestEngine';
import { runFullPsiV2Backtest } from '@/strategies/Cerberus';
import { runFullHydraBacktest } from '@/strategies/Hydra';
import { derivePositionLevels, getDailyPriceBars } from '@/lib/strategyOrders';
import { createClient } from '@/lib/supabase/server';
import { analyzeStrategy, analyzeTickerChampion, type StrategyId } from '@/lib/strategy-analysis';
import { normalizeStrategyId } from '@/strategies/registry';
import { requireProprietaryAccess, getCurrentProprietaryAccess } from '@/lib/server/proprietary-strategy-access';
import { db } from '@/db';
import { userStrategies } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { compileSavedStrategy } from '@/lib/strategies/server/compile-saved-strategy';
import { runSimpleBacktestForSymbol } from '@/lib/strategies/server/run-simple-backtest-for-symbol';
import { runKronosPrediction } from '@/tools/kronos/run-kronos-prediction';

const STRATEGY_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store',
};

export async function handleSignalsGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStrategy = searchParams.get('strategy') || '';
    const isCustom = rawStrategy.startsWith('custom-');

    if (!isCustom) {
      const denied = await requireProprietaryAccess();
      if (denied) return denied;
    }

    const symbol = searchParams.get('symbol');
    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';
    const startDate = searchParams.get('start') ?? searchParams.get('startDate') ?? (is1H ? undefined : '2025-01-01');
    const endDate = searchParams.get('end') ?? searchParams.get('endDate') ?? undefined;

    if (isCustom) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const [savedRow] = await db.select()
        .from(userStrategies)
        .where(and(eq(userStrategies.userId, user.id), eq(userStrategies.id, rawStrategy)))
        .limit(1);
      if (!savedRow) return NextResponse.json({ error: 'Custom strategy not found' }, { status: 404 });
      const compiled = compileSavedStrategy(savedRow.definition as any);
      if (compiled.status !== 'ready') return NextResponse.json({ error: compiled.message }, { status: 400 });
      const backtest = await runSimpleBacktestForSymbol(
        ticker,
        compiled.program,
        { initialCapital: 1000, feeBps: 10 },
        { startDate: startDate || '2025-01-01', endDate: endDate || '2099-12-31' }
      );
      if (backtest.status !== 'ok') return NextResponse.json({ error: 'Backtest failed' }, { status: 400 });
      const sig = backtest.latestSignal;
      return NextResponse.json({
        signal: sig?.signal ?? 'NEUTRAL',
        price: sig?.price ?? null,
        entryReason: sig?.reason ?? 'Custom strategy signal',
        exitReason: sig?.signal === 'SELL' ? sig.reason : null,
        stopLoss: null,
        targetPrice: null,
        masterIndex: null,
        medianDailyMove: null,
      }, { headers: STRATEGY_CACHE_HEADERS });
    }

    // Proprietary strategy signal
    const access = await getCurrentProprietaryAccess();
    // Non-staff with proprietary access (e.g. Alia / Abdelaziz) always gets Champion Strategy (cerberus)
    const strategy: StrategyId = !access.isOwner ? 'cerberus' : normalizeStrategyId(rawStrategy);

    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    const effectiveStartDate = startDate ?? (is1H ? (bars[0]?.date || '2020-01-01') : '2025-01-01');
    const strategyParams: Record<string, unknown> = {};
    if (searchParams.has('model')) strategyParams.model = searchParams.get('model');
    if (searchParams.has('useAym')) strategyParams.useAym = searchParams.get('useAym') === 'true';
    if (searchParams.has('aymMultiplier')) strategyParams.aymMultiplier = Number(searchParams.get('aymMultiplier'));
    if (searchParams.has('aymLimit')) strategyParams.aymLimit = Number(searchParams.get('aymLimit'));
    if (searchParams.has('useAtr')) strategyParams.useAtr = searchParams.get('useAtr') === 'true';
    if (searchParams.has('atrDistance')) strategyParams.atrDistance = Number(searchParams.get('atrDistance'));
    if (searchParams.has('entryLevels')) strategyParams.entryLevels = searchParams.get('entryLevels')?.split(',').map(Number);

    const analysis = await analyzeStrategy(ticker, bars, strategy, {
      startDate: effectiveStartDate,
      endDate,
      timeframe,
      strategyParams,
      lookbackBars: Number(searchParams.get('lookbackBars') || 5),
    });

    const raw = (analysis.rawResult && typeof analysis.rawResult === 'object')
      ? analysis.rawResult as Record<string, unknown>
      : {};

    const latestSignal = analysis.latestActionableSignal
      ? {
          ...analysis.latestActionableSignal,
          ...(analysis.latestActionableSignal.signal === 'BUY'
            ? { entryReason: analysis.latestActionableSignal.reason }
            : { exitReason: analysis.latestActionableSignal.reason }),
        }
      : null;

    return NextResponse.json({
      ...raw,
      signals: analysis.signalEvents,
      latestSignal,
      latestActionableSignal: analysis.latestActionableSignal,
      signalAgeBars: analysis.signalAgeBars,
      analysisStart: analysis.analysisStart,
      analysisEnd: analysis.analysisEnd,
      dataAsOf: analysis.dataAsOf,
      strategyId: analysis.strategyId,
      parameterVersion: analysis.parameterVersion,
      parameterSource: analysis.parameterVersion,
      formattedMetrics: analysis.formattedMetrics,
      canonicalMetrics: analysis.metrics,
      trades: analysis.trades,
      equityCurve: analysis.equityCurve,
    }, {
      headers: STRATEGY_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error calculating signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Resolves the best-fit strategy for one ticker. This is intentionally backed
 * by the same canonical analyser as chart markers and notification routing.
 */
export async function handleStrategyChampionGet(request: Request) {
  try {
    const denied = await requireProprietaryAccess();
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);
    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length === 0) {
      return NextResponse.json({ error: 'No price history found' }, { status: 404 });
    }

    const champion = await analyzeTickerChampion(ticker, bars, {
      startDate: searchParams.get('start') || (is1H ? bars[0]?.date : '2025-01-01'),
      endDate: searchParams.get('end') || undefined,
      timeframe,
    });

    return NextResponse.json({
      symbol: ticker,
      strategy: champion.strategyId,
      strategyId: champion.strategyId,
      strategyName: champion.strategyName,
      alpha: champion.alpha,
      hasPositiveAlpha: champion.hasPositiveAlpha,
    }, { headers: STRATEGY_CACHE_HEADERS });
  } catch (error) {
    console.error('Error resolving ticker strategy champion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleMetricsGet(request: Request) {
  try {
    const denied = await requireProprietaryAccess();
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const strategyId: StrategyId = normalizeStrategyId(searchParams.get('strategy'));
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const startDate = searchParams.get('start') ?? (is1H ? undefined : '2025-01-01');
    const endDate = searchParams.get('end') ?? undefined;

    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 30) {
      return NextResponse.json({ error: 'Insufficient price history' }, { status: 404 });
    }

    const effectiveStartDate = startDate ?? (is1H ? (bars[0]?.date || '2020-01-01') : '2025-01-01');
    const strategyParams: Record<string, unknown> = {};
    if (searchParams.has('model')) strategyParams.model = searchParams.get('model');
    if (searchParams.has('useAym')) strategyParams.useAym = searchParams.get('useAym') === 'true';
    if (searchParams.has('aymMultiplier')) strategyParams.aymMultiplier = Number(searchParams.get('aymMultiplier'));
    if (searchParams.has('aymLimit')) strategyParams.aymLimit = Number(searchParams.get('aymLimit'));
    if (searchParams.has('useAtr')) strategyParams.useAtr = searchParams.get('useAtr') === 'true';
    if (searchParams.has('atrDistance')) strategyParams.atrDistance = Number(searchParams.get('atrDistance'));
    if (searchParams.has('entryLevels')) strategyParams.entryLevels = searchParams.get('entryLevels')?.split(',').map(Number);

    const analysis = await analyzeStrategy(ticker, bars, strategyId, {
      startDate: effectiveStartDate,
      endDate,
      timeframe,
      strategyParams,
      lookbackBars: Number(searchParams.get('lookbackBars') || 5),
    });

    return NextResponse.json({
      symbol: ticker,
      strategyId: analysis.strategyId,
      startDate: analysis.analysisStart,
      endDate: analysis.analysisEnd,
      dataAsOf: analysis.dataAsOf,
      parameterSource: analysis.parameterVersion,
      metrics: analysis.formattedMetrics,
      canonicalMetrics: analysis.metrics,
    }, {
      headers: STRATEGY_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleLevelsGet(request: Request) {
  try {
  const denied = await requireProprietaryAccess();
  if (denied) return denied;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');
  const entryPrice = Number(searchParams.get('entryPrice'));

  if (!symbol || !date || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    return NextResponse.json({ error: 'symbol, date, and entryPrice are required' }, { status: 400 });
  }

    const ticker = normalizeTickerSymbol(symbol);
    const bars = await getDailyPriceBars(ticker);
    if (bars.length === 0) {
      return NextResponse.json({ error: 'No price history found' }, { status: 404 });
    }

    const paramRes = await resolvePsiParamsAsync(ticker);
    const levels = derivePositionLevels(ticker, bars, date, entryPrice, paramRes.params);
    return NextResponse.json({
      symbol: ticker,
      entryDate: date,
      entryPrice,
      ...formatLevels(levels),
    });
  } catch (error) {
    console.error('Error deriving strategy levels:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function formatLevels<T extends { targetPrice: number | null; stopPrice: number | null }>(levels: T): T {
  return {
    ...levels,
    targetPrice: levels.targetPrice === null ? null : Number(levels.targetPrice.toFixed(4)),
    stopPrice: levels.stopPrice === null ? null : Number(levels.stopPrice.toFixed(4)),
  };
}

function addCanonicalReportContext(report: any, analysis: Awaited<ReturnType<typeof analyzeStrategy>>) {
  const canonical = analysis.metrics;
  const stats = {
    ...report.stats,
    startDate: analysis.analysisStart,
    endDate: analysis.analysisEnd,
    ...(canonical.totalReturn !== null ? {
      netProfitPct: canonical.totalReturn,
      finalEquity: report.stats.initialCapital * (1 + canonical.totalReturn / 100),
      netProfit: report.stats.initialCapital * (canonical.totalReturn / 100),
    } : {}),
    ...(canonical.buyHoldReturn !== null ? {
      buyHoldReturnPct: canonical.buyHoldReturn,
      buyHoldReturn: report.stats.initialCapital * (canonical.buyHoldReturn / 100),
    } : {}),
    ...(canonical.alpha !== null ? { alphaMargin: canonical.alpha } : {}),
    ...(canonical.maxDrawdown !== null ? { maxDrawdown: canonical.maxDrawdown } : {}),
    ...(canonical.avgBarsPerTrade !== null ? { avgBarsHeld: canonical.avgBarsPerTrade } : {}),
    ...(canonical.winRate !== null ? { winRate: canonical.winRate } : {}),
    ...(canonical.trades !== null ? { totalTrades: canonical.trades } : {}),
    ...(canonical.annualCagr !== null ? { annualCagr: canonical.annualCagr } : {}),
  };

  return {
    ...report,
    stats,
    signals: analysis.signalEvents,
    canonicalMetrics: canonical,
    analysisStart: analysis.analysisStart,
    analysisEnd: analysis.analysisEnd,
    dataAsOf: analysis.dataAsOf,
    strategyId: analysis.strategyId,
    parameterVersion: analysis.parameterVersion,
  };
}

export async function handleReportGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStrategy = searchParams.get('strategy') || '';
    const isCustom = rawStrategy.startsWith('custom-');

    if (!isCustom) {
      const denied = await requireProprietaryAccess();
      if (denied) return denied;
    }

    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';
    const startDate = searchParams.get('start') ?? (is1H ? undefined : '2025-01-01');
    const endDate = searchParams.get('end') ?? undefined;
    const initialCapital = searchParams.get('initialCapital') ? Number(searchParams.get('initialCapital')) : 1000;

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 30) {
      return NextResponse.json({ error: 'Insufficient price history' }, { status: 404 });
    }

    if (isCustom) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const [savedRow] = await db.select()
        .from(userStrategies)
        .where(and(eq(userStrategies.userId, user.id), eq(userStrategies.id, rawStrategy)))
        .limit(1);
      if (!savedRow) return NextResponse.json({ error: 'Custom strategy not found' }, { status: 404 });
      const compiled = compileSavedStrategy(savedRow.definition as any);
      if (compiled.status !== 'ready') return NextResponse.json({ error: compiled.message }, { status: 400 });
      const backtestResult = await runSimpleBacktestForSymbol(
        ticker,
        compiled.program,
        { initialCapital, feeBps: 10 },
        { startDate: startDate || '2025-01-01', endDate: endDate || '2099-12-31' }
      );
      if (backtestResult.status !== 'ok') {
        return NextResponse.json({ error: 'Failed to run backtest for custom strategy' }, { status: 400 });
      }

      const trades = backtestResult.trades.map((t, idx) => {
        const pnlPct = t.returnPct;
        const pnl = initialCapital * (pnlPct / 100);
        return {
          id: idx + 1,
          date: String(t.exitTime ?? t.entryTime),
          entryDate: String(t.entryTime),
          exitDate: t.exitTime ? String(t.exitTime) : undefined,
          type: 'BUY' as const,
          price: t.entryPrice,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice ?? undefined,
          size: 1,
          pnl,
          pnlPct,
          returnPct: t.returnPct,
          exitReason: 'Rule Signal',
          durationBars: 0,
          mae: t.maePct,
          mfe: t.mfePct,
        };
      });

      const equityCurve = backtestResult.equity.map((pt) => ({
        time: String(pt.time),
        value: pt.value,
      }));

      const firstBar = bars[0];
      const lastBar = bars[bars.length - 1];
      const buyHoldReturnPct = firstBar && lastBar ? ((lastBar.close - firstBar.close) / firstBar.close) * 100 : 0;
      const netProfitPct = backtestResult.metrics.totalReturnPct;
      const finalEquity = equityCurve[equityCurve.length - 1]?.value ?? initialCapital;
      const netProfit = finalEquity - initialCapital;
      const alphaMargin = netProfitPct - buyHoldReturnPct;
      const winningTrades = trades.filter((t) => t.pnl > 0).length;
      const losingTrades = trades.filter((t) => t.pnl < 0).length;
      const grossProfit = trades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
      const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
      const winRate = backtestResult.metrics.winRatePct ?? (trades.length > 0 ? (winningTrades / trades.length) * 100 : 0);
      const avgTradePnl = trades.length > 0 ? netProfit / trades.length : 0;
      const avgTradeReturnPct = trades.length > 0 ? trades.reduce((acc, t) => acc + t.returnPct, 0) / trades.length : 0;
      const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
      const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
      const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

      const report = {
        trades,
        equityCurve,
        signals: backtestResult.latestSignal ? [backtestResult.latestSignal] : [],
        stats: {
          initialCapital,
          finalEquity,
          netProfit,
          netProfitPct,
          buyHoldReturn: initialCapital * (buyHoldReturnPct / 100),
          buyHoldReturnPct,
          alphaMargin,
          maxDrawdown: backtestResult.metrics.maxDrawdownPct,
          maxDrawdownAmount: initialCapital * (backtestResult.metrics.maxDrawdownPct / 100),
          totalTrades: backtestResult.metrics.closedTrades,
          winningTrades,
          losingTrades,
          winRate,
          profitFactor,
          grossProfit,
          grossLoss,
          avgTradePnl,
          avgTradeReturnPct,
          avgWin,
          avgLoss,
          winLossRatio,
          maxConsecutiveWins: 0,
          maxConsecutiveLosses: 0,
          avgBarsHeld: trades.length > 0 ? trades.reduce((acc, t) => acc + t.durationBars, 0) / trades.length : 0,
        },
      };

      return NextResponse.json(report, { headers: STRATEGY_CACHE_HEADERS });
    }

    // Proprietary strategy report
    const access = await getCurrentProprietaryAccess();
    // Non-staff with proprietary access (e.g. Alia / Abdelaziz) always gets Champion Strategy (cerberus)
    const strategy: StrategyId = !access.isOwner ? 'cerberus' : normalizeStrategyId(rawStrategy);
    const requestedModel = searchParams.get('model');
    const model = !access.isOwner ? 'cerberus' : (requestedModel || (strategy === 'hydra' ? 'hydra' : strategy === 'cerberus' ? 'cerberus' : 'canonical'));

    let report: any;
    let strategyId: StrategyId = 'typhon';
    let strategyParams: Record<string, unknown> = {};

    if (strategy === 'hydra' || model === 'hydra') {
      strategyId = 'hydra';
      report = runFullHydraBacktest(bars, {
        ticker,
        startDate,
        endDate,
        initialCapital,
        timeframe,
      });
    } else if (strategy === 'cerberus' || model === 'cerberus' || model === 'psi_v2') {
      strategyId = 'cerberus';
      const psiV2Overrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
        initialCapital,
        timeframe,
      };

      report = runFullPsiV2Backtest(bars, psiV2Overrides);
    } else {
      const psiModel = model === 'psi8' || model === 'psi40' ? model : undefined;
      const parameterResolution = await resolvePsiParamsAsync(ticker, {
        ...(psiModel ? { model: psiModel } : {}),
        initialCapital,
        startDate,
        endDate,
      }, timeframe);
      strategyId = 'typhon';
      strategyParams = { ...(psiModel ? { model: psiModel } : {}), ...parameterResolution.params };
      report = runFullStrategyBacktest(bars, parameterResolution.params);
    }

    const analysis = await analyzeStrategy(ticker, bars, strategyId, {
      startDate: startDate || '2025-01-01',
      endDate,
      timeframe,
      strategyParams,
    });
    return NextResponse.json(addCanonicalReportContext(report, analysis), {
      headers: STRATEGY_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error generating strategy report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handlePredictPost(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      history,
      predictDays,
      sampleCount: rawSampleCount,
      temperature: rawTemperature,
      symbol: rawSymbol,
    } = body;

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid history data.' }, { status: 400 });
    }

    const nDays = predictDays ? parseInt(predictDays, 10) : 10;
    const sampleCount = Math.max(1, Math.min(Number(rawSampleCount) || 1, 5));
    const temperature = Math.max(0.2, Math.min(Number(rawTemperature) || 0.6, 1.2));
    const lastBar = history[history.length - 1];
    const lastRowTime = lastBar?.time || 'unknown';

    // Build deterministic daily cache key
    const ticker = typeof rawSymbol === 'string' && rawSymbol.trim()
      ? rawSymbol.trim().toUpperCase().replace('.CA', '')
      : null;
    const identifier = ticker || `HIST_${history.length}_${history[0]?.time}_${lastBar?.close}`;
    const customCacheKey = `${identifier}:${lastRowTime}:${nDays}:${sampleCount}:${temperature.toFixed(2)}`;

    const { result, cacheStatus } = await runKronosPrediction(history, nDays, {
      sampleCount,
      temperature,
      customCacheKey,
    });

    return NextResponse.json(result, {
      headers: {
        'X-Ticknal-Cache': cacheStatus,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error during prediction:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
