import assert from 'node:assert';
import {
  parseEgxScannerRow,
  normalizeHistoricalStatements,
  calculateFreeCashFlow,
  calculatePiotroskiFScore,
  calculateAltmanZScore,
  calculateQualityScores,
  type RawEgxScannerFundamental,
} from './fundamentals-scraper';
import type { NewCompanyFinancialStatement } from '@/db/schema';

// Dual runner: runs under Vitest globals if in Vitest, or executes standalone with node:assert under tsx.
interface TestItem {
  name: string;
  fn: () => void | Promise<void>;
}
interface SuiteItem {
  name: string;
  tests: TestItem[];
}

const isVitest = typeof (globalThis as any).describe === 'function' && typeof (globalThis as any).it === 'function';

const standaloneSuites: SuiteItem[] = [];
let activeSuite: SuiteItem = { name: 'Root', tests: [] };
standaloneSuites.push(activeSuite);

const describe = isVitest
  ? (globalThis as any).describe
  : (name: string, fn: () => void) => {
      const prev = activeSuite;
      const suite: SuiteItem = { name, tests: [] };
      standaloneSuites.push(suite);
      activeSuite = suite;
      fn();
      activeSuite = prev;
    };

const it = isVitest
  ? (globalThis as any).it
  : (name: string, fn: () => void | Promise<void>) => {
      activeSuite.tests.push({ name, fn });
    };

// =========================================================================
// 1. Scanner Parsing & Normalization Tests
// =========================================================================
describe('TradingView Egypt Scanner Parsing', () => {
  it('parses valid stock item with EGX prefix and populates numeric columns', () => {
    const rawItem = {
      s: 'EGX:COMI',
      d: [
        'COMI',
        125.15,
        426153079427,
        6.02,
        1.83,
        21.16,
        34.36,
        239712949000,
        71380337000,
        1690039928000,
        82394734000,
        73089359000,
        0.045,
        'EGP',
      ],
    };

    const parsed = parseEgxScannerRow(rawItem);
    assert.ok(parsed, 'Parsed item must not be null');
    assert.strictEqual(parsed.symbol, 'COMI');
    assert.strictEqual(parsed.close, 125.15);
    assert.strictEqual(parsed.marketCap, 426153079427);
    assert.strictEqual(parsed.peTtm, 6.02);
    assert.strictEqual(parsed.pb, 1.83);
    assert.strictEqual(parsed.epsTtm, 21.16);
    assert.strictEqual(parsed.roe, 34.36);
    assert.strictEqual(parsed.revenueTtm, 239712949000);
    assert.strictEqual(parsed.netIncomeTtm, 71380337000);
    assert.strictEqual(parsed.totalAssets, 1690039928000);
    assert.strictEqual(parsed.totalDebt, 82394734000);
    assert.strictEqual(parsed.freeCashFlowTtm, 73089359000);
    assert.strictEqual(parsed.dividendYield, 0.045);
  });

  it('normalizes peTtm to null if net income is negative', () => {
    const rawItem = {
      s: 'EGX:LOSS',
      d: [
        'LOSS',
        10.5,
        500000000,
        15.4, // TradingView may occasionally emit a positive or glitch PE
        1.2,
        -1.5,
        -10.2,
        100000000,
        -25000000, // Negative Net Income
        600000000,
        200000000,
        -10000000,
        null,
        'EGP',
      ],
    };

    const parsed = parseEgxScannerRow(rawItem);
    assert.ok(parsed);
    assert.strictEqual(parsed.symbol, 'LOSS');
    assert.strictEqual(parsed.netIncomeTtm, -25000000);
    assert.strictEqual(parsed.peTtm, null, 'peTtm must be null when net income is negative');
  });

  it('normalizes peTtm to null if PE itself is negative', () => {
    const rawItem = {
      s: 'EGX:NEGPE',
      d: [
        'NEGPE',
        5.0,
        200000000,
        -8.5, // Negative PE
        0.8,
        0.1,
        2.5,
        80000000,
        5000000,
        250000000,
        50000000,
        1000000,
        null,
        'EGP',
      ],
    };

    const parsed = parseEgxScannerRow(rawItem);
    assert.ok(parsed);
    assert.strictEqual(parsed.symbol, 'NEGPE');
    assert.strictEqual(parsed.peTtm, null, 'peTtm must be null when PE is negative');
  });

  it('strips exchange suffixes (.CA) and prefixes (EGX:) safely', () => {
    const rawItem = {
      s: 'EGX:HRHO.CA',
      d: ['HRHO.CA', 25.0, 1000000000, 8.0, 1.1, 3.0, 15.0, 500000000, 200000000, 2000000000, 300000000, 150000000, 0.05, 'EGP'],
    };

    const parsed = parseEgxScannerRow(rawItem);
    assert.ok(parsed);
    assert.strictEqual(parsed.symbol, 'HRHO');
  });

  it('returns null for empty or invalid item', () => {
    assert.strictEqual(parseEgxScannerRow(null), null);
    assert.strictEqual(parseEgxScannerRow({}), null);
    assert.strictEqual(parseEgxScannerRow({ s: '', d: [] }), null);
  });
});

