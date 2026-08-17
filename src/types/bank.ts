export type BankItem = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  location?: string | null;
  website?: string | null;
};

export type BankAccount = {
  id: number;
  userId: string;
  bankId?: number | null;
  customBankName?: string | null;
  accountName: string;
  accountNumber?: string | null;
  accountType: string;
  currency: string;
  balance: string | number;
  color?: string | null;
  isArchived: boolean;
  bankName?: string | null;
  bankLogoUrl?: string | null;
  bankSlug?: string | null;
};

export type BankTransaction = {
  id: number;
  userId: string;
  accountId: number;
  toAccountId?: number | null;
  type: string;
  amount: string | number;
  currency: string;
  category: string;
  transactionDate: string;
  notes?: string | null;
  accountName?: string;
  accountType?: string;
  bankLogoUrl?: string | null;
  bankName?: string | null;
};

export type PositionItem = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  sector: string;
  logoUrl?: string | null;
};
