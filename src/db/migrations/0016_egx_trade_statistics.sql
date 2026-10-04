-- Create egx_trade_statistics table to store session trade counts, average trade size, and absorption metrics
CREATE TABLE IF NOT EXISTS public.egx_trade_statistics (
  id serial PRIMARY KEY,
  ticker_symbol varchar(20) NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,
  date date NOT NULL,
  trades integer DEFAULT 0,
  volume numeric(18, 2) DEFAULT 0,
  value numeric(18, 2) DEFAULT 0,
  average_trade_size numeric(18, 2) DEFAULT 0,
  absorption_ratio numeric(10, 4) DEFAULT 1.0000,
  clv numeric(6, 4) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT egx_trade_stats_ticker_date_unique UNIQUE (ticker_symbol, date)
);

CREATE INDEX IF NOT EXISTS egx_trade_stats_ticker_date_idx ON public.egx_trade_statistics (ticker_symbol, date DESC);

ALTER TABLE IF EXISTS public.egx_trade_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "egx_trade_stats_read_all" ON public.egx_trade_statistics;
CREATE POLICY "egx_trade_stats_read_all" ON public.egx_trade_statistics
  FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "egx_trade_stats_service_role_all" ON public.egx_trade_statistics;
CREATE POLICY "egx_trade_stats_service_role_all" ON public.egx_trade_statistics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
