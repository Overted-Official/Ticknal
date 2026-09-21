import type {
  StrategyKeyStats,
  StrategyTrade,
  EquityPoint,
} from '../registry';
import type { PriceBar } from '../PSI/psiStrategy';
import { computeHydraIndex, type HydraPoint, HYDRA_INDEX_VERSION } from '../../indicators/hydra-index';
import type { ChartData } from '@ticknal/types';

/**
 * HYDRA STRATEGY VERSION: 1.2
 * Architecture: Approach 3A Causal Smart Fast-EWMA Trailing Stop with Momentum Re-entry and Anti-Exhaustion Regime Filter.
 * Versioning is internal for code tracking and backtest audit (not exposed on UI).
 */
export const HYDRA_STRATEGY_VERSION = '1.2';

export interface HydraStrategyOverrides {
  ticker?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
  commissionRate?: number;
  slippageRate?: number;
}

export interface HydraSignal {
  date: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'FLAT';
  price: number;
  entryPrice?: number;
  entryDate?: string;
  entryReason?: string;
  exitReason?: string;
  reasoning?: string;
  hydraState: number;
  continuousVal: number;
  volatilityTheta?: number;
  masterIndex: number;
}

export interface HydraStrategyResult {
  signals: HydraSignal[];
  latestSignal: HydraSignal;
  latestMasterIndex: number;
  trades: StrategyTrade[];
  equityCurve: EquityPoint[];
  stats: StrategyKeyStats;
  metrics: {
    sysRoi: number;
    buyHoldRoi: number;
    roiMargin: number;
    trades: number;
    winRate: number;
    maxDrawdown: number;
    maxAdverseExcursion: number;
    avgAdverseExcursion: number;
    avgFavorableExcursion: number;
    annualCagr: number;
    avgReturnPerTrade: number;
    avgBarsPerTrade: number;
    currentBalance: number;
    hydraState: number;
    continuousVal: number;
    latestMasterIndex: number;
    medianDailyMove: number;
  };
}

export function formatHydraMetricsForApi(metrics: HydraStrategyResult['metrics']): Record<string, string> {
  return {
    "Sys ROI": metrics.sysRoi.toFixed(2),
    "B&H ROI": metrics.buyHoldRoi.toFixed(2),
    "ROI Margin": metrics.roiMargin.toFixed(2),
    "# of Trades": String(metrics.trades),
    "Win Rate": metrics.winRate.toFixed(2),
    "Max Drawdown": metrics.maxDrawdown.toFixed(2),
    "Annual CAGR": metrics.annualCagr.toFixed(2),
    "Avg. Return/Trade": metrics.avgReturnPerTrade.toFixed(2),
    "Avg Bars/Trade": metrics.avgBarsPerTrade.toFixed(1),
    "Max Adverse Excursion": metrics.maxAdverseExcursion.toFixed(2),
    "Avg. Adverse Excursion": metrics.avgAdverseExcursion.toFixed(2),
    "Avg. Favorable Excursion": metrics.avgFavorableExcursion.toFixed(2),
    "Hydra State": metrics.hydraState === 1 ? '1 (INVESTED)' : '0 (CASH)',
    "Regime Value": metrics.continuousVal.toFixed(1),
    "Master Index": metrics.latestMasterIndex.toFixed(2),
  };
}

const DEFAULT_INITIAL_CAPITAL = 100_000;
const DEFAULT_COMMISSION_RATE = 0; // Removed: 0% commission
const DEFAULT_SLIPPAGE_RATE = 0;   // Removed: 0% slippage

function emptyStats(initialCapital: number, startDate: string, endDate: string): StrategyKeyStats {
  return {
    initialCapital,
    finalEquity: initialCapital,
    netProfit: 0,
    netProfitPct: 0,
    buyHoldReturn: 0,
    buyHoldReturnPct: 0,
    alphaMargin: 0,
    maxDrawdown: 0,
    maxDrawdownAmount: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    profitFactor: 0,
    grossProfit: 0,
    grossLoss: 0,
    avgTradePnl: 0,
    avgTradeReturnPct: 0,
    avgWin: 0,
    avgLoss: 0,
    winLossRatio: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    avgBarsHeld: 0,
    annualCagr: 0,
    sharpeRatio: 0,
    startDate,
    endDate,
  };
}

