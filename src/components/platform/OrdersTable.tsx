'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, LineChart, Trash2 } from '@/components/ui/icons';

type OrderRow = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
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

export default function OrdersTable() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchOrders, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchOrders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => (filter === 'ALL' ? true : order.status === filter)),
    [filter, orders],
  );

  const totals = useMemo(() => {
    const openOrders = orders.filter((order) => order.status === 'OPEN');
    const closedOrders = orders.filter((order) => order.status === 'CLOSED');
    return {
      openCount: openOrders.length,
      closedCount: closedOrders.length,
      unrealized: openOrders.reduce((sum, order) => sum + order.profitLoss, 0),
      realized: closedOrders.reduce((sum, order) => sum + order.profitLoss, 0),
    };
  }, [orders]);

  async function closeOrder(order: OrderRow) {
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: order.id,
        status: 'CLOSED',
        exitDate: new Date().toISOString().split('T')[0],
        exitPrice: order.currentPrice,
      }),
    });
    if (res.ok) fetchOrders();
  }

  async function deleteOrder(order: OrderRow) {
    const res = await fetch(`/api/orders?id=${order.id}`, { method: 'DELETE' });
    if (res.ok) setOrders((current) => current.filter((item) => item.id !== order.id));
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-tv-base text-tv-text">
      <div className="border-b border-tv-border px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-weight-medium">Orders</h1>
            <p className="mt-1 text-xs text-tv-muted">Tracked long positions from chart candle clicks</p>
          </div>
          <div className="flex items-center gap-2">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`h-8 rounded-tv-sm border px-3 text-xs transition-colors ${
                  filter === value
                    ? 'border-tv-accent bg-tv-hover text-tv-text'
                    : 'border-tv-border text-tv-muted hover:border-tv-border-highlight hover:text-tv-text'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Open" value={String(totals.openCount)} />
          <Metric label="Closed" value={String(totals.closedCount)} />
          <Metric label="Unrealized P/L" value={formatMoney(totals.unrealized)} valueClass={totals.unrealized >= 0 ? 'text-tv-up' : 'text-tv-down'} />
          <Metric label="Realized P/L" value={formatMoney(totals.realized)} valueClass={totals.realized >= 0 ? 'text-tv-up' : 'text-tv-down'} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-tv-surface text-[0.65rem] uppercase text-tv-muted">
            <tr>
              <th className="border-b border-tv-border px-4 py-2">Ticker</th>
              <th className="border-b border-tv-border px-4 py-2">Status</th>
              <th className="border-b border-tv-border px-4 py-2">Entry Date</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">Entry</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">Current</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">Qty</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">Target</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">Stop</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">P/L</th>
              <th className="border-b border-tv-border px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-tv-muted">Loading orders</td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-tv-muted">No orders match this view</td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-tv-border transition-colors hover:bg-tv-hover">
                  <td className="px-4 py-2">
                    <div className="font-weight-medium text-tv-text">{order.tickerSymbol}</div>
                    <div className="mt-0.5 max-w-48 truncate text-[11px] text-tv-muted">{order.companyName}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-tv-sm border px-2 py-1 text-[11px] ${order.status === 'OPEN' ? 'border-tv-accent text-tv-accent' : 'border-tv-border text-tv-muted'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-tv-muted">{order.entryDate}</td>
                  <td className="px-4 py-2 text-right">{formatPrice(order.entryPrice)}</td>
                  <td className="px-4 py-2 text-right">{formatPrice(order.currentPrice)}</td>
                  <td className="px-4 py-2 text-right">{formatQuantity(order.quantity)}</td>
                  <td className="px-4 py-2 text-right text-tv-muted">{order.targetPrice === null ? '-' : formatPrice(order.targetPrice)}</td>
                  <td className="px-4 py-2 text-right text-tv-muted">{order.stopPrice === null ? '-' : formatPrice(order.stopPrice)}</td>
                  <td className={`px-4 py-2 text-right font-weight-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                    {formatMoney(order.profitLoss)}
                    <div className="text-[11px]">{order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`}
                        className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-surface hover:text-tv-text"
                        title="Open chart"
                      >
                        <LineChart className="h-4 w-4" />
                      </Link>
                      {order.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => closeOrder(order)}
                          className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-surface hover:text-tv-up"
                          title="Close order"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteOrder(order)}
                        className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-surface hover:text-tv-down"
                        title="Delete order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass = 'text-tv-text' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3">
      <div className="text-[11px] uppercase text-tv-muted">{label}</div>
      <div className={`mt-1 text-lg font-weight-medium ${valueClass}`}>{value}</div>
    </div>
  );
}

function formatPrice(value: number): string {
  return `${value.toFixed(2)} EGP`;
}

function formatMoney(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} EGP`;
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
