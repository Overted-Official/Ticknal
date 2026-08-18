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
  signalDate: date('signal_date').notNull(),
  signal: varchar('signal', { length: 20 }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    notificationUnique: unique('signal_notifications_unique').on(table.userId, table.tickerSymbol, table.signalDate, table.signal),
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
  entryDate: date('entry_date').notNull(),
  entryPrice: numeric('entry_price', { precision: 12, scale: 4 }).notNull(),
  quantity: numeric('quantity', { precision: 16, scale: 4 }).default('1').notNull(),
  targetPrice: numeric('target_price', { precision: 12, scale: 4 }),
  stopPrice: numeric('stop_price', { precision: 12, scale: 4 }),
  exitDate: date('exit_date'),
  exitPrice: numeric('exit_price', { precision: 12, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    statusIdx: index('positions_status_idx').on(table.status),
    userTickerStatusIdx: index('positions_user_ticker_status_idx').on(table.userId, table.tickerSymbol, table.status),
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
  accountType: varchar('account_type', { length: 50 }).default('CURRENT').notNull(), // CURRENT, SAVINGS, CD_TIME_DEPOSIT, BROKER_CASH, WALLET
  currency: varchar('currency', { length: 10 }).default('EGP').notNull(), // EGP, USD
  balance: numeric('balance', { precision: 16, scale: 4 }).default('0').notNull(),
  color: varchar('color', { length: 30 }),
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
  type: varchar('type', { length: 30 }).notNull(), // DEPOSIT, WITHDRAWAL, TRANSFER, EXPENSE, INCOME, BROKER_INJECTION, BROKER_WITHDRAWAL
  amount: numeric('amount', { precision: 16, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('EGP').notNull(),
  category: varchar('category', { length: 100 }).default('Other').notNull(), // Living, Housing, Food, Trading, Salary, Savings, Investments, Other
  transactionDate: date('transaction_date').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdDateIdx: index('bank_transactions_user_id_date_idx').on(table.userId, table.transactionDate),
    accountIdIdx: index('bank_transactions_account_id_idx').on(table.accountId),
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
  cbeHeadlineInflation: numeric('cbe_headline_inflation', { precision: 6, scale: 2 }).notNull(), // e.g. 15.20 for 15.2%
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

export const psiCombinations = pgTable('psi_combinations', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  model: varchar('model', { length: 10 }).notNull(), // 'psi8' | 'psi40'
  entryLevels: jsonb('entry_levels').notNull(), // e.g. [23.6, 38.2]
  useAym: boolean('use_aym').default(true).notNull(),
  aymMultiplier: numeric('aym_multiplier', { precision: 8, scale: 2 }),
  aymLimit: numeric('aym_limit', { precision: 8, scale: 2 }),
  useAtr: boolean('use_atr').default(true).notNull(),
  atrDistance: numeric('atr_distance', { precision: 8, scale: 2 }),
  inSampleRoiMargin: numeric('in_sample_roi_margin', { precision: 10, scale: 2 }),
  inSampleWinRate: numeric('in_sample_win_rate', { precision: 6, scale: 2 }),
  inSampleTrades: integer('in_sample_trades'),
  outOfSampleRoiMargin: numeric('out_of_sample_roi_margin', { precision: 10, scale: 2 }),
  outOfSampleWinRate: numeric('out_of_sample_win_rate', { precision: 6, scale: 2 }),
  outOfSampleTrades: integer('out_of_sample_trades'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    tickerModelUnique: unique('psi_combinations_ticker_model_unique').on(table.tickerSymbol, table.model),
    tickerIdx: index('psi_combinations_ticker_idx').on(table.tickerSymbol),
  };
});
