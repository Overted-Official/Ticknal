-- Correct high-confidence EGX ticker classifications found by the 2026-09-30
-- taxonomy audit. The application uses the four GICS hierarchy levels below.
WITH corrections(symbol, sector, industry_group, industry, sub_industry) AS (
  VALUES
    ('ALCN', 'Industrials', 'Transportation', 'Transportation Infrastructure', 'Marine Ports & Services'),
    ('ALEX', 'Materials', 'Materials', 'Construction Materials', 'Construction Materials'),
    ('AMIA', 'Financials', 'Financial Services', 'Financial Services', 'Specialized Finance'),
    ('BONY', 'Real Estate', 'Real Estate Management & Development', 'Real Estate Management & Development', 'Real Estate Development'),
    ('CERA', 'Materials', 'Materials', 'Construction Materials', 'Construction Materials'),
    ('EALR', 'Industrials', 'Capital Goods', 'Construction & Engineering', 'Construction & Engineering'),
    ('ECAP', 'Materials', 'Materials', 'Construction Materials', 'Construction Materials'),
    ('ETRS', 'Industrials', 'Transportation', 'Air Freight & Logistics', 'Air Freight & Logistics'),
    ('FNAR', 'Industrials', 'Capital Goods', 'Construction & Engineering', 'Construction & Engineering'),
    ('GTHE', 'Communication Services', 'Telecommunication Services', 'Wireless Telecommunication Services', 'Wireless Telecommunication Services'),
    ('MOED', 'Consumer Discretionary', 'Consumer Services', 'Diversified Consumer Services', 'Education Services'),
    ('MOIL', 'Energy', 'Energy', 'Energy Equipment & Services', 'Oil & Gas Equipment & Services'),
    ('NAHO', 'Financials', 'Financial Services', 'Capital Markets', 'Investment Banking & Brokerage'),
    ('NCCW', 'Industrials', 'Capital Goods', 'Construction & Engineering', 'Construction & Engineering'),
    ('OBRI', 'Real Estate', 'Real Estate Management & Development', 'Real Estate Management & Development', 'Real Estate Development'),
    ('OIH', 'Communication Services', 'Telecommunication Services', 'Wireless Telecommunication Services', 'Wireless Telecommunication Services'),
    ('PRCL', 'Materials', 'Materials', 'Construction Materials', 'Construction Materials'),
    ('PRDC', 'Real Estate', 'Real Estate Management & Development', 'Real Estate Management & Development', 'Real Estate Development'),
    ('RTVC', 'Real Estate', 'Real Estate Management & Development', 'Real Estate Management & Development', 'Real Estate Development')
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
  FORMAT('Applied %s high-confidence EGX GICS taxonomy corrections.', COUNT(*)),
  JSONB_BUILD_OBJECT(
    'auditDate', '2026-09-30',
    'source', 'TradingView/FactSet cross-check plus issuer activity review',
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