export function runHydraStrategy(
  bars: PriceBar[],
  overrides?: HydraStrategyOverrides
): HydraStrategyResult {
  const initialCapital = overrides?.initialCapital || DEFAULT_INITIAL_CAPITAL;
  const commissionRate = overrides?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const slippageRate = overrides?.slippageRate ?? DEFAULT_SLIPPAGE_RATE;
  const startDate = overrides?.startDate || (bars.length > 0 ? bars[0].date : '2025-01-01');
  const endDate = overrides?.endDate;

  if (bars.length === 0) {
    const empty = emptyStats(initialCapital, startDate, startDate);
    const dummySignal: HydraSignal = {
      date: startDate,
      signal: 'FLAT',
      price: 0,
      hydraState: 0,
      continuousVal: 50,
      masterIndex: 50,
    };
    return {
      signals: [dummySignal],
      latestSignal: dummySignal,
      latestMasterIndex: 50,
      trades: [],
      equityCurve: [],
      stats: empty,
      metrics: {
        sysRoi: 0,
        buyHoldRoi: 0,
        roiMargin: 0,
        trades: 0,
        winRate: 0,
        maxDrawdown: 0,
        maxAdverseExcursion: 0,
        avgAdverseExcursion: 0,
        avgFavorableExcursion: 0,
        annualCagr: 0,
        avgReturnPerTrade: 0,
        avgBarsPerTrade: 0,
        currentBalance: initialCapital,
        hydraState: 0,
        continuousVal: 50,
        latestMasterIndex: 50,
        medianDailyMove: 2.0,
      },
    };
  }

  // 1. Convert PriceBar[] to ChartData[] for the causal HYDRA calculator
  const chartBars: ChartData[] = bars.map((b) => ({
    time: b.date,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume ?? 0,
  }));

  // 2. Compute Causal HYDRA Index (0 = Cash, 1 = Invested)
  const hydraResult = computeHydraIndex(chartBars, { binaryMode: true, showMarkers: false });
  const points: HydraPoint[] = hydraResult.points;

  // 3. Locate Simulation Window Start
  let startIdx = 0;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date >= startDate) {
      startIdx = i;
      break;
    }
  }

  // 4. Discrete State Machine Simulation
  let isLong = false;
  let activeShares = 0;
  let entryPrice = 0;
  let entryDate = '';
  let entryReason = '';
  let highestInTrade = 0;
  let lowestInTrade = 0;
  let barsHeld = 0;
  let currentBalance = initialCapital;

  const trades: StrategyTrade[] = [];
  const signals: HydraSignal[] = [];
  const equityCurve: EquityPoint[] = [];

  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;
  let maxDrawdownPct = 0;

  // Buy & Hold baseline
  const firstBarClose = bars[startIdx]?.close || bars[0].close;
  const buyHoldShares = Math.floor(initialCapital / firstBarClose);
  const buyHoldCash = initialCapital - buyHoldShares * firstBarClose;

  for (let i = startIdx; i < bars.length; i++) {
    const bar = bars[i];
    if (endDate && bar.date > endDate) break;

    const currPoint = points[i] || { value: 0, state: 0, continuousVal: 50 };
    const prevPoint = i > 0 ? (points[i - 1] || currPoint) : currPoint;

    const closePrice = bar.close;
    const highPrice = bar.high;
    const lowPrice = bar.low;

    let signalType: 'BUY' | 'SELL' | 'HOLD' | 'FLAT' = isLong ? 'HOLD' : 'FLAT';
    let triggeredExitReason = '';
    let triggeredEntryReason = '';

    if (!isLong) {
      // Entry Condition: Index flips from 0 to 1, or simulation window starts while already in Bull Regime (State 1)
      const isFlipUp = (prevPoint.state === 0 && currPoint.state === 1) || (i === startIdx && currPoint.state === 1);

      if (isFlipUp) {
        signalType = 'BUY';
        triggeredEntryReason = 'HYDRA Entry (Oversold Bounce / Trend Continuation Momentum)';

        const effectiveEntryPrice = closePrice * (1.0 + slippageRate);
        const costPerShare = effectiveEntryPrice * (1.0 + commissionRate);
        const shares = Math.floor(currentBalance / costPerShare);

        if (shares > 0) {
          const totalCost = shares * costPerShare;
          currentBalance -= totalCost;
          activeShares = shares;
          entryPrice = effectiveEntryPrice;
          entryDate = bar.date;
          entryReason = triggeredEntryReason;
          highestInTrade = highPrice;
          lowestInTrade = lowPrice;
          barsHeld = 0;
          isLong = true;
        }
      }
    } else {
      // Position Tracking
      barsHeld += 1;
      if (highPrice > highestInTrade) highestInTrade = highPrice;
      if (lowPrice < lowestInTrade) lowestInTrade = lowPrice;

      // Exit Condition: Index flips from 1 to 0 (Trailing Stop Hit)
      const isFlipDown = prevPoint.state === 1 && currPoint.state === 0;

      if (isFlipDown) {
        signalType = 'SELL';
        triggeredExitReason = 'HYDRA Exit (Dynamic EWMA Volatility Trailing Stop)';

        const effectiveExitPrice = closePrice * (1.0 - slippageRate);
        const grossProceeds = activeShares * effectiveExitPrice;
        const exitCommission = grossProceeds * commissionRate;
        const netProceeds = grossProceeds - exitCommission;

        const totalCost = activeShares * entryPrice * (1.0 + commissionRate);
        const netPnl = netProceeds - totalCost;
        const returnPct = ((netProceeds - totalCost) / totalCost) * 100.0;

        currentBalance += netProceeds;

        const maxFavorableExcursion = ((highestInTrade - entryPrice) / entryPrice) * 100.0;
        const maxAdverseExcursion = ((lowestInTrade - entryPrice) / entryPrice) * 100.0;

        trades.push({
          id: trades.length + 1,
          tradeNumber: trades.length + 1,
          type: 'long',
          entryDate,
          entryPrice: Number(entryPrice.toFixed(4)),
          exitDate: bar.date,
          exitPrice: Number(effectiveExitPrice.toFixed(4)),
          shares: activeShares,
          positionValue: Number((activeShares * entryPrice).toFixed(2)),
          netPnl: Number(netPnl.toFixed(2)),
          returnPct: Number(returnPct.toFixed(2)),
          exitReason: triggeredExitReason,
          barsHeld,
          cumulativeEquity: Number(currentBalance.toFixed(2)),
          favorableExcursion: Number(maxFavorableExcursion.toFixed(2)),
          adverseExcursion: Number(maxAdverseExcursion.toFixed(2)),
        });

        isLong = false;
        activeShares = 0;
        entryPrice = 0;
        entryDate = '';
        barsHeld = 0;
      }
    }

    // Mark-to-Market Equity
    const currentPositionValue = isLong ? activeShares * closePrice * (1.0 - commissionRate - slippageRate) : 0;
    const totalEquity = currentBalance + currentPositionValue;
    const buyHoldCurrent = buyHoldCash + buyHoldShares * closePrice;

    if (totalEquity > peakEquity) peakEquity = totalEquity;
    const currentDdAmount = peakEquity - totalEquity;
    const currentDdPct = peakEquity > 0 ? (currentDdAmount / peakEquity) * 100 : 0;

    if (currentDdAmount > maxDrawdownAmount) maxDrawdownAmount = currentDdAmount;
    if (currentDdPct > maxDrawdownPct) maxDrawdownPct = currentDdPct;

    const lastTrade = trades[trades.length - 1];
    const tradeClosedOnThisBar = !isLong && lastTrade && lastTrade.exitDate === bar.date;

    equityCurve.push({
      date: bar.date,
      equity: Number(totalEquity.toFixed(2)),
      buyHoldEquity: Number(buyHoldCurrent.toFixed(2)),
      drawdown: Number(currentDdPct.toFixed(2)),
      tradePnl: tradeClosedOnThisBar ? lastTrade.netPnl : undefined,
      tradeReturnPct: tradeClosedOnThisBar ? lastTrade.returnPct : undefined,
    });

    signals.push({
      date: bar.date,
      signal: signalType,
      price: closePrice,
      entryPrice: isLong ? entryPrice : undefined,
      entryDate: isLong ? entryDate : undefined,
      entryReason: signalType === 'BUY' ? triggeredEntryReason : isLong ? entryReason : undefined,
      exitReason: signalType === 'SELL' ? triggeredExitReason : undefined,
      reasoning: signalType === 'BUY' ? triggeredEntryReason : signalType === 'SELL' ? triggeredExitReason : undefined,
      hydraState: currPoint.state,
      continuousVal: currPoint.continuousVal,
      masterIndex: currPoint.continuousVal,
    });
  }

  // If position is still open at the end, close it virtually for final stats accounting
  const lastBar = bars[bars.length - 1];
  let finalEquity = currentBalance;
  if (isLong && activeShares > 0) {
    const effectiveExitPrice = lastBar.close * (1.0 - slippageRate);
    const grossProceeds = activeShares * effectiveExitPrice;
    const netProceeds = grossProceeds * (1.0 - commissionRate);
    finalEquity += netProceeds;
  }

  const netProfit = finalEquity - initialCapital;
  const netProfitPct = (netProfit / initialCapital) * 100.0;

  const buyHoldFinal = buyHoldCash + buyHoldShares * lastBar.close;
  const buyHoldReturn = buyHoldFinal - initialCapital;
  const buyHoldReturnPct = (buyHoldReturn / initialCapital) * 100.0;
  const alphaMargin = netProfitPct - buyHoldReturnPct;

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.netPnl > 0).length;
  const losingTrades = trades.filter((t) => t.netPnl <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100.0 : 0.0;

  const grossProfit = trades.filter((t) => t.netPnl > 0).reduce((sum, t) => sum + t.netPnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.netPnl < 0).reduce((sum, t) => sum + t.netPnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.0 : 0.0;

  const avgTradePnl = totalTrades > 0 ? netProfit / totalTrades : 0.0;
  const avgTradeReturnPct = totalTrades > 0
    ? trades.reduce((sum, t) => sum + t.returnPct, 0) / totalTrades
    : 0.0;

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0.0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0.0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.0 : 0.0;

  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  for (const t of trades) {
    if (t.netPnl > 0) {
      curWins += 1;
      curLosses = 0;
      if (curWins > maxConsecWins) maxConsecWins = curWins;
    } else {
      curLosses += 1;
      curWins = 0;
      if (curLosses > maxConsecLosses) maxConsecLosses = curLosses;
    }
  }

  const avgBarsHeld = totalTrades > 0
    ? trades.reduce((sum, t) => sum + t.barsHeld, 0) / totalTrades
    : 0.0;

  // Annualized CAGR & Sharpe
  const startTimestamp = new Date(bars[startIdx].date).getTime();
  const endTimestamp = new Date(lastBar.date).getTime();
  const years = Math.max((endTimestamp - startTimestamp) / (365.25 * 24 * 3600 * 1000), 0.08);

  const annualCagr = finalEquity > 0
    ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100.0
    : -100.0;

  const dailyReturns: number[] = [];
  for (let k = 1; k < equityCurve.length; k++) {
    const prevE = equityCurve[k - 1].equity;
    const currE = equityCurve[k].equity;
    if (prevE > 0) {
      dailyReturns.push((currE - prevE) / prevE);
    }
  }

  let sharpeRatio = 0;
  if (dailyReturns.length > 5) {
    const meanDaily = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanDaily, 2), 0) / dailyReturns.length;
    const stdev = Math.sqrt(variance);
    const annualizedRiskFree = 0.15; // 15% Egyptian risk-free rate proxy
    const dailyRiskFree = annualizedRiskFree / 252;
    if (stdev > 0.00001) {
      sharpeRatio = ((meanDaily - dailyRiskFree) / stdev) * Math.sqrt(252);
    }
  }

  const stats: StrategyKeyStats = {
    initialCapital,
    finalEquity: Number(finalEquity.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    netProfitPct: Number(netProfitPct.toFixed(2)),
    buyHoldReturn: Number(buyHoldReturn.toFixed(2)),
    buyHoldReturnPct: Number(buyHoldReturnPct.toFixed(2)),
    alphaMargin: Number(alphaMargin.toFixed(2)),
    maxDrawdown: Number(maxDrawdownPct.toFixed(2)),
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Number(winRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    avgTradePnl: Number(avgTradePnl.toFixed(2)),
    avgTradeReturnPct: Number(avgTradeReturnPct.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
    avgBarsHeld: Number(avgBarsHeld.toFixed(1)),
    annualCagr: Number(annualCagr.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    startDate: bars[startIdx].date,
    endDate: lastBar.date,
  };

  const latestPoint = points[points.length - 1] || { state: 0, continuousVal: 50 };
  const latestSig = signals[signals.length - 1] || {
    date: lastBar.date,
    signal: 'FLAT',
    price: lastBar.close,
    hydraState: latestPoint.state,
    continuousVal: latestPoint.continuousVal,
    masterIndex: latestPoint.continuousVal,
  };

  const avgAdverseExcursion = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.adverseExcursion || 0), 0) / trades.length
    : 0;
  const maxAdverseExcursion = trades.length > 0
    ? Math.min(...trades.map((t) => t.adverseExcursion || 0))
    : 0;
  const avgFavorableExcursion = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.favorableExcursion || 0), 0) / trades.length
    : 0;

  return {
    signals,
    latestSignal: latestSig,
    latestMasterIndex: latestPoint.continuousVal,
    trades,
    equityCurve,
    stats,
    metrics: {
      sysRoi: netProfitPct,
      buyHoldRoi: buyHoldReturnPct,
      roiMargin: alphaMargin,
      trades: totalTrades,
      winRate: stats.winRate,
      maxDrawdown: maxDrawdownPct,
      maxAdverseExcursion,
      avgAdverseExcursion,
      avgFavorableExcursion,
      annualCagr,
      avgReturnPerTrade: avgTradeReturnPct,
      avgBarsPerTrade: avgBarsHeld,
      currentBalance: finalEquity,
      hydraState: latestPoint.state,
      continuousVal: latestPoint.continuousVal,
      latestMasterIndex: latestPoint.continuousVal,
      medianDailyMove: 2.0,
    },
  };
}
