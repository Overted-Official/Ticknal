import { db } from '@/db';
import { intradayPositions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { BotSignal, ExecutionResult, TickerConfig, OpenPosition, ComputedBar } from '@/lib/bot-engine/types';
import { botLog } from '@/lib/bot-engine/systemLogger';

/**
 * Opens a new position in the database.
 * @param signal The buy signal that triggered the position.
 * @param execution The execution result containing the filled price.
 * @param tickerConfig The ticker configuration.
 * @returns The inserted position ID, or -1 if quantity is less than 1 or an error occurs.
 */
export async function openPosition(signal: BotSignal, execution: ExecutionResult, tickerConfig: TickerConfig): Promise<number> {
  try {
    const tickerSymbol = signal.tickerSymbol || signal.ticker;
    const filledPrice = execution.filledPrice ?? signal.price;
    const quantity = Math.floor(tickerConfig.allocatedBudgetEgp / filledPrice);
    if (quantity < 1) {
      botLog.warn('POSITION_MANAGER', `Quantity < 1 for ${tickerSymbol}. Budget: ${tickerConfig.allocatedBudgetEgp}, Price: ${filledPrice}`);
      return -1;
    }

    const [inserted] = await db.insert(intradayPositions).values({
      tickerSymbol,
      status: 'OPEN',
      entryPrice: signal.price?.toString() || filledPrice.toString(),
      targetPrice: signal.targetPrice?.toString(),
      trailingStopPrice: signal.trailingStopPrice?.toString(),
      quantity: quantity.toString(),
      highestPrice: filledPrice.toString(),
      unrealizedPnlPct: '0',
    }).returning({ id: intradayPositions.id });

    botLog.info('POSITION_MANAGER', `Opened position for ${tickerSymbol} with ID ${inserted.id}`);
    return inserted.id;
  } catch (error) {
    botLog.error('POSITION_MANAGER', `Error in openPosition: ${error instanceof Error ? error.message : String(error)}`);
    return -1;
  }
}

/**
 * Updates open positions with the latest prices and trailing stops.
 * @param positions Array of current open positions.
 * @param latestPrices Map of the latest computed bars keyed by ticker symbol.
 * @param tickerConfigs Array of ticker configurations.
 */
export async function updateOpenPositions(positions: OpenPosition[], latestPrices: Map<string, ComputedBar>, tickerConfigs: TickerConfig[]): Promise<void> {
  try {
    for (const position of positions) {
      const latestBar = latestPrices.get(position.tickerSymbol);
      if (!latestBar) continue;

      const tickerConfig = tickerConfigs.find(t => (t.tickerSymbol || t.symbol) === position.tickerSymbol);
      if (!tickerConfig) continue;

      const currentPrice = latestBar.close;
      const unrealizedPnlPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      
      const newHighestPrice = Math.max(position.highestPrice || position.entryPrice, currentPrice);
      
      const potentialTrailingStop = newHighestPrice - (latestBar.atr14 * tickerConfig.strategyParams.atrDistance);
      const newTrailingStopPrice = Math.max(position.trailingStopPrice, potentialTrailingStop);

      await db.update(intradayPositions)
        .set({
          currentPrice: currentPrice.toString(),
          unrealizedPnlPct: unrealizedPnlPct.toString(),
          highestPrice: newHighestPrice.toString(),
          trailingStopPrice: newTrailingStopPrice.toString(),
          updatedAt: new Date()
        })
        .where(eq(intradayPositions.id, position.id));
    }
  } catch (error) {
    botLog.error('POSITION_MANAGER', `Error in updateOpenPositions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Closes an existing position in the database.
 * @param positionId The ID of the position to close.
 * @param exitPrice The price at which the position was closed.
 * @param exitReason The reason for closing the position (e.g., SELL_TP, SELL_STOPLOSS).
 */
export async function closePosition(positionId: number, exitPrice: number, exitReason: string): Promise<void> {
  try {
    const [position] = await db.select().from(intradayPositions).where(eq(intradayPositions.id, positionId));
    if (!position) {
      botLog.warn('POSITION_MANAGER', `Position ${positionId} not found for closing`);
      return;
    }

    const entryPrice = Number(position.entryPrice);
    const realizedPnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;

    await db.update(intradayPositions)
      .set({
        status: 'CLOSED',
        exitPrice: exitPrice.toString(),
        exitTime: new Date(),
        exitReason,
        realizedPnlPct: realizedPnlPct.toString(),
        updatedAt: new Date()
      })
      .where(eq(intradayPositions.id, positionId));

    botLog.info('POSITION_MANAGER', `Closed position ${positionId} at ${exitPrice}. Reason: ${exitReason}. PnL: ${realizedPnlPct.toFixed(2)}%`);
  } catch (error) {
    botLog.error('POSITION_MANAGER', `Error in closePosition: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Retrieves all open positions from the database.
 * @returns Array of OpenPosition objects.
 */
export async function getOpenPositions(): Promise<OpenPosition[]> {
  try {
    const rows = await db.select().from(intradayPositions).where(eq(intradayPositions.status, 'OPEN'));
    return rows.map(row => ({
      id: row.id,
      tickerSymbol: row.tickerSymbol,
      entryPrice: Number(row.entryPrice),
      targetPrice: Number(row.targetPrice),
      trailingStopPrice: Number(row.trailingStopPrice),
      quantity: Number(row.quantity),
      highestPrice: Number(row.highestPrice),
      currentPrice: row.currentPrice ? Number(row.currentPrice) : Number(row.entryPrice),
      unrealizedPnlPct: row.unrealizedPnlPct ? Number(row.unrealizedPnlPct) : 0,
      entryTime: row.entryTime || new Date(),
    } as OpenPosition));
  } catch (error) {
    botLog.error('POSITION_MANAGER', `Error in getOpenPositions: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Retrieves positions closed today from the database.
 * @returns Array of objects containing tickerSymbol and realizedPnlPct.
 */
export async function getClosedPositionsToday(): Promise<Array<{ tickerSymbol: string; realizedPnlPct: number }>> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await db.select()
      .from(intradayPositions)
      .where(
        and(
          eq(intradayPositions.status, 'CLOSED'),
          sql`${intradayPositions.exitTime} >= ${today}`
        )
      );

    return rows.map(row => ({
      tickerSymbol: row.tickerSymbol,
      realizedPnlPct: Number(row.realizedPnlPct || 0)
    }));
  } catch (error) {
    botLog.error('POSITION_MANAGER', `Error in getClosedPositionsToday: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}
