import { pgTable, serial, varchar, date, numeric, unique, uniqueIndex, index } from 'drizzle-orm/pg-core';

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
