'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Cpu,
  History,
  Settings as SettingsIcon,
  Terminal,
} from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import { getStrategyDefinition } from '@/strategies/intraday/strategyRegistry';
import { controlHover, controlTap } from '@/lib/motion';

import BotCockpitHeader from './BotCockpitHeader';
import BotAnalyticsView from './BotAnalyticsView';
import BotHistoryView from './BotHistoryView';
import BotSettingsView from './BotSettingsView';
import BotLogsView from './BotLogsView';
import { type ActivePosition } from './analytics/BotActivePositionsCard';
import { type TickerWalletItem } from './analytics/BotUniverseMatrixCard';
import { type ClosedTrade } from './history/BotTradesLedgerCard';
import { type SystemLogItem } from './logs/BotTerminalConsoleCard';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BOT_TABS = ['analytics', 'history', 'settings', 'logs'] as const;
type BotTabType = (typeof BOT_TABS)[number];

interface BotSettings {
  id: number;
  botActive: boolean;
  activeStrategy: string;
  timeframe: string;
  maxConcurrentPositions: number;
  allocationPerTradeEgp: string;
  eodRule: string;
  dailyLossHaltPct: string;
  brokerMode: string;
  updatedAt: string;
}

interface MarketStatus {
  status: 'OPEN' | 'CLOSED' | 'PRE_MARKET';
  message: string;
  cairoTime: string;
  isTradingDay: boolean;
}

