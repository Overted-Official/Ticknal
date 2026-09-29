ALTER TABLE "tickers"
  ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'EGP' NOT NULL;
--> statement-breakpoint
UPDATE "tickers"
SET "currency" = 'USD'
WHERE "symbol" IN ('GC1!', 'SI1!');
--> statement-breakpoint
UPDATE "tickers"
SET "currency" = CASE
  WHEN "symbol" IN ('OZE', 'MEM') THEN 'EUR'
  WHEN "symbol" IN ('BOU', 'AZ30', 'BUS', 'MUF', 'HFU', 'GUS', 'MFU', 'OZU', 'YYU') THEN 'USD'
  ELSE "currency"
END
WHERE "symbol" IN ('OZE', 'MEM', 'BOU', 'AZ30', 'BUS', 'MUF', 'HFU', 'GUS', 'MFU', 'OZU', 'YYU');
