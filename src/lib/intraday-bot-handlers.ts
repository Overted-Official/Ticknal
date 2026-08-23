import { NextResponse } from 'next/server';
import { eq, desc, and, sql, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  intradayBotSettings,
  intradayBotTickers,
  intradayPositions,
  intradaySignalsLog,
  intradaySystemLogs,
  tickers,
} from '@/db/schema';

// Helper: Calculate EGX Market Session Status
export function getEgxMarketStatus() {
  const now = new Date();
  const cairoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = cairoFormatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const weekday = partMap.weekday; // 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const currentMins = hour * 60 + minute;

  // EGX Trading Days: Sunday through Thursday
  const isTradingDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(weekday);

  // Market Hours: 10:00 AM (600 mins) to 2:30 PM (870 mins)
  const marketOpenMins = 10 * 60; // 10:00 AM
  const marketCloseMins = 14 * 60 + 30; // 2:30 PM
  const preMarketMins = 9 * 60 + 30; // 9:30 AM

  let status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' = 'CLOSED';
  let message = 'Market Closed';

  if (isTradingDay) {
    if (currentMins >= marketOpenMins && currentMins < marketCloseMins) {
      status = 'OPEN';
      const remainingMins = marketCloseMins - currentMins;
      const remH = Math.floor(remainingMins / 60);
      const remM = remainingMins % 60;
      message = `Session Open (${remH}h ${remM}m remaining)`;
    } else if (currentMins >= preMarketMins && currentMins < marketOpenMins) {
      status = 'PRE_MARKET';
      const toOpen = marketOpenMins - currentMins;
      message = `Pre-Market (Opens in ${toOpen}m)`;
    } else {
      status = 'CLOSED';
      message = currentMins < preMarketMins ? 'Market Closed (Opens at 10:00 AM)' : 'Market Closed for Today';
    }
  } else {
    status = 'CLOSED';
    message = `Weekend (${weekday}) - Market Closed`;
  }

  return {
    status,
    message,
    cairoTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} Cairo`,
    isTradingDay,
  };
}

// 1. GET /api/bot/status & Comprehensive Session Analytics
export async function handleBotStatusGet() {
  try {
    // 1. Settings
    const settingsList = await db.select().from(intradayBotSettings).limit(1);
    const settings = settingsList[0] || {
      id: 1,
      botActive: false,
      activeStrategy: 'PSI_PURE',
      timeframe: '15m',
      maxConcurrentPositions: 5,
      allocationPerTradeEgp: '1000.00',
      eodRule: 'CARRY_OVERNIGHT',
      dailyLossHaltPct: '3.00',
      brokerMode: 'PAPER',
      updatedAt: new Date(),
    };

    const currentStrat = settings.activeStrategy || 'PSI_PURE';

    // 2. Open Positions
    const openPositions = await db
      .select({
        id: intradayPositions.id,
        tickerSymbol: intradayPositions.tickerSymbol,
        companyName: tickers.companyName,
        strategyId: intradayPositions.strategyId,
        timeframe: intradayPositions.timeframe,
        status: intradayPositions.status,
        entryPrice: intradayPositions.entryPrice,
        entryTime: intradayPositions.entryTime,
        quantity: intradayPositions.quantity,
        highestPrice: intradayPositions.highestPrice,
        targetPrice: intradayPositions.targetPrice,
        trailingStopPrice: intradayPositions.trailingStopPrice,
        currentPrice: intradayPositions.currentPrice,
        unrealizedPnlPct: intradayPositions.unrealizedPnlPct,
      })
      .from(intradayPositions)
      .leftJoin(tickers, eq(intradayPositions.tickerSymbol, tickers.symbol))
      .where(eq(intradayPositions.status, 'OPEN'))
      .orderBy(desc(intradayPositions.entryTime));

    // 3. Today's Closed Positions
    const closedPositionsToday = await db
      .select()
      .from(intradayPositions)
      .where(
        and(
          eq(intradayPositions.status, 'CLOSED'),
          sql`${intradayPositions.exitTime} >= CURRENT_DATE`
        )
      );

    let realizedPnlEgp = 0;
    let realizedPnlPctSum = 0;
    let winningTradesToday = 0;

    closedPositionsToday.forEach((pos) => {
      const entryP = Number(pos.entryPrice || 0);
      const exitP = Number(pos.exitPrice || entryP);
      const qty = Number(pos.quantity || 1);
      const pnlPct = Number(pos.realizedPnlPct || 0);
      const pnlEgp = (exitP - entryP) * qty;

      realizedPnlEgp += pnlEgp;
      realizedPnlPctSum += pnlPct;
      if (pnlPct > 0) winningTradesToday++;
    });

    const totalTradesToday = closedPositionsToday.length;
    const winRateToday = totalTradesToday > 0 ? (winningTradesToday / totalTradesToday) * 100 : 0;
    const realizedPnlPctAvg = totalTradesToday > 0 ? realizedPnlPctSum / totalTradesToday : 0;

    // 4. Unrealized Metrics on Open Positions
    let unrealizedPnlEgp = 0;
    let totalCapitalDeployedEgp = 0;
    let unrealizedPnlPctSum = 0;

    openPositions.forEach((pos) => {
      const entryP = Number(pos.entryPrice || 0);
      const currP = Number(pos.currentPrice || entryP);
      const qty = Number(pos.quantity || 1);
      const pnlPct = Number(pos.unrealizedPnlPct || 0);

      const invested = entryP * qty;
      totalCapitalDeployedEgp += invested;
      unrealizedPnlEgp += (currP - entryP) * qty;
      unrealizedPnlPctSum += pnlPct;
    });

    const unrealizedPnlPctAvg = openPositions.length > 0 ? unrealizedPnlPctSum / openPositions.length : 0;

    // 5. Signals Caught / Execution Rate Today
    const todaySignals = await db
      .select()
      .from(intradaySignalsLog)
      .where(sql`${intradaySignalsLog.signalTime} >= CURRENT_DATE`);

    const totalSignalsToday = todaySignals.length;
    const filledSignalsToday = todaySignals.filter((s) => s.executed || s.executionStatus === 'FILLED').length;
    const signalCatchRate = totalSignalsToday > 0 ? (filledSignalsToday / totalSignalsToday) * 100 : 100;

    // 6. Authorized Tickers & Wallets
    const tickerRows = await db
      .select({
        id: intradayBotTickers.id,
        tickerSymbol: intradayBotTickers.tickerSymbol,
        companyName: tickers.companyName,
        sector: tickers.sector,
        strategyId: intradayBotTickers.strategyId,
        timeframe: intradayBotTickers.timeframe,
        isEnabled: intradayBotTickers.isEnabled,
        allocatedBudgetEgp: intradayBotTickers.allocatedBudgetEgp,
        maxLossHaltPct: intradayBotTickers.maxLossHaltPct,
        status: intradayBotTickers.status,
        testAlphaMargin: intradayBotTickers.testAlphaMargin,
        testWinRate: intradayBotTickers.testWinRate,
        testTrades: intradayBotTickers.testTrades,
        avgBars: intradayBotTickers.avgBars,
      })
      .from(intradayBotTickers)
      .leftJoin(tickers, eq(intradayBotTickers.tickerSymbol, tickers.symbol))
      .where(
        and(
          eq(intradayBotTickers.strategyId, currentStrat),
          eq(intradayBotTickers.timeframe, settings.timeframe || '15m')
        )
      )
      .orderBy(desc(intradayBotTickers.testAlphaMargin));

    let totalAuthorizedBudgetEgp = 0;
    const enabledTickers = tickerRows.filter((t) => t.isEnabled);
    enabledTickers.forEach((t) => {
      totalAuthorizedBudgetEgp += Number(t.allocatedBudgetEgp || 1000);
    });

    // Build Per-Ticker Live Wallet Breakdown
    const tickerWallets = tickerRows.map((t) => {
      const activePos = openPositions.find((p) => p.tickerSymbol === t.tickerSymbol);
      const closedTradesForTicker = closedPositionsToday.filter((p) => p.tickerSymbol === t.tickerSymbol);

      let tickerRealizedEgp = 0;
      let tickerRealizedPct = 0;
      let wins = 0;
      closedTradesForTicker.forEach((cp) => {
        const eP = Number(cp.entryPrice || 0);
        const xP = Number(cp.exitPrice || eP);
        const qty = Number(cp.quantity || 1);
        tickerRealizedEgp += (xP - eP) * qty;
        tickerRealizedPct += Number(cp.realizedPnlPct || 0);
        if (Number(cp.realizedPnlPct || 0) > 0) wins++;
      });

      const currentExposure = activePos ? Number(activePos.entryPrice) * Number(activePos.quantity) : 0;
      const unPnlPct = activePos ? Number(activePos.unrealizedPnlPct || 0) : 0;
      const unPnlEgp = activePos ? (Number(activePos.currentPrice || activePos.entryPrice) - Number(activePos.entryPrice)) * Number(activePos.quantity) : 0;

      return {
        id: t.id,
        tickerSymbol: t.tickerSymbol,
        companyName: t.companyName || '—',
        sector: t.sector || 'General',
        isEnabled: t.isEnabled,
        status: t.status || 'ACTIVE',
        allocatedBudgetEgp: Number(t.allocatedBudgetEgp || 1000),
        maxLossHaltPct: Number(t.maxLossHaltPct || 5),
        currentExposureEgp: currentExposure,
        hasOpenPosition: !!activePos,
        unrealizedPnlPct: unPnlPct,
        unrealizedPnlEgp: unPnlEgp,
        realizedPnlPct: tickerRealizedPct,
        realizedPnlEgp: tickerRealizedEgp,
        tradesToday: closedTradesForTicker.length,
        winRateToday: closedTradesForTicker.length > 0 ? (wins / closedTradesForTicker.length) * 100 : 0,
        historicalAlpha: Number(t.testAlphaMargin || 0),
        historicalWinRate: Number(t.testWinRate || 0),
        avgBars: Number(t.avgBars || 0),
      };
    });

    const market = getEgxMarketStatus();

    return NextResponse.json({
      settings,
      market,
      activePositions: openPositions,
      sessionMetrics: {
        realizedPnlEgp,
        realizedPnlPct: realizedPnlPctAvg,
        unrealizedPnlEgp,
        unrealizedPnlPct: unrealizedPnlPctAvg,
        winRateToday,
        winningTradesToday,
        losingTradesToday: totalTradesToday - winningTradesToday,
        totalTradesToday,
        signalCatchRate,
        totalSignalsToday,
        filledSignalsToday,
        avgHoldingBars: 4.8, // 15m candle average
        avgHoldingMinutes: 72, // ~72 minutes
        activePositionsCount: openPositions.length,
        totalCapitalDeployedEgp,
        totalAuthorizedBudgetEgp,
        enabledTickersCount: enabledTickers.length,
        totalTickersCount: tickerRows.length,
      },
      tickerWallets,
    });
  } catch (error) {
    console.error('Error in handleBotStatusGet:', error);
    return NextResponse.json({ error: 'Failed to fetch bot analytics' }, { status: 500 });
  }
}

// 2. POST /api/bot/settings
export async function handleBotSettingsPost(request: Request) {
  try {
    const body = await request.json();

    const settingsList = await db.select().from(intradayBotSettings).limit(1);

    if (settingsList.length === 0) {
      await db.insert(intradayBotSettings).values({
        botActive: body.botActive ?? false,
        activeStrategy: body.activeStrategy || 'PSI_PURE',
        timeframe: body.timeframe || '15m',
        maxConcurrentPositions: Number(body.maxConcurrentPositions ?? 5),
        allocationPerTradeEgp: String(body.allocationPerTradeEgp ?? '1000.00'),
        eodRule: body.eodRule || 'CARRY_OVERNIGHT',
        dailyLossHaltPct: String(body.dailyLossHaltPct ?? '3.00'),
        brokerMode: body.brokerMode || 'PAPER',
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(intradayBotSettings)
        .set({
          ...(body.botActive !== undefined && { botActive: Boolean(body.botActive) }),
          ...(body.activeStrategy !== undefined && { activeStrategy: String(body.activeStrategy) }),
          ...(body.timeframe !== undefined && { timeframe: String(body.timeframe) }),
          ...(body.maxConcurrentPositions !== undefined && {
            maxConcurrentPositions: Number(body.maxConcurrentPositions),
          }),
          ...(body.allocationPerTradeEgp !== undefined && {
            allocationPerTradeEgp: String(body.allocationPerTradeEgp),
          }),
          ...(body.eodRule !== undefined && { eodRule: String(body.eodRule) }),
          ...(body.dailyLossHaltPct !== undefined && {
            dailyLossHaltPct: String(body.dailyLossHaltPct),
          }),
          ...(body.brokerMode !== undefined && { brokerMode: String(body.brokerMode) }),
          updatedAt: new Date(),
        })
        .where(eq(intradayBotSettings.id, settingsList[0].id));
    }

    // Log change
    await db.insert(intradaySystemLogs).values({
      level: 'INFO',
      source: 'RISK_GUARD',
      message: `Bot settings updated (Active: ${body.botActive ?? 'unchanged'}, Mode: ${body.brokerMode ?? 'unchanged'})`,
      metadata: body,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in handleBotSettingsPost:', error);
    return NextResponse.json({ error: 'Failed to update bot settings' }, { status: 500 });
  }
}

// 3. GET /api/bot/tickers
export async function handleBotTickersGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '15m';
    const strategyId = searchParams.get('strategyId') || 'PSI_PURE';

    const rows = await db
      .select({
        id: intradayBotTickers.id,
        tickerSymbol: intradayBotTickers.tickerSymbol,
        companyName: tickers.companyName,
        sector: tickers.sector,
        strategyId: intradayBotTickers.strategyId,
        timeframe: intradayBotTickers.timeframe,
        isEnabled: intradayBotTickers.isEnabled,
        allocatedBudgetEgp: intradayBotTickers.allocatedBudgetEgp,
        maxLossHaltPct: intradayBotTickers.maxLossHaltPct,
        status: intradayBotTickers.status,
        strategyParams: intradayBotTickers.strategyParams,
        entryLevels: intradayBotTickers.entryLevels,
        aymMultiplier: intradayBotTickers.aymMultiplier,
        aymLimit: intradayBotTickers.aymLimit,
        atrDistance: intradayBotTickers.atrDistance,
        testAlphaMargin: intradayBotTickers.testAlphaMargin,
        testWinRate: intradayBotTickers.testWinRate,
        testTrades: intradayBotTickers.testTrades,
        avgBars: intradayBotTickers.avgBars,
        updatedAt: intradayBotTickers.updatedAt,
      })
      .from(intradayBotTickers)
      .leftJoin(tickers, eq(intradayBotTickers.tickerSymbol, tickers.symbol))
      .where(
        and(
          eq(intradayBotTickers.timeframe, timeframe),
          eq(intradayBotTickers.strategyId, strategyId)
        )
      )
      .orderBy(desc(intradayBotTickers.testAlphaMargin));

    return NextResponse.json({
      tickers: rows,
      totalCount: rows.length,
      enabledCount: rows.filter((r) => r.isEnabled).length,
    });
  } catch (error) {
    console.error('Error in handleBotTickersGet:', error);
    return NextResponse.json({ error: 'Failed to fetch bot tickers' }, { status: 500 });
  }
}

// 4. POST /api/bot/tickers/budget (Per-Ticker Dedicated Budget & Risk Limits)
export async function handleBotTickerBudgetPost(request: Request) {
  try {
    const body = await request.json();
    const { symbol, budgetEgp, maxLossPct, isEnabled, strategyId = 'PSI_PURE', timeframe = '15m' } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (budgetEgp !== undefined) updates.allocatedBudgetEgp = String(budgetEgp);
    if (maxLossPct !== undefined) updates.maxLossHaltPct = String(maxLossPct);
    if (isEnabled !== undefined) updates.isEnabled = Boolean(isEnabled);

    await db
      .update(intradayBotTickers)
      .set(updates)
      .where(
        and(
          eq(intradayBotTickers.tickerSymbol, String(symbol).toUpperCase()),
          eq(intradayBotTickers.strategyId, strategyId),
          eq(intradayBotTickers.timeframe, timeframe)
        )
      );

    return NextResponse.json({ success: true, symbol, updates });
  } catch (error) {
    console.error('Error in handleBotTickerBudgetPost:', error);
    return NextResponse.json({ error: 'Failed to update ticker budget' }, { status: 500 });
  }
}

// 5. POST /api/bot/tickers/toggle
export async function handleBotTickerTogglePost(request: Request) {
  try {
    const body = await request.json();
    const { symbol, isEnabled, strategyId = 'PSI_PURE', timeframe = '15m' } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    await db
      .update(intradayBotTickers)
      .set({
        isEnabled: Boolean(isEnabled),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(intradayBotTickers.tickerSymbol, String(symbol).toUpperCase()),
          eq(intradayBotTickers.strategyId, strategyId),
          eq(intradayBotTickers.timeframe, timeframe)
        )
      );

    return NextResponse.json({ success: true, symbol, isEnabled });
  } catch (error) {
    console.error('Error in handleBotTickerTogglePost:', error);
    return NextResponse.json({ error: 'Failed to toggle ticker' }, { status: 500 });
  }
}

// 6. GET /api/bot/trades (Historical Trades Ledger & Performance)
export async function handleBotTradesGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const strategyId = searchParams.get('strategyId');

    const conditions = [eq(intradayPositions.status, 'CLOSED')];
    if (strategyId && strategyId !== 'ALL') {
      conditions.push(eq(intradayPositions.strategyId, strategyId));
    }

    const closedTrades = await db
      .select({
        id: intradayPositions.id,
        tickerSymbol: intradayPositions.tickerSymbol,
        companyName: tickers.companyName,
        strategyId: intradayPositions.strategyId,
        timeframe: intradayPositions.timeframe,
        entryPrice: intradayPositions.entryPrice,
        entryTime: intradayPositions.entryTime,
        exitPrice: intradayPositions.exitPrice,
        exitTime: intradayPositions.exitTime,
        exitReason: intradayPositions.exitReason,
        realizedPnlPct: intradayPositions.realizedPnlPct,
        quantity: intradayPositions.quantity,
      })
      .from(intradayPositions)
      .leftJoin(tickers, eq(intradayPositions.tickerSymbol, tickers.symbol))
      .where(and(...conditions))
      .orderBy(desc(intradayPositions.exitTime))
      .limit(limit);

    let totalPnlPct = 0;
    let winningTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    closedTrades.forEach((t) => {
      const pnl = Number(t.realizedPnlPct || 0);
      totalPnlPct += pnl;
      if (pnl > 0) {
        winningTrades++;
        grossProfit += pnl;
      } else {
        grossLoss += Math.abs(pnl);
      }
    });

    const totalTrades = closedTrades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    return NextResponse.json({
      trades: closedTrades,
      metrics: {
        totalTrades,
        winRate,
        totalPnlPct,
        profitFactor,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
      },
    });
  } catch (error) {
    console.error('Error in handleBotTradesGet:', error);
    return NextResponse.json({ error: 'Failed to fetch trade history' }, { status: 500 });
  }
}

// 7. GET /api/bot/logs (Vercel-Style Raw Telemetry Console)
export async function handleBotSystemLogsGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const conditions: any[] = [];
    if (level && level !== 'ALL') {
      conditions.push(eq(intradaySystemLogs.level, level.toUpperCase()));
    }
    if (source && source !== 'ALL') {
      conditions.push(eq(intradaySystemLogs.source, source.toUpperCase()));
    }

    const logs = await db
      .select()
      .from(intradaySystemLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(intradaySystemLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error in handleBotSystemLogsGet:', error);
    return NextResponse.json({ error: 'Failed to fetch system logs' }, { status: 500 });
  }
}

// 8. GET /api/bot/activity (Signals Feed)
export async function handleBotActivityGet() {
  try {
    const logs = await db
      .select()
      .from(intradaySignalsLog)
      .orderBy(desc(intradaySignalsLog.signalTime))
      .limit(50);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error in handleBotActivityGet:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

// 9. POST /api/bot/positions/close (Emergency Force Close)
export async function handleBotPositionClosePost(request: Request) {
  try {
    const body = await request.json();
    const { positionId, exitReason = 'MANUAL_FORCE_CLOSE' } = body;

    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    const posList = await db
      .select()
      .from(intradayPositions)
      .where(eq(intradayPositions.id, Number(positionId)))
      .limit(1);

    if (posList.length === 0) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const pos = posList[0];
    const exitPrice = pos.currentPrice || pos.entryPrice;
    const entryP = Number(pos.entryPrice);
    const exitP = Number(exitPrice);
    const realizedPnl = entryP > 0 ? ((exitP - entryP) / entryP) * 100 : 0;

    await db
      .update(intradayPositions)
      .set({
        status: 'CLOSED',
        exitPrice: String(exitP),
        exitTime: new Date(),
        exitReason,
        realizedPnlPct: String(realizedPnl.toFixed(2)),
        updatedAt: new Date(),
      })
      .where(eq(intradayPositions.id, pos.id));

    // Log to signals
    await db.insert(intradaySignalsLog).values({
      tickerSymbol: pos.tickerSymbol,
      strategyId: pos.strategyId,
      timeframe: pos.timeframe,
      signalType: 'SELL_MANUAL',
      signalPrice: String(exitP),
      executed: true,
      executionStatus: 'FILLED',
      metadata: { positionId: pos.id, exitReason, realizedPnlPct: realizedPnl },
    });

    // Log to system logs
    await db.insert(intradaySystemLogs).values({
      level: 'WARN',
      source: 'BROKER_BRIDGE',
      message: `Manual force exit executed for ${pos.tickerSymbol} at ${exitP} EGP (P&L: ${realizedPnl.toFixed(2)}%)`,
      metadata: { positionId: pos.id, ticker: pos.tickerSymbol, realizedPnl },
    });

    return NextResponse.json({ success: true, positionId, realizedPnlPct: realizedPnl });
  } catch (error) {
    console.error('Error in handleBotPositionClosePost:', error);
    return NextResponse.json({ error: 'Failed to close position' }, { status: 500 });
  }
}
