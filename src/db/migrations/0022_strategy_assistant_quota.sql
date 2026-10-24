-- In-app assistant requests must have a durable, concurrent per-user budget.
ALTER TABLE public.user_strategies ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.strategy_assistant_quota (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_kind text NOT NULL CHECK (window_kind IN ('hour', 'day')),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, window_kind, window_start)
);

ALTER TABLE public.strategy_assistant_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.strategy_assistant_quota FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_strategy_assistant_quota()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  affected integer;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  hour_start timestamptz := date_trunc('hour', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF actor IS NULL THEN RETURN false; END IF;
  INSERT INTO public.strategy_assistant_quota (user_id, window_kind, window_start, request_count)
  VALUES (actor, 'day', day_start, 1)
  ON CONFLICT (user_id, window_kind, window_start) DO UPDATE
    SET request_count = public.strategy_assistant_quota.request_count + 1
    WHERE public.strategy_assistant_quota.request_count < 40;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN RETURN false; END IF;

  INSERT INTO public.strategy_assistant_quota (user_id, window_kind, window_start, request_count)
  VALUES (actor, 'hour', hour_start, 1)
  ON CONFLICT (user_id, window_kind, window_start) DO UPDATE
    SET request_count = public.strategy_assistant_quota.request_count + 1
    WHERE public.strategy_assistant_quota.request_count < 12;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_strategy_assistant_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_strategy_assistant_quota() TO authenticated;
