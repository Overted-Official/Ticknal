/**
 * Core Type Definitions for the Intraday Trading Bot Engine.
 *
 * Every module in `src/lib/bot-engine/` imports from this file.
 * Keep it dependency-free (no DB imports, no side effects).
 */

// ─────────────────────────────────────────────────────────
// Market Data
// ─────────────────────────────────────────────────────────

export interface CandleBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ComputedBar extends CandleBar {
  /** Raw 8-indicator weighted composite (0–100 scale) */
  masterIndex: number;
  /** Double-smoothed EMA(3) of masterIndex */
  masterIndexAdjusted: number;
  /** 14-period ATR (RMA-based) */
  atr14: number;
  /** 14-bar rolling median of |close - open| / open * 100 */
  medianBarMove: number;
  normPrice?: number;
  rsi?: number;
  bankerFlow?: number;
  supertrend?: number;
  adx?: number;
  bollingerPercentB?: number;
  maSpread?: number;
  slopeAngle?: number;
  rawIndex?: number;
  atr?: number;
  medianMove?: number;
}

// ─────────────────────────────────────────────────────────
// Signals
// ─────────────────────────────────────────────────────────

export type SignalType =
  | 'BUY'
  | 'SELL_TP'      // AYM Take-Profit
  | 'SELL_TRAIL'   // ATR Trailing Stop
  | 'SELL_STOPLOSS'// Hard Stop Loss
  | 'SELL_EOD'     // End-of-Day forced close
  | 'SELL_MANUAL'; // Manual force exit from UI

export interface BotSignal {
  type: SignalType;
  ticker: string;
  tickerSymbol?: string;
  price: number;
  masterIndex: number;
  masterIndexAdjusted: number;
  /** Which Fibonacci level was crossed (for BUY signals) */
  crossedLevel?: number;
  /** Computed target price (for BUY signals) */
  targetPrice?: number;
  /** Computed trailing stop (for BUY signals) */
  trailingStopPrice?: number;
  /** Position ID being closed (for SELL signals) */
  positionId?: number;
  /** Additional context */
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────
// Risk Guard
// ─────────────────────────────────────────────────────────

export interface RiskCheckResult {
  approved: boolean;
  rejectReason?: string;
  rejectSource?: string;
  reason?: string;
}

// ─────────────────────────────────────────────────────────
// Broker Bridge
// ─────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  filledPrice?: number;
  filledQty?: number;
  error?: string;
  latencyMs: number;
}

export interface BrokerQuote {
  bid: number;
  ask: number;
  last: number;
}

export interface BrokerBridge {
  readonly name: string;
  readonly mode: 'PAPER' | 'THNDR_LIVE';

  submitBuyOrder(
    ticker: string,
    qty: number,
    limitPrice: number
  ): Promise<ExecutionResult>;

  submitSellOrder(
    ticker: string,
    qty: number,
    limitPrice: number
  ): Promise<ExecutionResult>;

  getQuote(ticker: string): Promise<BrokerQuote>;

  healthCheck(): Promise<{ connected: boolean; latencyMs: number }>;
}

// ─────────────────────────────────────────────────────────
// Ticker Configuration (from DB row)
// ─────────────────────────────────────────────────────────

export interface TickerConfig {
  id: number;
  tickerSymbol: string;
  symbol?: string;
  strategyId: string;
  timeframe: string;
  isEnabled: boolean;
  allocatedBudgetEgp: number;
  maxLossHaltPct: number;
  status: string; // 'ACTIVE' | 'CIRCUIT_HALTED' | 'PAUSED'
  strategyParams: {
    entryLevels: number[];
    aymMultiplier: number;
    aymLimit: number;
    atrDistance: number;
    stopLoss?: number;
    maxLossHaltPct?: number;
  };
}

// ─────────────────────────────────────────────────────────
// Open Position (from DB row)
// ─────────────────────────────────────────────────────────

export interface OpenPosition {
  id: number;
  tickerSymbol: string;
  strategyId: string;
  timeframe: string;
  entryPrice: number;
  entryTime: Date;
  quantity: number;
  highestPrice: number;
  targetPrice: number;
  trailingStopPrice: number;
  currentPrice: number;
  unrealizedPnlPct: number;
}

// ─────────────────────────────────────────────────────────
// Bot Settings (from DB row)
// ─────────────────────────────────────────────────────────

export interface BotSettings {
  id: number;
  botActive: boolean;
  activeStrategy: string;
  timeframe: string;
  maxConcurrentPositions: number;
  allocationPerTradeEgp: number;
  eodRule: 'CARRY_OVERNIGHT' | 'HARD_CLOSE_EOD' | 'PROFIT_CLOSE_EOD';
  dailyLossHaltPct: number;
  brokerMode: 'PAPER' | 'THNDR_LIVE';
}

// ─────────────────────────────────────────────────────────
// Tick Context  (assembled at the start of each heartbeat)
// ─────────────────────────────────────────────────────────

export interface MarketState {
  status: 'OPEN' | 'CLOSED' | 'PRE_MARKET';
  cairoTime: string;
  cairoHour: number;
  cairoMinute: number;
  isTradingDay: boolean;
  isEodWindow: boolean; // true when >= 14:15 Cairo
}

export interface TickContext {
  settings: BotSettings;
  market: MarketState;
  enabledTickers: TickerConfig[];
  openPositions: OpenPosition[];
  closedTradesToday: Array<{ tickerSymbol: string; realizedPnlPct: number }>;
  closedPositionsToday?: Array<{ tickerSymbol: string; realizedPnlPct: number }>;
  totalRealizedPnlPctToday: number;
}

// ─────────────────────────────────────────────────────────
// Orchestrator Result
// ─────────────────────────────────────────────────────────

export interface TickResult {
  timestamp: Date;
  durationMs: number;
  candleIngestion: {
    totalTickers: number;
    successCount: number;
    failCount: number;
    latencyMs: number;
  };
  signalsGenerated: number;
  signalsApproved: number;
  signalsRejected: number;
  positionsOpened: number;
  positionsClosed: number;
  errors: string[];
}

// ─────────────────────────────────────────────────────────
// System Log Sources
// ─────────────────────────────────────────────────────────

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogSource =
  | 'CANDLE_INGESTION'
  | 'PSI_ENGINE'
  | 'SIGNAL_EVALUATOR'
  | 'RISK_GUARD'
  | 'POSITION_MANAGER'
  | 'BROKER_BRIDGE'
  | 'ORCHESTRATOR'
  | 'EOD_HANDLER';
