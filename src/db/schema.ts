import { boolean, date, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, unique, varchar, uuid } from 'drizzle-orm/pg-core';

export const tickers = pgTable('tickers', {
  symbol: varchar('symbol', { length: 20 }).primaryKey(),
  companyName: varchar('company_name', { length: 255 }),
  website: varchar('website', { length: 255 }),
  exchange: varchar('exchange', { length: 50 }).default('EGX'),
  sector: varchar('sector', { length: 100 }),
  industryGroup: varchar('industry_group', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  subIndustry: varchar('sub_industry', { length: 100 }),
  logoUrl: varchar('logo_url', { length: 255 }),
});

export const dailyPrices = pgTable('daily_prices', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 }).references(() => tickers.symbol, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(), // stored as YYYY-MM-DD
  open: numeric('open', { precision: 12, scale: 4 }),
  high: numeric('high', { precision: 12, scale: 4 }),
  low: numeric('low', { precision: 12, scale: 4 }),
  close: numeric('close', { precision: 12, scale: 4 }),
  volume: numeric('volume', { precision: 15, scale: 2 }),
}, (table) => {
  return {
    tickerDateUnique: unique('ticker_date_unique').on(table.tickerSymbol, table.date),
  };
});

// Removed old ML signals table as signals are now dynamically calculated per user configuration
// Removed strategy_signals table as signals are now dynamically calculated per user configuration

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    endpointUnique: unique('push_subscriptions_endpoint_unique').on(table.endpoint),
    userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  };
});

export const devicePushTokens = pgTable('device_push_tokens', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id'),
  token: text('token').notNull(),
  platform: varchar('platform', { length: 20 }).default('android').notNull(), // 'android' | 'ios'
  deviceModel: text('device_model'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    tokenUnique: unique('device_push_tokens_token_unique').on(table.token),
    userIdIdx: index('device_push_tokens_user_id_idx').on(table.userId),
  };
});

export const tickerAlerts = pgTable('ticker_alerts', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userTickerUnique: unique('ticker_alerts_user_ticker_unique').on(table.userId, table.tickerSymbol),
    tickerIdx: index('ticker_alerts_ticker_idx').on(table.tickerSymbol),
  };
});

export const signalNotifications = pgTable('signal_notifications', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  strategy: varchar('strategy', { length: 50 }).default('psi').notNull(),
  signalDate: date('signal_date').notNull(),
  signal: varchar('signal', { length: 20 }).notNull(),
  // Canonical analysis snapshot written by the scheduled signal processor.
  signalPrice: numeric('signal_price', { precision: 12, scale: 4 }),
  signalBarsAgo: integer('signal_bars_ago'),
  signalReason: text('signal_reason'),
  analysisStart: date('analysis_start'),
  analysisEnd: date('analysis_end'),
  dataAsOf: date('data_as_of'),
  metrics: jsonb('metrics'),
  parameterVersion: varchar('parameter_version', { length: 100 }),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    notificationUnique: unique('signal_notifications_unique').on(table.userId, table.tickerSymbol, table.strategy, table.signalDate, table.signal),
    tickerDateIdx: index('signal_notifications_ticker_date_idx').on(table.tickerSymbol, table.signalDate),
  };
});

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  status: varchar('status', { length: 12 }).default('OPEN').notNull(),
  side: varchar('side', { length: 10 }).default('LONG').notNull(),
  accountId: integer('account_id').references(() => userBankAccounts.id, { onDelete: 'set null' }),
  entryDate: date('entry_date').notNull(),
  entryPrice: numeric('entry_price', { precision: 12, scale: 4 }).notNull(),
  quantity: numeric('quantity', { precision: 16, scale: 4 }).default('1').notNull(),
  targetPrice: numeric('target_price', { precision: 12, scale: 4 }),
  stopPrice: numeric('stop_price', { precision: 12, scale: 4 }),
  exitDate: date('exit_date'),
  exitPrice: numeric('exit_price', { precision: 12, scale: 4 }),
  entryStrategyId: varchar('entry_strategy_id', { length: 50 }),
  entrySignalDate: date('entry_signal_date'),
  entrySignalPrice: numeric('entry_signal_price', { precision: 12, scale: 4 }),
  entrySource: varchar('entry_source', { length: 30 }).default('IMPORT'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    statusIdx: index('positions_status_idx').on(table.status),
    userTickerStatusIdx: index('positions_user_ticker_status_idx').on(table.userId, table.tickerSymbol, table.status),
    accountIdx: index('positions_account_idx').on(table.accountId),
  };
});

