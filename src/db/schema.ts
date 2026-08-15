import { boolean, date, index, numeric, pgTable, serial, text, timestamp, unique, varchar, uuid } from 'drizzle-orm/pg-core';

export const tickers = pgTable('tickers', {
  symbol: varchar('symbol', { length: 20 }).primaryKey(),
  companyName: varchar('company_name', { length: 255 }),
  website: varchar('website', { length: 255 }),
  exchange: varchar('exchange', { length: 50 }).default('EGX'),
  sector: varchar('sector', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
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
