import { PaperBridge } from './paperBridge';
import { ThndrLiveBridge } from './thndrLiveBridge';
import type { BrokerBridge } from '@/lib/bot-engine/types';

/**
 * Creates a broker bridge instance based on the specified mode
 */
export function createBrokerBridge(mode: 'PAPER' | 'THNDR_LIVE'): BrokerBridge {
  if (mode === 'THNDR_LIVE') return new ThndrLiveBridge();
  return new PaperBridge();
}
