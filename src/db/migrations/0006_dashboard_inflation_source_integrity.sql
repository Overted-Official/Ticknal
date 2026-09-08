-- Dashboard metric integrity: a month can have US CPI without a CBE release.
-- Keep the two sources independent instead of storing a fabricated CBE value.
ALTER TABLE IF EXISTS public.macro_inflation_rates
  ADD COLUMN IF NOT EXISTS us_cpi_inflation numeric(6, 2);

ALTER TABLE IF EXISTS public.macro_inflation_rates
  ALTER COLUMN cbe_headline_inflation DROP NOT NULL;
