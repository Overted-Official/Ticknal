-- Migration: 0004_savings_interest_engine.sql
-- Add interest calculation and yield fields to user_bank_accounts

ALTER TABLE IF EXISTS "user_bank_accounts"
  ADD COLUMN IF NOT EXISTS "interest_rate" numeric(6, 2),
  ADD COLUMN IF NOT EXISTS "interest_frequency" varchar(30) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "last_interest_calc_date" date;
