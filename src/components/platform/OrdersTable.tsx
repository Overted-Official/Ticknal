'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, LineChart, Trash2, Pencil } from '@/components/ui/icons';
import AddOrderModal from '@/components/platform/AddOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';

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
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [orderToClose, setOrderToClose] = useState<OrderRow | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderRow | null>(null);

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
    setOrderToClose(order);
  }

  function editOrder(order: OrderRow) {
    setOrderToEdit(order);
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
            <button
              type="button"
              onClick={() => setIsAddingOrder(true)}
              className="h-8 rounded-tv-sm bg-tv-accent text-white px-3 text-xs font-weight-medium hover:bg-tv-accent/90 transition-colors shadow-[0_0_10px_rgba(41,98,255,0.3)]"
            >
              + Add Order
            </button>
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
        {/* Mobile View (Cards) */}
        <div className="md:hidden flex flex-col space-y-3 p-3">
          {loading ? (
            <div className="p-8 text-center text-tv-muted">Loading orders</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-tv-muted">No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders found</div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-tv-base border border-tv-border rounded-tv-lg p-3 shadow-sm">
                <div className="flex justify-between items-start border-b border-tv-border pb-2 mb-2">
                  <div>
                    <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-weight-medium text-tv-text hover:text-tv-accent text-sm flex items-center gap-1">
                      {order.tickerSymbol}
                      <span className="text-[10px] text-tv-muted font-normal">({order.sector})</span>
                    </Link>
                    <div className="text-[11px] text-tv-muted truncate max-w-[150px]">{order.companyName}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-weight-medium ${
                    order.status === 'OPEN' ? 'bg-[#2962FF]/10 text-tv-accent' : 'bg-tv-surface text-tv-muted'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs mb-3">
                  <div>
                    <span className="text-tv-muted text-[10px] uppercase block mb-0.5">Entry</span>
                    <span className="text-tv-text font-weight-medium">{formatPrice(order.entryPrice)}</span>
                    <span className="text-tv-muted text-[10px] block">{order.entryDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-tv-muted text-[10px] uppercase block mb-0.5">Current</span>
                    <span className="text-tv-text font-weight-medium">{formatPrice(order.currentPrice)}</span>
                    <span className="text-tv-muted text-[10px] block">Qty: {formatQuantity(order.quantity)}</span>
                  </div>

                  <div>
                    <span className="text-tv-muted text-[10px] uppercase block mb-0.5">Target/Stop</span>
                    <span className="text-tv-text">{order.targetPrice ? order.targetPrice.toFixed(2) : '-'} / {order.stopPrice ? order.stopPrice.toFixed(2) : '-'}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-tv-muted text-[10px] uppercase block mb-0.5">P/L</span>
                    <div className={`font-weight-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                      {formatMoney(order.profitLoss)}
                      <span className="text-[10px] ml-1 opacity-80">({(order.profitLossPct * 100).toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-tv-border">
                  {order.status === 'OPEN' && (
                    <button
                      title="Close Position"
                      onClick={() => closeOrder(order)}
                      className="p-1.5 rounded bg-tv-surface text-tv-text hover:bg-tv-hover transition-colors flex items-center justify-center border border-tv-border"
                    >
                      <CheckCircle size={14} className="mr-1" />
                      <span className="text-[11px]">Close</span>
                    </button>
                  )}
                  <button
                    title="Delete Record"
                    onClick={() => deleteOrder(order)}
                    className="p-1.5 rounded bg-tv-surface text-tv-down hover:bg-red-900/20 transition-colors flex items-center justify-center border border-tv-border"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-tv-surface sticky top-0 z-10 border-b border-tv-border text-xs uppercase text-tv-muted">
            <tr>
              <th className="px-5 py-3 font-weight-medium">Ticker</th>
              <th className="px-5 py-3 font-weight-medium">Status</th>
              <th className="px-5 py-3 font-weight-medium">Entry</th>
              <th className="px-5 py-3 font-weight-medium text-right">Target / Stop</th>
              <th className="px-5 py-3 font-weight-medium text-right">Quantity</th>
              <th className="px-5 py-3 font-weight-medium text-right">Current</th>
              <th className="px-5 py-3 font-weight-medium text-right">P/L</th>
              <th className="px-5 py-3 font-weight-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tv-border bg-tv-base">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-tv-muted">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-tv-muted">
                  No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-tv-hover transition-colors group">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-weight-medium text-tv-text group-hover:text-tv-accent transition-colors flex items-center gap-2">
                      <LineChart size={16} className="text-tv-muted" />
                      {order.tickerSymbol}
                    </Link>
                    <div className="text-xs text-tv-muted truncate max-w-[200px] mt-0.5">{order.companyName}</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-weight-medium ${
                        order.status === 'OPEN' ? 'bg-[#2962FF]/10 text-tv-accent' : 'bg-tv-surface text-tv-muted'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="text-tv-text font-weight-medium">{formatPrice(order.entryPrice)}</div>
                    <div className="text-xs text-tv-muted mt-0.5">{order.entryDate}</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className="text-tv-up">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</div>
                    <div className="text-tv-down mt-0.5">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right font-weight-medium text-tv-text">
                    {formatQuantity(order.quantity)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right text-tv-text font-weight-medium">
                    {formatPrice(order.currentPrice)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className={`font-weight-medium ${order.profitLoss >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                      {formatMoney(order.profitLoss)}
                    </div>
                    <div className={`text-xs mt-0.5 ${order.profitLossPct >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                      {(order.profitLossPct * 100).toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status === 'OPEN' && (
                        <button
                          title="Close Position"
                          onClick={() => closeOrder(order)}
                          className="p-1.5 rounded-tv-sm bg-tv-surface text-tv-text hover:bg-tv-hover transition-colors border border-tv-border"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        title="Edit Order"
                        onClick={() => editOrder(order)}
                        className="p-1.5 rounded-tv-sm bg-tv-surface text-tv-text hover:bg-tv-hover transition-colors border border-tv-border"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title="Delete Record"
                        onClick={() => deleteOrder(order)}
                        className="p-1.5 rounded-tv-sm bg-tv-surface text-tv-down hover:bg-red-900/20 transition-colors border border-tv-border"
                      >
                        <Trash2 size={16} />
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

      <AddOrderModal 
        isOpen={isAddingOrder} 
        onClose={() => setIsAddingOrder(false)} 
        onSuccess={() => fetchOrders()} 
      />
      
      <CloseOrderModal
        isOpen={!!orderToClose}
        onClose={() => setOrderToClose(null)}
        onSuccess={() => fetchOrders()}
        order={orderToClose}
      />

      <EditOrderModal
        isOpen={!!orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSuccess={() => fetchOrders()}
        order={orderToEdit}
      />
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
