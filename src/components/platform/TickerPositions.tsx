'use client';

import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown } from '@/components/ui/icon-library';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

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
  chartData?: ChartBar[];
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
  chartData = [],
  onEditOrder,
  onCloseOrder,
  onAddNew,
}: TickerPositionsProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const currency = getCurrency(symbol);

  const openOrders = orders.filter((o) => o.status === 'OPEN');
  const closedOrders = orders.filter((o) => o.status === 'CLOSED');

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

  const cleanSymbol = symbol.replace('.CA', '');

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

  const isTrajectoryProfit = unrealizedPl >= 0;

  return (
    <div className="flex flex-col space-y-6 text-plt-text select-none font-sans">
      {/* ================================================================= */}
      {/* 1. POSITION SUMMARY (BORDERLESS CARD TOKENS)                      */}
      {/* ================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="section-title">
            Position Overview
          </h3>
          <span className="text-xs text-plt-muted font-normal">
            Live Price: <strong className="text-plt-text font-semibold tabular-nums">{formatPrice(currentPrice, currency)}</strong>
          </span>
        </div>

        {/* 3 KPI Metrics (Clean & Borderless) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Total Invested */}
          <div className="py-2.5 px-3 rounded-lg bg-white/[0.02] flex flex-col justify-between">
            <span className="kpi-title">
              Total Invested
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-plt-text tabular-nums">
                {formatMoney(totalInvested, currency)}
              </div>
              <div className="text-xs text-plt-muted tabular-nums mt-0.5">
                {openOrders.reduce((sum, o) => sum + o.quantity, 0)} active shares
              </div>
            </div>
          </div>

          {/* Unrealized P/L */}
          <div className="py-2.5 px-3 rounded-lg bg-white/[0.02] flex flex-col justify-between">
            <span className="kpi-title">
              Unrealized P/L
            </span>
            <div className="mt-2">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${
                unrealizedPl >= 0 ? 'text-plt-profit' : 'text-plt-risk'
              }`}>
                {formatMoney(unrealizedPl, currency, true)}
              </div>
              <div className={`text-xs font-medium tabular-nums mt-0.5 ${
                unrealizedPlPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
              }`}>
                {unrealizedPlPct >= 0 ? '+' : ''}{unrealizedPlPct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Realized P/L */}
          <div className="py-2.5 px-3 rounded-lg bg-white/[0.02] flex flex-col justify-between">
            <span className="kpi-title">
              Realized P/L
            </span>
            <div className="mt-2">
              <div className={`text-xl font-bold tracking-tight tabular-nums ${
                realizedPl >= 0 ? 'text-plt-profit' : 'text-plt-risk'
              }`}>
                {formatMoney(realizedPl, currency, true)}
              </div>
              <div className="text-xs text-plt-muted tabular-nums mt-0.5">
                {closedOrders.length} closed orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. P&L TRAJECTORY AREA CHART (ELEVATED VISUALIZATION)              */}
      {/* ================================================================= */}
      {trajectoryData.length > 1 && openOrders.length > 0 && (
        <div className="py-3 px-3.5 rounded-xl bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="kpi-title">P&L Performance Trajectory</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold tabular-nums ${isTrajectoryProfit ? 'text-plt-profit' : 'text-plt-risk'}`}>
                  {formatMoney(unrealizedPl, currency, true)} ({unrealizedPlPct >= 0 ? '+' : ''}{unrealizedPlPct.toFixed(2)}%)
                </span>
              </div>
            </div>
            {isTrajectoryProfit ? (
              <TrendingUp size={16} className="text-plt-profit" />
            ) : (
              <TrendingDown size={16} className="text-plt-risk" />
            )}
          </div>

          <div className="h-28 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="posPlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isTrajectoryProfit ? "var(--plt-profit)" : "var(--plt-risk)"}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={isTrajectoryProfit ? "var(--plt-profit)" : "var(--plt-risk)"}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dateLabel"
                  stroke="var(--chart-axis)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--chart-axis)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${val >= 0 ? '+' : ''}${Math.round(val)}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isUp = d.pl >= 0;
                      return (
                        <div className="surface-popover text-xs p-2 shadow-xl">
                          <div className="text-[10px] text-plt-muted font-medium mb-1">{d.dateLabel}</div>
                          <div className={`font-bold tabular-nums ${isUp ? 'text-plt-profit' : 'text-plt-risk'}`}>
                            P/L: {d.pl >= 0 ? '+' : ''}{d.pl.toLocaleString()} {currency}
                          </div>
                          <div className="text-[11px] text-plt-muted tabular-nums mt-0.5">
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
                  stroke={isTrajectoryProfit ? "var(--plt-profit)" : "var(--plt-risk)"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#posPlGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. ORDER HISTORY & ACTIVE POSITIONS                               */}
      {/* ================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h3 className="section-title">
              Orders & Positions
            </h3>
            {/* Tokenized Segmented Switch (Transparent Background, No Border) */}
            <div className="pill-switch">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`pill-switch-btn ${filter === 'all' ? 'pill-switch-btn-active' : ''}`}
              >
                All ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('open')}
                className={`pill-switch-btn ${filter === 'open' ? 'pill-switch-btn-active' : ''}`}
              >
                Open ({openOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('closed')}
                className={`pill-switch-btn ${filter === 'closed' ? 'pill-switch-btn-active' : ''}`}
              >
                Closed ({closedOrders.length})
              </button>
            </div>
          </div>

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

        {displayedOrders.length === 0 ? (
          <div className="empty-state py-12 text-center text-plt-muted text-xs">
            No tracked positions found for {cleanSymbol} matching the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-plt-border/30">
            {displayedOrders.map((order) => {
              const isOpen = order.status === 'OPEN';
              const cost = order.entryPrice * order.quantity;
              const pl = isOpen
                ? (currentPrice - order.entryPrice) * order.quantity
                : ((order.exitPrice ?? order.entryPrice) - order.entryPrice) * order.quantity;
              const plPct = cost > 0 ? (pl / cost) * 100 : 0;
              const isProfit = pl >= 0;

              return (
                <div
                  key={order.id}
                  className="py-4 space-y-3.5 first:pt-1 last:pb-1"
                >
                  {/* Row 1: Header (Status Pill, Date, Quantity & Net P/L) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge ${
                          isOpen
                            ? 'badge-profit'
                            : 'badge-muted'
                        }`}
                      >
                        {isOpen ? 'Open Long' : 'Closed'}
                      </span>
                      <span className="text-xs text-plt-muted">
                        {order.entryDate}
                      </span>
                      <span className="text-plt-muted/40 text-xs">•</span>
                      <span className="text-xs font-medium text-plt-text tabular-nums">
                        {order.quantity} units
                      </span>
                    </div>

                    <div className="text-right">
                      <div className={`text-base font-bold tracking-tight tabular-nums ${
                        isProfit ? 'text-plt-profit' : 'text-plt-risk'
                      }`}>
                        {formatMoney(pl, currency, true)}
                      </div>
                      <div className={`text-[11px] font-medium tabular-nums ${
                        isProfit ? 'text-plt-profit' : 'text-plt-risk'
                      }`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Detailed Coordinates Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                    <div className="flex flex-col">
                      <span className="kpi-title text-plt-muted">
                        Entry Price
                      </span>
                      <span className="font-semibold text-plt-text tabular-nums mt-0.5">
                        {formatPrice(order.entryPrice, currency)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="kpi-title text-plt-muted">
                        {isOpen ? 'Current Market' : 'Exit Price'}
                      </span>
                      <span className="font-semibold text-plt-text tabular-nums mt-0.5">
                        {isOpen ? formatPrice(currentPrice, currency) : formatPrice(order.exitPrice ?? 0, currency)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="kpi-title text-plt-profit/70">
                        Target Price
                      </span>
                      <span className="font-semibold text-plt-profit tabular-nums mt-0.5">
                        {order.targetPrice ? formatPrice(order.targetPrice, currency) : '—'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="kpi-title text-plt-risk/70">
                        Stop Loss
                      </span>
                      <span className="font-semibold text-plt-risk tabular-nums mt-0.5">
                        {order.stopPrice ? formatPrice(order.stopPrice, currency) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Action Buttons (Only for Open Orders) */}
                  {isOpen && (onEditOrder || onCloseOrder) && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                      {onEditOrder && (
                        <button
                          type="button"
                          onClick={() => onEditOrder(order)}
                          className="btn-token btn-secondary btn-compact"
                        >
                          Edit Levels
                        </button>
                      )}
                      {onCloseOrder && (
                        <button
                          type="button"
                          onClick={() => onCloseOrder(order)}
                          className="btn-token btn-danger btn-compact"
                        >
                          Close Position
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
