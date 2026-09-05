'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PortfolioCommandBar from './PortfolioCommandBar';
import PortfolioProjectionStrip from './PortfolioProjectionStrip';
import HoldingsConsensusMatrix from './HoldingsConsensusMatrix';
import OpportunityRadarPanel from './OpportunityRadarPanel';
import RebalancingSandboxVisualizer from './RebalancingSandboxVisualizer';
import TickerQuickInsightsDrawer, { type InsightTickerData } from './TickerQuickInsightsDrawer';
import {
  simulatePortfolioState,
  type PortfolioPosition,
  type StagedItem,
} from '@/lib/portfolio-simulation';
import type { HoldingConsensus } from '@/lib/multi-strategy-consensus';
import type { OpportunitySignal as Opportunity } from '@/lib/opportunities';

interface PortfolioArchitectViewProps {
  initialPositions: Array<{
    id: number | string;
    tickerSymbol: string;
    entryPrice: number;
    quantity: number;
    createdAt?: any;
    entryDate?: string;
  }>;
  latestPriceMap: Record<string, number>;
  tickerMap: Record<string, { companyName: string; sector: string; industryGroup: string; logoUrl: string | null }>;
  rotationMap: Record<string, { industryGroup: string; rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging' }>;
  initialConsensusMap?: Record<string, HoldingConsensus>;
  initialOpportunities?: Opportunity[];
}

export default function PortfolioArchitectView({
  initialPositions,
  latestPriceMap,
  tickerMap,
  rotationMap,
  initialConsensusMap = {},
  initialOpportunities = [],
}: PortfolioArchitectViewProps) {
  const [mode, setMode] = useState<'live' | 'sandbox'>('live');
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [selectedInsightTicker, setSelectedInsightTicker] = useState<InsightTickerData | null>(null);
  const [isInsightOpen, setIsInsightOpen] = useState(false);

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [isLoadingOpps, setIsLoadingOpps] = useState(initialOpportunities.length === 0);

  // Background fetch of full opportunities if initial is empty
  useEffect(() => {
    if (initialOpportunities && initialOpportunities.length > 0) {
      setOpportunities(initialOpportunities);
      setIsLoadingOpps(false);
      return;
    }

    let isMounted = true;
    fetch('/api/opportunities?bars=15&strategy=all')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.opportunities && Array.isArray(data.opportunities)) {
          const buys = data.opportunities.filter((o: any) => o.signal?.signal === 'BUY');
          setOpportunities(buys);
        }
      })
      .catch((err) => console.warn('Opportunities fetch error in Portfolio Architect:', err))
      .finally(() => {
        if (isMounted) setIsLoadingOpps(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialOpportunities]);

  // Aggregate and format live positions
  const livePositions: PortfolioPosition[] = useMemo(() => {
    const totalInvested = initialPositions.reduce((sum, p) => {
      const sym = p.tickerSymbol.trim().toUpperCase();
      const currentPrice = latestPriceMap[sym] ?? Number(p.entryPrice);
      return sum + currentPrice * Number(p.quantity);
    }, 0);

    return initialPositions.map((p) => {
      const sym = p.tickerSymbol.trim().toUpperCase();
      const cleanSym = sym.replace('.CA', '');
      const meta = tickerMap[sym] || tickerMap[cleanSym] || {
        companyName: cleanSym,
        sector: 'Unclassified',
        industryGroup: 'Unclassified',
        logoUrl: null,
      };
      const rot = rotationMap[cleanSym];

      const currentPrice = latestPriceMap[sym] ?? Number(p.entryPrice);
      const entryPrice = Number(p.entryPrice);
      const quantity = Number(p.quantity);
      const marketValue = currentPrice * quantity;
      const unrealizedPnl = (currentPrice - entryPrice) * quantity;
      const unrealizedPnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
      const weightPct = totalInvested > 0 ? (marketValue / totalInvested) * 100 : 0;

      return {
        id: p.id,
        tickerSymbol: sym,
        companyName: meta.companyName || cleanSym,
        sector: meta.sector || 'Unclassified',
        industryGroup: rot?.industryGroup || meta.industryGroup || meta.sector || 'Unclassified',
        logoUrl: meta.logoUrl,
        entryDate: p.entryDate || (p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()),
        entryPrice,
        quantity,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct,
        weightPct,
        rotationRegime: rot?.rotationRegime || 'Leading',
      };
    });
  }, [initialPositions, latestPriceMap, tickerMap, rotationMap]);

  // Run portfolio simulation math
  const { liveMetrics, simulatedMetrics } = useMemo(() => {
    return simulatePortfolioState(livePositions, stagedItems, 50000);
  }, [livePositions, stagedItems]);

  const activeMetrics = mode === 'sandbox' && stagedItems.length > 0 ? simulatedMetrics : liveMetrics;

  const heldSymbols = useMemo(
    () => new Set(livePositions.map((p) => p.tickerSymbol.replace('.CA', '').trim().toUpperCase())),
    [livePositions]
  );

  const stagedSymbols = useMemo(
    () => new Set(stagedItems.map((i) => i.symbol.replace('.CA', '').trim().toUpperCase())),
    [stagedItems]
  );

  // Count active exit risks on live holdings
  const exitRiskCount = useMemo(() => {
    return Object.values(initialConsensusMap).filter((c) => c.overallVerdict === 'CRITICAL_EXIT').length;
  }, [initialConsensusMap]);

  // Handlers for Sandbox
  const handleStageBuy = (symbol: string, amount: number, ticker: InsightTickerData) => {
    const cleanSym = symbol.replace('.CA', '').trim().toUpperCase();
    setStagedItems((prev) => {
      const filtered = prev.filter((i) => i.symbol.toUpperCase() !== cleanSym);
      return [
        ...filtered,
        {
          symbol: cleanSym,
          action: 'BUY',
          allocatedAmount: amount || 25000,
          simulatedPrice: ticker.currentPrice,
          companyName: ticker.companyName,
          sector: ticker.sector,
          industryGroup: ticker.industryGroup || ticker.sector,
          logoUrl: ticker.logoUrl,
          rotationRegime: ticker.rotationRegime,
          strategyId: ticker.strategyId,
        },
      ];
    });
    setMode('sandbox');
  };

  const handleSimulateExit = (symbol: string) => {
    const cleanSym = symbol.replace('.CA', '').trim().toUpperCase();
    const pos = livePositions.find((p) => p.tickerSymbol.replace('.CA', '').trim().toUpperCase() === cleanSym);

    setStagedItems((prev) => {
      const filtered = prev.filter((i) => i.symbol.toUpperCase() !== cleanSym);
      return [
        ...filtered,
        {
          symbol: cleanSym,
          action: 'EXIT',
          allocatedAmount: 0,
          simulatedPrice: pos?.currentPrice || 0,
          companyName: pos?.companyName || cleanSym,
          sector: pos?.sector || 'Equities',
          industryGroup: pos?.industryGroup || 'Equities',
          logoUrl: pos?.logoUrl,
        },
      ];
    });
    setMode('sandbox');
  };

  const handleRemoveStaged = (symbol: string) => {
    const cleanSym = symbol.replace('.CA', '').trim().toUpperCase();
    setStagedItems((prev) => prev.filter((i) => i.symbol.toUpperCase() !== cleanSym));
  };

  const handleResetSandbox = () => {
    setStagedItems([]);
    setMode('live');
  };

  const handleSelectTickerForInsight = (ticker: InsightTickerData) => {
    setSelectedInsightTicker(ticker);
    setIsInsightOpen(true);
  };

  const handleDropCandidate = (symbol: string) => {
    const cleanSym = symbol.replace('.CA', '').trim().toUpperCase();
    const opp = opportunities.find((o) => o.symbol.replace('.CA', '').trim().toUpperCase() === cleanSym);
    const meta = tickerMap[cleanSym];

    handleStageBuy(cleanSym, 25000, {
      symbol: cleanSym,
      companyName: opp?.companyName || meta?.companyName || cleanSym,
      sector: opp?.sector || meta?.sector || 'Equities',
      industryGroup: opp?.industryGroup || meta?.industryGroup,
      rotationRegime: opp?.rotationRegime,
      logoUrl: opp?.logoUrl || meta?.logoUrl,
      currentPrice: opp?.signal.price || latestPriceMap[cleanSym] || 50,
      strategyId: opp?.strategyId,
      strategyName: opp?.strategyShortName,
    });
  };

  return (
    <div className="flex-1 h-full w-full overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4 pb-28 md:pb-16 bg-tv-base text-tv-text">
      {/* 1. Command Bar */}
      <PortfolioCommandBar
        mode={mode}
        onModeChange={setMode}
        stagedCount={stagedItems.length}
        totalValue={activeMetrics.totalValue}
        cashBalance={activeMetrics.cashBalance}
        onResetSandbox={handleResetSandbox}
      />

      {/* 2. Projected KPIs Strip */}
      <PortfolioProjectionStrip
        metrics={activeMetrics}
        isSandbox={mode === 'sandbox' && stagedItems.length > 0}
        exitRiskCount={exitRiskCount}
      />

      {/* 3. Main Workspace Grid: Holdings Consensus (Left) + Opportunity Radar (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch min-h-[560px]">
        {/* Left 7 Columns: Holdings Consensus Matrix */}
        <div className="xl:col-span-7 h-[560px]">
          <HoldingsConsensusMatrix
            positions={livePositions}
            consensusMap={initialConsensusMap}
            stagedItems={stagedItems}
            isSandbox={mode === 'sandbox'}
            onSimulateExit={handleSimulateExit}
            onRemoveStaged={handleRemoveStaged}
            onSelectTickerForInsight={handleSelectTickerForInsight}
            onDropCandidate={handleDropCandidate}
          />
        </div>

        {/* Right 5 Columns: Opportunity Radar */}
        <div className="xl:col-span-5 h-[560px]">
          <OpportunityRadarPanel
            opportunities={opportunities}
            isLoading={isLoadingOpps}
            heldSymbols={heldSymbols}
            stagedSymbols={stagedSymbols}
            onStageBuy={handleStageBuy}
            onSelectTickerForInsight={handleSelectTickerForInsight}
          />
        </div>
      </div>

      {/* 4. Bottom Visualizer: Sector Allocation Morph & Diagnostics */}
      <RebalancingSandboxVisualizer
        liveSectors={liveMetrics.sectorBreakdown}
        simulatedSectors={simulatedMetrics.sectorBreakdown}
        isSandbox={mode === 'sandbox' && stagedItems.length > 0}
      />

      {/* 5. Ticker Quick Insights Drawer */}
      <TickerQuickInsightsDrawer
        ticker={selectedInsightTicker}
        isOpen={isInsightOpen}
        onClose={() => setIsInsightOpen(false)}
        onStageBuy={handleStageBuy}
        onSimulateExit={handleSimulateExit}
        onRemoveStaged={handleRemoveStaged}
      />
    </div>
  );
}
