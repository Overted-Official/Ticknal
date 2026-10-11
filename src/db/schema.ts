import { boolean, date, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, unique, varchar, uuid } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  notificationsSeededAt: timestamp('notifications_seeded_at', { withTimezone: true }),
  notificationsClearedAt: timestamp('notifications_cleared_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: index('profiles_email_idx').on(table.email),
  };
});

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
  // Prices are stored in this instrument's native quote currency.
  currency: varchar('currency', { length: 10 }).default('EGP').notNull(),
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

export const priceAdjustments = pgTable('price_adjustments', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  effectiveDate: date('effective_date').notNull(),
  factor: numeric('factor', { precision: 18, scale: 10 }).notNull(),
  referencePriceBefore: numeric('reference_price_before', { precision: 12, scale: 4 }),
  referencePriceAfter: numeric('reference_price_after', { precision: 12, scale: 4 }),
  source: varchar('source', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).default('PENDING_REVIEW').notNull(),
  evidence: jsonb('evidence'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
}, (table) => {
  return {
    tickerEffectiveUnique: unique('price_adjustments_ticker_effective_unique').on(table.tickerSymbol, table.effectiveDate),
    statusIdx: index('price_adjustments_status_idx').on(table.status),
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

export const macroMoneySupply = pgTable('macro_money_supply', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(), // stored as YYYY-MM-DD
  indicator: varchar('indicator', { length: 20 }).notNull(), // 'M2' | 'M1' | 'M0'
  value: numeric('value', { precision: 20, scale: 2 }).notNull(), // Raw EGP amount (e.g. 15499852000000.00)
  change: numeric('change', { precision: 20, scale: 2 }), // Change from previous period
  changePercent: numeric('change_percent', { precision: 8, scale: 4 }), // % change e.g. 1.56
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    dateIndicatorUnique: unique('macro_money_supply_date_indicator_unique').on(table.date, table.indicator),
    dateIdx: index('macro_money_supply_date_idx').on(table.date),
    indicatorIdx: index('macro_money_supply_indicator_idx').on(table.indicator),
  };
});

export const macroObservations = pgTable('macro_observations', {
  id: serial('id').primaryKey(),
  seriesCode: varchar('series_code', { length: 64 }).notNull(),
  observationDate: date('observation_date').notNull(),
  value: numeric('value', { precision: 24, scale: 8 }).notNull(),
  unit: varchar('unit', { length: 32 }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  sourceName: varchar('source_name', { length: 100 }).notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceRevision: varchar('source_revision', { length: 64 }).notNull(),
  isLatest: boolean('is_latest').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  revisionUnique: unique('macro_observations_revision_unique').on(
    table.seriesCode,
    table.observationDate,
    table.sourceRevision,
  ),
  seriesDateIdx: index('macro_observations_series_date_idx').on(table.seriesCode, table.observationDate),
  publishedAtIdx: index('macro_observations_published_at_idx').on(table.publishedAt),
  latestIdx: index('macro_observations_latest_idx').on(table.seriesCode, table.isLatest, table.observationDate),
}));

export const egxInvestorFlows = pgTable('egx_investor_flows', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(), // stored as YYYY-MM-DD
  egyptianBuy: numeric('egyptian_buy', { precision: 16, scale: 2 }).default('0').notNull(),
  egyptianSell: numeric('egyptian_sell', { precision: 16, scale: 2 }).default('0').notNull(),
  egyptianNet: numeric('egyptian_net', { precision: 16, scale: 2 }).default('0').notNull(),
  arabBuy: numeric('arab_buy', { precision: 16, scale: 2 }).default('0').notNull(),
  arabSell: numeric('arab_sell', { precision: 16, scale: 2 }).default('0').notNull(),
  arabNet: numeric('arab_net', { precision: 16, scale: 2 }).default('0').notNull(),
  foreignBuy: numeric('foreign_buy', { precision: 16, scale: 2 }).default('0').notNull(),
  foreignSell: numeric('foreign_sell', { precision: 16, scale: 2 }).default('0').notNull(),
  foreignNet: numeric('foreign_net', { precision: 16, scale: 2 }).default('0').notNull(),
  totalTurnover: numeric('total_turnover', { precision: 16, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    dateIdx: index('egx_investor_flows_date_idx').on(table.date),
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

export const egxTradeStatistics = pgTable('egx_trade_statistics', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  trades: integer('trades').default(0),
  volume: numeric('volume', { precision: 18, scale: 2 }).default('0'),
  value: numeric('value', { precision: 18, scale: 2 }).default('0'),
  averageTradeSize: numeric('average_trade_size', { precision: 18, scale: 2 }).default('0'),
  absorptionRatio: numeric('absorption_ratio', { precision: 10, scale: 4 }).default('1.0000'),
  clv: numeric('clv', { precision: 6, scale: 4 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    tickerDateUnique: unique('egx_trade_stats_ticker_date_unique').on(table.tickerSymbol, table.date),
    tickerDateIdx: index('egx_trade_stats_ticker_date_idx').on(table.tickerSymbol, table.date),
  };
});

export const marketNews = pgTable('market_news', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  content: text('content'),
  category: varchar('category', { length: 50 }).notNull(), // 'egx_disclosures' | 'cbe_macro' | 'bullion_fx' | 'earnings' | 'sectors'
  categoryLabel: varchar('category_label', { length: 100 }).notNull(),
  tickers: jsonb('tickers').$type<string[]>().default([]).notNull(),
  sentiment: varchar('sentiment', { length: 20 }).default('neutral').notNull(), // 'bullish' | 'neutral' | 'bearish'
  source: varchar('source', { length: 100 }).notNull(),
  sourceUrl: text('source_url'),
  importance: varchar('importance', { length: 20 }).default('normal').notNull(), // 'critical' | 'high' | 'normal'
  impactMetric: varchar('impact_metric', { length: 100 }),
  readTime: varchar('read_time', { length: 30 }).default('2 min read').notNull(),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    categoryIdx: index('market_news_category_idx').on(table.category),
    publishedAtIdx: index('market_news_published_at_idx').on(table.publishedAt),
    sentimentIdx: index('market_news_sentiment_idx').on(table.sentiment),
  };
});

// ==========================================
// CONSOLE / ADMIN & MONETIZATION TABLES
// ==========================================

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminId: uuid('admin_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'user.role_update', 'subscription.grant', 'cron.trigger'
  targetId: varchar('target_id', { length: 255 }),      // User ID, ticker, or entity identifier
  metadata: jsonb('metadata'),                          // Audit details, payload, diff
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    adminIdx: index('audit_logs_admin_id_idx').on(table.adminId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    createdIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  };
});

export const subscriptionPlans = pgTable('subscription_plans', {
  id: varchar('id', { length: 50 }).primaryKey(), // 'free' | 'plus' | 'elite' | 'vip'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  monthlyPriceEgp: numeric('monthly_price_egp', { precision: 10, scale: 2 }).default('0').notNull(),
  annualPriceEgp: numeric('annual_price_egp', { precision: 10, scale: 2 }).default('0').notNull(),
  annualDiscountPct: integer('annual_discount_pct').default(0).notNull(),
  badge: varchar('badge', { length: 50 }),
  color: varchar('color', { length: 20 }).default('#787b86').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  limits: jsonb('limits').notNull(),
  features: jsonb('features').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  tier: varchar('tier', { length: 50 }).default('pro_monthly').notNull(), // 'free' | 'pro_monthly' | 'pro_annual' | 'elite'
  status: varchar('status', { length: 50 }).default('active').notNull(),   // 'active' | 'past_due' | 'canceled' | 'trialing'
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).defaultNow().notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  provider: varchar('provider', { length: 50 }).default('manual').notNull(), // 'stripe' | 'manual' | 'promo'
  providerCustomerId: varchar('provider_customer_id', { length: 255 }),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('user_subscriptions_user_id_idx').on(table.userId),
    statusIdx: index('user_subscriptions_status_idx').on(table.status),
    tierIdx: index('user_subscriptions_tier_idx').on(table.tier),
  };
});

