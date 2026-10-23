import type { CompanyFinancialStatement } from './types';

export interface StatementsData {
  annual: CompanyFinancialStatement[];
  quarterly: CompanyFinancialStatement[];
}

export interface MetricRowDefinition {
  label: string;
  getter: (stmt: CompanyFinancialStatement) => number | null | undefined;
}

export const EXPORT_METRIC_ROWS: MetricRowDefinition[] = [
  { label: 'Total Revenue', getter: (s) => s.totalRevenue },
  { label: 'Gross Profit', getter: (s) => s.grossProfit },
  { label: 'Operating Income', getter: (s) => s.operatingIncome },
  { label: 'Net Income', getter: (s) => s.netIncome },
  { label: 'EBITDA', getter: (s) => s.ebitda },
  { label: 'EPS Diluted', getter: (s) => s.epsDiluted },
  { label: 'Total Assets', getter: (s) => s.totalAssets },
  { label: 'Total Liabilities', getter: (s) => s.totalLiabilities },
  { label: 'Total Debt', getter: (s) => s.totalDebt },
  { label: 'Cash & Equivalents', getter: (s) => s.cashAndEquivalents },
  { label: 'Total Equity', getter: (s) => s.totalEquity },
  { label: 'Free Cash Flow', getter: (s) => s.freeCashFlow },
];

/**
 * Builds clean CSV string content for company financial statements.
 * Columns: Metric, followed by periods sorted descending (latest first).
 */
export function buildStatementsCSVContent(
  statements: CompanyFinancialStatement[] = [],
  frequency: 'annual' | 'quarterly' = 'annual'
): string {
  if (!statements || statements.length === 0) {
    return 'Metric\n';
  }

  // Sort periods descending (latest period first)
  const sortedStatements = [...statements].sort((a, b) => {
    if (b.fiscalYear !== a.fiscalYear) {
      return b.fiscalYear - a.fiscalYear;
    }
    const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
    const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
    if (dateB !== dateA) {
      return dateB - dateA;
    }
    return (b.fiscalPeriod || '').localeCompare(a.fiscalPeriod || '');
  });

  // Build header row: Metric,Period1,Period2,...
  const periodHeaders = sortedStatements.map((stmt) => {
    if (frequency === 'annual') {
      return stmt.fiscalPeriod === 'FY'
        ? `FY ${stmt.fiscalYear}`
        : `${stmt.fiscalPeriod} ${stmt.fiscalYear}`;
    }
    return `${stmt.fiscalPeriod} ${stmt.fiscalYear}`;
  });

  const headerLine = ['Metric', ...periodHeaders.map((h) => (h.includes(',') ? `"${h}"` : h))].join(',');

  // Build rows for each standard metric
  const lines = [headerLine];

  for (const metric of EXPORT_METRIC_ROWS) {
    const rowValues = sortedStatements.map((stmt) => {
      const val = metric.getter(stmt);
      if (val == null || Number.isNaN(val)) {
        return '';
      }
      return val.toString();
    });
    const escapedLabel = metric.label.includes(',') ? `"${metric.label}"` : metric.label;
    lines.push([escapedLabel, ...rowValues].join(','));
  }

  return lines.join('\n');
}

/**
 * Exports financial statements to a downloadable CSV file.
 * File format: `${symbol}_financials_${frequency}.csv`
 */
export function exportStatementsToCSV(
  symbol: string,
  statements?: StatementsData,
  frequency: 'annual' | 'quarterly' = 'annual'
): void {
  const cleanSymbol = symbol
    .trim()
    .toUpperCase()
    .replace(/\.CA$/, '')
    .replace(/^EGX:/, '');

  const list = frequency === 'annual' ? statements?.annual : statements?.quarterly;
  const csvContent = buildStatementsCSVContent(list || [], frequency);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${cleanSymbol}_financials_${frequency}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
