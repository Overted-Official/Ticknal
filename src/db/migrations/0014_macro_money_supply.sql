-- Create macro_money_supply table to store Egyptian money supply aggregates (M2, M1, M0)
CREATE TABLE IF NOT EXISTS public.macro_money_supply (
  id serial PRIMARY KEY,
  date date NOT NULL,
  indicator varchar(20) NOT NULL,
  value numeric(20, 2) NOT NULL,
  change numeric(20, 2),
  change_percent numeric(8, 4),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT macro_money_supply_date_indicator_unique UNIQUE(date, indicator)
);

CREATE INDEX IF NOT EXISTS macro_money_supply_date_idx ON public.macro_money_supply (date);
CREATE INDEX IF NOT EXISTS macro_money_supply_indicator_idx ON public.macro_money_supply (indicator);

ALTER TABLE IF EXISTS public.macro_money_supply ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "macro_money_supply_read_all" ON public.macro_money_supply;
CREATE POLICY "macro_money_supply_read_all" ON public.macro_money_supply
  FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "macro_money_supply_service_role_all" ON public.macro_money_supply;
CREATE POLICY "macro_money_supply_service_role_all" ON public.macro_money_supply
  FOR ALL TO service_role USING (true) WITH CHECK (true);