export const userTelemetryEvents = pgTable('user_telemetry_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 128 }).notNull(),

  // Granular Geolocation (Targeting & Retargeting)
  country: varchar('country', { length: 100 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }).notNull(),
  regionOrGovernorate: varchar('region_or_governorate', { length: 100 }),
  city: varchar('city', { length: 100 }),
  latitude: numeric('latitude', { precision: 10, scale: 6 }),
  longitude: numeric('longitude', { precision: 10, scale: 6 }),
  timezone: varchar('timezone', { length: 50 }),
  ispOrCarrier: varchar('isp_or_carrier', { length: 100 }),

  // Attribution & Channel
  channel: varchar('channel', { length: 50 }).default('direct').notNull(),
  referrer: text('referrer'),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  landingPath: text('landing_path').default('/').notNull(),

  // Device & Client Specs
  deviceType: varchar('device_type', { length: 20 }).default('desktop').notNull(),
  os: varchar('os', { length: 50 }).notNull(),
  browser: varchar('browser', { length: 50 }).notNull(),
  isPwaOrNative: boolean('is_pwa_or_native').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('user_telemetry_user_id_idx').on(table.userId),
    channelIdx: index('user_telemetry_channel_idx').on(table.channel),
    countryIdx: index('user_telemetry_country_idx').on(table.countryCode),
    createdIdx: index('user_telemetry_created_at_idx').on(table.createdAt),
  };
});
