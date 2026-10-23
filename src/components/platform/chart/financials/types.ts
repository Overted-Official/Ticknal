import type { CompanyFinancialStatement, CompanyValuationMetric } from '@/db/schema';

export type { CompanyFinancialStatement, CompanyValuationMetric };

export interface CompanyFundamentalsResponse {
  symbol: string;
  currency: string;
  valuation: CompanyValuationMetric | null;
  statements: {
    annual: CompanyFinancialStatement[];
    quarterly: CompanyFinancialStatement[];
  };
}

export interface FinancialsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName?: string;
  sector?: string;
  logoUrl?: string | null;
  currency?: string;
}

export type FinancialsTab = 'overview' | 'statements' | 'ratios';

export type StatementType = 'income' | 'balance' | 'cashflow';

export type PeriodFrequency = 'annual' | 'quarterly';

export type AltmanZone = 'safe' | 'grey' | 'distress';

export type PiotroskiRating = 'high' | 'stable' | 'weak';
