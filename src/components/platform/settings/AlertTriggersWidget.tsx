'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Zap,
  Target,
  Compass,
  Cpu,
  Plus,
  Search,
  Lock,
  Bell,
  TrendingUp,
  Trash2,
  X,
} from '@/components/ui/icon-library';

export type MonitoredTicker = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  isPosition: boolean;
  positionQuantity?: number;
  positionAvgEntry?: number;
  isExplicitAlert: boolean;
  alertEnabled: boolean;
  currentPrice?: number;
};

export type TickerOption = {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
};

interface AlertTriggersWidgetProps {
  initialMonitoredTickers: MonitoredTicker[];
  allTickers: TickerOption[];
}

function TickerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.09] p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold text-white/50 uppercase font-mono">{symbol.slice(0, 2)}</span>
      )}
    </div>
  );
}

export default function AlertTriggersWidget({
  initialMonitoredTickers,
  allTickers,
}: AlertTriggersWidgetProps) {
  const [monitoredTickers, setMonitoredTickers] = useState<MonitoredTicker[]>(initialMonitoredTickers);
  const [tickerFilter, setTickerFilter] = useState<'ALL' | 'POSITIONS' | 'ALERTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null);

  // Strategy Scope state
  const [alertStrategyScope, setAlertStrategyScope] = useState<'all' | 'psi' | 'psi_v2' | 'thoth_egx_macro'>('all');
  const [isSavingScope, setIsSavingScope] = useState(false);

  useEffect(() => {
    fetch('/api/user/strategy-scope')
      .then((res) => res.json())
      .then((data) => {
        if (data?.strategyScope) {
          setAlertStrategyScope(data.strategyScope);
        }
      })
      .catch((err) => console.warn('Could not fetch user strategy scope:', err));
  }, []);

  const handleStrategyScopeChange = async (scope: 'all' | 'psi' | 'psi_v2' | 'thoth_egx_macro') => {
    if (scope === alertStrategyScope) return;
    setAlertStrategyScope(scope);
    setIsSavingScope(true);
    try {
      await fetch('/api/user/strategy-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyScope: scope }),
      });
    } catch (err) {
      console.error('Failed to update alert strategy scope:', err);
    } finally {
      setIsSavingScope(false);
    }
  };

  const handleToggleAlert = async (symbol: string, currentEnabled: boolean) => {
    setTogglingSymbol(symbol);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setMonitoredTickers((prev) =>
          prev.map((t) => (t.symbol === symbol ? { ...t, alertEnabled: !currentEnabled, isExplicitAlert: true } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    } finally {
      setTogglingSymbol(null);
    }
  };

  const handleDeleteCustomAlert = async (symbol: string) => {
    setTogglingSymbol(symbol);
    try {
      const res = await fetch(`/api/alerts?symbol=${symbol}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitoredTickers((prev) =>
          prev
            .map((t) => {
              if (t.symbol === symbol) {
                if (t.isPosition) {
                  return { ...t, isExplicitAlert: false, alertEnabled: true };
                }
                return null;
              }
              return t;
            })
            .filter(Boolean) as MonitoredTicker[]
        );
      }
    } catch (err) {
      console.error('Failed to delete alert:', err);
    } finally {
      setTogglingSymbol(null);
    }
  };

  const handleAddAlert = async (ticker: TickerOption) => {
    setTogglingSymbol(ticker.symbol);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: ticker.symbol, enabled: true }),
      });
      if (res.ok) {
        setMonitoredTickers((prev) => {
          const existing = prev.find((t) => t.symbol === ticker.symbol);
          if (existing) {
            return prev.map((t) =>
              t.symbol === ticker.symbol ? { ...t, isExplicitAlert: true, alertEnabled: true } : t
            );
          }
          return [
            ...prev,
            {
              symbol: ticker.symbol,
              companyName: ticker.companyName,
              sector: ticker.sector,
              logoUrl: ticker.logoUrl,
              isPosition: false,
              isExplicitAlert: true,
              alertEnabled: true,
            },
          ];
        });
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to add alert:', err);
    } finally {
      setTogglingSymbol(null);
    }
  };

  const filteredMonitoredTickers = useMemo(() => {
    return monitoredTickers.filter((t) => {
      if (tickerFilter === 'POSITIONS' && !t.isPosition) return false;
      if (tickerFilter === 'ALERTS' && !t.isExplicitAlert) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.symbol.toLowerCase().includes(q) || t.companyName.toLowerCase().includes(q);
      }

      return true;
    });
  }, [monitoredTickers, tickerFilter, searchQuery]);

  const addModalSearchResults = useMemo(() => {
    if (!addSearchQuery.trim()) return allTickers.slice(0, 15);
    const q = addSearchQuery.toLowerCase();
    return allTickers
      .filter((t) => t.symbol.toLowerCase().includes(q) || t.companyName.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allTickers, addSearchQuery]);

  return (
    <div className="w-full min-w-0 relative space-y-4">
      {/* Strategy Scope Selector Card */}
      <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white/60">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[13px] font-medium text-white tracking-[-0.02em] flex items-center gap-2">
                <span>Signal & Alert Strategy Scope</span>
                {isSavingScope && <span className="text-[10px] text-plt-muted animate-pulse font-mono">Syncing...</span>}
              </h2>
              <p className="mt-0.5 text-xs text-white/40">
                Choose which models send push notifications and populate opportunity tables.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Strategy Scope Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* 1. All Strategies */}
          <div
            onClick={() => handleStrategyScopeChange('all')}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
              alertStrategyScope === 'all'
                ? 'bg-white/[0.06] border-white/60 shadow-inset'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${alertStrategyScope === 'all' ? 'text-white' : 'text-white/40'}`} />
                  <span className="text-xs font-bold text-white">All Strategies</span>
                </div>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Receive alerts from PSI, PSI V2, and Thoth EGX Macro models.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/30">Scope: Multi-Model</span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                alertStrategyScope === 'all' ? 'border-white bg-white' : 'border-white/30'
              }`}>
                {alertStrategyScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </div>
          </div>

          {/* 2. PSI Strategy */}
          <div
            onClick={() => handleStrategyScopeChange('psi')}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
              alertStrategyScope === 'psi'
                ? 'bg-cyan-500/10 border-cyan-500/60 shadow-accent'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className={`w-4 h-4 ${alertStrategyScope === 'psi' ? 'text-cyan-400' : 'text-white/40'}`} />
                  <span className="text-xs font-bold text-white">PSI Strategy</span>
                </div>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                  PSI
                </span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Multi-indicator PSI inflection and consensus engine triggers.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/30">Scope: PSI Rules</span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                alertStrategyScope === 'psi' ? 'border-cyan-400 bg-cyan-400' : 'border-white/30'
              }`}>
                {alertStrategyScope === 'psi' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </div>
          </div>

          {/* 3. PSI V2 Strategy */}
          <div
            onClick={() => handleStrategyScopeChange('psi_v2')}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
              alertStrategyScope === 'psi_v2'
                ? 'bg-emerald-500/10 border-emerald-500/60 shadow-accent'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Compass className={`w-4 h-4 ${alertStrategyScope === 'psi_v2' ? 'text-emerald-400' : 'text-white/40'}`} />
                  <span className="text-xs font-bold text-white">PSI V2 Strategy</span>
                </div>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  PSI V2
                </span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                3-PSI Vector Architecture (PSI Zone & Up/Down Momentum).
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/30">Scope: 3-PSI Vector</span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                alertStrategyScope === 'psi_v2' ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'
              }`}>
                {alertStrategyScope === 'psi_v2' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </div>
          </div>

          {/* 4. Thoth EGX Macro */}
          <div
            onClick={() => handleStrategyScopeChange('thoth_egx_macro')}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
              alertStrategyScope === 'thoth_egx_macro'
                ? 'bg-purple-500/10 border-purple-500/60 shadow-accent'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className={`w-4 h-4 ${alertStrategyScope === 'thoth_egx_macro' ? 'text-purple-400' : 'text-white/40'}`} />
                  <span className="text-xs font-bold text-white">Thoth Macro</span>
                </div>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/25">
                  Deep Learning
                </span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Transformer Exhaustion Prediction model alerts.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/30">Scope: AI Model</span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                alertStrategyScope === 'thoth_egx_macro' ? 'border-purple-400 bg-purple-400' : 'border-white/30'
              }`}>
                {alertStrategyScope === 'thoth_egx_macro' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitored Tickers Card */}
      <div className="border border-white/[0.09] rounded-md bg-black p-5 sm:p-6">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.08]">
          <div>
            <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">Monitored Tickers & Trigger Subscriptions</h2>
            <p className="mt-1 text-xs text-white/40">
              Open holdings are automatically monitored. You can also add custom watch alerts for other stocks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-black bg-white hover:bg-white/90 transition-all shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Ticker Alert</span>
          </button>
        </div>

        {/* Filters & Search Row — Desktop (sm and up) */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-md border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setTickerFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                tickerFilter === 'ALL'
                  ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              All ({monitoredTickers.length})
            </button>
            <button
              type="button"
              onClick={() => setTickerFilter('POSITIONS')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                tickerFilter === 'POSITIONS'
                  ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Active Holdings ({monitoredTickers.filter((t) => t.isPosition).length})
            </button>
            <button
              type="button"
              onClick={() => setTickerFilter('ALERTS')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                tickerFilter === 'ALERTS'
                  ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Custom Watch ({monitoredTickers.filter((t) => t.isExplicitAlert).length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, company..."
              className="w-full pl-8 pr-7 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-white/30 hover:text-white rounded"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search Row — Mobile (below sm) */}
        <div className="flex sm:hidden flex-col gap-2 mb-4">
          {/* Row 1: Search bar */}
          <div className="relative flex items-center h-9 rounded-xl overflow-hidden border border-plt-border bg-plt-raised">
            <div className="absolute left-0 pl-3 flex items-center pointer-events-none text-plt-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol or company..."
              className="h-full w-full bg-transparent pl-9 pr-8 text-[12px] text-plt-text placeholder:text-plt-muted focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 pr-3 flex items-center text-plt-muted hover:text-plt-text"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Row 2: Full-width segmented status switch */}
          <div className="pill-switch w-full">
            <button
              type="button"
              onClick={() => setTickerFilter('ALL')}
              className={`pill-switch-btn flex-1 text-center text-[11px] ${
                tickerFilter === 'ALL' ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              All ({monitoredTickers.length})
            </button>
            <button
              type="button"
              onClick={() => setTickerFilter('POSITIONS')}
              className={`pill-switch-btn flex-1 text-center text-[11px] ${
                tickerFilter === 'POSITIONS' ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              Holdings ({monitoredTickers.filter((t) => t.isPosition).length})
            </button>
            <button
              type="button"
              onClick={() => setTickerFilter('ALERTS')}
              className={`pill-switch-btn flex-1 text-center text-[11px] ${
                tickerFilter === 'ALERTS' ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              Watch ({monitoredTickers.filter((t) => t.isExplicitAlert).length})
            </button>
          </div>
        </div>

        {/* Mobile View: Clean Card List */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {filteredMonitoredTickers.length === 0 ? (
            <div className="py-8 text-center text-white/30 text-xs">
              No monitored tickers found matching the current filter.
            </div>
          ) : (
            filteredMonitoredTickers.map((ticker) => (
              <div key={ticker.symbol} className="py-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TickerLogo symbol={ticker.symbol} logoUrl={ticker.logoUrl} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-white">{ticker.symbol}</span>
                        <span className="text-[10px] font-mono text-white/35 px-1.5 py-0.2 rounded bg-white/[0.03] border border-white/[0.05] truncate">
                          {ticker.sector}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/40 truncate block mt-0.5">
                        {ticker.companyName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-white/90">
                      {ticker.currentPrice ? `${ticker.currentPrice.toFixed(2)} EGP` : '—'}
                    </div>
                    {ticker.isPosition ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-plt-profit font-sans font-medium mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-plt-profit" />
                        Always ON
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleAlert(ticker.symbol, ticker.alertEnabled)}
                        disabled={togglingSymbol === ticker.symbol}
                        className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer ${
                          ticker.alertEnabled
                            ? 'bg-plt-profit-soft border border-plt-profit-border text-plt-profit'
                            : 'bg-white/[0.03] border border-white/[0.08] text-white/40'
                        }`}
                      >
                        {ticker.alertEnabled ? 'Active' : 'Muted'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.03]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ticker.isPosition && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-plt-profit/10 border border-plt-profit/20 text-plt-profit">
                        <Lock size={10} />
                        Active Holding
                      </span>
                    )}
                    {ticker.isExplicitAlert && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-white/[0.06] border border-white/[0.12] text-white/80">
                        <Bell size={10} />
                        Custom Alert
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/invest?ticker=${ticker.symbol}&view=chart`}
                      className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Open in Invest"
                    >
                      <TrendingUp size={14} />
                    </Link>

                    {ticker.isExplicitAlert && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomAlert(ticker.symbol)}
                        disabled={togglingSymbol === ticker.symbol}
                        className="p-1.5 rounded text-white/30 hover:text-plt-risk hover:bg-plt-risk-soft transition-colors cursor-pointer"
                        title="Remove Alert"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Monitored Tickers Table */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-medium text-white/35">
                <th className="py-2.5 px-3">Ticker</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Monitoring Type</th>
                <th className="py-2.5 px-3 text-right">Current Price</th>
                <th className="py-2.5 px-3 text-center">Alert Trigger</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredMonitoredTickers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/30 text-xs">
                    No monitored tickers found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredMonitoredTickers.map((ticker) => (
                  <tr key={ticker.symbol} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <TickerLogo symbol={ticker.symbol} logoUrl={ticker.logoUrl} />
                        <div>
                          <span className="font-mono font-semibold text-white block">{ticker.symbol}</span>
                          <span className="text-[11px] text-white/40 truncate block max-w-[200px]">
                            {ticker.companyName}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-white/50 truncate max-w-[150px]">{ticker.sector}</td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ticker.isPosition && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-plt-profit/10 border border-plt-profit/20 text-plt-profit">
                            <Lock size={10} />
                            Active Holding
                          </span>
                        )}
                        {ticker.isExplicitAlert && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-white/[0.06] border border-white/[0.12] text-white/80">
                            <Bell size={10} />
                            Custom Alert
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-medium text-white/90">
                      {ticker.currentPrice ? `${ticker.currentPrice.toFixed(2)} EGP` : '—'}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {ticker.isPosition ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-plt-profit font-sans font-medium whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-plt-profit" />
                          Always ON
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAlert(ticker.symbol, ticker.alertEnabled)}
                          disabled={togglingSymbol === ticker.symbol}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                            ticker.alertEnabled
                              ? 'bg-plt-profit-soft border border-plt-profit-border text-plt-profit hover:bg-plt-profit-soft'
                              : 'bg-white/[0.03] border border-white/[0.08] text-white/40 hover:text-white/70'
                          }`}
                        >
                          {ticker.alertEnabled ? 'Active' : 'Muted'}
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/invest?ticker=${ticker.symbol}&view=chart`}
                          className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                          title="Open in Invest"
                        >
                          <TrendingUp size={14} />
                        </Link>

                        {ticker.isExplicitAlert && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomAlert(ticker.symbol)}
                            disabled={togglingSymbol === ticker.symbol}
                            className="p-1 rounded text-white/30 hover:text-plt-risk hover:bg-plt-risk-soft transition-colors cursor-pointer"
                            title="Remove Alert"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Alert Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md bg-plt-base border border-white/[0.12] shadow-popover p-5 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-white/80" />
                  <h3 className="text-sm font-medium text-white">Add Stock Trigger Alert</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-white/40 hover:text-white p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="my-4 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  placeholder="Search by EGX symbol or company..."
                  className="w-full pl-8 pr-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.09] text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 divide-y divide-white/[0.04] custom-scrollbar">
                {addModalSearchResults.map((t) => {
                  const isAlreadyMonitored = monitoredTickers.some((m) => m.symbol === t.symbol && m.alertEnabled);

                  return (
                    <div
                      key={t.symbol}
                      className="pt-2 pb-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TickerLogo symbol={t.symbol} logoUrl={t.logoUrl} />
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-xs text-white block">{t.symbol}</span>
                          <span className="text-[11px] text-white/40 truncate block">{t.companyName}</span>
                        </div>
                      </div>

                      {isAlreadyMonitored ? (
                        <span className="text-[11px] font-sans text-plt-profit px-2 py-1 bg-plt-profit-soft rounded border border-plt-profit-border shrink-0">
                          Subscribed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddAlert(t)}
                          disabled={togglingSymbol === t.symbol}
                          className="px-3 py-1 rounded bg-white hover:bg-white/90 text-black text-xs font-medium shrink-0 transition-colors cursor-pointer"
                        >
                          + Add Alert
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
