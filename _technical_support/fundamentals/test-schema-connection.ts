import { db } from '../../src/db';
import {
  companyFinancialStatements,
  companyValuationMetrics,
  tickers,
  CompanyFinancialStatement,
  NewCompanyFinancialStatement,
  CompanyValuationMetric,
  NewCompanyValuationMetric,
} from '../../src/db/schema';
import { sql, eq, and } from 'drizzle-orm';

async function main() {
  console.log('=== Step 1: Ensuring Fundamental Tables Exist in PostgreSQL ===');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_financial_statements (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
      period_type VARCHAR(10) NOT NULL,
      fiscal_year INTEGER NOT NULL,
      fiscal_period VARCHAR(10) NOT NULL,
      report_date DATE NOT NULL,
      filing_date DATE,
      currency VARCHAR(10) DEFAULT 'EGP' NOT NULL,
      total_revenue DOUBLE PRECISION,
      gross_profit DOUBLE PRECISION,
      operating_income DOUBLE PRECISION,
      net_income DOUBLE PRECISION,
      ebitda DOUBLE PRECISION,
      eps_basic DOUBLE PRECISION,
      eps_diluted DOUBLE PRECISION,
      total_assets DOUBLE PRECISION,
      total_liabilities DOUBLE PRECISION,
      total_debt DOUBLE PRECISION,
      cash_and_equivalents DOUBLE PRECISION,
      total_equity DOUBLE PRECISION,
      operating_cash_flow DOUBLE PRECISION,
      capital_expenditures DOUBLE PRECISION,
      free_cash_flow DOUBLE PRECISION,
      income_statement_raw JSONB,
      balance_sheet_raw JSONB,
      cash_flow_raw JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // Create unique index and query indexes for financial statements
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_statement_period'
      ) THEN
        ALTER TABLE company_financial_statements
        ADD CONSTRAINT unique_statement_period UNIQUE (symbol, period_type, fiscal_year, fiscal_period);
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_statement_symbol_report ON company_financial_statements (symbol, report_date);
    CREATE INDEX IF NOT EXISTS idx_statement_symbol_year ON company_financial_statements (symbol, period_type, fiscal_year);
  `);
  console.log('company_financial_statements table and indexes verified.');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_valuation_metrics (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
      date DATE NOT NULL,
      market_cap DOUBLE PRECISION,
      enterprise_value DOUBLE PRECISION,
      pe_ratio_ttm DOUBLE PRECISION,
      forward_pe DOUBLE PRECISION,
      pb_ratio DOUBLE PRECISION,
      ps_ratio_ttm DOUBLE PRECISION,
      ev_to_ebitda DOUBLE PRECISION,
      dividend_yield DOUBLE PRECISION,
      roe DOUBLE PRECISION,
      roa DOUBLE PRECISION,
      gross_margin DOUBLE PRECISION,
      operating_margin DOUBLE PRECISION,
      net_margin DOUBLE PRECISION,
      debt_to_equity DOUBLE PRECISION,
      current_ratio DOUBLE PRECISION,
      quick_ratio DOUBLE PRECISION,
      free_cash_flow_yield DOUBLE PRECISION,
      piotroski_f_score INTEGER,
      altman_z_score DOUBLE PRECISION,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // Create unique index and query index for valuation metrics
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_valuation_symbol_date'
      ) THEN
        ALTER TABLE company_valuation_metrics
        ADD CONSTRAINT unique_valuation_symbol_date UNIQUE (symbol, date);
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_valuation_symbol_date ON company_valuation_metrics (symbol, date);
  `);
  console.log('company_valuation_metrics table and indexes verified.');

  console.log('=== Step 2: Testing Drizzle ORM Insert & Select ===');

  const testSymbol = 'TEST_FUND_MOCK';
  let createdTicker = false;

  // Check or insert test ticker
  const existingTicker = await db
    .select({ symbol: tickers.symbol })
    .from(tickers)
    .where(eq(tickers.symbol, testSymbol))
    .limit(1);

  if (existingTicker.length === 0) {
    await db.insert(tickers).values({
      symbol: testSymbol,
      companyName: 'Test Fundamental Corp',
      currency: 'EGP',
      status: 'ACTIVE',
    });
    createdTicker = true;
    console.log(`Inserted temporary ticker '${testSymbol}'.`);
  }

  try {
    // 1. Insert into companyFinancialStatements
    const mockStatement: NewCompanyFinancialStatement = {
      symbol: testSymbol,
      periodType: 'QUARTERLY',
      fiscalYear: 2024,
      fiscalPeriod: 'Q3',
      reportDate: '2024-09-30',
      filingDate: '2024-11-15',
      currency: 'EGP',
      totalRevenue: 15400000000,
      grossProfit: 8200000000,
      operatingIncome: 5100000000,
      netIncome: 3800000000,
      ebitda: 5600000000,
      epsBasic: 1.25,
      epsDiluted: 1.24,
      totalAssets: 95000000000,
      totalLiabilities: 62000000000,
      totalDebt: 21000000000,
      cashAndEquivalents: 14000000000,
      totalEquity: 33000000000,
      operatingCashFlow: 4500000000,
      capitalExpenditures: 1200000000,
      freeCashFlow: 3300000000,
      incomeStatementRaw: { revenue: 15400000000, cogs: 7200000000 },
      balanceSheetRaw: { cash: 14000000000, equity: 33000000000 },
      cashFlowRaw: { ocf: 4500000000, capex: 1200000000 },
    };

    const insertedStatements = await db
      .insert(companyFinancialStatements)
      .values(mockStatement)
      .onConflictDoUpdate({
        target: [
          companyFinancialStatements.symbol,
          companyFinancialStatements.periodType,
          companyFinancialStatements.fiscalYear,
          companyFinancialStatements.fiscalPeriod,
        ],
        set: {
          totalRevenue: mockStatement.totalRevenue,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`Inserted statement id: ${insertedStatements[0]?.id}, symbol: ${insertedStatements[0]?.symbol}`);

    // Query statement back
    const retrievedStatements: CompanyFinancialStatement[] = await db
      .select()
      .from(companyFinancialStatements)
      .where(
        and(
          eq(companyFinancialStatements.symbol, testSymbol),
          eq(companyFinancialStatements.fiscalYear, 2024),
          eq(companyFinancialStatements.fiscalPeriod, 'Q3')
        )
      );

    if (retrievedStatements.length === 0) {
      throw new Error('Failed to retrieve inserted financial statement.');
    }
    console.log(
      `Retrieved statement: fiscalYear=${retrievedStatements[0].fiscalYear}, revenue=${retrievedStatements[0].totalRevenue}, fcf=${retrievedStatements[0].freeCashFlow}`
    );

    // 2. Insert into companyValuationMetrics
    const mockMetric: NewCompanyValuationMetric = {
      symbol: testSymbol,
      date: '2024-09-30',
      marketCap: 45000000000,
      enterpriseValue: 52000000000,
      peRatioTtm: 8.5,
      forwardPe: 7.2,
      pbRatio: 1.36,
      psRatioTtm: 0.95,
      evToEbitda: 6.2,
      dividendYield: 0.045,
      roe: 0.185,
      roa: 0.065,
      grossMargin: 0.532,
      operatingMargin: 0.331,
      netMargin: 0.246,
      debtToEquity: 0.636,
      currentRatio: 1.45,
      quickRatio: 1.12,
      freeCashFlowYield: 0.073,
      piotroskiFScore: 8,
      altmanZScore: 3.12,
    };

    const insertedMetrics = await db
      .insert(companyValuationMetrics)
      .values(mockMetric)
      .onConflictDoUpdate({
        target: [companyValuationMetrics.symbol, companyValuationMetrics.date],
        set: {
          marketCap: mockMetric.marketCap,
        },
      })
      .returning();

    console.log(`Inserted valuation metric id: ${insertedMetrics[0]?.id}, symbol: ${insertedMetrics[0]?.symbol}`);

    // Query metric back
    const retrievedMetrics: CompanyValuationMetric[] = await db
      .select()
      .from(companyValuationMetrics)
      .where(
        and(
          eq(companyValuationMetrics.symbol, testSymbol),
          eq(companyValuationMetrics.date, '2024-09-30')
        )
      );

    if (retrievedMetrics.length === 0) {
      throw new Error('Failed to retrieve inserted valuation metric.');
    }
    console.log(
      `Retrieved metric: date=${retrievedMetrics[0].date}, pe=${retrievedMetrics[0].peRatioTtm}, piotroski=${retrievedMetrics[0].piotroskiFScore}`
    );

    console.log('=== Step 3: Verification Passed Successfully! ===');
  } finally {
    console.log('=== Step 4: Cleaning up mock data ===');
    await db
      .delete(companyFinancialStatements)
      .where(eq(companyFinancialStatements.symbol, testSymbol));
    await db
      .delete(companyValuationMetrics)
      .where(eq(companyValuationMetrics.symbol, testSymbol));

    if (createdTicker) {
      await db.delete(tickers).where(eq(tickers.symbol, testSymbol));
      console.log(`Deleted temporary ticker '${testSymbol}'.`);
    }
    console.log('Cleanup complete.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
