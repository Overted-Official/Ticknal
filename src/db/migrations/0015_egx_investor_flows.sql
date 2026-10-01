-- Create egx_investor_flows table to track daily domestic, Arab, and foreign capital flows
CREATE TABLE IF NOT EXISTS public.egx_investor_flows (
  id serial PRIMARY KEY,
  date date NOT NULL UNIQUE,
  egyptian_buy numeric(16, 2) NOT NULL DEFAULT 0,
  egyptian_sell numeric(16, 2) NOT NULL DEFAULT 0,
  egyptian_net numeric(16, 2) NOT NULL DEFAULT 0,
  arab_buy numeric(16, 2) NOT NULL DEFAULT 0,
  arab_sell numeric(16, 2) NOT NULL DEFAULT 0,
  arab_net numeric(16, 2) NOT NULL DEFAULT 0,
  foreign_buy numeric(16, 2) NOT NULL DEFAULT 0,
  foreign_sell numeric(16, 2) NOT NULL DEFAULT 0,
  foreign_net numeric(16, 2) NOT NULL DEFAULT 0,
  total_turnover numeric(16, 2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS egx_investor_flows_date_idx ON public.egx_investor_flows (date DESC);

ALTER TABLE IF EXISTS public.egx_investor_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "egx_investor_flows_read_all" ON public.egx_investor_flows;
CREATE POLICY "egx_investor_flows_read_all" ON public.egx_investor_flows
  FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "egx_investor_flows_service_role_all" ON public.egx_investor_flows;
CREATE POLICY "egx_investor_flows_service_role_all" ON public.egx_investor_flows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
