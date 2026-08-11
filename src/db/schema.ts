import { boolean, date, index, numeric, pgTable, serial, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

export const tickers = pgTable('tickers', {
  symbol: varchar('symbol', { length: 20 }).primaryKey(),
  companyName: varchar('company_name', { length: 255 }),
  website: varchar('website', { length: 255 }),
  exchange: varchar('exchange', { length: 50 }).default('EGX'),
  sector: varchar('sector', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
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

export const signals = pgTable('signals', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  signal: varchar('signal', { length: 10 }).notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 4 }),
  prob5d: numeric('prob_5d', { precision: 5, scale: 4 }),
  prob10d: numeric('prob_10d', { precision: 5, scale: 4 }),
  prob15d: numeric('prob_15d', { precision: 5, scale: 4 }),
  prob20d: numeric('prob_20d', { precision: 5, scale: 4 }),
  prob25d: numeric('prob_25d', { precision: 5, scale: 4 }),
  modelVersion: varchar('model_version', { length: 50 }),
}, (table) => {
  return {
    signalTickerDateUnique: unique('signal_ticker_date_unique').on(table.tickerSymbol, table.date),
  };
});

export const strategySignals = pgTable('strategy_signals', {
  id: serial('id').primaryKey(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  signal: varchar('signal', { length: 10 }).notNull(),
  masterIndex: numeric('master_index', { precision: 8, scale: 2 }),
  entryReason: varchar('entry_reason', { length: 255 }),
  exitReason: varchar('exit_reason', { length: 255 }),
  tickerClass: varchar('ticker_class', { length: 100 }),
  positionSizePct: numeric('position_size_pct', { precision: 5, scale: 4 }),
}, (table) => {
  return {
    strategySignalTickerDateUnique: unique('strategy_signal_ticker_date_unique').on(table.tickerSymbol, table.date),
  };
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  deviceId: varchar('device_id', { length: 64 }).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    endpointUnique: unique('push_subscriptions_endpoint_unique').on(table.endpoint),
    deviceIdIdx: index('push_subscriptions_device_id_idx').on(table.deviceId),
  };
});

export const tickerAlerts = pgTable('ticker_alerts', {
  id: serial('id').primaryKey(),
  deviceId: varchar('device_id', { length: 64 }).notNull(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    deviceTickerUnique: unique('ticker_alerts_device_ticker_unique').on(table.deviceId, table.tickerSymbol),
    tickerIdx: index('ticker_alerts_ticker_idx').on(table.tickerSymbol),
  };
});

export const signalNotifications = pgTable('signal_notifications', {
  id: serial('id').primaryKey(),
  deviceId: varchar('device_id', { length: 64 }).notNull(),
  tickerSymbol: varchar('ticker_symbol', { length: 20 })
    .notNull()
    .references(() => tickers.symbol, { onDelete: 'cascade' }),
  signalDate: date('signal_date').notNull(),
  signal: varchar('signal', { length: 20 }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    notificationUnique: unique('signal_notifications_unique').on(table.deviceId, table.tickerSymbol, table.signalDate, table.signal),
    tickerDateIdx: index('signal_notifications_ticker_date_idx').on(table.tickerSymbol, table.signalDate),
  };
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
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
    statusIdx: index('orders_status_idx').on(table.status),
    tickerStatusIdx: index('orders_ticker_status_idx').on(table.tickerSymbol, table.status),
  };
});
