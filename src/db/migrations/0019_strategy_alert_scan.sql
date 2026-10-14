ALTER TABLE public.user_strategies
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_session date,
  ADD COLUMN IF NOT EXISTS notification_cursor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_generation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_lease_token varchar(36),
  ADD COLUMN IF NOT EXISTS notification_lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS notification_last_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_error text;

CREATE INDEX IF NOT EXISTS user_strategies_notification_scan_idx
  ON public.user_strategies (notifications_enabled, notification_last_scanned_at);

ALTER TABLE public.signal_notifications
  ALTER COLUMN strategy TYPE varchar(100);

ALTER TABLE public.signal_notifications
  ADD COLUMN IF NOT EXISTS push_delivery_status varchar(16) NOT NULL DEFAULT 'not-applicable',
  ADD COLUMN IF NOT EXISTS push_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_next_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS signal_notifications_push_pending_idx
  ON public.signal_notifications (push_next_attempt_at, sent_at)
  WHERE push_delivery_status IN ('pending', 'retry');

ALTER TABLE public.positions
  ALTER COLUMN entry_strategy_id TYPE varchar(100);
