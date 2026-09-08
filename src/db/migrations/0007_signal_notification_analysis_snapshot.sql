-- Persist the canonical strategy result alongside each signal event.
-- This makes the opportunities endpoint a bounded read on Vercel Hobby rather
-- than a request-time scan and re-analysis of the entire EGX price history.
ALTER TABLE IF EXISTS public.signal_notifications
  ADD COLUMN IF NOT EXISTS signal_price numeric(12, 4),
  ADD COLUMN IF NOT EXISTS signal_bars_ago integer,
  ADD COLUMN IF NOT EXISTS signal_reason text,
  ADD COLUMN IF NOT EXISTS analysis_start date,
  ADD COLUMN IF NOT EXISTS analysis_end date,
  ADD COLUMN IF NOT EXISTS data_as_of date,
  ADD COLUMN IF NOT EXISTS metrics jsonb,
  ADD COLUMN IF NOT EXISTS parameter_version varchar(100);

CREATE INDEX IF NOT EXISTS signal_notifications_buy_snapshot_idx
  ON public.signal_notifications (signal, signal_date, strategy)
  WHERE signal = 'BUY';
