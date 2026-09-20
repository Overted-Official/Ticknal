CREATE TABLE "bank_monthly_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" integer NOT NULL,
	"year_month" varchar(7) NOT NULL,
	"closing_balance" numeric(16, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_monthly_snapshots_account_month_unique" UNIQUE("account_id","year_month")
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" integer NOT NULL,
	"to_account_id" integer,
	"type" varchar(30) NOT NULL,
	"amount" numeric(16, 4) NOT NULL,
	"currency" varchar(10) DEFAULT 'EGP' NOT NULL,
	"category" varchar(100) DEFAULT 'Other' NOT NULL,
	"transaction_date" date NOT NULL,
	"position_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"logo_url" varchar(500),
	"location" varchar(255),
	"description" text,
	"website" varchar(500),
	"detail_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "device_push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"token" text NOT NULL,
	"platform" varchar(20) DEFAULT 'android' NOT NULL,
	"device_model" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intraday_bot_tickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"strategy_id" varchar(50) DEFAULT 'PSI_PURE' NOT NULL,
	"timeframe" varchar(10) DEFAULT '15m' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"allocated_budget_egp" numeric(12, 2) DEFAULT '1000.00' NOT NULL,
	"max_loss_halt_pct" numeric(6, 2) DEFAULT '5.00' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"strategy_params" jsonb NOT NULL,
	"entry_levels" jsonb,
	"aym_multiplier" numeric(8, 2),
	"aym_limit" numeric(8, 2),
	"atr_distance" numeric(8, 2),
	"test_alpha_margin" numeric(10, 2),
	"test_win_rate" numeric(6, 2),
	"test_trades" integer,
	"avg_bars" numeric(8, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intraday_bot_tickers_sym_strat_tf_unique" UNIQUE("ticker_symbol","strategy_id","timeframe")
);
--> statement-breakpoint
CREATE TABLE "intraday_candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"timeframe" varchar(10) DEFAULT '15m' NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" numeric(12, 4) NOT NULL,
	"high" numeric(12, 4) NOT NULL,
	"low" numeric(12, 4) NOT NULL,
	"close" numeric(12, 4) NOT NULL,
	"volume" numeric(15, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "intraday_candles_sym_tf_ts_unique" UNIQUE("ticker_symbol","timeframe","timestamp")
);
--> statement-breakpoint
CREATE TABLE "intraday_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"strategy_id" varchar(50) DEFAULT 'PSI_PURE' NOT NULL,
	"timeframe" varchar(10) DEFAULT '15m' NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"entry_price" numeric(12, 4) NOT NULL,
	"entry_time" timestamp with time zone DEFAULT now() NOT NULL,
	"quantity" numeric(16, 4) DEFAULT '1' NOT NULL,
	"highest_price" numeric(12, 4),
	"target_price" numeric(12, 4),
	"trailing_stop_price" numeric(12, 4),
	"current_price" numeric(12, 4),
	"unrealized_pnl_pct" numeric(8, 2) DEFAULT '0.00',
	"exit_price" numeric(12, 4),
	"exit_time" timestamp with time zone,
	"exit_reason" varchar(50),
	"realized_pnl_pct" numeric(8, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intraday_signals_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"strategy_id" varchar(50) DEFAULT 'PSI_PURE' NOT NULL,
	"timeframe" varchar(10) DEFAULT '15m' NOT NULL,
	"signal_type" varchar(20) NOT NULL,
	"signal_price" numeric(12, 4) NOT NULL,
	"master_index" numeric(8, 2),
	"master_index_adjusted" numeric(8, 2),
	"signal_time" timestamp with time zone DEFAULT now() NOT NULL,
	"executed" boolean DEFAULT false NOT NULL,
	"execution_status" varchar(20) DEFAULT 'FILLED' NOT NULL,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "intraday_system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(10) DEFAULT 'INFO' NOT NULL,
	"source" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "macro_inflation_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"year_month" varchar(7) NOT NULL,
	"cbe_headline_inflation" numeric(6, 2),
	"cbe_core_inflation" numeric(6, 2),
	"us_cpi_inflation" numeric(6, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "macro_inflation_rates_year_month_unique" UNIQUE("year_month")
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(20) DEFAULT 'INFO' NOT NULL,
	"source" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bank_id" integer,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signal_notifications" DROP CONSTRAINT "signal_notifications_unique";--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "account_id" integer;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "entry_strategy_id" varchar(50);--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "entry_signal_date" date;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "entry_signal_price" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "entry_source" varchar(30) DEFAULT 'IMPORT';--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "strategy" varchar(50) DEFAULT 'psi' NOT NULL;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "signal_price" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "signal_bars_ago" integer;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "signal_reason" text;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "analysis_start" date;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "analysis_end" date;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "data_as_of" date;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "metrics" jsonb;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD COLUMN "parameter_version" varchar(100);--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN "industry_group" varchar(100);--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN "sub_industry" varchar(100);--> statement-breakpoint
ALTER TABLE "bank_monthly_snapshots" ADD CONSTRAINT "bank_monthly_snapshots_account_id_user_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user_bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_account_id_user_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user_bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_to_account_id_user_bank_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."user_bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intraday_bot_tickers" ADD CONSTRAINT "intraday_bot_tickers_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intraday_candles" ADD CONSTRAINT "intraday_candles_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intraday_positions" ADD CONSTRAINT "intraday_positions_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intraday_signals_log" ADD CONSTRAINT "intraday_signals_log_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bank_accounts" ADD CONSTRAINT "user_bank_accounts_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_monthly_snapshots_user_id_month_idx" ON "bank_monthly_snapshots" USING btree ("user_id","year_month");--> statement-breakpoint
CREATE INDEX "bank_transactions_user_id_date_idx" ON "bank_transactions" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "bank_transactions_account_id_idx" ON "bank_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "bank_transactions_position_id_idx" ON "bank_transactions" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "banks_slug_idx" ON "banks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "device_push_tokens_user_id_idx" ON "device_push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "intraday_bot_tickers_ticker_idx" ON "intraday_bot_tickers" USING btree ("ticker_symbol");--> statement-breakpoint
CREATE INDEX "intraday_candles_ticker_time_idx" ON "intraday_candles" USING btree ("ticker_symbol","timeframe","timestamp");--> statement-breakpoint
CREATE INDEX "intraday_positions_ticker_status_idx" ON "intraday_positions" USING btree ("ticker_symbol","status");--> statement-breakpoint
CREATE INDEX "intraday_signals_log_ticker_time_idx" ON "intraday_signals_log" USING btree ("ticker_symbol","signal_time");--> statement-breakpoint
CREATE INDEX "intraday_system_logs_created_idx" ON "intraday_system_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "intraday_system_logs_level_idx" ON "intraday_system_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "user_bank_accounts_user_id_idx" ON "user_bank_accounts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_account_id_user_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user_bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "positions_account_idx" ON "positions" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD CONSTRAINT "signal_notifications_unique" UNIQUE("user_id","ticker_symbol","strategy","signal_date","signal");