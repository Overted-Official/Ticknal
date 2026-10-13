CREATE TABLE IF NOT EXISTS public.user_strategies (
  user_id uuid NOT NULL,
  id varchar(100) NOT NULL,
  name varchar(100) NOT NULL,
  mode varchar(12) NOT NULL,
  definition jsonb NOT NULL,
  selected_symbols jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_strategies_pk PRIMARY KEY (user_id, id),
  CONSTRAINT user_strategies_mode_check CHECK (mode IN ('simple', 'advanced'))
);

CREATE INDEX IF NOT EXISTS user_strategies_user_updated_idx
  ON public.user_strategies (user_id, updated_at DESC);

ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_strategies_user_isolation ON public.user_strategies;
CREATE POLICY user_strategies_user_isolation ON public.user_strategies
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_strategies_service_role_all ON public.user_strategies;
CREATE POLICY user_strategies_service_role_all ON public.user_strategies
  FOR ALL TO service_role USING (true) WITH CHECK (true);
