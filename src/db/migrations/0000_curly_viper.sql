CREATE TABLE "daily_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"date" date NOT NULL,
	"open" numeric(12, 4),
	"high" numeric(12, 4),
	"low" numeric(12, 4),
	"close" numeric(12, 4),
	"volume" numeric(15, 2),
	CONSTRAINT "ticker_date_unique" UNIQUE("ticker_symbol","date")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"status" varchar(12) DEFAULT 'OPEN' NOT NULL,
	"side" varchar(10) DEFAULT 'LONG' NOT NULL,
	"entry_date" date NOT NULL,
	"entry_price" numeric(12, 4) NOT NULL,
	"quantity" numeric(16, 4) DEFAULT '1' NOT NULL,
	"target_price" numeric(12, 4),
	"stop_price" numeric(12, 4),
	"exit_date" date,
	"exit_price" numeric(12, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "signal_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"signal_date" date NOT NULL,
	"signal" varchar(20) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signal_notifications_unique" UNIQUE("user_id","ticker_symbol","signal_date","signal")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"date" date NOT NULL,
	"signal" varchar(10) NOT NULL,
	"confidence" numeric(5, 4),
	"prob_5d" numeric(5, 4),
	"prob_10d" numeric(5, 4),
	"prob_15d" numeric(5, 4),
	"prob_20d" numeric(5, 4),
	"prob_25d" numeric(5, 4),
	"model_version" varchar(50),
	CONSTRAINT "signal_ticker_date_unique" UNIQUE("ticker_symbol","date")
);
--> statement-breakpoint
CREATE TABLE "ticker_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticker_alerts_user_ticker_unique" UNIQUE("user_id","ticker_symbol")
);
--> statement-breakpoint
CREATE TABLE "tickers" (
	"symbol" varchar(20) PRIMARY KEY NOT NULL,
	"company_name" varchar(255),
	"website" varchar(255),
	"exchange" varchar(50) DEFAULT 'EGX',
	"sector" varchar(100),
	"industry" varchar(100),
	"logo_url" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "user_strategy_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker_symbol" varchar(20) NOT NULL,
	"strategy_name" varchar(50) NOT NULL,
	"params" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_strategy_settings_unique" UNIQUE("user_id","ticker_symbol","strategy_name")
);
--> statement-breakpoint
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_notifications" ADD CONSTRAINT "signal_notifications_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticker_alerts" ADD CONSTRAINT "ticker_alerts_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strategy_settings" ADD CONSTRAINT "user_strategy_settings_ticker_symbol_tickers_symbol_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "positions_status_idx" ON "positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "positions_user_ticker_status_idx" ON "positions" USING btree ("user_id","ticker_symbol","status");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signal_notifications_ticker_date_idx" ON "signal_notifications" USING btree ("ticker_symbol","signal_date");--> statement-breakpoint
CREATE INDEX "ticker_alerts_ticker_idx" ON "ticker_alerts" USING btree ("ticker_symbol");