export const userStrategySettings = pgTable('user_strategy_settings', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  strategyName: varchar('strategy_name', { length: 50 }).notNull(),
  params: text('params').notNull(), // Stores JSON stringified parameters
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userTickerStrategyUnique: unique('user_strategy_settings_unique').on(table.userId, table.tickerSymbol, table.strategyName),
  };
});

export const banks = pgTable('banks', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  website: varchar('website', { length: 500 }),
  detailUrl: varchar('detail_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    slugUnique: unique('banks_slug_unique').on(table.slug),
    slugIdx: index('banks_slug_idx').on(table.slug),
  };
});

export const userBankAccounts = pgTable('user_bank_accounts', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  bankId: integer('bank_id').references(() => banks.id, { onDelete: 'set null' }),
  customBankName: varchar('custom_bank_name', { length: 255 }),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }),
  accountType: varchar('account_type', { length: 50 }).default('CURRENT').notNull(), // CURRENT, SAVINGS, CD_TIME_DEPOSIT, BROKERAGE, BROKER_CASH (legacy), WALLET
  currency: varchar('currency', { length: 10 }).default('EGP').notNull(), // EGP, USD
  balance: numeric('balance', { precision: 16, scale: 4 }).default('0').notNull(),
  interestRate: numeric('interest_rate', { precision: 6, scale: 2 }), // e.g. 6.00 for 6.00% APR
  interestFrequency: varchar('interest_frequency', { length: 30 }).default('NONE'), // DAILY, MONTHLY, QUARTERLY, ANNUALLY, NONE
  lastInterestCalcDate: date('last_interest_calc_date'), // YYYY-MM-DD
  color: varchar('color', { length: 30 }),
  isDefaultExpense: boolean('is_default_expense').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('user_bank_accounts_user_id_idx').on(table.userId),
  };
});

export const bankTransactions = pgTable('bank_transactions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  accountId: integer('account_id').references(() => userBankAccounts.id, { onDelete: 'cascade' }).notNull(),
  toAccountId: integer('to_account_id').references(() => userBankAccounts.id, { onDelete: 'set null' }), // for transfers
  type: varchar('type', { length: 30 }).notNull(), // DEPOSIT, WITHDRAWAL, TRANSFER, EXPENSE, INCOME, BROKERAGE_BUY, BROKERAGE_SELL, BROKER_INJECTION, BROKER_WITHDRAWAL
  amount: numeric('amount', { precision: 16, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('EGP').notNull(),
  category: varchar('category', { length: 100 }).default('Other').notNull(), // Living, Housing, Food, Trading, Salary, Savings, Investments, Other
  transactionDate: date('transaction_date').notNull(), // YYYY-MM-DD
  positionId: integer('position_id').references(() => positions.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdDateIdx: index('bank_transactions_user_id_date_idx').on(table.userId, table.transactionDate),
    accountIdIdx: index('bank_transactions_account_id_idx').on(table.accountId),
    positionIdIdx: index('bank_transactions_position_id_idx').on(table.positionId),
  };
});

export const bankMonthlySnapshots = pgTable('bank_monthly_snapshots', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  accountId: integer('account_id').references(() => userBankAccounts.id, { onDelete: 'cascade' }).notNull(),
  yearMonth: varchar('year_month', { length: 7 }).notNull(), // YYYY-MM
  closingBalance: numeric('closing_balance', { precision: 16, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    accountMonthUnique: unique('bank_monthly_snapshots_account_month_unique').on(table.accountId, table.yearMonth),
    userIdMonthIdx: index('bank_monthly_snapshots_user_id_month_idx').on(table.userId, table.yearMonth),
  };
});

export const macroInflationRates = pgTable('macro_inflation_rates', {
  id: serial('id').primaryKey(),
  yearMonth: varchar('year_month', { length: 7 }).notNull(), // YYYY-MM
  cbeHeadlineInflation: numeric('cbe_headline_inflation', { precision: 6, scale: 2 }), // e.g. 15.20 for 15.2%; null when only US CPI is available
  cbeCoreInflation: numeric('cbe_core_inflation', { precision: 6, scale: 2 }),
  usCpiInflation: numeric('us_cpi_inflation', { precision: 6, scale: 2 }), // e.g. 2.80 for 2.8%
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    yearMonthUnique: unique('macro_inflation_rates_year_month_unique').on(table.yearMonth),
  };
});