// =========================================================================
// 2. Historical Statements Normalization Tests
// =========================================================================
describe('Historical Statements Normalization', () => {
  it('parses annual historical statements in chronological descending order', () => {
    const mockTvHistorical = {
      s: 'EGX:SWDY',
      d: [
        'SWDY',
        'EGP',
        1782777600, // 2026-06-30
        [2025, 2024, 2023], // fiscal_period_fy_h
        [280000000000, 210000000000, 150000000000], // total_revenue_fy_h
        [88000000000, 75000000000], // total_revenue_fq_h
        [40000000000, 30000000000, 20000000000], // gross_profit_fy_h
        [13000000000, 10000000000], // gross_profit_fq_h
        [18000000000, 14000000000, 10000000000], // net_income_fy_h
        [5000000000, 4000000000], // net_income_fq_h
        [27000000000, 20000000000, 15000000000], // ebitda_fy_h
        [8500000000, 6500000000], // ebitda_fq_h
        [8.5, 6.8, 4.9], // earnings_per_share_basic_fy_h
        [8.4, 6.7, 4.8], // earnings_per_share_diluted_fy_h
        [2.5, 2.0], // earnings_per_share_diluted_fq_h
        [370000000000, 290000000000, 220000000000], // total_assets_fy_h
        [390000000000, 370000000000], // total_assets_fq_h
        [85000000000, 70000000000, 55000000000], // total_debt_fy_h
        [90000000000, 85000000000], // total_debt_fq_h
        [12000000000, 8000000000, 5000000000], // free_cash_flow_fy_h
        [3000000000, 2500000000], // free_cash_flow_fq_h
      ],
    };

    const { annual, quarterly } = normalizeHistoricalStatements(mockTvHistorical, 'SWDY');

    assert.strictEqual(annual.length, 3);
    assert.strictEqual(annual[0].symbol, 'SWDY');
    assert.strictEqual(annual[0].periodType, 'ANNUAL');
    assert.strictEqual(annual[0].fiscalYear, 2025);
    assert.strictEqual(annual[0].fiscalPeriod, 'FY');
    assert.strictEqual(annual[0].reportDate, '2025-12-31');
    assert.strictEqual(annual[0].totalRevenue, 280000000000);
    assert.strictEqual(annual[0].grossProfit, 40000000000);
    assert.strictEqual(annual[0].netIncome, 18000000000);
    assert.strictEqual(annual[0].ebitda, 27000000000);
    assert.strictEqual(annual[0].epsBasic, 8.5);
    assert.strictEqual(annual[0].epsDiluted, 8.4);
    assert.strictEqual(annual[0].totalAssets, 370000000000);
    assert.strictEqual(annual[0].totalDebt, 85000000000);
    assert.strictEqual(annual[0].freeCashFlow, 12000000000);

    // Prior years
    assert.strictEqual(annual[1].fiscalYear, 2024);
    assert.strictEqual(annual[2].fiscalYear, 2023);

    // Quarterly series
    assert.strictEqual(quarterly.length, 2);
    // Base is 1782777600 -> 2026-06-30 (2026 Q2)
    assert.strictEqual(quarterly[0].periodType, 'QUARTERLY');
    assert.strictEqual(quarterly[0].fiscalYear, 2026);
    assert.strictEqual(quarterly[0].fiscalPeriod, 'Q2');
    assert.strictEqual(quarterly[0].reportDate, '2026-06-30');
    assert.strictEqual(quarterly[0].totalRevenue, 88000000000);

    // Step 1 prior: 2026 Q1
    assert.strictEqual(quarterly[1].periodType, 'QUARTERLY');
    assert.strictEqual(quarterly[1].fiscalYear, 2026);
    assert.strictEqual(quarterly[1].fiscalPeriod, 'Q1');
    assert.strictEqual(quarterly[1].reportDate, '2026-03-31');
    assert.strictEqual(quarterly[1].totalRevenue, 75000000000);
  });

  it('calculates Free Cash Flow from OCF and CapEx', () => {
    // Normalizer calculates Free Cash Flow (operating_cash_flow - capital_expenditures)
    const fcf1 = calculateFreeCashFlow(50000000, 20000000);
    assert.strictEqual(fcf1, 30000000);

    const fcf2 = calculateFreeCashFlow(10000000, null, 10000000);
    assert.strictEqual(fcf2, 10000000);

    const fcf3 = calculateFreeCashFlow(null, null, 42000000);
    assert.strictEqual(fcf3, 42000000);

    const fcf4 = calculateFreeCashFlow(null, null, null);
    assert.strictEqual(fcf4, null);
  });

  it('handles bank statements with null gross profit and ebitda without failing', () => {
    const mockBank = {
      s: 'EGX:COMI',
      d: [
        'COMI',
        'EGP',
        1782777600,
        [2025, 2024],
        [230000000000, 216000000000],
        [64000000000],
        null, // No gross profit fy
        [null], // No gross profit fq
        [61000000000, 49000000000],
        [21000000000],
        null, // No ebitda fy
        null, // No ebitda fq
        [18.2, 14.9],
        [18.0, 14.7],
        [6.2],
        [1440000000000, 1210000000000],
        [1690000000000],
        [38000000000, 31000000000],
        [82000000000],
        [70000000000, 31000000000],
        [25000000000],
      ],
    };

    const { annual, quarterly } = normalizeHistoricalStatements(mockBank, 'COMI');
    assert.strictEqual(annual.length, 2);
    assert.strictEqual(annual[0].grossProfit, null);
    assert.strictEqual(annual[0].ebitda, null);
    assert.strictEqual(annual[0].netIncome, 61000000000);
    assert.strictEqual(quarterly.length, 1);
  });
});

