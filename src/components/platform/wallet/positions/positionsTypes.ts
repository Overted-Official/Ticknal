export type OrderRow = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  status: 'OPEN' | 'CLOSED';
  entryDate: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number | null;
  stopPrice: number | null;
  exitDate: string | null;
  exitPrice: number | null;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

export type GroupedOrder = {
  key: string;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  status: 'OPEN' | 'CLOSED';
  totalQuantity: number;
  avgEntryPrice: number;
  targetPrice: number | null;
  stopPrice: number | null;
  currentPrice: number;
  totalMktValue: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  orders: OrderRow[];
  firstEntryDate: string;
  lastEntryDate: string;
};

export type SortField = 'ticker' | 'status' | 'entry' | 'target' | 'quantity' | 'current' | 'mktValue' | 'pl';
export type SortDirection = 'asc' | 'desc';

export const formatPrice = (p: number) =>
  `${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;

export const formatQuantity = (q: number) =>
  Number.isInteger(q)
    ? q.toLocaleString('en-US')
    : q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const formatMoney = (val: number) => {
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  const abs = Math.abs(val);
  return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;
};
