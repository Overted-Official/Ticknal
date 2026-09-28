-- Corporate-action integrity guard for canonical daily price history.
CREATE TABLE IF NOT EXISTS public.price_adjustments (
  id serial PRIMARY KEY,
  ticker_symbol varchar(20) NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,
  effective_date date NOT NULL,
  factor numeric(18, 10) NOT NULL,
  reference_price_before numeric(12, 4),
  reference_price_after numeric(12, 4),
  source varchar(50) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'PENDING_REVIEW',
  evidence jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  CONSTRAINT price_adjustments_ticker_effective_unique UNIQUE (ticker_symbol, effective_date)
);

CREATE INDEX IF NOT EXISTS price_adjustments_status_idx
  ON public.price_adjustments(status);

ALTER TABLE public.price_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_adjustments_read_all" ON public.price_adjustments;
DROP POLICY IF EXISTS "price_adjustments_service_role_all" ON public.price_adjustments;

CREATE POLICY "price_adjustments_read_all" ON public.price_adjustments
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "price_adjustments_service_role_all" ON public.price_adjustments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- POUL resumed trading on 2026-09-27 after a merger-related capital increase.
-- EGX set EGP 10.36 as the new reference price versus the EGP 38.20 prior close.
INSERT INTO public.price_adjustments (
  ticker_symbol,
  effective_date,
  factor,
  reference_price_before,
  reference_price_after,
  source,
  status,
  evidence
)
VALUES (
  'POUL',
  '2026-09-27',
  0.2712041885,
  38.2000,
  10.3600,
  'EGX_MERGER_REFERENCE_PRICE',
  'CONFIRMED',
  '{"description":"Merger-related capital increase; trading resumed with a new EGX reference price.","oldShareAdditionalEntitlement":2.688241358,"lastTradingDate":"2026-09-21"}'::jsonb
)
ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;
