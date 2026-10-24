import type { BacktestTrade } from '../../../../lib/strategies/run-simple-backtest';

type TradeMetrics = Pick<BacktestTrade, 'entryTime' | 'exitTime' | 'returnPct' | 'maePct' | 'mfePct'>;

export function summarizeCompanyTrades(trades: readonly TradeMetrics[]) {
  if (trades.length === 0) return { averageReturnPct: null, averageMaePct: null, averageMfePct: null, averageHoldDays: null };
  const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    averageReturnPct: mean(trades.map((trade) => trade.returnPct)),
    averageMaePct: mean(trades.map((trade) => trade.maePct)),
    averageMfePct: mean(trades.map((trade) => trade.mfePct)),
    averageHoldDays: mean(trades.map((trade) => (Date.parse(String(trade.exitTime)) - Date.parse(String(trade.entryTime))) / 86_400_000)),
  };
}
