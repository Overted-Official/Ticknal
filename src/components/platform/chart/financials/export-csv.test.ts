import { describe, it, expect } from 'vitest';
import {
  buildStatementsCSVContent,
  EXPORT_METRIC_ROWS,
} from './export-csv';
import type { CompanyFinancialStatement } from './types';

describe('Financial Statements CSV Export', () => {
  it('handles empty statements array gracefully', () => {
    const csv = buildStatementsCSVContent([]);
    expect(csv).toBe('Metric\n');
  });

  it('builds annual statements CSV with sorted columns descending', () => {
    const mockStatements: CompanyFinancialStatement[] = [
      {
        id: 1,
        symbol: 'COMI',
        periodType: 'ANNUAL',
        fiscalYear: 2022,
        fiscalPeriod: 'FY',
        reportDate: '2022-12-31',
        filingDate: null,
        currency: 'EGP',
        totalRevenue: 30000000000,
        grossProfit: 25000000000,
        operatingIncome: 20000000000,
        netIncome: 16000000000,
        ebitda: 21000000000,
        epsBasic: 5.5,
        epsDiluted: 5.4,
        totalAssets: 600000000000,
        totalLiabilities: 520000000000,
        totalDebt: 50000000000,
        cashAndEquivalents: 40000000000,
        totalEquity: 80000000000,
        operatingCashFlow: 15000000000,
        capitalExpenditures: -2000000000,
        freeCashFlow: 13000000000,
        incomeStatementRaw: null,
        balanceSheetRaw: null,
        cashFlowRaw: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        symbol: 'COMI',
        periodType: 'ANNUAL',
        fiscalYear: 2023,
        fiscalPeriod: 'FY',
        reportDate: '2023-12-31',
        filingDate: null,
        currency: 'EGP',
        totalRevenue: 45000000000,
        grossProfit: 38000000000,
        operatingIncome: 30000000000,
        netIncome: 24000000000,
        ebitda: 32000000000,
        epsBasic: 8.1,
        epsDiluted: 8.0,
        totalAssets: 800000000000,
        totalLiabilities: 690000000000,
        totalDebt: 60000000000,
        cashAndEquivalents: 55000000000,
        totalEquity: 110000000000,
        operatingCashFlow: 22000000000,
        capitalExpenditures: -3000000000,
        freeCashFlow: 19000000000,
        incomeStatementRaw: null,
        balanceSheetRaw: null,
        cashFlowRaw: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const csv = buildStatementsCSVContent(mockStatements, 'annual');
    const lines = csv.split('\n');

    // Header row should have latest period first (FY 2023 before FY 2022)
    expect(lines[0]).toBe('Metric,FY 2023,FY 2022');

    // Check rows for metrics
    expect(lines.find((l) => l.startsWith('Total Revenue'))).toBe('Total Revenue,45000000000,30000000000');
    expect(lines.find((l) => l.startsWith('Net Income'))).toBe('Net Income,24000000000,16000000000');
    expect(lines.find((l) => l.startsWith('EPS Diluted'))).toBe('EPS Diluted,8,5.4');
    expect(lines.find((l) => l.startsWith('Cash & Equivalents'))).toBe('Cash & Equivalents,55000000000,40000000000');
    expect(lines.find((l) => l.startsWith('Free Cash Flow'))).toBe('Free Cash Flow,19000000000,13000000000');
  });

  it('builds quarterly statements CSV correctly', () => {
    const mockQuarterly: CompanyFinancialStatement[] = [
      {
        id: 1,
        symbol: 'COMI',
        periodType: 'QUARTERLY',
        fiscalYear: 2024,
        fiscalPeriod: 'Q1',
        reportDate: '2024-03-31',
        filingDate: null,
        currency: 'EGP',
        totalRevenue: 12000000000,
        grossProfit: 10000000000,
        operatingIncome: 8000000000,
        netIncome: 6500000000,
        ebitda: 8500000000,
        epsBasic: 2.1,
        epsDiluted: 2.1,
        totalAssets: 850000000000,
        totalLiabilities: 730000000000,
        totalDebt: 62000000000,
        cashAndEquivalents: 60000000000,
        totalEquity: 120000000000,
        operatingCashFlow: 5000000000,
        capitalExpenditures: -800000000,
        freeCashFlow: 4200000000,
        incomeStatementRaw: null,
        balanceSheetRaw: null,
        cashFlowRaw: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        symbol: 'COMI',
        periodType: 'QUARTERLY',
        fiscalYear: 2024,
        fiscalPeriod: 'Q2',
        reportDate: '2024-06-30',
        filingDate: null,
        currency: 'EGP',
        totalRevenue: 14000000000,
        grossProfit: 11500000000,
        operatingIncome: 9200000000,
        netIncome: 7400000000,
        ebitda: 9800000000,
        epsBasic: 2.4,
        epsDiluted: 2.4,
        totalAssets: 890000000000,
        totalLiabilities: 760000000000,
        totalDebt: 65000000000,
        cashAndEquivalents: 63000000000,
        totalEquity: 130000000000,
        operatingCashFlow: 6000000000,
        capitalExpenditures: -900000000,
        freeCashFlow: 5100000000,
        incomeStatementRaw: null,
        balanceSheetRaw: null,
        cashFlowRaw: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const csv = buildStatementsCSVContent(mockQuarterly, 'quarterly');
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Metric,Q2 2024,Q1 2024');
    expect(lines.find((l) => l.startsWith('Total Revenue'))).toBe('Total Revenue,14000000000,12000000000');
  });

  it('contains all 12 standard metric definitions', () => {
    expect(EXPORT_METRIC_ROWS.length).toBe(12);
  });
});
