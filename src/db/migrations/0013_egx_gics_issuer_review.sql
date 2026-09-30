-- Correct EGX classifications confirmed against issuer and market profiles during
-- the 2026-09-30 issuer-review pass. Values follow the four-level GICS hierarchy.
WITH corrections(symbol, sector, industry_group, industry, sub_industry) AS (
  VALUES
    ('AFMC', 'Consumer Staples', 'Food, Beverage & Tobacco', 'Food Products', 'Agricultural Products & Services'),
    ('AMER', 'Real Estate', 'Real Estate Management & Development', 'Real Estate Management & Development', 'Real Estate Development'),
    ('AMII', 'Industrials', 'Capital Goods', 'Building Products', 'Building Products'),
    ('BIGP', 'Consumer Discretionary', 'Consumer Discretionary Distribution & Retail', 'Specialty Retail', 'Automotive Retail'),
    ('GDWA', 'Industrials', 'Capital Goods', 'Industrial Conglomerates', 'Industrial Conglomerates'),
    ('GGCC', 'Industrials', 'Capital Goods', 'Construction & Engineering', 'Construction & Engineering'),
    ('GSSC', 'Consumer Staples', 'Consumer Staples Distribution & Retail', 'Consumer Staples Distribution & Retail', 'Food Distributors'),
    ('HBCO', 'Industrials', 'Capital Goods', 'Construction & Engineering', 'Construction & Engineering'),
    ('LCSW', 'Industrials', 'Capital Goods', 'Building Products', 'Building Products'),
    ('VERT', 'Industrials', 'Capital Goods', 'Machinery', 'Industrial Machinery & Supplies & Components')
), changed AS MATERIALIZED (
  SELECT
    t.symbol,
    t.sector AS previous_sector,
    t.industry_group AS previous_industry_group,
    t.industry AS previous_industry,
    t.sub_industry AS previous_sub_industry,
    c.sector,
    c.industry_group,
    c.industry,
    c.sub_industry
  FROM tickers AS t
  INNER JOIN corrections AS c ON c.symbol = t.symbol
  WHERE (t.sector, t.industry_group, t.industry, t.sub_industry)
    IS DISTINCT FROM (c.sector, c.industry_group, c.industry, c.sub_industry)
), applied AS (
  UPDATE tickers AS t
  SET
    sector = c.sector,
    industry_group = c.industry_group,
    industry = c.industry,
    sub_industry = c.sub_industry
  FROM changed AS c
  WHERE t.symbol = c.symbol
  RETURNING t.symbol
)
INSERT INTO system_logs (level, source, message, metadata)
SELECT
  'INFO',
  'egx-gics-audit',
  FORMAT('Applied %s issuer-verified EGX GICS taxonomy corrections.', COUNT(*)),
  JSONB_BUILD_OBJECT(
    'auditDate', '2026-09-30',
    'source', 'Issuer and EGX market-profile principal-activity review',
    'changes', COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'symbol', symbol,
          'previous', JSONB_BUILD_OBJECT(
            'sector', previous_sector,
            'industryGroup', previous_industry_group,
            'industry', previous_industry,
            'subIndustry', previous_sub_industry
          ),
          'current', JSONB_BUILD_OBJECT(
            'sector', sector,
            'industryGroup', industry_group,
            'industry', industry,
            'subIndustry', sub_industry
          )
        )
        ORDER BY symbol
      ),
      '[]'::jsonb
    )
  )
FROM changed;
