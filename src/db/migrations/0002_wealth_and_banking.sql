-- Create user_bank_accounts table
CREATE TABLE IF NOT EXISTS "user_bank_accounts" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "bank_id" integer REFERENCES "banks"("id") ON DELETE SET NULL,
  "custom_bank_name" varchar(255),
  "account_name" varchar(255) NOT NULL,
  "account_number" varchar(50),
  "account_type" varchar(50) DEFAULT 'CURRENT' NOT NULL,
  "currency" varchar(10) DEFAULT 'EGP' NOT NULL,
  "balance" numeric(16, 4) DEFAULT '0' NOT NULL,
  "color" varchar(30),
  "is_archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_bank_accounts_user_id_idx" ON "user_bank_accounts"("user_id");

-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS "bank_transactions" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "account_id" integer NOT NULL REFERENCES "user_bank_accounts"("id") ON DELETE CASCADE,
  "to_account_id" integer REFERENCES "user_bank_accounts"("id") ON DELETE SET NULL,
  "type" varchar(30) NOT NULL,
  "amount" numeric(16, 4) NOT NULL,
  "currency" varchar(10) DEFAULT 'EGP' NOT NULL,
  "category" varchar(100) DEFAULT 'Other' NOT NULL,
  "transaction_date" date NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "bank_transactions_user_id_date_idx" ON "bank_transactions"("user_id", "transaction_date");
CREATE INDEX IF NOT EXISTS "bank_transactions_account_id_idx" ON "bank_transactions"("account_id");

-- Create bank_monthly_snapshots table
CREATE TABLE IF NOT EXISTS "bank_monthly_snapshots" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "account_id" integer NOT NULL REFERENCES "user_bank_accounts"("id") ON DELETE CASCADE,
  "year_month" varchar(7) NOT NULL,
  "closing_balance" numeric(16, 4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "bank_monthly_snapshots_account_month_unique" UNIQUE ("account_id", "year_month")
);

CREATE INDEX IF NOT EXISTS "bank_monthly_snapshots_user_id_month_idx" ON "bank_monthly_snapshots"("user_id", "year_month");

-- Create macro_inflation_rates table
CREATE TABLE IF NOT EXISTS "macro_inflation_rates" (
  "id" serial PRIMARY KEY,
  "year_month" varchar(7) NOT NULL UNIQUE,
  "cbe_headline_inflation" numeric(6, 2) NOT NULL,
  "cbe_core_inflation" numeric(6, 2),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
