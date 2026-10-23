import { db } from '../../src/db';
import {
  companyFinancialStatements,
  companyValuationMetrics,
  tickers,
} from '../../src/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (Math.abs(num) >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

async function runVerification() {
  console.log('================================================================');
  console.log('EGX Historical Fundamentals & Quality Scoring Audit Report');
  console.log('================================================================\n');

  // 1. Count distinct companies seeded in companyFinancialStatements
  const distinctCompaniesResult = await db.execute(sql`
    SELECT count(DISTINCT symbol)::int as count FROM company_financial_statements;
  `);
  const distinctCompanies = (distinctCompaniesResult as any)[0]?.count ?? 0;

  // Distinct in valuation metrics
  const distinctValuationResult = await db.execute(sql`
    SELECT count(DISTINCT symbol)::int as count FROM company_valuation_metrics;
  `);
  const distinctValuation = (distinctValuationResult as any)[0]?.count ?? 0;

  console.log(`[Summary Stats]`);
  console.log(`  - Distinct Companies with Financial Statements: ${distinctCompanies}`);
  console.log(`  - Distinct Companies with Valuation Snapshots:  ${distinctValuation}\n`);

  // 2. Count total statements (Annual vs. Quarterly)
  const statementsBreakdown = await db.execute(sql`
    SELECT
      period_type,
      count(*)::int as total_count,
      min(report_date) as earliest_date,
      max(report_date) as latest_date
    FROM company_financial_statements
    GROUP BY period_type
    ORDER BY period_type ASC;
  `);

  console.log('[Statement Period Breakdown]');
  for (const row of statementsBreakdown as any[]) {
    console.log(
      `  - ${row.period_type.padEnd(10)}: ${String(row.total_count).padStart(6)} statements (From: ${row.earliest_date} to: ${row.latest_date})`
    );
  }
  console.log();

  // 3. Sector-level coverage and date ranges
  const sectorCoverage = await db.execute(sql`
    SELECT
      COALESCE(t.sector, 'Unclassified') as sector_name,
      count(DISTINCT c.symbol)::int as seeded_companies,
      count(*)::int as total_statements,
      min(c.report_date) as earliest_report,
      max(c.report_date) as latest_report
    FROM company_financial_statements c
    JOIN tickers t ON c.symbol = t.symbol
    GROUP BY t.sector
    ORDER BY seeded_companies DESC
    LIMIT 15;
  `);

  console.log('[Sector Coverage & History Range (Top Sectors)]');
  console.log('------------------------------------------------------------------------------------------------------');
  console.log(
    `${'Sector'.padEnd(32)} | ${'Companies'.padStart(9)} | ${'Statements'.padStart(10)} | ${'Earliest'.padEnd(10)} | ${'Latest'.padEnd(10)}`
  );
  console.log('------------------------------------------------------------------------------------------------------');
  for (const row of sectorCoverage as any[]) {
    console.log(
      `${String(row.sector_name).slice(0, 32).padEnd(32)} | ${String(row.seeded_companies).padStart(9)} | ${String(row.total_statements).padStart(10)} | ${String(row.earliest_report).padEnd(10)} | ${String(row.latest_report).padEnd(10)}`
    );
  }
  console.log('------------------------------------------------------------------------------------------------------\n');

  // 4. Sample audit table of top benchmark blue chips (COMI, SWDY, TMGH, MFPC, ETEL)
  const benchmarkSymbols = ['COMI', 'SWDY', 'TMGH', 'MFPC', 'ETEL'];
  console.log('[Benchmark Blue Chips Deep-Dive]');
  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(
    `${'Symbol'.padEnd(6)} | ${'Annual'.padStart(6)} | ${'Qtr'.padStart(4)} | ${'Latest Rev'.padStart(12)} | ${'Net Income'.padStart(12)} | ${'P/E TTM'.padStart(8)} | ${'Piotroski'.padStart(9)} | ${'Altman Z'.padStart(8)}`
  );
  console.log('------------------------------------------------------------------------------------------------------------------------');

  for (const sym of benchmarkSymbols) {
    // Statement counts
    const annualCountRes = await db.execute(sql`
      SELECT count(*)::int as count FROM company_financial_statements WHERE symbol = ${sym} AND period_type = 'ANNUAL';
    `);
    const qtrCountRes = await db.execute(sql`
      SELECT count(*)::int as count FROM company_financial_statements WHERE symbol = ${sym} AND period_type = 'QUARTERLY';
    `);
    const annualCount = (annualCountRes as any)[0]?.count ?? 0;
    const qtrCount = (qtrCountRes as any)[0]?.count ?? 0;

    // Latest annual revenue & net income
    const latestAnnualRes = await db.execute(sql`
      SELECT total_revenue, net_income, fiscal_year
      FROM company_financial_statements
      WHERE symbol = ${sym} AND period_type = 'ANNUAL'
      ORDER BY fiscal_year DESC
      LIMIT 1;
    `);
    const latestAnnual = (latestAnnualRes as any)[0];
    const latestRev = latestAnnual?.total_revenue;
    const latestNetInc = latestAnnual?.net_income;

    // Valuation metric
    const latestMetricRes = await db.execute(sql`
      SELECT pe_ratio_ttm, piotroski_f_score, altman_z_score
      FROM company_valuation_metrics
      WHERE symbol = ${sym}
      ORDER BY date DESC
      LIMIT 1;
    `);
    const metric = (latestMetricRes as any)[0];

    const peDisplay = metric?.pe_ratio_ttm != null ? Number(metric.pe_ratio_ttm).toFixed(1) : 'N/A';
    const piotroskiDisplay = metric?.piotroski_f_score != null ? String(metric.piotroski_f_score) : 'N/A';
    const altmanDisplay = metric?.altman_z_score != null ? Number(metric.altman_z_score).toFixed(2) : 'N/A';

    console.log(
      `${sym.padEnd(6)} | ${String(annualCount).padStart(6)} | ${String(qtrCount).padStart(4)} | ${formatNumber(latestRev).padStart(12)} | ${formatNumber(latestNetInc).padStart(12)} | ${peDisplay.padStart(8)} | ${piotroskiDisplay.padStart(9)} | ${altmanDisplay.padStart(8)}`
    );
  }
  console.log('------------------------------------------------------------------------------------------------------------------------\n');

  console.log('Verification audit completed successfully.');
}

runVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Audit verification error:', err);
    process.exit(1);
  });
