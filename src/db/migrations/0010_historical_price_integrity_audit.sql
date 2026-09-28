-- Historical price integrity audit repairs.
--
-- Each range below was confirmed against exact-date TradingView OHLCV and an
-- exchange/corporate-action disclosure. The update is intentionally
-- idempotent: a repair is applied only while its adjustment row is not marked
-- APPLIED.

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'ACGC', '2026-08-20', 0.9259259259, 14.1500, 13.1019,
    'EGX_BONUS_SHARES_AUDIT', 'CONFIRMED',
    '{"bonusSharesPerShare":0.0799999981,"historicalStartDate":"2005-11-23","tradingViewPreviousClose":13.101839,"description":"8% bonus-share adjustment; scoped start preserves the earlier TradingView price regime."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'ACGC' AND effective_date = '2026-08-20';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET open = round(open::numeric * 0.9259259259, 4),
        high = round(high::numeric * 0.9259259259, 4),
        low = round(low::numeric * 0.9259259259, 4),
        close = round(close::numeric * 0.9259259259, 4),
        volume = round(volume::numeric / 0.9259259259, 2)
    WHERE ticker_symbol = 'ACGC'
      AND date >= '2005-11-23'
      AND date < '2026-08-20';

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'ACGC' AND signal_date >= '2026-08-20';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'ACGC' AND effective_date = '2026-08-20';
  END IF;
END $$;

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'COPR', '2023-07-05', 0.0150076720, 20.9006, 0.31366935,
    'EGX_RIGHTS_ISSUE_AUDIT', 'CONFIRMED',
    '{"oldCapitalEgp":1040688,"newCapitalEgp":105109488,"newShares":520344000,"subscriptionPriceEgp":0.20,"tradingViewFactor":0.0150076720,"description":"Rights-issue ex-date regime normalized to TradingView current price units."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'COPR' AND effective_date = '2023-07-05';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET open = round(open::numeric * 0.0150076720, 4),
        high = round(high::numeric * 0.0150076720, 4),
        low = round(low::numeric * 0.0150076720, 4),
        close = round(close::numeric * 0.0150076720, 4),
        volume = round(volume::numeric / 0.0150076720, 2)
    WHERE ticker_symbol = 'COPR' AND date < '2023-07-05';

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'COPR' AND signal_date >= '2023-07-05';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'COPR' AND effective_date = '2023-07-05';
  END IF;
END $$;

