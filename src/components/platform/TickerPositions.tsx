'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Wallet, CheckCircle2, TrendingUp, TrendingDown, Loader2 } from '@/components/ui/icon-library';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useToast } from '@/context/ToastContext';

export interface TickerOrder {
  id: number;
  status: string;
  side: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number | null;
  stopPrice: number | null;
  exitDate: string | null;
  exitPrice: number | null;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPct?: number;
}

export interface ChartBar {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TickerPositionsProps {
  symbol: string;
  orders: TickerOrder[];
  currentPrice: number;
  companyName?: string;
  logoUrl?: string | null;
  chartData?: ChartBar[];
  onOrdersChange?: () => void;
  onEditOrder?: (order: TickerOrder) => void;
  onCloseOrder?: (order: TickerOrder) => void;
  onAddNew?: () => void;
}

function getCurrency(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (['GC1!', 'SI1!'].includes(upper)) return 'USD';
  return 'EGP';
}

function formatMoney(value: number, currency: string, showSign: boolean = false): string {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted} ${currency}`;
}

function formatPrice(value: number, currency: string): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatDateLabel(dateVal: string | number): string {
  try {
    const d = typeof dateVal === 'number' ? new Date(dateVal * 1000) : new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return String(dateVal);
  }
}

export default function TickerPositions({
  symbol,
  orders,
  currentPrice,
  companyName,
  logoUrl,
  chartData = [],
  onOrdersChange,
  onEditOrder,
  onCloseOrder,
  onAddNew,
}: TickerPositionsProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCloseWholePosition, setIsCloseWholePosition] = useState(true);
  const [unitsToSell, setUnitsToSell] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [tickerMeta, setTickerMeta] = useState<{ companyName?: string; logoUrl?: string | null }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!companyName || !logoUrl) {
      fetch('/api/tickers')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const clean = symbol.replace('.CA', '').toUpperCase();
            const found = data.find((t) => t.symbol?.replace('.CA', '').toUpperCase() === clean);
            if (found) {
              setTickerMeta({ companyName: found.companyName, logoUrl: found.logoUrl });
            }
          }
        })
        .catch(() => {});
    }
  }, [symbol, companyName, logoUrl]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCloseModalOpen) {
        setIsCloseModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCloseModalOpen]);

  const currency = getCurrency(symbol);
  const cleanSymbol = symbol.replace('.CA', '').toUpperCase();
  const displayCompanyName = companyName || tickerMeta.companyName || cleanSymbol;
  const displayLogoUrl = logoUrl || tickerMeta.logoUrl || null;

  const openOrders = orders.filter((o) => o.status === 'OPEN');
  const closedOrders = orders.filter((o) => o.status === 'CLOSED');

  const totalOpenQuantity = useMemo(() => openOrders.reduce((sum, o) => sum + o.quantity, 0), [openOrders]);

  // Summary Metrics
  const totalInvested = openOrders.reduce((sum, order) => sum + order.entryPrice * order.quantity, 0);
  const currentValue = openOrders.reduce((sum, order) => sum + currentPrice * order.quantity, 0);
  const unrealizedPl = currentValue - totalInvested;
  const unrealizedPlPct = totalInvested > 0 ? (unrealizedPl / totalInvested) * 100 : 0;
  const realizedPl = closedOrders.reduce((sum, order) => {
    const exitP = order.exitPrice ?? order.entryPrice;
    return sum + (exitP - order.entryPrice) * order.quantity;
  }, 0);

  const displayedOrders =
    filter === 'open' ? openOrders : filter === 'closed' ? closedOrders : [...openOrders, ...closedOrders];

  // Build P&L Trajectory Curve for open positions
  const trajectoryData = useMemo(() => {
    if (openOrders.length === 0) return [];

    const sortedOpen = [...openOrders].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    const earliestDate = sortedOpen[0].entryDate;

    if (chartData && chartData.length > 0) {
      const filtered = chartData.filter((bar) => bar.time >= earliestDate);
      if (filtered.length >= 2) {
        return filtered.map((bar) => {
          let dayCost = 0;
          let dayVal = 0;
          for (const order of sortedOpen) {
            if (order.entryDate <= bar.time) {
              dayCost += order.entryPrice * order.quantity;
              dayVal += bar.close * order.quantity;
            }
          }
          const dayPl = dayVal - dayCost;
          return {
            time: bar.time,
            dateLabel: formatDateLabel(bar.time),
            pl: Number(dayPl.toFixed(2)),
            value: Number(dayVal.toFixed(2)),
            price: bar.close,
          };
        });
      }
    }

    // Fallback: minimal 2-point line from initial investment to live price
    const initialCost = sortedOpen.reduce((s, o) => s + o.entryPrice * o.quantity, 0);
    return [
      {
        time: earliestDate,
        dateLabel: formatDateLabel(earliestDate),
        pl: 0,
        value: initialCost,
        price: sortedOpen[0].entryPrice,
      },
      {
        time: new Date().toISOString().split('T')[0],
        dateLabel: 'Today',
        pl: Number(unrealizedPl.toFixed(2)),
        value: Number(currentValue.toFixed(2)),
        price: currentPrice,
      },
    ];
  }, [openOrders, chartData, unrealizedPl, currentValue, currentPrice]);

  const { minPl, maxPl } = useMemo(() => {
    if (trajectoryData.length === 0) return { minPl: 0, maxPl: 0 };
    let min = trajectoryData[0].pl;
    let max = trajectoryData[0].pl;
    for (const d of trajectoryData) {
      if (d.pl < min) min = d.pl;
      if (d.pl > max) max = d.pl;
    }
    return { minPl: min, maxPl: max };
  }, [trajectoryData]);

  const yDomain = useMemo(() => {
    if (minPl === maxPl) {
      return minPl === 0 ? [-1, 1] : [minPl * 0.9, maxPl * 1.1];
    }
    return [minPl, maxPl];
  }, [minPl, maxPl]);

  // Compute zero-line offset for the linear gradient (0 = top, 1 = bottom)
  const gradientOffset = useMemo(() => {
    const [dMin, dMax] = yDomain;
    if (dMax <= 0) return 0;
    if (dMin >= 0) return 1;
    return dMax / (dMax - dMin);
  }, [yDomain]);

  const offsetPercent = `${(gradientOffset * 100).toFixed(2)}%`;
  const isTrajectoryProfit = unrealizedPl >= 0;

  const handleExecuteSell = async () => {
    const units = parseFloat(unitsToSell);
    const price = parseFloat(sellingPrice);

    if (!units || units <= 0 || units > totalOpenQuantity) {
      toast.error('Invalid Quantity', `Please enter a quantity between 1 and ${totalOpenQuantity}.`);
      return;
    }
    if (!price || price <= 0) {
      toast.error('Invalid Price', 'Please enter a valid selling price.');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let remainingToClose = units;

      // Sort open orders oldest first (FIFO)
      const sorted = [...openOrders].sort((a, b) => a.entryDate.localeCompare(b.entryDate));

      for (const order of sorted) {
        if (remainingToClose <= 0) break;
        const closeFromThisLot = Math.min(order.quantity, remainingToClose);

        const res = await fetch('/api/positions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: order.id,
            status: 'CLOSED',
            exitPrice: price,
            exitDate: today,
            quantityToClose: closeFromThisLot,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || 'Failed to close position lot.');
        }

        remainingToClose -= closeFromThisLot;
      }

      toast.success(
        'Position Closed',
        `Sold ${units} share${units > 1 ? 's' : ''} of ${cleanSymbol} at ${price.toFixed(2)} ${currency}.`
      );
      setIsCloseModalOpen(false);
      onOrdersChange?.();
    } catch (err: any) {
      console.error('Error closing position:', err);
      toast.error('Failed to Close', err?.message || 'An error occurred while closing position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 sm:space-y-8 text-white select-none font-sans">
      {/* ================================================================= */}
      {/* 1. POSITION SUMMARY SECTION                                      */}
      {/* ================================================================= */}
      <section className="space-y-3">
        {/* Clear Section Header matching Strategy Report Drawer */}
        <div className="flex flex-col gap-0.5 min-w-0 pb-1 border-b border-border-subtle">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
              Position Overview
            </h3>
            <span className="text-xs text-white/50 font-normal">
              Live Price:{' '}
              <strong className="text-white font-semibold tabular-nums">
                {formatPrice(currentPrice, currency)}
              </strong>
            </span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Portfolio exposure, unrealized performance, and realized returns for this instrument
          </p>
        </div>

        {/* 3 KPI Metrics Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* Total Invested */}
          <div className="relative overflow-hidden rounded-xl bg-black border border-white/10 hover:border-white/20 p-3 sm:p-3.5 transition-all duration-200 flex flex-col justify-between select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs bg-brand-blue text-white">
                <Wallet className="w-3 h-3 text-white" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] sm:text-[12px] font-semibold text-white tracking-tight truncate">
                Total Invested
              </span>
            </div>

            <div className="flex flex-col mt-2 sm:mt-2.5">
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-[15px] sm:text-[18px] lg:text-[20px] font-bold text-white tabular-nums tracking-tight truncate">
                  {Math.abs(totalInvested).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/50 uppercase tracking-wider ml-0.5 shrink-0">
                  {currency}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mt-1.5 leading-none">
                <span className="text-[10px] sm:text-[11px] font-medium tabular-nums text-white/50 truncate">
                  {openOrders.reduce((sum, o) => sum + o.quantity, 0)} active shares
                </span>
              </div>
            </div>
          </div>

          {/* Unrealized P/L */}
          <div className="relative overflow-hidden rounded-xl bg-black border border-white/10 hover:border-white/20 p-3 sm:p-3.5 transition-all duration-200 flex flex-col justify-between select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  unrealizedPl >= 0 ? 'bg-profit-num text-white' : 'bg-loss-num text-white'
                }`}
              >
                {unrealizedPl >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-white" strokeWidth={2.4} />
                ) : (
                  <TrendingDown className="w-3 h-3 text-white" strokeWidth={2.4} />
                )}
              </div>
              <span className="text-[11px] sm:text-[12px] font-semibold text-white tracking-tight truncate">
                Unrealized P/L
              </span>
            </div>

            <div className="flex flex-col mt-2 sm:mt-2.5">
              <div className="flex items-baseline gap-1 leading-none">
                <span
                  className={`text-[15px] sm:text-[18px] lg:text-[20px] font-bold tabular-nums tracking-tight truncate ${
                    unrealizedPl >= 0 ? 'text-profit-num' : 'text-loss-num'
                  }`}
                >
                  {unrealizedPl > 0 ? '+' : unrealizedPl < 0 ? '-' : ''}
                  {Math.abs(unrealizedPl).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/50 uppercase tracking-wider ml-0.5 shrink-0">
                  {currency}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mt-1.5 leading-none">
                <span
                  className={`text-[10px] sm:text-[11px] font-medium tabular-nums ${
                    unrealizedPl >= 0 ? 'text-profit-num' : 'text-loss-num'
                  }`}
                >
                  {unrealizedPlPct >= 0 ? '+' : ''}
                  {unrealizedPlPct.toFixed(2)}%
                </span>
                <span className="text-[9px] sm:text-[10px] text-white/40 font-normal">open</span>
              </div>
            </div>
          </div>

          {/* Realized P/L */}
          <div className="relative overflow-hidden rounded-xl bg-black border border-white/10 hover:border-white/20 p-3 sm:p-3.5 transition-all duration-200 flex flex-col justify-between select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  realizedPl >= 0 ? 'bg-profit-num text-white' : 'bg-loss-num text-white'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] sm:text-[12px] font-semibold text-white tracking-tight truncate">
                Realized P/L
              </span>
            </div>

            <div className="flex flex-col mt-2 sm:mt-2.5">
              <div className="flex items-baseline gap-1 leading-none">
                <span
                  className={`text-[15px] sm:text-[18px] lg:text-[20px] font-bold tabular-nums tracking-tight truncate ${
                    realizedPl >= 0 ? 'text-profit-num' : 'text-loss-num'
                  }`}
                >
                  {realizedPl > 0 ? '+' : realizedPl < 0 ? '-' : ''}
                  {Math.abs(realizedPl).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/50 uppercase tracking-wider ml-0.5 shrink-0">
                  {currency}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mt-1.5 leading-none">
                <span
                  className={`text-[10px] sm:text-[11px] font-medium tabular-nums ${
                    realizedPl >= 0 ? 'text-profit-num' : 'text-loss-num'
                  }`}
                >
                  {closedOrders.length} closed
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. P&L TRAJECTORY AREA CHART (NO ICON, HIDDEN Y-AXIS, FULL WIDTH) */}
      {/* ================================================================= */}
      {trajectoryData.length > 1 && openOrders.length > 0 && (
        <section className="space-y-3">
          {/* Clear Section Header matching Strategy Report Drawer */}
          <div className="flex flex-col gap-0.5 min-w-0 pb-1 border-b border-border-subtle">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
                P&amp;L Performance Trajectory
              </h3>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isTrajectoryProfit ? 'text-profit-num' : 'text-loss-num'
                }`}
              >
                {formatMoney(unrealizedPl, currency, true)} ({unrealizedPlPct >= 0 ? '+' : ''}
                {unrealizedPlPct.toFixed(2)}%)
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Historical mark-to-market performance curve for open allocations over holding period
            </p>
          </div>

          <div className="h-32 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  {/* Stroke gradient switching between green and red at zero */}
                  <linearGradient id="posPlStrokeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset={offsetPercent} stopColor="#10b981" />
                    <stop offset={offsetPercent} stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>

                  {/* Fill gradient: green glow above zero, red glow below zero */}
                  <linearGradient id="posPlFillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset={offsetPercent} stopColor="#10b981" stopOpacity={0.02} />
                    <stop offset={offsetPercent} stopColor="#f43f5e" stopOpacity={0.02} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dateLabel"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={4}
                />
                <YAxis hide domain={yDomain} />
                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isUp = d.pl >= 0;
                      return (
                        <div className="bg-cold-gray-900 border border-white/10 rounded-lg text-xs p-2.5 shadow-2xl font-sans">
                          <div className="text-[10px] text-white/50 font-medium mb-1">
                            {d.dateLabel}
                          </div>
                          <div
                            className={`font-bold tabular-nums ${
                              isUp ? 'text-profit-num' : 'text-loss-num'
                            }`}
                          >
                            P/L: {d.pl >= 0 ? '+' : ''}
                            {d.pl.toLocaleString()} {currency}
                          </div>
                          <div className="text-[11px] text-white/60 tabular-nums mt-0.5">
                            Value: {d.value.toLocaleString()} {currency}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pl"
                  stroke="url(#posPlStrokeGrad)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#posPlFillGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. ORDER HISTORY & ACTIVE POSITIONS                               */}
      {/* ================================================================= */}
      <section className="space-y-3">
        {/* Clear Section Header matching Strategy Report Drawer */}
        <div className="flex flex-col gap-0.5 min-w-0 pb-1 border-b border-border-subtle">
          <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
            Orders &amp; Positions
          </h3>
          <p className="text-xs text-white/50 leading-relaxed">
            Transaction ledger and fill levels for active and historical executions
          </p>
        </div>

        {/* Filter Controls & Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Segmented control */}
          <div className="seg-control shrink-0">
            {(['all', 'open', 'closed'] as const).map((tab) => {
              const count =
                tab === 'all'
                  ? orders.length
                  : tab === 'open'
                  ? openOrders.length
                  : closedOrders.length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`seg-control-btn capitalize ${
                    filter === tab ? 'seg-control-btn-active' : ''
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Action CTAs: Close Position & Add Position */}
          <div className="flex items-center gap-2 shrink-0">
            {openOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUnitsToSell(String(totalOpenQuantity));
                  setSellingPrice(currentPrice ? String(currentPrice) : '');
                  setIsCloseWholePosition(true);
                  setIsCloseModalOpen(true);
                }}
                className="btn-token btn-secondary btn-compact"
                title="Close or reduce position"
              >
                <span>Close</span>
              </button>
            )}

            {onAddNew && (
              <button
                type="button"
                onClick={onAddNew}
                className="btn-token btn-primary btn-compact"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Position</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact & Minimal Positions Ledger (No individual close buttons) */}
        {displayedOrders.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-xs">
            No tracked positions found for {cleanSymbol} matching the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] border-t border-white/[0.06]">
            {displayedOrders.map((order) => {
              const isOpen = order.status === 'OPEN';
              const cost = order.entryPrice * order.quantity;
              const effectivePrice = isOpen ? currentPrice : (order.exitPrice ?? order.entryPrice);
              const currentValue = effectivePrice * order.quantity;
              const pl = isOpen
                ? (currentPrice - order.entryPrice) * order.quantity
                : ((order.exitPrice ?? order.entryPrice) - order.entryPrice) * order.quantity;
              const plPct = cost > 0 ? (pl / cost) * 100 : 0;
              const isProfit = pl >= 0;

              return (
                <div
                  key={order.id}
                  className="py-2 px-1 sm:px-2 transition-colors flex items-center justify-between gap-3 hover:bg-white/[0.02]"
                >
                  {/* Left: Status dot + Date + units & price */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isOpen ? 'bg-profit-num' : 'bg-white/20'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white tabular-nums tracking-tight">
                          {order.entryDate}
                        </span>
                        {!isOpen && (
                          <span className="text-[9px] font-semibold text-white/40 uppercase">
                            Closed
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 tabular-nums">
                        {order.quantity} units @ {formatPrice(order.entryPrice, currency)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Value & P&L */}
                  <div className="flex flex-col items-end text-right shrink-0">
                    <span className="text-xs font-bold text-white tabular-nums tracking-tight">
                      {formatPrice(currentValue, currency)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isProfit ? 'text-profit-num' : 'text-loss-num'
                      }`}
                    >
                      {formatMoney(pl, currency, true)} ({plPct >= 0 ? '+' : ''}
                      {plPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 4. CLOSE / SELL POSITION MODAL                                     */}
      {/* Structured as:                                                    */}
      {/* Logo name               Total current position value               */}
      {/* symbol                  total current position quantity            */}
      {/*                                                                   */}
      {/* Sell 'Units' at price 'selling price'                             */}
      {/* toggle to close the whole position                                */}
      {/* Cancel button   Sell button                                       */}
      {/* ================================================================= */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isCloseModalOpen && (
            <div
              key="close-position-modal-container"
              className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
              onClick={() => !isSubmitting && setIsCloseModalOpen(false)}
            >
              <motion.div
                key="close-position-modal-card"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-black border border-white/10 rounded-xl shadow-2xl p-5 space-y-4 font-sans text-white overflow-hidden"
              >
                {/* Header Row:
                    Logo Name                   Total current position value
                    Symbol                      Total current position quantity
                */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                      {displayLogoUrl && !imgError ? (
                        <img
                          src={displayLogoUrl}
                          alt={cleanSymbol}
                          className="w-full h-full object-contain rounded-full"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <span className="text-xs font-bold text-white uppercase font-sans">
                          {cleanSymbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-sm font-semibold text-white truncate max-w-[190px] sm:max-w-[210px] leading-snug"
                        title={displayCompanyName}
                      >
                        {displayCompanyName}
                      </span>
                      <span className="text-xs font-bold text-white/50 tracking-wider uppercase tabular-nums">
                        {cleanSymbol}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right shrink-0">
                    <span className="text-sm font-bold text-white tabular-nums tracking-tight">
                      {formatPrice(currentValue, currency)}
                    </span>
                    <span className="text-xs text-white/50 tabular-nums">
                      {totalOpenQuantity} units owned
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/[0.08]" />

                {/* Form Fields: Sell 'Units' at price 'Selling Price' */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider block">
                      Units to Sell
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalOpenQuantity}
                      step="any"
                      value={unitsToSell}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUnitsToSell(val);
                        if (parseFloat(val) !== totalOpenQuantity) {
                          setIsCloseWholePosition(false);
                        }
                      }}
                      disabled={isCloseWholePosition || isSubmitting}
                      className="input-token h-9 w-full bg-black text-white border-white/10 focus:border-white/40 text-xs tabular-nums disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Units"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider block">
                      Price ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      disabled={isSubmitting}
                      className="input-token h-9 w-full bg-black text-white border-white/10 focus:border-white/40 text-xs tabular-nums"
                      placeholder="Selling price"
                    />
                  </div>
                </div>

                {/* Toggle to close whole position */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">Close whole position</span>
                    <span className="text-[10px] text-white/40">
                      Sell all {totalOpenQuantity} owned units
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isCloseWholePosition}
                    disabled={isSubmitting}
                    onClick={() => {
                      const next = !isCloseWholePosition;
                      setIsCloseWholePosition(next);
                      if (next) {
                        setUnitsToSell(String(totalOpenQuantity));
                      }
                    }}
                    className={`toggle-token cursor-pointer ${
                      isCloseWholePosition ? 'toggle-token-active' : ''
                    }`}
                  >
                    <span
                      className={`toggle-thumb ${
                        isCloseWholePosition ? 'toggle-thumb-active' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Estimated Proceeds preview */}
                {parseFloat(unitsToSell) > 0 && parseFloat(sellingPrice) > 0 && (
                  <div className="flex items-center justify-between text-xs px-1 text-white/60 tabular-nums">
                    <span>Estimated Proceeds:</span>
                    <span className="text-white font-semibold">
                      {formatPrice(parseFloat(unitsToSell) * parseFloat(sellingPrice), currency)}
                    </span>
                  </div>
                )}

                {/* Footer Buttons: Cancel & Sell */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    disabled={isSubmitting}
                    className="btn-token btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSell}
                    disabled={
                      isSubmitting ||
                      !unitsToSell ||
                      parseFloat(unitsToSell) <= 0 ||
                      parseFloat(unitsToSell) > totalOpenQuantity ||
                      !sellingPrice ||
                      parseFloat(sellingPrice) <= 0
                    }
                    className="btn-token btn-danger"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmitting ? 'Selling...' : 'Sell'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
