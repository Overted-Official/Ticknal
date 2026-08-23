import { botLog } from '@/lib/bot-engine/systemLogger';
import type { BrokerBridge, ExecutionResult, BrokerQuote } from '@/lib/bot-engine/types';

/**
 * Stub implementation for Thndr Live Execution Bridge
 */
export class ThndrLiveBridge implements BrokerBridge {
  name = 'Thndr Live Execution Bridge';
  mode = 'THNDR_LIVE' as const;

  /**
   * Submits a live buy order (stub)
   */
  async submitBuyOrder(ticker: string, qty: number, price: number): Promise<ExecutionResult> {
    const errorMsg = 'Thndr Live Bridge not yet implemented. Reverse engineering in progress.';
    botLog.warn('BROKER_BRIDGE', errorMsg, { ticker, qty, price });
    return {
      success: false,
      orderId: '',
      filledPrice: 0,
      filledQty: 0,
      error: errorMsg,
      latencyMs: 0
    };
  }

  /**
   * Submits a live sell order (stub)
   */
  async submitSellOrder(ticker: string, qty: number, price: number): Promise<ExecutionResult> {
    const errorMsg = 'Thndr Live Bridge not yet implemented. Reverse engineering in progress.';
    botLog.warn('BROKER_BRIDGE', errorMsg, { ticker, qty, price });
    return {
      success: false,
      orderId: '',
      filledPrice: 0,
      filledQty: 0,
      error: errorMsg,
      latencyMs: 0
    };
  }

  /**
   * Gets a live quote (stub)
   */
  async getQuote(ticker: string): Promise<BrokerQuote> {
    const errorMsg = 'Thndr Live Bridge not yet implemented. Reverse engineering in progress.';
    botLog.warn('BROKER_BRIDGE', errorMsg, { ticker });
    return { bid: 0, ask: 0, last: 0 };
  }

  /**
   * Health check (stub)
   */
  async healthCheck(): Promise<{ connected: boolean; latencyMs: number }> {
    return { connected: false, latencyMs: -1 };
  }
}
