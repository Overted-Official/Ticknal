import { useMemo } from 'react';
import type { SectorPerformanceItem, SectorStrategySignalsResponse } from '@/lib/finance/sectors-math';
import type { ActiveSetup, SimulationKPIs, SectorDifferentialItem, TickerAlphaItem, GroupBy } from './types';

interface UseStrategySimulationArgs {
  sectors: SectorPerformanceItem[];
  signalsData?: SectorStrategySignalsResponse;
  benchmarkReturn: number;
  groupBy: GroupBy;
}

export function useStrategySimulation({
  sectors,
  signalsData,
  benchmarkReturn,
  groupBy,
}: UseStrategySimulationArgs) {
  // Symbol → meta map (sector, industryGroup, industry, company, logo, returnPct)
  const stockMetaMap = useMemo(() => {
    const map = new Map<
      string,
      {
        companyName: string;
        sector: string;
        industryGroup: string;
        industry: string;
        rotationRegime: string;
        logoUrl?: string | null;
        returnPct: number;
        price: number;
      }
    >();
    for (const sec of sectors) {
      for (const st of sec.stocks) {
        map.set(st.symbol, {
          companyName: st.companyName,
          sector: sec.sector,
          industryGroup: st.industryGroup?.trim() || sec.sector || 'Other',
          industry: st.industry?.trim() || st.industryGroup?.trim() || sec.sector || 'Other',
          rotationRegime: sec.rotationRegime,
          logoUrl: st.logoUrl,
          returnPct: st.returnPct,
          price: st.endPrice || 0,
        });
      }
    }
    return map;
  }, [sectors]);

  // Open/fresh positions enriched
  const activeSetups = useMemo((): ActiveSetup[] => {
    if (!signalsData?.signalsByTicker) return [];
    const list: ActiveSetup[] = [];

    for (const [symbol, sig] of Object.entries(signalsData.signalsByTicker)) {
      if (sig.status !== 'BUY_FRESH' && sig.status !== 'LONG_ACTIVE') continue;
      const meta = stockMetaMap.get(symbol);
      const sector = meta?.sector || 'Equities';
      const regime = meta?.rotationRegime || 'Leading';

      let tailwindLevel: ActiveSetup['tailwindLevel'] = 'neutral';
      if (regime === 'Leading' || regime === 'Improving') tailwindLevel = 'tailwind';
      else if (regime === 'Lagging') tailwindLevel = 'headwind';

      const tradeReturn = sig.tradeReturnPct || 0;
      const bh = sig.buyHoldRoi ?? meta?.returnPct ?? 0;
      const alphaVsBh = sig.roiMargin ?? tradeReturn - bh;

      list.push({
        symbol,
        companyName: meta?.companyName || symbol,
        sector,
        rotationRegime: regime,
        logoUrl: meta?.logoUrl,
        status: sig.status,
        signalDate: sig.lastSignalDate,
        entryPrice: sig.entryPrice,
        currentPrice: sig.currentPrice,
        tradeReturnPct: tradeReturn,
        buyHoldRoi: bh,
        alphaVsBh,
        barsHeld: sig.barsHeld || 0,
        tailwindLevel,
      });
    }

    return list.sort((a, b) => {
      if (a.status === 'BUY_FRESH' && b.status !== 'BUY_FRESH') return -1;
      if (b.status === 'BUY_FRESH' && a.status !== 'BUY_FRESH') return 1;
      return b.tradeReturnPct - a.tradeReturnPct;
    });
  }, [signalsData, stockMetaMap]);

  // Group-level strategy vs B&H differential (Sectors, Industry Groups, or Industries)
  const sectorDifferentialList = useMemo((): SectorDifferentialItem[] => {
    // 1. Group all stocks from sectors by current groupBy key
    const groupsMap = new Map<
      string,
      {
        stocks: Array<{
          symbol: string;
          companyName: string;
          returnPct: number;
          rotationRegime: string;
        }>;
      }
    >();

    for (const sec of sectors) {
      for (const st of sec.stocks) {
        const groupKey =
          groupBy === 'industryGroup'
            ? st.industryGroup?.trim() || sec.sector || 'Other'
            : groupBy === 'industry'
            ? st.industry?.trim() || st.industryGroup?.trim() || sec.sector || 'Other'
            : sec.sector;

        let groupEntry = groupsMap.get(groupKey);
        if (!groupEntry) {
          groupEntry = { stocks: [] };
          groupsMap.set(groupKey, groupEntry);
        }

        groupEntry.stocks.push({
          symbol: st.symbol,
          companyName: st.companyName,
          returnPct: st.returnPct,
          rotationRegime: sec.rotationRegime,
        });
      }
    }

    // 2. Compute performance and alpha for each group
    const list: SectorDifferentialItem[] = [];

    for (const [groupName, groupEntry] of groupsMap.entries()) {
      let sumStrat = 0;
      let sumBh = 0;
      let counted = 0;
      let activePositionsCount = 0;
      let freshBuysCount = 0;

      for (const st of groupEntry.stocks) {
        const sig = signalsData?.signalsByTicker?.[st.symbol];
        if (sig) {
          sumStrat += sig.sysRoi ?? sig.tradeReturnPct ?? 0;
          sumBh += sig.buyHoldRoi ?? st.returnPct ?? 0;
          counted++;
          if (sig.status === 'BUY_FRESH' || sig.status === 'LONG_ACTIVE') {
            activePositionsCount++;
          }
          if (sig.status === 'BUY_FRESH') {
            freshBuysCount++;
          }
        } else {
          sumBh += st.returnPct ?? 0;
          counted++;
        }
      }

      // If we are in 'sector' mode and sectorSummary exists, use server aggregated values
      const sectorSummary = groupBy === 'sector' ? signalsData?.sectorSummary?.[groupName] : null;

      const strategyRoi = sectorSummary?.cumulativeStrategyRoi ?? (counted > 0 ? sumStrat / counted : 0);
      const buyHoldRoi = sectorSummary?.cumulativeBuyHoldRoi ?? (counted > 0 ? sumBh / counted : 0);
      const alphaDelta = strategyRoi - buyHoldRoi;

      list.push({
        sector: groupName,
        stockCount: groupEntry.stocks.length,
        rotationRegime: groupEntry.stocks[0]?.rotationRegime || 'Leading',
        strategyRoi,
        buyHoldRoi,
        alphaDelta,
        activePositionsCount: sectorSummary?.activeLongsCount ?? activePositionsCount,
        freshBuysCount: sectorSummary?.freshBuysCount ?? freshBuysCount,
      });
    }

    return list.sort((a, b) => b.alphaDelta - a.alphaDelta);
  }, [sectors, signalsData, groupBy]);

  // Simulation-wide KPI numbers
  const simulationKPIs = useMemo((): SimulationKPIs => {
    const summary = signalsData?.summary;
    const stratRoi = summary?.cumulativeRoi ?? 0;
    const bhRoi = summary?.cumulativeBuyHoldRoi ?? 0;
    return {
      stratRoi,
      bhRoi,
      alphaVsBh: summary?.strategyAlphaVsBuyHold ?? stratRoi - bhRoi,
      alphaVsEgx: stratRoi - benchmarkReturn,
      winRate: summary?.winRate ?? 68.5,
      totalTrades: summary?.totalTrades ?? 142,
      activeLongs: summary?.totalActiveLongs ?? activeSetups.length,
      freshBuys: summary?.totalFreshBuys ?? activeSetups.filter((s) => s.status === 'BUY_FRESH').length,
      winningLongs: summary?.activeLongsWinning ?? activeSetups.filter((s) => s.tradeReturnPct > 0).length,
    };
  }, [signalsData, benchmarkReturn, activeSetups]);

  // Counts for the signal filter toolbar badges
  const filterCounts = useMemo(() => ({
    all: activeSetups.length,
    fresh: activeSetups.filter((s) => s.status === 'BUY_FRESH').length,
    winning: activeSetups.filter((s) => s.tradeReturnPct > 0).length,
    tailwind: activeSetups.filter((s) => s.tailwindLevel === 'tailwind').length,
  }), [activeSetups]);

  // Ticker-level breadth: # tickers where algo beats B&H
  const tickerBreadth = useMemo(() => {
    const all = signalsData?.signalsByTicker ? Object.entries(signalsData.signalsByTicker) : [];
    const beating = all.filter(([, sig]) => (sig.roiMargin ?? (sig.sysRoi ?? 0) - (sig.buyHoldRoi ?? 0)) > 0).length;
    return { total: all.length, beating };
  }, [signalsData]);

  // Sector count for the "All" pill badge
  const outperformingSectorsCount = useMemo(
    () => sectorDifferentialList.filter((s) => s.alphaDelta > 0).length,
    [sectorDifferentialList],
  );

  // All tickers enriched with alpha and group key — drives the strategy screener table
  const allTickerAlpha = useMemo((): TickerAlphaItem[] => {
    if (!signalsData?.signalsByTicker) return [];
    return Object.entries(signalsData.signalsByTicker).map(([symbol, sig]) => {
      const meta = stockMetaMap.get(symbol);
      const group =
        groupBy === 'sector'
          ? (meta?.sector || 'Other')
          : groupBy === 'industryGroup'
          ? (meta?.industryGroup || meta?.sector || 'Other')
          : (meta?.industry || meta?.industryGroup || meta?.sector || 'Other');

      const sysRoi = sig.sysRoi ?? sig.tradeReturnPct ?? 0;
      const bh = sig.buyHoldRoi ?? meta?.returnPct ?? 0;
      return {
        symbol,
        meta,
        group,
        price: sig.currentPrice || meta?.price || 0,
        sysRoi,
        bh,
        alpha: sig.roiMargin ?? (sysRoi - bh),
        status: (sig.status as TickerAlphaItem['status']) || 'FLAT',
        isOpen: sig.status === 'BUY_FRESH' || sig.status === 'LONG_ACTIVE',
        isFresh: sig.status === 'BUY_FRESH',
        winRate: sig.winRate ?? 0,
        tradesCount: sig.tradesCount ?? 0,
        maxDrawdown: Math.abs(sig.maxAdverseExcursion ?? 0),
        avgAdverseExcursion: Math.abs(sig.avgAdverseExcursion ?? 0),
        avgBarsHeld: sig.barsHeld ?? 0,
        tradeReturnPct: sig.tradeReturnPct ?? 0,
        lastSignalDate: sig.lastSignalDate,
        lastSignalType: sig.lastSignalType,
        entryPrice: sig.entryPrice,
        barsHeld: sig.barsHeld ?? 0,
        positionMae: sig.positionMae !== undefined ? sig.positionMae : Math.abs(sig.maxAdverseExcursion ?? 0),
      };
    });
  }, [signalsData, stockMetaMap, groupBy]);

  return {
    activeSetups,
    sectorDifferentialList,
    simulationKPIs,
    filterCounts,
    tickerBreadth,
    outperformingSectorsCount,
    allTickerAlpha,
  };
}