// =========================================================================
// 3. Piotroski F-Score Math (0..9) Tests
// =========================================================================
describe('Piotroski F-Score Math', () => {
  it('awards a perfect 9/9 when all accounting criteria are satisfied', () => {
    // Current period (T):
    // 1) ROA > 0: Net income > 0 (150 / 1000 = 15%)
    // 2) CFO > 0: Free cash flow / OCF = 200 > 0
    // 3) ΔROA > 0: Current ROA 15% > Prior ROA 10%
    // 4) Accrual: CFO (200) > Net income (150)
    // 5) ΔLeverage < 0: Current debt/assets (100/1000 = 0.10) < Prior (200/900 = 0.22)
    // 6) Stable/improving liquidity: Current working cap or cash/assets (250/1000 = 0.25) > Prior (150/900 = 0.16)
    // 7) No dilution: Diluted EPS increased (1.50 >= 1.00)
    // 8) ΔGross Margin > 0: Current gross margin (400/1200 = 33.3%) > Prior (300/1000 = 30%)
    // 9) ΔAsset Turnover > 0: Current revenue/assets (1200/1000 = 1.20) > Prior (1000/900 = 1.11)
    const current: NewCompanyFinancialStatement = {
      symbol: 'TEST',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalRevenue: 1200,
      grossProfit: 400,
      netIncome: 150,
      ebitda: 250,
      epsDiluted: 1.5,
      totalAssets: 1000,
      totalDebt: 100,
      cashAndEquivalents: 250,
      totalEquity: 800,
      operatingCashFlow: 200,
      freeCashFlow: 180,
    };

    const prior: NewCompanyFinancialStatement = {
      symbol: 'TEST',
      periodType: 'ANNUAL',
      fiscalYear: 2024,
      fiscalPeriod: 'FY',
      reportDate: '2024-12-31',
      currency: 'EGP',
      totalRevenue: 1000,
      grossProfit: 300,
      netIncome: 90,
      ebitda: 150,
      epsDiluted: 1.0,
      totalAssets: 900,
      totalDebt: 200,
      cashAndEquivalents: 150,
      totalEquity: 600,
      operatingCashFlow: 80,
      freeCashFlow: 60,
    };

    const score = calculatePiotroskiFScore(current, prior);
    assert.strictEqual(score, 9, 'Should score 9 out of 9');
  });

  it('scores 0/9 when company deteriorates across every single signal', () => {
    // Current period (T):
    // 1) ROA <= 0 (Net income = -100) -> 0
    // 2) CFO <= 0 (CFO = -50) -> 0
    // 3) ΔROA <= 0 (Current ROA -10% < Prior ROA +5%) -> 0
    // 4) Accrual: CFO (-50) not > Net Income (-100)? Wait: -50 > -100, so set CFO -150 < Net Income -100 -> 0
    // 5) ΔLeverage >= 0 (Debt 500/1000 = 0.50 vs Prior 200/900 = 0.22) -> 0
    // 6) Deteriorating liquidity (Cash 50/1000 = 0.05 vs Prior 150/900 = 0.16) -> 0
    // 7) Dilution (EPS diluted dropped from 1.00 to -1.50) -> 0
    // 8) ΔGross Margin <= 0 (Gross margin 100/1000 = 10% vs Prior 300/1000 = 30%) -> 0
    // 9) ΔAsset Turnover <= 0 (Revenue 800/1000 = 0.80 vs Prior 1000/900 = 1.11) -> 0
    const current: NewCompanyFinancialStatement = {
      symbol: 'FAIL',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalRevenue: 800,
      grossProfit: 80,
      netIncome: -100,
      ebitda: -40,
      epsDiluted: -1.5,
      totalAssets: 1000,
      totalDebt: 500,
      cashAndEquivalents: 50,
      totalEquity: 300,
      operatingCashFlow: -150,
      freeCashFlow: -160,
    };

    const prior: NewCompanyFinancialStatement = {
      symbol: 'FAIL',
      periodType: 'ANNUAL',
      fiscalYear: 2024,
      fiscalPeriod: 'FY',
      reportDate: '2024-12-31',
      currency: 'EGP',
      totalRevenue: 1000,
      grossProfit: 300,
      netIncome: 50,
      ebitda: 100,
      epsDiluted: 1.0,
      totalAssets: 900,
      totalDebt: 200,
      cashAndEquivalents: 150,
      totalEquity: 600,
      operatingCashFlow: 80,
      freeCashFlow: 60,
    };

    const score = calculatePiotroskiFScore(current, prior);
    assert.strictEqual(score, 0, 'Should score 0 out of 9');
  });

  it('evaluates current-year profitability tests when prior year statement is absent', () => {
    // Current period only:
    // ROA > 0 (1 pt)
    // CFO > 0 (1 pt)
    // CFO > Net income (1 pt: 250 > 150)
    // Prior-dependent tests (ΔROA, ΔLeverage, etc.) evaluate to 0
    // Expected score: 3
    const current: NewCompanyFinancialStatement = {
      symbol: 'NEWIPO',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalRevenue: 1000,
      grossProfit: 400,
      netIncome: 150,
      ebitda: 300,
      epsDiluted: 2.0,
      totalAssets: 1000,
      totalDebt: 100,
      cashAndEquivalents: 200,
      totalEquity: 800,
      operatingCashFlow: 250,
      freeCashFlow: 200,
    };

    const score = calculatePiotroskiFScore(current);
    assert.strictEqual(score, 3, 'Single year with ROA>0, CFO>0, CFO>NI should score 3');
  });
});

