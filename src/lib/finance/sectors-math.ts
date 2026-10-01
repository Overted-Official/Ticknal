export interface StockPerformanceItem {
  symbol: string;
  companyName: string;
  sector: string;
  industryGroup?: string | null;
  industry?: string | null;
  subIndustry?: string | null;
  logoUrl: string | null;
  startPrice: number;
  endPrice: number;
  returnPct: number;
  /** Tactical return used only when a caller supplies a short-term rotation horizon. */
  shortTermReturnPct?: number;
  volume: number;
  turnover: number;
  turnoverShare: number;
  isAdvancing: boolean;
  psiSignal?: {
    signal: string;
    date: string;
    masterIndex: number | null;
    entryReason?: string;
    exitReason?: string;
  };
}

export interface SectorPerformanceItem {
  sector: string;
  stockCount: number;
  totalTurnover: number;
  turnoverShare: number;
  turnoverWeightedReturn: number;
  equalWeightedReturn: number;
  gainersCount: number;
  losersCount: number;
  unchangedCount: number;
  breadthRatio: number;
  relativeStrengthVsBenchmark: number;
  rotationRegime: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
  topDriver: {
    symbol: string;
    companyName: string;
    returnPct: number;
    contributionPct: number;
  } | null;
  topDrag: {
    symbol: string;
    companyName: string;
    returnPct: number;
  } | null;
  stocks: StockPerformanceItem[];
}

