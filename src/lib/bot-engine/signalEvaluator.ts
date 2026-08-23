import { ComputedBar, BotSignal, OpenPosition, TickerConfig } from '@/lib/bot-engine/types';

/**
 * Evaluates entry signals for a given ticker based on computed bars and open positions.
 * @param ticker The ticker configuration.
 * @param computedBars Array of recent computed bars for the ticker.
 * @param openPositions Array of current open positions.
 * @returns A BUY BotSignal if entry criteria are met, otherwise null.
 */
export function evaluateEntrySignal(ticker: TickerConfig, computedBars: ComputedBar[], openPositions: OpenPosition[]): BotSignal | null {
  try {
    const tickerSymbol = ticker.tickerSymbol || ticker.symbol || '';
    const hasOpenPosition = openPositions.some(p => p.tickerSymbol === tickerSymbol);
    if (hasOpenPosition) {
      return null;
    }

    if (computedBars.length < 2) {
      return null;
    }

    const currentBar = computedBars[computedBars.length - 1];
    const previousBar = computedBars[computedBars.length - 2];

    let crossedLevel: number | null = null;
    let lowestLevel = Infinity;

    for (const level of ticker.strategyParams.entryLevels) {
      if (currentBar.masterIndexAdjusted > level && previousBar.masterIndexAdjusted <= level) {
        if (level < lowestLevel) {
          lowestLevel = level;
          crossedLevel = level;
        }
      }
    }

    if (crossedLevel !== null) {
      const targetPrice = currentBar.close * (1 + (currentBar.medianBarMove * ticker.strategyParams.aymMultiplier) / 100);
      const trailingStopPrice = currentBar.close - currentBar.atr14 * ticker.strategyParams.atrDistance;

      return {
        ticker: tickerSymbol,
        tickerSymbol,
        type: 'BUY',
        price: currentBar.close,
        masterIndex: currentBar.masterIndex,
        masterIndexAdjusted: currentBar.masterIndexAdjusted,
        crossedLevel,
        targetPrice,
        trailingStopPrice,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Evaluates exit signals for an open position.
 * @param ticker The ticker configuration.
 * @param computedBars Array of recent computed bars for the ticker.
 * @param position The current open position.
 * @returns A SELL BotSignal if exit criteria are met, otherwise null.
 */
export function evaluateExitSignal(ticker: TickerConfig, computedBars: ComputedBar[], position: OpenPosition): BotSignal | null {
  try {
    if (computedBars.length === 0) return null;
    
    const tickerSymbol = ticker.tickerSymbol || ticker.symbol || '';
    const currentBar = computedBars[computedBars.length - 1];

    if (currentBar.close >= position.targetPrice && currentBar.masterIndexAdjusted < ticker.strategyParams.aymLimit) {
      return {
        ticker: tickerSymbol,
        tickerSymbol,
        type: 'SELL_TP',
        price: currentBar.close,
        masterIndex: currentBar.masterIndex,
        masterIndexAdjusted: currentBar.masterIndexAdjusted,
        positionId: position.id,
      };
    }

    if (currentBar.close <= position.trailingStopPrice && currentBar.close > position.entryPrice) {
      return {
        ticker: tickerSymbol,
        tickerSymbol,
        type: 'SELL_TRAIL',
        price: currentBar.close,
        masterIndex: currentBar.masterIndex,
        masterIndexAdjusted: currentBar.masterIndexAdjusted,
        positionId: position.id,
      };
    }

    if (ticker.strategyParams.stopLoss) {
      const stopLossPrice = position.entryPrice * (1 - (currentBar.medianBarMove * ticker.strategyParams.stopLoss) / 100);
      if (currentBar.close <= stopLossPrice) {
        return {
          ticker: tickerSymbol,
          tickerSymbol,
          type: 'SELL_STOPLOSS',
          price: currentBar.close,
          masterIndex: currentBar.masterIndex,
          masterIndexAdjusted: currentBar.masterIndexAdjusted,
          positionId: position.id,
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Evaluates end-of-day exit signals for an open position.
 * @param position The current open position.
 * @param currentPrice The current price of the ticker.
 * @param eodRule The end-of-day rule ('HARD_CLOSE_EOD' or 'PROFIT_CLOSE_EOD').
 * @param isEodWindow Boolean indicating if it's currently the end-of-day window.
 * @returns A SELL_EOD BotSignal if criteria are met, otherwise null.
 */
export function evaluateEodSignal(position: OpenPosition, currentPrice: number, eodRule: string, isEodWindow: boolean): BotSignal | null {
  try {
    if (!isEodWindow) {
      return null;
    }

    if (eodRule === 'HARD_CLOSE_EOD') {
      return {
        ticker: position.tickerSymbol,
        tickerSymbol: position.tickerSymbol,
        type: 'SELL_EOD',
        price: currentPrice,
        masterIndex: 0,
        masterIndexAdjusted: 0,
        positionId: position.id,
      };
    }

    if (eodRule === 'PROFIT_CLOSE_EOD' && currentPrice > position.entryPrice) {
      return {
        ticker: position.tickerSymbol,
        tickerSymbol: position.tickerSymbol,
        type: 'SELL_EOD',
        price: currentPrice,
        masterIndex: 0,
        masterIndexAdjusted: 0,
        positionId: position.id,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