// =========================================================================
// 4. Altman Z-Score Math Tests
// =========================================================================
describe('Altman Z-Score Math', () => {
  it('calculates solvency Z-score accurately according to emerging markets formula', () => {
    // Formula:
    // Z = 6.56 * (NWC / TA) + 3.26 * (RE / TA) + 6.72 * (EBITDA / TA) + 1.05 * (Equity / Debt)
    // Assets: 1000
    // Cash / NWC: 200 -> NWC/TA = 0.2
    // Net Income / RE: 100 -> RE/TA = 0.1
    // EBITDA: 150 -> EBITDA/TA = 0.15
    // Debt: 250
    // Equity: 500 -> Equity/Debt = 2.0
    // Z = 6.56*(0.2) + 3.26*(0.1) + 6.72*(0.15) + 1.05*(2.0)
    // Z = 1.312 + 0.326 + 1.008 + 2.1 = 4.746 -> ~4.75
    const statement: NewCompanyFinancialStatement = {
      symbol: 'SAFE',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalRevenue: 1000,
      netIncome: 100,
      ebitda: 150,
      totalAssets: 1000,
      totalDebt: 250,
      cashAndEquivalents: 200,
      totalEquity: 500,
    };

    const z = calculateAltmanZScore(statement, 500);
    assert.ok(z !== null, 'Z-score must not be null');
    assert.ok(Math.abs(z - 4.75) < 0.05, `Expected ~4.75, got ${z}`);
  });

  it('correctly indicates distress for highly leveraged loss-making company', () => {
    // Assets: 1000, NWC: -200, Net Income: -100, EBITDA: -50, Debt: 800, Equity: 100
    // NWC/TA = -0.2
    // RE/TA = -0.1
    // EBITDA/TA = -0.05
    // Equity/Debt = 100 / 800 = 0.125
    // Z = 6.56*(-0.2) + 3.26*(-0.1) + 6.72*(-0.05) + 1.05*(0.125)
    // Z = -1.312 - 0.326 - 0.336 + 0.13125 = -1.84275 (Severe Distress)
    const statement: NewCompanyFinancialStatement = {
      symbol: 'DISTRESS',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalRevenue: 500,
      netIncome: -100,
      ebitda: -50,
      totalAssets: 1000,
      totalDebt: 800,
      cashAndEquivalents: 50,
      totalEquity: 100,
    };
    (statement as any).workingCapital = -200;

    const z = calculateAltmanZScore(statement, 100);
    assert.ok(z !== null);
    assert.ok(z < 1.1, `Expected distress score (< 1.1), got ${z}`);
  });

  it('handles debt-free entity without zero-division error', () => {
    const statement: NewCompanyFinancialStatement = {
      symbol: 'NODEBT',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalRevenue: 500,
      netIncome: 50,
      ebitda: 80,
      totalAssets: 500,
      totalDebt: 0,
      cashAndEquivalents: 150,
      totalEquity: 450,
    };

    const z = calculateAltmanZScore(statement, 600);
    assert.ok(z !== null);
    assert.ok(Number.isFinite(z), 'Z-score must be a finite number');
    assert.ok(z > 2.6, 'Debt-free profitable entity should be in safe zone (> 2.6)');
  });

  it('returns null if totalAssets is zero, negative, or missing', () => {
    const statementNoAssets: NewCompanyFinancialStatement = {
      symbol: 'NOASSETS',
      periodType: 'ANNUAL',
      fiscalYear: 2025,
      fiscalPeriod: 'FY',
      reportDate: '2025-12-31',
      currency: 'EGP',
      totalAssets: 0,
    };

    assert.strictEqual(calculateAltmanZScore(statementNoAssets, 100), null);
    assert.strictEqual(calculateAltmanZScore({ ...statementNoAssets, totalAssets: -500 }, 100), null);
  });
});

