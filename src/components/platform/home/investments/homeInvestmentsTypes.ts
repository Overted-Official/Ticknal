import { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';
import { type IndustryGroupStake } from '@/types/bank';

export type HomeInvestmentOrder = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  industryGroup?: string;
  logoUrl?: string | null;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

// Backwards-compatibility alias
export type DashboardOrder = HomeInvestmentOrder;

export type OrderStats = {
  openOrders: HomeInvestmentOrder[];
  openMarketValue: number;
  openCostBasis: number;
  unrealized: number;
  realized: number;
  totalRoi: number;
  sectorData: SectorDataItem[];
  industryGroupData: IndustryGroupStake[];
  rotationMap?: Record<string, string>;
  monthlyData: MonthlyDataItem[];
  winRate: number | null;
  avgBarsPerTrade: number | null;
  maxDrawdownPct: number | null;
  avgAdverseExcursion: number | null;
  openWinning: number;
  openLosing: number;
  closedWinning: number;
  closedLosing: number;
  closedCount: number;
};

export type { MonthlyDataItem, SectorDataItem, IndustryGroupStake };
