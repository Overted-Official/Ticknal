import {
  createDiagnostic,
  type CompletedTrade,
  type Diagnostic,
  type ObservationTime,
} from '../../contracts';

export interface CompletedTradeSummary {
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly grossProfit: number;
  readonly grossLoss: number;
  readonly netProfit: number;
  readonly winRate: number;
  readonly averageWin: number;
  readonly averageLoss: number;
  readonly expectancy: number;
  readonly profitFactor: number | null;
  readonly payoffRatio: number | null;
}

export interface CompletedTradeSummaryResult {
  readonly summary: CompletedTradeSummary;
  readonly diagnostics: readonly Diagnostic[];
}

function timeValue(time: ObservationTime): number | null {
  if (typeof time === 'number') return Number.isFinite(time) ? time : null;
  const parsed = Date.parse(time);
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizeCompletedTrades(
  trades: readonly CompletedTrade[],
): CompletedTradeSummaryResult {
  const diagnostics: Diagnostic[] = [];
  for (const trade of trades) {
    const entry = timeValue(trade.entryTime);
    const exit = timeValue(trade.exitTime);
    if (entry === null || exit === null) {
      diagnostics.push(createDiagnostic(
        'INPUT_INVALID_TIMESTAMP',
        'indicator.context.tradeTimestampInvalid',
        { tradeId: trade.id },
      ));
    } else if (entry > exit) {
      diagnostics.push(createDiagnostic(
        'INPUT_TIMESTAMP_ORDER',
        'indicator.context.tradeChronologyInvalid',
        { tradeId: trade.id },
      ));
    }
  }

  const wins = trades.filter((trade) => trade.realizedPnl > 0);
  const losses = trades.filter((trade) => trade.realizedPnl < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.realizedPnl, 0);
  const grossLoss = losses.reduce((sum, trade) => sum + Math.abs(trade.realizedPnl), 0);
  const netProfit = trades.reduce((sum, trade) => sum + trade.realizedPnl, 0);
  const averageWin = wins.length === 0 ? 0 : grossProfit / wins.length;
  const averageLoss = losses.length === 0 ? 0 : grossLoss / losses.length;
  const tradeCount = trades.length;

  return {
    summary: {
      tradeCount,
      winCount: wins.length,
      lossCount: losses.length,
      grossProfit,
      grossLoss,
      netProfit,
      winRate: tradeCount === 0 ? 0 : wins.length / tradeCount,
      averageWin,
      averageLoss,
      expectancy: tradeCount === 0 ? 0 : netProfit / tradeCount,
      profitFactor: grossLoss === 0 ? null : grossProfit / grossLoss,
      payoffRatio: averageLoss === 0 ? null : averageWin / averageLoss,
    },
    diagnostics: Object.freeze(diagnostics),
  };
}