// =========================================================================
// 5. Integrated calculateQualityScores Tests
// =========================================================================
describe('Integrated calculateQualityScores', () => {
  it('computes both Piotroski F-score and Altman Z-score together', () => {
    const statements: NewCompanyFinancialStatement[] = [
      {
        symbol: 'COMI',
        periodType: 'ANNUAL',
        fiscalYear: 2025,
        fiscalPeriod: 'FY',
        reportDate: '2025-12-31',
        currency: 'EGP',
        totalRevenue: 230000000000,
        grossProfit: 80000000000,
        netIncome: 61000000000,
        ebitda: 75000000000,
        epsDiluted: 18.0,
        totalAssets: 1440000000000,
        totalDebt: 38000000000,
        cashAndEquivalents: 100000000000,
        totalEquity: 180000000000,
        operatingCashFlow: 70000000000,
        freeCashFlow: 65000000000,
      },
      {
        symbol: 'COMI',
        periodType: 'ANNUAL',
        fiscalYear: 2024,
        fiscalPeriod: 'FY',
        reportDate: '2024-12-31',
        currency: 'EGP',
        totalRevenue: 216000000000,
        grossProfit: 70000000000,
        netIncome: 49000000000,
        ebitda: 60000000000,
        epsDiluted: 14.7,
        totalAssets: 1210000000000,
        totalDebt: 31000000000,
        cashAndEquivalents: 80000000000,
        totalEquity: 140000000000,
        operatingCashFlow: 35000000000,
        freeCashFlow: 31000000000,
      },
    ];

    const result = calculateQualityScores(statements, 426000000000, 125.15);
    assert.strictEqual(typeof result.piotroskiFScore, 'number');
    assert.ok(result.piotroskiFScore >= 0 && result.piotroskiFScore <= 9);
    assert.ok(result.altmanZScore !== null);
    assert.ok(result.altmanZScore > 0);
  });
});

// =========================================================================
// Standalone runner execution for tsx
// =========================================================================
if (!isVitest) {
  (async () => {
    let total = 0;
    let passed = 0;
    console.log('\n================ FUNDAMENTALS SCRAPER TEST SUITE ================');
    for (const s of standaloneSuites) {
      if (s.tests.length === 0) continue;
      console.log(`\n[Suite] ${s.name}`);
      for (const t of s.tests) {
        total++;
        try {
          await t.fn();
          console.log(`  ✓ ${t.name}`);
          passed++;
        } catch (err: any) {
          console.error(`  ✗ ${t.name}`);
          console.error(`    ${err.stack || err.message}`);
          throw err;
        }
      }
    }
    console.log(`\n================ ALL ${passed}/${total} TESTS PASSED =================\n`);
  })().catch(err => {
    console.error('\nTest Suite Failed:', err.message);
    process.exit(1);
  });
}
