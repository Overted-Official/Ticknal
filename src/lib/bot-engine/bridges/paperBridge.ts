import { botLog } from '@/lib/bot-engine/systemLogger';
import type { BrokerBridge, ExecutionResult, BrokerQuote } from '@/lib/bot-engine/types';

/**
 * Paper trading simulation bridge that instantly fills orders
 */
export class PaperBridge implements BrokerBridge {
  name = 'Paper Trading Simulator';
  mode = 'PAPER' as const;

  /**
   * Submits a simulated buy order
   */
  async submitBuyOrder(ticker: string, qty: number, price: number): Promise<ExecutionResult> {
    const orderId = `PAPER-BUY-${Date.now()}-${ticker}`;
    botLog.info('BROKER_BRIDGE', `Simulating buy order: ${qty} ${ticker} @ ${price}`, { orderId });
    return {
      success: true,
      orderId,
      filledPrice: price,
      filledQty: qty,
      latencyMs: 0
    };
  }

  /**
   * Submits a simulated sell order
   */
  async submitSellOrder(ticker: string, qty: number, price: number): Promise<ExecutionResult> {
    const orderId = `PAPER-SELL-${Date.now()}-${ticker}`;
    botLog.info('BROKER_BRIDGE', `Simulating sell order: ${qty} ${ticker} @ ${price}`, { orderId });
    return {
      success: true,
      orderId,
      filledPrice: price,
      filledQty: qty,
      latencyMs: 0
    };
  }

  /**
   * Gets a mock quote
   */
  async getQuote(ticker: string): Promise<BrokerQuote> {
    botLog.info('BROKER_BRIDGE', `Getting paper quote for ${ticker}`);
    return { bid: 0, ask: 0, last: 0 };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ connected: boolean; latencyMs: number }> {
    return { connected: true, latencyMs: 0 };
  }
}
