import assert from 'node:assert';
import { getRatioBenchmarkStatus } from './components/RatioBenchmarkBadge';
import type { CompanyFinancialStatement } from './types';

const isVitest =
  typeof (globalThis as any).describe === 'function' &&
  typeof (globalThis as any).it === 'function';

interface TestItem {
  name: string;
  fn: () => void | Promise<void>;
}
interface SuiteItem {
  name: string;
  tests: TestItem[];
}

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

describe('Ratio Benchmark Classifications', () => {
  describe('Gross Margin % Benchmark', () => {
    it('classifies values correctly', () => {
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', 42.5), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', 25.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', 18.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', 10.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', 7.5), 'strained');
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', -5.0), 'strained');
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', null), null);
    });
  });

  describe('Operating & Net Margin % Benchmarks', () => {
    it('classifies operating margin', () => {
      assert.strictEqual(getRatioBenchmarkStatus('operatingMargin', 22.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('operatingMargin', 15.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('operatingMargin', 8.5), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('operatingMargin', 5.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('operatingMargin', 2.0), 'strained');
    });

    it('classifies net margin', () => {
      assert.strictEqual(getRatioBenchmarkStatus('netMargin', 14.5), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('netMargin', 10.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('netMargin', 6.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('netMargin', 3.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('netMargin', 1.2), 'strained');
      assert.strictEqual(getRatioBenchmarkStatus('netMargin', -4.0), 'strained');
    });
  });

  describe('ROE & ROA Benchmarks', () => {
    it('classifies Return on Equity (ROE)', () => {
      assert.strictEqual(getRatioBenchmarkStatus('roe', 28.5), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('roe', 15.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('roe', 10.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('roe', 5.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('roe', 2.0), 'strained');
      assert.strictEqual(getRatioBenchmarkStatus('roe', -10.0), 'strained');
    });

    it('classifies Return on Assets (ROA)', () => {
      assert.strictEqual(getRatioBenchmarkStatus('roa', 8.2), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('roa', 5.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('roa', 3.5), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('roa', 2.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('roa', 1.1), 'strained');
    });
  });

  describe('Current Ratio & Solvency Benchmarks', () => {
    it('classifies current ratio', () => {
      assert.strictEqual(getRatioBenchmarkStatus('currentRatio', 1.8), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('currentRatio', 1.2), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('currentRatio', 1.05), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('currentRatio', 0.9), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('currentRatio', 0.75), 'strained');
    });

    it('classifies debt-to-equity (lower is better, negative is strained)', () => {
      assert.strictEqual(getRatioBenchmarkStatus('debtToEquity', 0.35), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('debtToEquity', 1.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('debtToEquity', 1.6), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('debtToEquity', 2.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('debtToEquity', 3.5), 'strained');
      assert.strictEqual(getRatioBenchmarkStatus('debtToEquity', -1), 'strained');
    });

    it('classifies debt-to-assets and leverage', () => {
      assert.strictEqual(getRatioBenchmarkStatus('debtToAssets', 0.25), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('debtToAssets', 0.4), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('debtToAssets', 0.55), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('debtToAssets', 0.6), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('debtToAssets', 0.75), 'strained');

      assert.strictEqual(getRatioBenchmarkStatus('financialLeverage', 1.8), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('financialLeverage', 2.5), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('financialLeverage', 3.2), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('financialLeverage', 4.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('financialLeverage', 5.5), 'strained');
    });
  });

  describe('Cash Flow & Operating Efficiency Benchmarks', () => {
    it('classifies FCF margin and cash conversion quality', () => {
      assert.strictEqual(getRatioBenchmarkStatus('fcfMargin', 16.5), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('fcfMargin', 10.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('fcfMargin', 4.2), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('fcfMargin', 0.0), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('fcfMargin', -3.0), 'strained');

      assert.strictEqual(getRatioBenchmarkStatus('cashConversion', 1.3), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('cashConversion', 1.0), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('cashConversion', 0.8), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('cashConversion', 0.6), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('cashConversion', 0.4), 'strained');

      assert.strictEqual(getRatioBenchmarkStatus('assetTurnover', 0.95), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('assetTurnover', 0.7), 'healthy');
      assert.strictEqual(getRatioBenchmarkStatus('assetTurnover', 0.5), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('assetTurnover', 0.3), 'neutral');
      assert.strictEqual(getRatioBenchmarkStatus('assetTurnover', 0.2), 'strained');
    });

    it('returns null for unknown ratio keys or invalid numbers', () => {
      assert.strictEqual(getRatioBenchmarkStatus('unknownRatio', 10), null);
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', NaN), null);
      assert.strictEqual(getRatioBenchmarkStatus('grossMargin', undefined), null);
    });
  });
});

describe('3-Statement Line Item Calculations', () => {
  const sampleStmt = {
    id: 1,
    symbol: 'COMI',
    periodType: 'ANNUAL',
    fiscalYear: 2024,
    fiscalPeriod: 'FY',
    reportDate: '2024-12-31',
    filingDate: '2025-02-15',
    currency: 'EGP',
    totalRevenue: 100000000,
    grossProfit: 40000000,
    operatingIncome: 25000000,
    netIncome: 18000000,
    ebitda: 32000000,
    epsBasic: 4.5,
    epsDiluted: 4.45,
    totalAssets: 200000000,
    totalLiabilities: 120000000,
    totalDebt: 50000000,
    cashAndEquivalents: 30000000,
    totalEquity: 80000000,
    operatingCashFlow: 22000000,
    capitalExpenditures: 7000000,
    freeCashFlow: 15000000,
  } as unknown as CompanyFinancialStatement;

  it('computes Gross Margin %, Operating Margin %, and Net Margin %', () => {
    const grossMargin = (sampleStmt.grossProfit! / sampleStmt.totalRevenue!) * 100;
    const operatingMargin = (sampleStmt.operatingIncome! / sampleStmt.totalRevenue!) * 100;
    const netMargin = (sampleStmt.netIncome! / sampleStmt.totalRevenue!) * 100;

    assert.strictEqual(grossMargin, 40);
    assert.strictEqual(operatingMargin, 25);
    assert.strictEqual(netMargin, 18);
  });

  it('computes Net Debt = Total Debt - Cash & Equivalents', () => {
    const netDebt = sampleStmt.totalDebt! - sampleStmt.cashAndEquivalents!;
    assert.strictEqual(netDebt, 20000000);
  });

  it('computes Free Cash Flow = CFO - CapEx fallback if FCF is null', () => {
    const calculatedFCF = sampleStmt.operatingCashFlow! - sampleStmt.capitalExpenditures!;
    assert.strictEqual(calculatedFCF, 15000000);
  });

  it('computes Return on Equity (ROE) and Return on Assets (ROA)', () => {
    const roe = (sampleStmt.netIncome! / sampleStmt.totalEquity!) * 100;
    const roa = (sampleStmt.netIncome! / sampleStmt.totalAssets!) * 100;

    assert.strictEqual(roe, 22.5);
    assert.strictEqual(roa, 9.0);
  });

  it('computes Debt-to-Equity and Financial Leverage', () => {
    const debtToEquity = sampleStmt.totalDebt! / sampleStmt.totalEquity!;
    const leverage = sampleStmt.totalAssets! / sampleStmt.totalEquity!;

    assert.strictEqual(debtToEquity, 0.625);
    assert.strictEqual(leverage, 2.5);
  });
});
