ALTER TABLE public.tickers
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS delisted_at timestamptz;

CREATE INDEX IF NOT EXISTS tickers_status_idx
  ON public.tickers (status);