export const systemLogs = pgTable('system_logs', {
  id: serial('id').primaryKey(),
  level: varchar('level', { length: 20 }).default('INFO').notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// INTRADAY TRADING BOT TABLES (STRATEGY-AGNOSTIC)
// ==========================================

export const intradayBotSettings = pgTable('intraday_bot_settings', {
  id: serial('id').primaryKey(),
  botActive: boolean('bot_active').default(false).notNull(),
  activeStrategy: varchar('active_strategy', { length: 50 }).default('PSI_PURE').notNull(),
  timeframe: varchar('timeframe', { length: 10 }).default('15m').notNull(),
  maxConcurrentPositions: integer('max_concurrent_positions').default(5).notNull(),
  allocationPerTradeEgp: numeric('allocation_per_trade_egp', { precision: 12, scale: 2 }).default('1000.00').notNull(),
  eodRule: varchar('eod_rule', { length: 30 }).default('CARRY_OVERNIGHT').notNull(), // 'CARRY_OVERNIGHT' | 'HARD_CLOSE_EOD' | 'PROFIT_CLOSE_EOD'
  dailyLossHaltPct: numeric('daily_loss_halt_pct', { precision: 6, scale: 2 }).default('3.00').notNull(),
  brokerMode: varchar('broker_mode', { length: 20 }).default('PAPER').notNull(), // 'PAPER' | 'THNDR_LIVE'
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const intradayBotTickers = pgTable('intraday_bot_tickers', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  strategyId: varchar('strategy_id', { length: 50 }).default('PSI_PURE').notNull(),
  timeframe: varchar('timeframe', { length: 10 }).default('15m').notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  allocatedBudgetEgp: numeric('allocated_budget_egp', { precision: 12, scale: 2 }).default('1000.00').notNull(),
  maxLossHaltPct: numeric('max_loss_halt_pct', { precision: 6, scale: 2 }).default('5.00').notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // 'ACTIVE' | 'CIRCUIT_HALTED' | 'PAUSED'
  strategyParams: jsonb('strategy_params').notNull(), // Dynamic strategy parameters e.g. { entryLevels: [50.0, 61.8], aymMultiplier: 4.0, aymLimit: 50.0, atrDistance: 6.0 }
  entryLevels: jsonb('entry_levels'), // Backward compatibility helper
  aymMultiplier: numeric('aym_multiplier', { precision: 8, scale: 2 }),
  aymLimit: numeric('aym_limit', { precision: 8, scale: 2 }),
  atrDistance: numeric('atr_distance', { precision: 8, scale: 2 }),
  testAlphaMargin: numeric('test_alpha_margin', { precision: 10, scale: 2 }),
  testWinRate: numeric('test_win_rate', { precision: 6, scale: 2 }),
  testTrades: integer('test_trades'),
  avgBars: numeric('avg_bars', { precision: 8, scale: 2 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    tickerStratTfUnique: unique('intraday_bot_tickers_sym_strat_tf_unique').on(
      table.tickerSymbol,
      table.strategyId,
      table.timeframe
    ),
    tickerIdx: index('intraday_bot_tickers_ticker_idx').on(table.tickerSymbol),
  };
});

export const intradayPositions = pgTable('intraday_positions', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  strategyId: varchar('strategy_id', { length: 50 }).default('PSI_PURE').notNull(),
  timeframe: varchar('timeframe', { length: 10 }).default('15m').notNull(),
  status: varchar('status', { length: 20 }).default('OPEN').notNull(), // 'OPEN' | 'CLOSED' | 'CANCELLED'
  entryPrice: numeric('entry_price', { precision: 12, scale: 4 }).notNull(),
  entryTime: timestamp('entry_time', { withTimezone: true }).defaultNow().notNull(),
  quantity: numeric('quantity', { precision: 16, scale: 4 }).default('1').notNull(),
  highestPrice: numeric('highest_price', { precision: 12, scale: 4 }),
  targetPrice: numeric('target_price', { precision: 12, scale: 4 }),
  trailingStopPrice: numeric('trailing_stop_price', { precision: 12, scale: 4 }),
  currentPrice: numeric('current_price', { precision: 12, scale: 4 }),
  unrealizedPnlPct: numeric('unrealized_pnl_pct', { precision: 8, scale: 2 }).default('0.00'),
  exitPrice: numeric('exit_price', { precision: 12, scale: 4 }),
  exitTime: timestamp('exit_time', { withTimezone: true }),
  exitReason: varchar('exit_reason', { length: 50 }), // 'AYM_TARGET' | 'ATR_TRAIL' | 'EOD_CLOSE' | 'MANUAL_FORCE_CLOSE'
  realizedPnlPct: numeric('realized_pnl_pct', { precision: 8, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    tickerStatusIdx: index('intraday_positions_ticker_status_idx').on(table.tickerSymbol, table.status),
  };
});

export const intradaySignalsLog = pgTable('intraday_signals_log', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  strategyId: varchar('strategy_id', { length: 50 }).default('PSI_PURE').notNull(),
  timeframe: varchar('timeframe', { length: 10 }).default('15m').notNull(),
  signalType: varchar('signal_type', { length: 20 }).notNull(), // 'BUY' | 'SELL_TP' | 'SELL_TRAIL' | 'SELL_EOD' | 'SELL_MANUAL'
  signalPrice: numeric('signal_price', { precision: 12, scale: 4 }).notNull(),
  masterIndex: numeric('master_index', { precision: 8, scale: 2 }),
  masterIndexAdjusted: numeric('master_index_adjusted', { precision: 8, scale: 2 }),
  signalTime: timestamp('signal_time', { withTimezone: true }).defaultNow().notNull(),
  executed: boolean('executed').default(false).notNull(),
  executionStatus: varchar('execution_status', { length: 20 }).default('FILLED').notNull(), // 'FILLED' | 'MISSED' | 'REJECTED' | 'PENDING'
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
}, (table) => {
  return {
    tickerTimeIdx: index('intraday_signals_log_ticker_time_idx').on(table.tickerSymbol, table.signalTime),
  };
});

export const intradaySystemLogs = pgTable('intraday_system_logs', {
  id: serial('id').primaryKey(),
  level: varchar('level', { length: 10 }).default('INFO').notNull(), // 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  source: varchar('source', { length: 50 }).notNull(), // 'CANDLE_INGESTION' | 'PSI_ENGINE' | 'BROKER_BRIDGE' | 'RISK_GUARD'
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    createdIdx: index('intraday_system_logs_created_idx').on(table.createdAt),
    levelIdx: index('intraday_system_logs_level_idx').on(table.level),
  };
});

export const intradayCandles = pgTable('intraday_candles', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  timeframe: varchar('timeframe', { length: 10 }).default('15m').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  open: numeric('open', { precision: 12, scale: 4 }).notNull(),
  high: numeric('high', { precision: 12, scale: 4 }).notNull(),
  low: numeric('low', { precision: 12, scale: 4 }).notNull(),
  close: numeric('close', { precision: 12, scale: 4 }).notNull(),
  volume: numeric('volume', { precision: 15, scale: 2 }).default('0').notNull(),
}, (table) => {
  return {
    uniqueCandle: unique('intraday_candles_sym_tf_ts_unique').on(
      table.tickerSymbol,
      table.timeframe,
      table.timestamp
    ),
    tickerTimeIdx: index('intraday_candles_ticker_time_idx').on(
      table.tickerSymbol,
      table.timeframe,
      table.timestamp
    ),
  };
});