-- The all-ticker follow-up audit compared every suspicious flat, zero-volume
-- row with TradingView's exact and surrounding traded sessions. These rows are
-- absent from TradingView and retain an obsolete reference-price basis, while
-- 184 similar zero-volume rows that TradingView confirms are deliberately kept.
DO $$
BEGIN
  DELETE FROM public.daily_prices d
  USING (
    VALUES
      ('DEIN'::varchar, '2026-08-11'::date, NULL::date, 10.3500::numeric),
      ('GPPL'::varchar, '2026-08-11'::date, NULL::date, 1.4000::numeric),
      ('ICLE'::varchar, '2026-08-11'::date, NULL::date, 15.7600::numeric),
      ('MKIT'::varchar, '2023-09-19'::date, '2023-12-04'::date, 1.3920::numeric),
      ('NDRL'::varchar, '2026-08-11'::date, NULL::date, 4.6900::numeric),
      ('SAIB'::varchar, '2026-08-11'::date, '2026-08-19'::date, 2.1100::numeric),
      ('SAIB'::varchar, '2026-08-27'::date, NULL::date, 2.5300::numeric),
      ('SPHT'::varchar, '2026-09-22'::date, NULL::date, 1.4200::numeric)
  ) AS target(ticker_symbol, from_date, through_date, stale_close)
  WHERE d.ticker_symbol = target.ticker_symbol
    AND d.date >= target.from_date
    AND (target.through_date IS NULL OR d.date <= target.through_date)
    AND d.open::numeric = target.stale_close
    AND d.high::numeric = target.stale_close
    AND d.low::numeric = target.stale_close
    AND d.close::numeric = target.stale_close
    AND d.volume::numeric = 0;

  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence, applied_at
  ) VALUES
    ('DEIN', '2026-08-11', 1, 10.3500, 12.4200, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":27,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now()),
    ('GPPL', '2026-08-11', 1, 1.4000, 1.3300, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":20,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now()),
    ('ICLE', '2026-08-11', 1, 15.7600, 18.9100, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":28,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now()),
    ('MKIT', '2023-09-19', 1, 1.3920, 1.2530, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":4,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now()),
    ('NDRL', '2026-08-11', 1, 4.6900, 5.6200, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":29,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now()),
    ('SAIB', '2026-08-11', 1, 2.1100, 2.5300, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":5,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now()),
    ('SPHT', '2026-09-22', 1, 1.4200, 1.1600, 'TRADINGVIEW_FILLER_AUDIT', 'APPLIED', '{"staleFillerRowsRemoved":4,"description":"Removed flat zero-volume rows absent from TradingView and contradicted by surrounding exact traded closes."}'::jsonb, now())
  ON CONFLICT (ticker_symbol, effective_date) DO UPDATE
  SET source = excluded.source,
      status = 'APPLIED',
      evidence = excluded.evidence,
      applied_at = COALESCE(public.price_adjustments.applied_at, excluded.applied_at);

  UPDATE public.price_adjustments
  SET evidence = COALESCE(evidence, '{}'::jsonb) || '{"staleFillerRowsRemoved":18}'::jsonb
  WHERE ticker_symbol = 'SAIB' AND effective_date = '2026-08-26';

  DELETE FROM public.signal_notifications notification
  USING (
    VALUES
      ('DEIN'::varchar, '2026-08-11'::date),
      ('GPPL'::varchar, '2026-08-11'::date),
      ('ICLE'::varchar, '2026-08-11'::date),
      ('MKIT'::varchar, '2023-09-19'::date),
      ('NDRL'::varchar, '2026-08-11'::date),
      ('SAIB'::varchar, '2026-08-11'::date),
      ('SPHT'::varchar, '2026-09-22'::date)
  ) AS target(ticker_symbol, from_date)
  WHERE notification.ticker_symbol = target.ticker_symbol
    AND notification.signal_date >= target.from_date;
END $$;

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'EEII', '2026-09-03', 0.8287861194, 2.9000, 2.403479,
    'EGX_BONUS_SHARES_AUDIT', 'CONFIRMED',
    '{"bonusSharesPerShare":0.2065839142,"oldCapitalEgp":83293005,"newCapitalEgp":100500000,"description":"Bonus-share reference-price adjustment confirmed by EGX disclosure and TradingView."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'EEII' AND effective_date = '2026-09-03';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET open = round(open::numeric * 0.8287861194, 4),
        high = round(high::numeric * 0.8287861194, 4),
        low = round(low::numeric * 0.8287861194, 4),
        close = round(close::numeric * 0.8287861194, 4),
        volume = round(volume::numeric / 0.8287861194, 2)
    WHERE ticker_symbol = 'EEII' AND date < '2026-09-03';

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'EEII' AND signal_date >= '2026-09-03';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'EEII' AND effective_date = '2026-09-03';
  END IF;
END $$;

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'GRCA', '2026-09-10', 0.7500000000, 74.5400, 55.9050,
    'EGX_BONUS_SHARES_AUDIT', 'CONFIRMED',
    '{"bonusSharesPerShare":0.3333333333,"oldCapitalEgp":39000000,"newCapitalEgp":52000000,"description":"One-for-three bonus-share adjustment confirmed by EGX disclosure and TradingView."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'GRCA' AND effective_date = '2026-09-10';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET open = round(open::numeric * 0.7500000000, 4),
        high = round(high::numeric * 0.7500000000, 4),
        low = round(low::numeric * 0.7500000000, 4),
        close = round(close::numeric * 0.7500000000, 4),
        volume = round(volume::numeric / 0.7500000000, 2)
    WHERE ticker_symbol = 'GRCA' AND date < '2026-09-10';

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'GRCA' AND signal_date >= '2026-09-10';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'GRCA' AND effective_date = '2026-09-10';
  END IF;
END $$;

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'LUTS', '2026-08-30', 0.6101939203, 1.5900, 0.97020833,
    'EGX_RIGHTS_ISSUE_AUDIT', 'CONFIRMED',
    '{"rightsPerShare":0.7142857143,"subscriptionPriceEgp":0.1025,"oldCapitalEgp":133000000,"newCapitalEgp":228000000,"description":"Rights-issue theoretical ex-right price confirmed by EGX terms and TradingView."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'LUTS' AND effective_date = '2026-08-30';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET open = round(open::numeric * 0.6101939203, 4),
        high = round(high::numeric * 0.6101939203, 4),
        low = round(low::numeric * 0.6101939203, 4),
        close = round(close::numeric * 0.6101939203, 4),
        volume = round(volume::numeric / 0.6101939203, 2)
    WHERE ticker_symbol = 'LUTS' AND date < '2026-08-30';

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'LUTS' AND signal_date >= '2026-08-30';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'LUTS' AND effective_date = '2026-08-30';
  END IF;
END $$;

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'MTIE', '2026-07-01', 0.8333333333, 8.9600, 7.46666368,
    'TRADINGVIEW_REGIME_AUDIT', 'CONFIRMED',
    '{"bonusSharesPerShare":0.2000000002,"officialActionDate":"2026-08-13","canonicalBoundaryDate":"2026-07-01","description":"The provider refreshed the post-boundary window to the later 20% bonus-share basis while older rows remained stale."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'MTIE' AND effective_date = '2026-07-01';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET open = round(open::numeric * 0.8333333333, 4),
        high = round(high::numeric * 0.8333333333, 4),
        low = round(low::numeric * 0.8333333333, 4),
        close = round(close::numeric * 0.8333333333, 4),
        volume = round(volume::numeric / 0.8333333333, 2)
    WHERE ticker_symbol = 'MTIE' AND date < '2026-07-01';

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'MTIE' AND signal_date >= '2026-07-01';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'MTIE' AND effective_date = '2026-07-01';
  END IF;
END $$;

DO $$
DECLARE
  should_apply boolean;
BEGIN
  INSERT INTO public.price_adjustments (
    ticker_symbol, effective_date, factor, reference_price_before,
    reference_price_after, source, status, evidence
  ) VALUES (
    'SAIB', '2026-08-26', 1.0000000000, 3.0300, 3.0300,
    'TRADINGVIEW_BAR_REPAIR', 'CONFIRMED',
    '{"badStoredClose":2.53,"confirmedClose":3.03,"removedFillerDate":"2026-08-30","description":"Exact-date TradingView comparison confirmed a bad close followed by a zero-volume filler bar."}'::jsonb
  ) ON CONFLICT (ticker_symbol, effective_date) DO NOTHING;

  SELECT status <> 'APPLIED' INTO should_apply
  FROM public.price_adjustments
  WHERE ticker_symbol = 'SAIB' AND effective_date = '2026-08-26';

  IF should_apply THEN
    UPDATE public.daily_prices
    SET close = 3.0300
    WHERE ticker_symbol = 'SAIB' AND date = '2026-08-26'
      AND open = 2.5300 AND high = 3.0300 AND low = 2.5300 AND close = 2.5300;

    DELETE FROM public.daily_prices
    WHERE ticker_symbol = 'SAIB' AND date = '2026-08-30'
      AND open = 2.5300 AND high = 2.5300 AND low = 2.5300 AND close = 2.5300
      AND volume = 0;

    DELETE FROM public.signal_notifications
    WHERE ticker_symbol = 'SAIB' AND signal_date >= '2026-08-26';

    UPDATE public.price_adjustments
    SET status = 'APPLIED', applied_at = now()
    WHERE ticker_symbol = 'SAIB' AND effective_date = '2026-08-26';
  END IF;
END $$;

-- Preserve the wider filler-audit evidence when this migration is applied to a
-- fresh database and the SAIB exact-bar repair is inserted after the cleanup.
UPDATE public.price_adjustments
SET evidence = COALESCE(evidence, '{}'::jsonb) || '{"staleFillerRowsRemoved":18}'::jsonb
WHERE ticker_symbol = 'SAIB' AND effective_date = '2026-08-26';
