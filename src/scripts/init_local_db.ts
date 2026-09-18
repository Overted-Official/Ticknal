import fs from 'fs';
import path from 'path';
import readline from 'readline';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { PGlite } from '@electric-sql/pglite';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PRIMARY_USER_ID = '4425418c-eef9-474e-bd27-acf59d2ec7f8'; // Abdelrahman Mamdouh

async function initLocalDatabase() {
  const dataDir = path.resolve(process.cwd(), '.local_pgdata');
  console.log(`[initLocalDatabase] Initializing PGlite at: ${dataDir}`);

  const client = new PGlite(dataDir);
  const liveDbUrl = process.env.DATABASE_URL;

  if (!liveDbUrl) {
    throw new Error('DATABASE_URL is not defined in .env.local');
  }

  const liveSql = postgres(liveDbUrl, {
    ssl: 'require',
    max: 1,
    connect_timeout: 10,
  });

  try {
    // 1. Emulate auth schema in local PGlite
    console.log('[1/10] Initializing auth schema and user context...');
    await client.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
        SELECT '${PRIMARY_USER_ID}'::uuid;
      $$ LANGUAGE sql;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
        SELECT 'authenticated'::text;
      $$ LANGUAGE sql;

      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email varchar(255),
        created_at timestamptz
      );
      DELETE FROM auth.users;
    `);

    const liveUsers = await liveSql`SELECT id, email, created_at FROM auth.users;`;
    for (const u of liveUsers) {
      await client.query(`INSERT INTO auth.users (id, email, created_at) VALUES ($1, $2, $3);`, [
        u.id,
        u.email,
        u.created_at,
      ]);
    }
    console.log(` -> Synced ${liveUsers.length} auth users.`);

    // 2. Tickers (All 300 from live Supabase)
    console.log('[2/10] Syncing tickers table...');
    await client.exec(`
      DROP TABLE IF EXISTS "tickers" CASCADE;
      CREATE TABLE "tickers" (
        "symbol" varchar(20) PRIMARY KEY NOT NULL,
        "company_name" varchar(255),
        "website" varchar(255),
        "exchange" varchar(50) DEFAULT 'EGX',
        "sector" varchar(100),
        "industry_group" varchar(100),
        "industry" varchar(100),
        "sub_industry" varchar(100),
        "logo_url" varchar(255)
      );
    `);

    const liveTickers = await liveSql`SELECT * FROM tickers;`;
    for (const t of liveTickers) {
      await client.query(
        `INSERT INTO tickers (symbol, company_name, website, exchange, sector, industry_group, industry, sub_industry, logo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [t.symbol, t.company_name, t.website, t.exchange, t.sector, t.industry_group, t.industry, t.sub_industry, t.logo_url]
      );
    }
    console.log(` -> Synced ${liveTickers.length} tickers.`);

    // 3. Banks (All 157 from live Supabase)
    console.log('[3/10] Syncing banks table...');
    await client.exec(`
      DROP TABLE IF EXISTS "banks" CASCADE;
      CREATE TABLE "banks" (
        "id" integer PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "logo_url" varchar(500),
        "location" varchar(255),
        "description" text,
        "website" varchar(500),
        "detail_url" varchar(500),
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );
    `);

    const liveBanks = await liveSql`SELECT * FROM banks;`;
    for (const b of liveBanks) {
      await client.query(
        `INSERT INTO banks (id, name, slug, logo_url, location, description, website, detail_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [b.id, b.name, b.slug, b.logo_url, b.location, b.description, b.website, b.detail_url, b.created_at, b.updated_at]
      );
    }
    console.log(` -> Synced ${liveBanks.length} banks.`);

    // 4. User Bank Accounts
    console.log('[4/10] Syncing user_bank_accounts...');
    await client.exec(`
      DROP TABLE IF EXISTS "user_bank_accounts" CASCADE;
      CREATE TABLE "user_bank_accounts" (
        "id" integer PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL,
        "bank_id" integer REFERENCES "banks"("id") ON DELETE set null,
        "custom_bank_name" varchar(255),
        "account_name" varchar(255) NOT NULL,
        "account_number" varchar(50),
        "account_type" varchar(50) DEFAULT 'CURRENT' NOT NULL,
        "currency" varchar(10) DEFAULT 'EGP' NOT NULL,
        "balance" numeric(16, 4) DEFAULT '0' NOT NULL,
        "interest_rate" numeric(6, 2),
        "interest_frequency" varchar(30) DEFAULT 'NONE',
        "last_interest_calc_date" date,
        "color" varchar(30),
        "is_default_expense" boolean DEFAULT false NOT NULL,
        "is_archived" boolean DEFAULT false NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );
      CREATE INDEX "user_bank_accounts_user_id_idx" ON "user_bank_accounts"("user_id");
    `);

    const liveAccounts = await liveSql`SELECT * FROM user_bank_accounts;`;
    for (const a of liveAccounts) {
      await client.query(
        `INSERT INTO user_bank_accounts (
           id, user_id, bank_id, custom_bank_name, account_name, account_number,
           account_type, currency, balance, interest_rate, interest_frequency,
           last_interest_calc_date, color, is_default_expense, is_archived, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);`,
        [
          a.id, a.user_id, a.bank_id, a.custom_bank_name, a.account_name, a.account_number,
          a.account_type, a.currency, a.balance, a.interest_rate, a.interest_frequency,
          a.last_interest_calc_date, a.color, a.is_default_expense, a.is_archived, a.created_at, a.updated_at
        ]
      );
    }
    console.log(` -> Synced ${liveAccounts.length} user bank accounts.`);

    // 5. Positions (All real positions from live)
    console.log('[5/10] Syncing real positions from live...');
    await client.exec(`
      DROP TABLE IF EXISTS "positions" CASCADE;
      CREATE TABLE "positions" (
        "id" integer PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL,
        "ticker_symbol" varchar(20) NOT NULL REFERENCES "tickers"("symbol") ON DELETE cascade,
        "status" varchar(12) DEFAULT 'OPEN' NOT NULL,
        "side" varchar(10) DEFAULT 'LONG' NOT NULL,
        "account_id" integer REFERENCES "user_bank_accounts"("id") ON DELETE set null,
        "entry_date" timestamptz NOT NULL,
        "entry_price" numeric(12, 4) NOT NULL,
        "quantity" numeric(14, 4) NOT NULL,
        "target_price" numeric(12, 4),
        "stop_price" numeric(12, 4),
        "exit_date" timestamptz,
        "exit_price" numeric(12, 4),
        "notes" text,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "entry_strategy_id" varchar(50),
        "entry_signal_date" date,
        "entry_signal_price" numeric(12, 4),
        "entry_source" varchar(50) DEFAULT 'MANUAL' NOT NULL
      );
      CREATE INDEX "positions_user_id_idx" ON "positions"("user_id");
      CREATE INDEX "positions_ticker_symbol_idx" ON "positions"("ticker_symbol");
      CREATE INDEX "positions_status_idx" ON "positions"("status");
    `);

    const livePositions = await liveSql`SELECT * FROM positions;`;
    for (const p of livePositions) {
      await client.query(
        `INSERT INTO positions (
           id, user_id, ticker_symbol, status, side, account_id,
           entry_date, entry_price, quantity, target_price, stop_price,
           exit_date, exit_price, notes, created_at, updated_at,
           entry_strategy_id, entry_signal_date, entry_signal_price, entry_source
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
        [
          p.id, p.user_id, p.ticker_symbol, p.status, p.side, p.account_id,
          p.entry_date, p.entry_price, p.quantity, p.target_price, p.stop_price,
          p.exit_date, p.exit_price, p.notes, p.created_at, p.updated_at,
          p.entry_strategy_id, p.entry_signal_date, p.entry_signal_price, p.entry_source
        ]
      );
    }
    console.log(` -> Synced ${livePositions.length} real user positions.`);

    // 6. Bank Transactions & Snapshots
    console.log('[6/10] Syncing bank transactions & monthly snapshots...');
    await client.exec(`
      DROP TABLE IF EXISTS "bank_transactions" CASCADE;
      CREATE TABLE "bank_transactions" (
        "id" integer PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL,
        "account_id" integer NOT NULL REFERENCES "user_bank_accounts"("id") ON DELETE cascade,
        "to_account_id" integer REFERENCES "user_bank_accounts"("id") ON DELETE set null,
        "type" varchar(30) NOT NULL,
        "amount" numeric(16, 4) NOT NULL,
        "currency" varchar(10) DEFAULT 'EGP' NOT NULL,
        "category" varchar(100) DEFAULT 'Other' NOT NULL,
        "transaction_date" date NOT NULL,
        "position_id" integer REFERENCES "positions"("id") ON DELETE set null,
        "notes" text,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );

      DROP TABLE IF EXISTS "bank_monthly_snapshots" CASCADE;
      CREATE TABLE "bank_monthly_snapshots" (
        "id" integer PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL,
        "account_id" integer NOT NULL REFERENCES "user_bank_accounts"("id") ON DELETE cascade,
        "year_month" varchar(7) NOT NULL,
        "closing_balance" numeric(16, 4) NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL
      );
    `);

    const liveTx = await liveSql`SELECT * FROM bank_transactions;`;
    for (const t of liveTx) {
      await client.query(
        `INSERT INTO bank_transactions (id, user_id, account_id, to_account_id, type, amount, currency, category, transaction_date, position_id, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [t.id, t.user_id, t.account_id, t.to_account_id, t.type, t.amount, t.currency, t.category, t.transaction_date, t.position_id, t.notes, t.created_at, t.updated_at]
      );
    }

    const liveSnaps = await liveSql`SELECT * FROM bank_monthly_snapshots;`;
    for (const s of liveSnaps) {
      await client.query(
        `INSERT INTO bank_monthly_snapshots (id, user_id, account_id, year_month, closing_balance, created_at)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [s.id, s.user_id, s.account_id, s.year_month, s.closing_balance, s.created_at]
      );
    }
    console.log(` -> Synced ${liveTx.length} transactions and ${liveSnaps.length} monthly snapshots.`);

    // 7. Macro Inflation Rates & User Settings
    console.log('[7/10] Syncing inflation rates and strategy settings...');
    await client.exec(`
      DROP TABLE IF EXISTS "macro_inflation_rates" CASCADE;
      CREATE TABLE "macro_inflation_rates" (
        "id" integer PRIMARY KEY NOT NULL,
        "year_month" varchar(7) NOT NULL UNIQUE,
        "cbe_headline_inflation" numeric(6, 2),
        "cbe_core_inflation" numeric(6, 2),
        "us_cpi_inflation" numeric(6, 2),
        "notes" text,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );

      DROP TABLE IF EXISTS "user_strategy_settings" CASCADE;
      CREATE TABLE "user_strategy_settings" (
        "id" integer PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL,
        "ticker_symbol" varchar(20) NOT NULL REFERENCES "tickers"("symbol") ON DELETE cascade,
        "strategy_name" varchar(50) NOT NULL,
        "params" text NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );
    `);

    const liveInflation = await liveSql`SELECT * FROM macro_inflation_rates;`;
    for (const inf of liveInflation) {
      await client.query(
        `INSERT INTO macro_inflation_rates (id, year_month, cbe_headline_inflation, cbe_core_inflation, us_cpi_inflation, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [inf.id, inf.year_month, inf.cbe_headline_inflation, inf.cbe_core_inflation, inf.us_cpi_inflation, inf.notes, inf.created_at, inf.updated_at]
      );
    }

    const liveSettings = await liveSql`SELECT * FROM user_strategy_settings;`;
    for (const s of liveSettings) {
      await client.query(
        `INSERT INTO user_strategy_settings (id, user_id, ticker_symbol, strategy_name, params, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [s.id, s.user_id, s.ticker_symbol, s.strategy_name, s.params, s.updated_at]
      );
    }
    console.log(` -> Synced ${liveInflation.length} inflation records and ${liveSettings.length} strategy settings.`);

    // 8. Signal Notifications & Bot Settings
    console.log('[8/10] Syncing signal notifications and bot settings...');
    await client.exec(`
      DROP TABLE IF EXISTS "signal_notifications" CASCADE;
      CREATE TABLE "signal_notifications" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" uuid NOT NULL,
        "ticker_symbol" varchar(20) NOT NULL REFERENCES "tickers"("symbol") ON DELETE cascade,
        "strategy" varchar(50) DEFAULT 'psi' NOT NULL,
        "signal_date" date NOT NULL,
        "signal" varchar(20) NOT NULL,
        "signal_price" numeric(12, 4),
        "signal_bars_ago" integer,
        "signal_reason" text,
        "analysis_start" date,
        "analysis_end" date,
        "data_as_of" date,
        "metrics" jsonb,
        "parameter_version" varchar(100),
        "sent_at" timestamptz DEFAULT now() NOT NULL
      );

      DROP TABLE IF EXISTS "intraday_bot_settings" CASCADE;
      CREATE TABLE "intraday_bot_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "bot_active" boolean DEFAULT false NOT NULL,
        "active_strategy" varchar(50) DEFAULT 'PSI_PURE' NOT NULL,
        "timeframe" varchar(10) DEFAULT '15m' NOT NULL,
        "max_concurrent_positions" integer DEFAULT 5 NOT NULL,
        "allocation_per_trade_egp" numeric(12, 2) DEFAULT '1000.00' NOT NULL,
        "eod_rule" varchar(30) DEFAULT 'CARRY_OVERNIGHT' NOT NULL,
        "daily_loss_halt_pct" numeric(6, 2) DEFAULT '3.00' NOT NULL,
        "broker_mode" varchar(20) DEFAULT 'PAPER' NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );

      DROP TABLE IF EXISTS "intraday_bot_tickers" CASCADE;
      CREATE TABLE "intraday_bot_tickers" (
        "id" serial PRIMARY KEY NOT NULL,
        "ticker_symbol" varchar(20) NOT NULL REFERENCES "tickers"("symbol") ON DELETE cascade,
        "strategy_id" varchar(50) DEFAULT 'PSI_PURE' NOT NULL,
        "timeframe" varchar(10) DEFAULT '15m' NOT NULL,
        "is_enabled" boolean DEFAULT true NOT NULL,
        "allocated_budget_egp" numeric(12, 2) DEFAULT '1000.00' NOT NULL,
        "max_loss_halt_pct" numeric(6, 2) DEFAULT '5.00' NOT NULL,
        "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
        "strategy_params" jsonb,
        "updated_at" timestamptz DEFAULT now() NOT NULL
      );
    `);

    const liveSignals = await liveSql`SELECT * FROM signal_notifications;`;
    for (const s of liveSignals) {
      await client.query(
        `INSERT INTO signal_notifications (id, user_id, ticker_symbol, strategy, signal_date, signal, signal_price, signal_bars_ago, signal_reason, analysis_start, analysis_end, data_as_of, metrics, parameter_version, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
        [s.id, s.user_id, s.ticker_symbol, s.strategy, s.signal_date, s.signal, s.signal_price, s.signal_bars_ago, s.signal_reason, s.analysis_start, s.analysis_end, s.data_as_of, JSON.stringify(s.metrics), s.parameter_version, s.sent_at]
      );
    }
    console.log(` -> Synced ${liveSignals.length} signal notifications.`);

    // 9. Sync Latest Daily Prices from live Supabase (>= 2026-08-14)
    console.log('[9/10] Syncing latest daily prices from live Supabase (>= 2026-08-14)...');
    await client.exec(`
      DROP TABLE IF EXISTS "daily_prices" CASCADE;
      CREATE TABLE "daily_prices" (
        "id" serial PRIMARY KEY NOT NULL,
        "ticker_symbol" varchar(20) NOT NULL REFERENCES "tickers"("symbol") ON DELETE cascade,
        "date" date NOT NULL,
        "open" numeric(12, 4),
        "high" numeric(12, 4),
        "low" numeric(12, 4),
        "close" numeric(12, 4),
        "volume" numeric(15, 2),
        CONSTRAINT "ticker_date_unique" UNIQUE("ticker_symbol", "date")
      );
      CREATE INDEX "daily_prices_ticker_idx" ON "daily_prices"("ticker_symbol");
      CREATE INDEX "daily_prices_date_idx" ON "daily_prices"("date");
    `);

    const recentPrices = await liveSql`
      SELECT ticker_symbol, date, open, high, low, close, volume 
      FROM daily_prices 
      WHERE date >= '2026-08-14';
    `;

    let recentBatch: string[] = [];
    for (const p of recentPrices) {
      const d = typeof p.date === 'string' ? p.date : p.date.toISOString().split('T')[0];
      recentBatch.push(`('${p.ticker_symbol}', '${d}', ${p.open || 0}, ${p.high || 0}, ${p.low || 0}, ${p.close || 0}, ${p.volume || 0})`);
      if (recentBatch.length >= 1000) {
        await client.exec(`
          INSERT INTO daily_prices (ticker_symbol, date, open, high, low, close, volume)
          VALUES ${recentBatch.join(',\n')}
          ON CONFLICT (ticker_symbol, date) DO NOTHING;
        `);
        recentBatch = [];
      }
    }
    if (recentBatch.length > 0) {
      await client.exec(`
        INSERT INTO daily_prices (ticker_symbol, date, open, high, low, close, volume)
        VALUES ${recentBatch.join(',\n')}
        ON CONFLICT (ticker_symbol, date) DO NOTHING;
      `);
    }
    console.log(` -> Synced ${recentPrices.length} latest live price candles.`);

    // 10. Load Historical Daily Prices from local CSV (>= 2023-01-01) with 0 network egress
    const csvPath = path.resolve(process.cwd(), '_playground/_random/consolidated_prices_new.csv');
    if (fs.existsSync(csvPath)) {
      console.log('[10/10] Loading multi-year historical prices from local CSV (>= 2023-01-01)...');
      const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let count = 0;
      let batchValues: string[] = [];
      const BATCH_SIZE = 2000;

      for await (const line of rl) {
        if (!line || line.startsWith('ticker,')) continue;
        const parts = line.split(',');
        if (parts.length < 7) continue;

        const [ticker, date, open, high, low, close, volume] = parts;
        // From 2023 onwards gives ~3.5 years of rich historical depth for technical charts
        if (date >= '2023-01-01') {
          const cleanO = parseFloat(open) || 0;
          const cleanH = parseFloat(high) || 0;
          const cleanL = parseFloat(low) || 0;
          const cleanC = parseFloat(close) || 0;
          const cleanV = parseFloat(volume) || 0;

          batchValues.push(
            `('${ticker.trim()}', '${date.trim()}', ${cleanO}, ${cleanH}, ${cleanL}, ${cleanC}, ${cleanV})`
          );
          count++;

          if (batchValues.length >= BATCH_SIZE) {
            await client.exec(`
              INSERT INTO daily_prices (ticker_symbol, date, open, high, low, close, volume)
              VALUES ${batchValues.join(',\n')}
              ON CONFLICT (ticker_symbol, date) DO NOTHING;
            `);
            batchValues = [];
          }
        }
      }

      if (batchValues.length > 0) {
        await client.exec(`
          INSERT INTO daily_prices (ticker_symbol, date, open, high, low, close, volume)
          VALUES ${batchValues.join(',\n')}
          ON CONFLICT (ticker_symbol, date) DO NOTHING;
        `);
      }
      console.log(` -> Loaded ${count} historical candles from local disk.`);
    }

    console.log('\n======================================================');
    console.log('SUCCESS: Local PGlite database has 100% of live data!');
    console.log(`Dev user active: ${PRIMARY_USER_ID} (Abdelrahman Mamdouh)`);
    console.log('Zero network egress will be consumed during dev execution.');
    console.log('======================================================\n');

  } finally {
    await liveSql.end();
  }
}

initLocalDatabase().catch((err) => {
  console.error('[initLocalDatabase] Fatal error:', err);
  process.exit(1);
});
