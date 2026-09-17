import { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';
import { type IndustryGroupStake } from './PortfolioConsultantCard';

export type DashboardOrder = {
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

export type OrderStats = {
  openOrders: DashboardOrder[];
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