export interface MajorIndexData {
  symbol: 'EGX30' | 'EGX70' | 'EGX100';
  name: string;
  badge: string;
  points: number;
  change: number;
  changePercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  history: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface MoneySupplyData {
  symbol: 'M2' | 'M1' | 'M0';
  name: string;
  badge: string;
  value: number;
  change: number;
  changePercent: number;
  history: Array<{
    date: string;
    value: number;
    change: number;
    changePercent: number;
  }>;
}

export interface SectorsPerformanceResponse {
  timeframe: {
    startDate: string;
    endDate: string;
    tradingDaysCount: number;
  };
  marketSummary: {
    totalTurnover: number;
    marketWeightedReturn: number;
    marketEqualReturn: number;
    totalStocks: number;
    totalGainers: number;
    totalLosers: number;
    topSector: string;
    topSectorReturn: number;
    laggardSector: string;
    laggardSectorReturn: number;
  };
  sectors: SectorPerformanceItem[];
  rawStockItems?: StockPerformanceItem[];
  egx30Return?: number | null;
  egx30History?: { date: string; close: number; volume?: number }[];
  dailyBreadth?: { date: string; gainers: number; losers: number; netAdvancers: number; adLine: number }[];
  majorIndices?: Record<'EGX30' | 'EGX70' | 'EGX100', MajorIndexData>;
  moneySupply?: Record<'M2' | 'M1' | 'M0', MoneySupplyData>;
  granularity?: 'sector' | 'industryGroup' | 'industry' | 'ticker';
}

export interface TickerStrategySignalState {
  status: 'BUY_FRESH' | 'LONG_ACTIVE' | 'EXIT_RECENT' | 'FLAT';
  lastSignalDate?: string;
  lastSignalType?: string;
  tradeReturnPct?: number;
  entryPrice?: number;
  currentPrice?: number;
  barsHeld?: number;
  sysRoi?: number;
  buyHoldRoi?: number;
  roiMargin?: number;
  winRate?: number;
  tradesCount?: number;
  maxAdverseExcursion?: number;
  avgAdverseExcursion?: number;
  positionMae?: number;
}

export interface StrategyModelComparisonMetrics {
  simulatedRoi: number;
  buyHoldRoi: number;
  alphaVsBh: number;
  alphaVsEgx: number;
  cagr: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  volatility: number;
  winRate: number;
  winLossRatio: number;
  avgHoldingPeriod: string;
  breadthBeatRate: number;
  totalTrades: number;
}

export interface WinningUniverseComparisonMetrics extends StrategyModelComparisonMetrics {
  winningTickersCount: number;
  totalScanned: number;
  winningBreadthPct: number;
}

export interface TickerChampionInfo {
  champion: 'psi' | 'psi_v2' | 'hydra';
  championName: string;
  alpha: number;
  roi: number;
  buyHoldRoi: number;
  hasPositiveAlpha: boolean;
}

export interface SectorStrategySignalsResponse {
  summary: {
    cumulativeRoi?: number;
    cumulativeBuyHoldRoi?: number;
    strategyAlphaVsBuyHold?: number;
    winRate?: number;
    totalTrades?: number;
    avgBarsPerTrade?: number;
    avgMae?: number;
    totalFreshBuys: number;
    totalActiveLongs: number;
    activeLongsWinning?: number;
    activeLongsLosing?: number;
    totalRecentExits: number;
    totalScanned: number;
    lastScanTime: string;
  };
  signalsByTicker: Record<string, TickerStrategySignalState>;
  sectorSummary: Record<
    string,
    {
      freshBuysCount: number;
      activeLongsCount: number;
      activeWinningCount?: number;
      activeLosingCount?: number;
      avgTradeReturn?: number;
      cumulativeStrategyRoi?: number;
      cumulativeBuyHoldRoi?: number;
      alphaSpread?: number;
      recentExitsCount: number;
      totalStocks: number;
    }
  >;
  modelsComparison?: Record<string, StrategyModelComparisonMetrics>;
  winningUniverseComparison?: Record<string, WinningUniverseComparisonMetrics>;
  tickerChampions?: Record<string, TickerChampionInfo>;
}

export function aggregateSectorsFromStocks(
  stockItems: StockPerformanceItem[],
  granularity: 'sector' | 'industryGroup' | 'industry' | 'ticker' = 'sector',
  egx30Return: number | null = null,
  options: { shortTermBenchmarkReturn?: number | null } = {},
): {
  sectors: SectorPerformanceItem[];
  marketSummary: SectorsPerformanceResponse['marketSummary'];
} {
  const totalMarketTurnover = stockItems.reduce((sum, s) => sum + s.turnover, 0);
  const totalMarketGainers = stockItems.filter((s) => s.returnPct > 0).length;
  const totalMarketLosers = stockItems.filter((s) => s.returnPct < 0).length;

  const sectorGroups = new Map<string, StockPerformanceItem[]>();
  for (const stock of stockItems) {
    const groupKey =
      granularity === 'ticker'
        ? stock.symbol
        : granularity === 'industryGroup'
        ? stock.industryGroup || 'Other'
        : granularity === 'industry'
        ? stock.industry || 'Other'
        : stock.sector;
    const list = sectorGroups.get(groupKey) || [];
    list.push(stock);
    sectorGroups.set(groupKey, list);
  }

  const marketWeightedReturn =
    totalMarketTurnover > 0
      ? stockItems.reduce((sum, s) => sum + s.returnPct * (s.turnover / totalMarketTurnover), 0)
      : 0;

  const marketEqualReturn =
    stockItems.length > 0
      ? stockItems.reduce((sum, s) => sum + s.returnPct, 0) / stockItems.length
      : 0;

  const benchmarkReturn = egx30Return !== null ? egx30Return : marketWeightedReturn;
  const hasShortTermRotation =
    stockItems.some((stock) => Number.isFinite(stock.shortTermReturnPct));
  const marketShortTermWeightedReturn =
    totalMarketTurnover > 0
      ? stockItems.reduce(
          (sum, stock) => sum + (stock.shortTermReturnPct ?? 0) * (stock.turnover / totalMarketTurnover),
          0,
        )
      : 0;
  const shortTermBenchmarkReturn =
    typeof options.shortTermBenchmarkReturn === 'number'
      ? options.shortTermBenchmarkReturn
      : marketShortTermWeightedReturn;
  const sectors: SectorPerformanceItem[] = [];

  for (const [sectorName, stocks] of sectorGroups.entries()) {
    const sectorTurnover = stocks.reduce((sum, s) => sum + s.turnover, 0);
    const gainers = stocks.filter((s) => s.returnPct > 0).length;
    const losers = stocks.filter((s) => s.returnPct < 0).length;
    const unchanged = stocks.length - gainers - losers;

    for (const s of stocks) {
      s.turnoverShare = sectorTurnover > 0 ? (s.turnover / sectorTurnover) * 100 : 0;
    }

    const turnoverWeightedReturn =
      sectorTurnover > 0
        ? stocks.reduce((sum, s) => sum + s.returnPct * (s.turnover / sectorTurnover), 0)
        : 0;

    const equalWeightedReturn =
      stocks.length > 0
        ? stocks.reduce((sum, s) => sum + s.returnPct, 0) / stocks.length
        : 0;
    const relativeStrengthVsBenchmark = turnoverWeightedReturn - benchmarkReturn;

    let topDriver: any = null;
    let topDrag: any = null;

    const sortedByImpact = [...stocks].sort((a, b) => {
      const impactA = a.returnPct * (a.turnover / (sectorTurnover || 1));
      const impactB = b.returnPct * (b.turnover / (sectorTurnover || 1));
      return impactB - impactA;
    });

    if (sortedByImpact.length > 0) {
      const best = sortedByImpact[0];
      const bestImpact = best.returnPct * (best.turnover / (sectorTurnover || 1));
      const contributionPct =
        turnoverWeightedReturn !== 0 ? (bestImpact / turnoverWeightedReturn) * 100 : 0;

      topDriver = {
        symbol: best.symbol,
        companyName: best.companyName,
        returnPct: best.returnPct,
        contributionPct,
      };

      const worst = sortedByImpact[sortedByImpact.length - 1];
      if (worst.returnPct < 0) {
        topDrag = {
          symbol: worst.symbol,
          companyName: worst.companyName,
          returnPct: worst.returnPct,
        };
      }
    }

    const stockCount = stocks.length;
    let hasPositiveMomentum: boolean;

    if (hasShortTermRotation) {
      const shortTermGainers = stocks.filter((stock) => (stock.shortTermReturnPct ?? 0) > 0).length;
      const shortTermLosers = stocks.filter((stock) => (stock.shortTermReturnPct ?? 0) < 0).length;
      const shortTermTurnoverWeightedReturn =
        sectorTurnover > 0
          ? stocks.reduce(
              (sum, stock) => sum + (stock.shortTermReturnPct ?? 0) * (stock.turnover / sectorTurnover),
              0,
            )
          : 0;

      // Tactical confirmation requires both relative strength and breadth to be positive over 5 sessions.
      hasPositiveMomentum =
        shortTermTurnoverWeightedReturn >= shortTermBenchmarkReturn &&
        shortTermGainers >= shortTermLosers;
    } else if (stockCount > 1) {
      // Default behavior for callers that use a single timeframe: breadth-conditioned momentum.
      const netBreadth = (gainers - losers) / stockCount;
      const capitalSpread = Math.abs(turnoverWeightedReturn - equalWeightedReturn);
      const alphaAbs = Math.abs(turnoverWeightedReturn - (benchmarkReturn ?? 0));
      const impactMagnitude = 10 + capitalSpread * 0.4 + alphaAbs * 0.2;
      hasPositiveMomentum = netBreadth * impactMagnitude >= 0;
    } else {
      hasPositiveMomentum = turnoverWeightedReturn >= marketEqualReturn;
    }

    let rotationRegime: 'Leading' | 'Weakening' | 'Lagging' | 'Improving' = 'Lagging';

    if (turnoverWeightedReturn >= benchmarkReturn) {
      rotationRegime = hasPositiveMomentum ? 'Leading' : 'Weakening';
    } else {
      rotationRegime = hasPositiveMomentum ? 'Improving' : 'Lagging';
    }

    stocks.sort((a, b) => b.turnover - a.turnover);

    sectors.push({
      sector: sectorName,
      stockCount: stocks.length,
      totalTurnover: sectorTurnover,
      turnoverShare: totalMarketTurnover > 0 ? (sectorTurnover / totalMarketTurnover) * 100 : 0,
      turnoverWeightedReturn,
      equalWeightedReturn,
      gainersCount: gainers,
      losersCount: losers,
      unchangedCount: unchanged,
      breadthRatio: stocks.length > 0 ? (gainers / stocks.length) * 100 : 0,
      relativeStrengthVsBenchmark,
      rotationRegime,
      topDriver,
      topDrag,
      stocks,
    });
  }

  sectors.sort((a, b) => b.totalTurnover - a.totalTurnover);

  const totalMarketStocksCount = stockItems.length || 1;

  // Filter out Unclassified / Other
  const namedSectors = sectors.filter(
    (s) => s.sector !== 'Other' && s.sector !== 'Unclassified' && s.stockCount > 0
  );

  // Rank by Market Breadth Contribution: Return * (StockCount / TotalMarketStocks)
  const sectorsByContribution = [...(namedSectors.length > 0 ? namedSectors : sectors)].sort((a, b) => {
    const contribA = a.turnoverWeightedReturn * (a.stockCount / totalMarketStocksCount);
    const contribB = b.turnoverWeightedReturn * (b.stockCount / totalMarketStocksCount);
    return contribB - contribA;
  });

  const topItem = sectorsByContribution[0] || sectors[0];
  const topSector = topItem?.sector || 'N/A';
  const topSectorReturn = topItem?.turnoverWeightedReturn || 0;

  const laggardItem =
    sectorsByContribution[sectorsByContribution.length - 1] || sectors[sectors.length - 1];
  const laggardSector = laggardItem?.sector || 'N/A';
  const laggardSectorReturn = laggardItem?.turnoverWeightedReturn || 0;

  return {
    sectors,
    marketSummary: {
      totalTurnover: totalMarketTurnover,
      marketWeightedReturn,
      marketEqualReturn,
      totalStocks: stockItems.length,
      totalGainers: totalMarketGainers,
      totalLosers: totalMarketLosers,
      topSector,
      topSectorReturn,
      laggardSector,
      laggardSectorReturn,
    },
  };
}
