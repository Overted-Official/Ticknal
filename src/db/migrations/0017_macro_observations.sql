CREATE TABLE IF NOT EXISTS public.macro_observations (
  id serial PRIMARY KEY,
  series_code varchar(64) NOT NULL,
  observation_date date NOT NULL,
  value numeric(24, 8) NOT NULL,
  unit varchar(32) NOT NULL,
  published_at timestamp with time zone NOT NULL,
  source_name varchar(100) NOT NULL,
  source_url text NOT NULL,
  source_revision varchar(64) NOT NULL,
  is_latest boolean DEFAULT true NOT NULL,
  metadata jsonb,
  retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT macro_observations_revision_unique UNIQUE(series_code, observation_date, source_revision)
);

CREATE INDEX IF NOT EXISTS macro_observations_series_date_idx
  ON public.macro_observations (series_code, observation_date DESC);
CREATE INDEX IF NOT EXISTS macro_observations_published_at_idx
  ON public.macro_observations (published_at DESC);
CREATE INDEX IF NOT EXISTS macro_observations_latest_idx
  ON public.macro_observations (series_code, is_latest, observation_date DESC);

ALTER TABLE IF EXISTS public.macro_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "macro_observations_read_all" ON public.macro_observations;
CREATE POLICY "macro_observations_read_all" ON public.macro_observations
  FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "macro_observations_service_role_all" ON public.macro_observations;
CREATE POLICY "macro_observations_service_role_all" ON public.macro_observations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
