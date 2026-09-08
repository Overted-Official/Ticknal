-- Investment Command Center: canonical brokerage linkage and trade provenance.
ALTER TABLE IF EXISTS public.positions
  ADD COLUMN IF NOT EXISTS account_id integer,
  ADD COLUMN IF NOT EXISTS entry_strategy_id varchar(50),
  ADD COLUMN IF NOT EXISTS entry_signal_date date,
  ADD COLUMN IF NOT EXISTS entry_signal_price numeric(12, 4),
  ADD COLUMN IF NOT EXISTS entry_source varchar(30) DEFAULT 'IMPORT';

DO $$
BEGIN
  IF to_regclass('public.positions') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'positions_account_id_user_bank_accounts_id_fk') THEN
    ALTER TABLE public.positions
      ADD CONSTRAINT positions_account_id_user_bank_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES public.user_bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS positions_account_idx ON public.positions(account_id);

ALTER TABLE IF EXISTS public.bank_transactions
  ADD COLUMN IF NOT EXISTS position_id integer;

DO $$
BEGIN
  IF to_regclass('public.bank_transactions') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_transactions_position_id_positions_id_fk') THEN
    ALTER TABLE public.bank_transactions
      ADD CONSTRAINT bank_transactions_position_id_positions_id_fk
      FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bank_transactions_position_id_idx ON public.bank_transactions(position_id);

-- BROKER_CASH was the old display-only account. Keep the records and promote
-- them to the canonical brokerage account type.
UPDATE public.user_bank_accounts
SET account_type = 'BROKERAGE', updated_at = NOW()
WHERE account_type = 'BROKER_CASH';