export default function BotCockpit({ initialTab = 'analytics' }: { initialTab?: string }) {
  const searchParams = useSearchParams();

  // Normalize legacy tab names ('cockpit' -> 'analytics', 'trades' -> 'history', 'basket' -> 'settings')
  const rawTab = searchParams.get('tab') || initialTab || 'analytics';
  const mappedTab =
    rawTab === 'cockpit'
      ? 'analytics'
      : rawTab === 'trades'
      ? 'history'
      : rawTab === 'basket'
      ? 'settings'
      : (rawTab as BotTabType);

  const [activeTab, setActiveTab] = useState<BotTabType>(
    BOT_TABS.includes(mappedTab) ? mappedTab : 'analytics'
  );

  useEffect(() => {
    if (searchParams.get('tab')) {
      const tabParam = searchParams.get('tab');
      const normalized =
        tabParam === 'cockpit'
          ? 'analytics'
          : tabParam === 'trades'
          ? 'history'
          : tabParam === 'basket'
          ? 'settings'
          : (tabParam as BotTabType);
      if (BOT_TABS.includes(normalized)) {
        setActiveTab(normalized);
      }
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    const normalized =
      val === 'cockpit'
        ? 'analytics'
        : val === 'trades'
        ? 'history'
        : val === 'basket'
        ? 'settings'
        : (val as BotTabType);
    setActiveTab(normalized);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', normalized);
    window.history.replaceState(window.history.state, '', `/bot?${params.toString()}`);
  };

  const { swipeHandlers } = useSwipeableTabs({
    tabs: BOT_TABS,
    activeTab,
    onTabChange: handleTabChange,
  });

  // Filters and actions state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [closingPositionId, setClosingPositionId] = useState<number | null>(null);
  const [selectedLogLevel, setSelectedLogLevel] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [editingBudgets, setEditingBudgets] = useState<Record<string, { budget: number; maxLoss: number }>>({});
  const [isSavingBudget, setIsSavingBudget] = useState<string | null>(null);

  // 1. Fetch Session Status & Analytics (Poll every 5s)
  const { data: statusData, mutate: mutateStatus } = useSWR<{
    settings: BotSettings;
    market: MarketStatus;
    activePositions: ActivePosition[];
    sessionMetrics: {
      realizedPnlEgp: number;
      realizedPnlPct: number;
      unrealizedPnlEgp: number;
      unrealizedPnlPct: number;
      winRateToday: number;
      winningTradesToday: number;
      losingTradesToday: number;
      totalTradesToday: number;
      signalCatchRate: number;
      totalSignalsToday: number;
      filledSignalsToday: number;
      avgHoldingBars: number;
      avgHoldingMinutes: number;
      activePositionsCount: number;
      totalCapitalDeployedEgp: number;
      totalAuthorizedBudgetEgp: number;
      enabledTickersCount: number;
      totalTickersCount: number;
    };
    tickerWallets: TickerWalletItem[];
  }>('/api/bot/status', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  const settings = statusData?.settings;
  const market = statusData?.market;
  const positions = statusData?.activePositions || [];
  const metrics = statusData?.sessionMetrics;
  const tickerWallets = statusData?.tickerWallets || [];
  const currentStrategyId = settings?.activeStrategy || 'PSI_PURE';
  const currentStrategyDef = getStrategyDefinition(currentStrategyId);

  // 2. Fetch Closed Trades History (Poll every 15s)
  const { data: tradesData } = useSWR<{
    trades: ClosedTrade[];
    metrics: {
      totalTrades: number;
      winRate: number;
      totalPnlPct: number;
      profitFactor: number;
      winningTrades: number;
      losingTrades: number;
    };
  }>('/api/bot/trades?limit=100', fetcher, {
    refreshInterval: 15000,
  });

  const closedTrades = tradesData?.trades || [];
  const historicalMetrics = tradesData?.metrics;

  // 3. Fetch Signals Feed
  const { data: activityData } = useSWR<{ logs: any[] }>('/api/bot/activity', fetcher, {
    refreshInterval: 8000,
  });

  // 4. Fetch System Telemetry Logs (for Logs tab)
  const { data: systemLogsData, mutate: mutateLogs } = useSWR<{ logs: SystemLogItem[] }>(
    `/api/bot/logs?limit=150${selectedLogLevel !== 'ALL' ? `&level=${selectedLogLevel}` : ''}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const rawLogs = systemLogsData?.logs || [];

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!logSearch) return rawLogs;
    return rawLogs.filter(
      (l) =>
        l.message.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.source.toLowerCase().includes(logSearch.toLowerCase())
    );
  }, [rawLogs, logSearch]);

  // Filtered Tickers for Settings
  const filteredTickerWallets = useMemo(() => {
    return tickerWallets.filter((t) => {
      const matchesSearch =
        t.tickerSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSector === 'ALL' || t.sector === selectedSector;
      return matchesSearch && matchesSector;
    });
  }, [tickerWallets, searchQuery, selectedSector]);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    tickerWallets.forEach((t) => {
      if (t.sector) s.add(t.sector);
    });
    return ['ALL', ...Array.from(s).sort()];
  }, [tickerWallets]);

  // Master Kill Switch Toggle
  const toggleMasterSwitch = async () => {
    if (!settings) return;
    setIsUpdatingSettings(true);
    const nextState = !settings.botActive;
    try {
      await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botActive: nextState }),
      });
      mutateStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Update Global Settings Field
  const updateSettingsField = async (field: keyof BotSettings, value: any) => {
    if (!settings) return;
    try {
      await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      mutateStatus();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Ticker Active State
  const toggleTickerActive = async (symbol: string, currentState: boolean) => {
    try {
      await fetch('/api/bot/tickers/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          isEnabled: !currentState,
          strategyId: currentStrategyId,
          timeframe: '15m',
        }),
      });
      mutateStatus();
    } catch (e) {
      console.error(e);
    }
  };

  // Update Ticker Dedicated Budget & Max Loss
  const saveTickerBudget = async (symbol: string, budgetEgp: number, maxLossPct: number) => {
    setIsSavingBudget(symbol);
    try {
      await fetch('/api/bot/tickers/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          budgetEgp,
          maxLossPct,
          strategyId: currentStrategyId,
          timeframe: '15m',
        }),
      });
      mutateStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingBudget(null);
    }
  };

  // Bulk Budget Update
  const setBulkBudgets = async (budget: number) => {
    for (const t of tickerWallets) {
      fetch('/api/bot/tickers/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: t.tickerSymbol,
          budgetEgp: budget,
          strategyId: currentStrategyId,
          timeframe: '15m',
        }),
      });
    }
    setTimeout(() => mutateStatus(), 500);
  };

  // Force Close Position
  const forceClosePosition = async (id: number) => {
    setClosingPositionId(id);
    try {
      await fetch('/api/bot/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: id, exitReason: 'MANUAL_FORCE_CLOSE' }),
      });
      mutateStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setClosingPositionId(null);
    }
  };

  // Export Closed Trades to CSV
  const exportTradesCsv = () => {
    if (!closedTrades.length) return;
    const headers = 'ID,Symbol,Strategy,Timeframe,EntryPrice,EntryTime,ExitPrice,ExitTime,ExitReason,RealizedPnlPct\n';
    const rows = closedTrades
      .map(
        (t) =>
          `${t.id},${t.tickerSymbol},${t.strategyId},${t.timeframe},${t.entryPrice},${t.entryTime},${t.exitPrice},${t.exitTime},${t.exitReason},${t.realizedPnlPct}%`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bot_closed_trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 h-full w-full min-h-0 flex flex-col overflow-hidden bg-transparent text-plt-text relative z-10 select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab={activeTab}
        onChange={handleTabChange}
        items={[
          { label: 'Analytics', value: 'analytics', icon: Cpu },
          { label: 'History', value: 'history', icon: History },
          { label: 'Settings', value: 'settings', icon: SettingsIcon },
          { label: 'Logs', value: 'logs', icon: Terminal },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-x-hidden overflow-y-auto touch-pan-y">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header */}
          <BotCockpitHeader
            botActive={settings?.botActive ?? false}
            onToggleBot={toggleMasterSwitch}
            isUpdating={isUpdatingSettings}
            marketStatus={market?.status}
            brokerMode={settings?.brokerMode}
            strategyShortName={currentStrategyDef.shortName}
            timeframe={settings?.timeframe ?? '15m'}
            signalCatchRate={metrics?.signalCatchRate ?? 100.0}
            enabledTickersCount={metrics?.enabledTickersCount ?? 0}
          />

          {/* Desktop Tab Selector Bar */}
          <div className="tab-strip hidden md:flex">
            {[
              { label: 'Analytics', value: 'analytics', icon: Cpu },
              { label: 'History', value: 'history', icon: History },
              { label: 'Settings', value: 'settings', icon: SettingsIcon },
              { label: 'Logs', value: 'logs', icon: Terminal },
            ].map((tab) => {
              const isActive = activeTab === tab.value;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  whileHover={controlHover}
                  whileTap={controlTap}
                  className={`tab-button ${isActive ? 'tab-button-active' : ''}`}
                >
                  <Icon size={16} className={isActive ? 'text-plt-text' : 'text-plt-muted'} />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Main Tab Views */}
          {activeTab === 'analytics' && (
            <BotAnalyticsView
              metrics={metrics}
              positions={positions}
              tickerWallets={tickerWallets}
              activityLogs={activityData?.logs || []}
              onRefresh={() => mutateStatus()}
              onForceClosePosition={forceClosePosition}
              closingPositionId={closingPositionId}
            />
          )}

          {activeTab === 'history' && (
            <BotHistoryView
              metrics={historicalMetrics}
              trades={closedTrades}
              onExportCsv={exportTradesCsv}
            />
          )}

          {activeTab === 'settings' && (
            <BotSettingsView
              currentStrategyId={currentStrategyId}
              onSelectStrategy={(id) => updateSettingsField('activeStrategy', id)}
              maxConcurrentPositions={settings?.maxConcurrentPositions || 5}
              eodRule={settings?.eodRule || 'CARRY_OVERNIGHT'}
              dailyLossHaltPct={settings?.dailyLossHaltPct || '3.00'}
              brokerMode={settings?.brokerMode || 'PAPER'}
              onUpdateSetting={(field, val) => updateSettingsField(field as keyof BotSettings, val)}
              tickerWallets={tickerWallets}
              filteredTickerWallets={filteredTickerWallets}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
              sectors={sectors}
              editingBudgets={editingBudgets}
              onEditBudget={(symbol, budget, maxLoss) => {
                setEditingBudgets((prev) => ({
                  ...prev,
                  [symbol]: { budget, maxLoss },
                }));
              }}
              onSaveBudget={saveTickerBudget}
              isSavingBudget={isSavingBudget}
              onToggleTickerActive={toggleTickerActive}
              onSetBulkBudgets={setBulkBudgets}
            />
          )}

          {activeTab === 'logs' && (
            <BotLogsView
              monitoredTickersCount={tickerWallets.length}
              logs={filteredLogs}
              selectedLogLevel={selectedLogLevel}
              onSelectLogLevel={setSelectedLogLevel}
              logSearch={logSearch}
              onLogSearchChange={setLogSearch}
              onRefreshLogs={() => mutateLogs()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
