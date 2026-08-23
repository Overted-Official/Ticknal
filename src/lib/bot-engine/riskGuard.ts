import { BotSignal, TickContext, RiskCheckResult } from '@/lib/bot-engine/types';
import { botLog } from '@/lib/bot-engine/systemLogger';

/**
 * Validates a buy signal against various risk constraints.
 * @param signal The buy signal to validate.
 * @param ctx The current tick context.
 * @returns A RiskCheckResult indicating approval or rejection reason.
 */
export function validateBuySignal(signal: BotSignal, ctx: TickContext): RiskCheckResult {
  try {
    const tickerSymbol = signal.tickerSymbol || signal.ticker;

    if (!ctx.settings.botActive) {
      botLog.warn('RISK_GUARD', 'Rejected: Bot is paused (master kill switch off)');
      return { approved: false, reason: 'Bot is paused (master kill switch off)', rejectReason: 'Bot is paused' };
    }

    if (ctx.market.status !== 'OPEN') {
      botLog.warn('RISK_GUARD', 'Rejected: Market is not open');
      return { approved: false, reason: 'Market is not open', rejectReason: 'Market is not open' };
    }

    if (ctx.openPositions.length >= ctx.settings.maxConcurrentPositions) {
      botLog.warn('RISK_GUARD', `Rejected: Max concurrent positions reached (${ctx.settings.maxConcurrentPositions})`);
      return { approved: false, reason: 'Max concurrent positions reached', rejectReason: 'Max concurrent positions reached' };
    }

    const ticker = ctx.enabledTickers.find(t => (t.tickerSymbol || t.symbol) === tickerSymbol);
    if (!ticker) {
      botLog.warn('RISK_GUARD', `Rejected: Ticker ${tickerSymbol} not found in enabled tickers`);
      return { approved: false, reason: 'Ticker not found', rejectReason: 'Ticker not found' };
    }

    if (ticker.allocatedBudgetEgp <= 0) {
      botLog.warn('RISK_GUARD', `Rejected: Zero or negative allocated budget for ${tickerSymbol}`);
      return { approved: false, reason: 'Zero allocated budget', rejectReason: 'Zero allocated budget' };
    }

    if (ticker.status === 'CIRCUIT_HALTED') {
      botLog.warn('RISK_GUARD', `Rejected: Ticker ${tickerSymbol} is circuit halted`);
      return { approved: false, reason: 'Ticker is circuit halted', rejectReason: 'Ticker is circuit halted' };
    }

    const closedList = ctx.closedPositionsToday || ctx.closedTradesToday || [];
    const todayLossForTicker = closedList
      .filter((p: { tickerSymbol: string; realizedPnlPct: number }) => p.tickerSymbol === tickerSymbol && p.realizedPnlPct < 0)
      .reduce((sum: number, p: { tickerSymbol: string; realizedPnlPct: number }) => sum + p.realizedPnlPct, 0);
    
    const maxLossThreshold = ticker.maxLossHaltPct ?? ticker.strategyParams?.maxLossHaltPct ?? 5;
    // Convert to positive percentage for comparison
    if (Math.abs(todayLossForTicker) > maxLossThreshold) {
      botLog.warn('RISK_GUARD', `Rejected: Ticker ${tickerSymbol} exceeded max loss halt pct`);
      return { approved: false, reason: 'Ticker max loss halt exceeded', rejectReason: 'Ticker max loss halt exceeded' };
    }

    if (ctx.totalRealizedPnlPctToday <= -ctx.settings.dailyLossHaltPct) {
      botLog.warn('RISK_GUARD', `Rejected: Daily account loss halt exceeded`);
      return { approved: false, reason: 'Daily account loss halt', rejectReason: 'Daily account loss halt' };
    }

    if (ctx.openPositions.some(p => p.tickerSymbol === tickerSymbol)) {
      botLog.warn('RISK_GUARD', `Rejected: Already have an open position for ${tickerSymbol}`);
      return { approved: false, reason: 'Duplicate position', rejectReason: 'Duplicate position' };
    }

    return { approved: true };
  } catch (error) {
    botLog.error('RISK_GUARD', `Error in validateBuySignal: ${error instanceof Error ? error.message : String(error)}`);
    return { approved: false, reason: 'Internal error', rejectReason: 'Internal error' };
  }
}

/**
 * Validates a sell signal. Always approved as we never block an exit.
 * @param signal The sell signal to validate.
 * @param ctx The current tick context.
 * @returns A RiskCheckResult approving the sell signal.
 */
export function validateSellSignal(signal: BotSignal, ctx: TickContext): RiskCheckResult {
  return { approved: true };
}
