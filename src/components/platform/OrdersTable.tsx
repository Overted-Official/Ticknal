'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { containerStagger, itemFadeInUp, hoverLift } from '@/lib/motion';
import { CheckCircle, LineChart, Trash2, Pencil, Search } from '@/components/ui/icons';
import AddOrderModal from '@/components/platform/AddOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import { DesktopOrdersSkeleton, MobileOrdersSkeleton } from '@/components/platform/OrdersSkeleton';

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OrdersTable() {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [orderToClose, setOrderToClose] = useState<OrderRow | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderRow | null>(null);

  const { data, isLoading, mutate } = useSWR<{ orders: OrderRow[] }>('/api/positions', fetcher);
  const orders = data?.orders ?? [];
  const loading = isLoading;

  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      const matchesFilter = filter === 'ALL' ? true : order.status === filter;
      const matchesSearch = 
        order.tickerSymbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
        order.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [filter, orders, searchQuery],
  );

  const totals = useMemo(() => {
    const openOrders = orders.filter((order) => order.status === 'OPEN');
    const closedOrders = orders.filter((order) => order.status === 'CLOSED');
    return {
      openCount: new Set(openOrders.map(o => o.tickerSymbol)).size,
      closedCount: closedOrders.length,
      unrealized: openOrders.reduce((sum, order) => sum + order.profitLoss, 0),
      realized: closedOrders.reduce((sum, order) => sum + order.profitLoss, 0),
      netWorth: openOrders.reduce((sum, order) => sum + (order.currentPrice * order.quantity), 0),
    };
  }, [orders]);

  async function closeOrder(order: OrderRow) {
    setOrderToClose(order);
  }

  function editOrder(order: OrderRow) {
    setOrderToEdit(order);
  }

  async function deleteOrder(order: OrderRow) {
    const res = await fetch(`/api/positions?id=${order.id}`, { method: 'DELETE' });
    if (res.ok) {
      mutate({ orders: orders.filter((item) => item.id !== order.id) }, { revalidate: false });
    }
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerStagger}
      className="flex h-full min-h-0 flex-col bg-transparent text-white relative z-10"
    >
      {/* Top Header Banner */}
      <motion.div variants={itemFadeInUp} className="border-b border-white/[0.09] px-6 py-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-plt-orange" />
              <h1 className="text-lg font-medium tracking-[-0.02em] text-white">Positions & Orders</h1>
            </div>
            <p className="mt-0.5 text-[13px] text-white/30">Tracked long positions and execution trade history</p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <Search size={13} />
              </div>
              <input
                type="text"
                placeholder="Search ticker or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 md:w-56 rounded-md bg-white/[0.03] border border-white/[0.09] pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none transition-all"
              />
            </div>

            {/* Filter Pill Switch */}
            <div className="flex items-center bg-black border border-white/[0.09] rounded-md p-0.5 gap-0.5">
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-all ${
                    filter === value
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {/* Add Order CTA */}
            <button
              type="button"
              onClick={() => setIsAddingOrder(true)}
              className="h-8 rounded-md bg-plt-orange hover:bg-plt-orange-hover text-white px-3.5 text-xs font-medium transition-colors"
            >
              + Add Order
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Canvas: 24px outer padding (p-6), 12px widget gap (space-y-3) */}
      <div className="min-h-0 flex-1 overflow-auto p-6 space-y-3">
        {/* Metric Strip (5 items in unified master container) */}
        <motion.div 
          variants={itemFadeInUp}
          className="border border-white/[0.09] rounded-md bg-black divide-y md:divide-y-0 md:divide-x divide-white/[0.06] grid grid-cols-2 md:grid-cols-5 overflow-hidden"
        >
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Net Worth</div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">{formatPrice(totals.netWorth)}</div>
          </div>
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Open Positions</div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">{totals.openCount}</div>
          </div>
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Closed Positions</div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-white">{totals.closedCount}</div>
          </div>
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Unrealized P/L</div>
            <div className={`mt-2 text-xl font-semibold font-mono tracking-tight ${totals.unrealized > 0 ? 'text-[#22c55e]' : totals.unrealized < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
              {formatMoney(totals.unrealized)}
            </div>
          </div>
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Realized P/L</div>
            <div className={`mt-2 text-xl font-semibold font-mono tracking-tight ${totals.realized > 0 ? 'text-[#22c55e]' : totals.realized < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
              {formatMoney(totals.realized)}
            </div>
          </div>
        </motion.div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden flex flex-col space-y-3">
          {loading ? (
            <MobileOrdersSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-white/40 text-xs">No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders found</div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="border border-white/[0.09] rounded-md bg-black p-5">
                <div className="flex justify-between items-start border-b border-white/[0.09] pb-2.5 mb-2.5">
                  <div>
                    <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-semibold text-white hover:text-plt-orange text-sm flex items-center gap-1.5">
                      {order.tickerSymbol}
                      <span className="text-[10px] text-white/40 font-normal">({order.sector})</span>
                    </Link>
                    <div className="text-[11px] text-white/40 truncate max-w-[160px]">{order.companyName}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium ${
                    order.status === 'OPEN' ? 'bg-white/[0.06] text-white/90 border border-white/[0.09]' : 'bg-white/[0.02] text-white/40'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs mb-3 font-mono">
                  <div>
                    <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">Entry</span>
                    <span className="text-white font-medium">{formatPrice(order.entryPrice)}</span>
                    <span className="text-white/40 text-[10px] block">{order.entryDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">Current</span>
                    <span className="text-white font-medium">{formatPrice(order.currentPrice)}</span>
                    <span className="text-white/40 text-[10px] block">Qty: {formatQuantity(order.quantity)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">Target / Stop</span>
                    <span className="text-white/70">{order.targetPrice ? order.targetPrice.toFixed(2) : '-'} / {order.stopPrice ? order.stopPrice.toFixed(2) : '-'}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] text-white/35 font-medium block mb-0.5 font-sans">P/L</span>
                    <div className={`font-semibold ${order.profitLoss > 0 ? 'text-[#22c55e]' : order.profitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                      {formatMoney(order.profitLoss)}
                      <span className="text-[10px] ml-1 opacity-80">({(order.profitLossPct * 100).toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2.5 border-t border-white/[0.09]">
                  {order.status === 'OPEN' && (
                    <button
                      title="Close Position"
                      onClick={() => closeOrder(order)}
                      className="px-2.5 py-1 rounded-[4px] bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all flex items-center justify-center border border-white/[0.09] text-xs font-medium"
                    >
                      <CheckCircle size={13} className="mr-1 text-[#22c55e]" />
                      <span>Close</span>
                    </button>
                  )}
                  <button
                    title="Edit Order"
                    onClick={() => editOrder(order)}
                    className="p-1.5 rounded-[4px] bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center border border-white/[0.09]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    title="Delete Record"
                    onClick={() => deleteOrder(order)}
                    className="p-1.5 rounded-[4px] bg-white/[0.04] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all flex items-center justify-center border border-white/[0.09]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table Container) */}
        <motion.div variants={itemFadeInUp} className="hidden md:block border border-white/[0.09] rounded-md bg-black overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-transparent border-b border-white/[0.09] text-[11px] font-medium text-white/30">
              <tr>
                <th className="px-6 py-3.5">Ticker</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Entry</th>
                <th className="px-6 py-3.5 text-right">Target / Stop</th>
                <th className="px-6 py-3.5 text-right">Quantity</th>
                <th className="px-6 py-3.5 text-right">Current</th>
                <th className="px-6 py-3.5 text-right">P/L</th>
                <th className="px-6 py-3.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <DesktopOrdersSkeleton />
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-white/40 text-xs">
                    No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-semibold text-white group-hover:text-plt-orange transition-colors flex items-center gap-2">
                        <LineChart size={15} className="text-white/40 group-hover:text-plt-orange" />
                        {order.tickerSymbol}
                      </Link>
                      <div className="text-[11px] text-white/40 truncate max-w-[200px] mt-0.5">{order.companyName}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-[4px] px-2 py-0.5 text-[10px] font-medium ${
                          order.status === 'OPEN' ? 'bg-white/[0.06] border border-white/[0.09] text-white' : 'bg-white/[0.02] text-white/40'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono">
                      <div className="text-white font-medium">{formatPrice(order.entryPrice)}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{order.entryDate}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono">
                      <div className="text-[#22c55e]">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</div>
                      <div className="text-[#ef4444] mt-0.5">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono font-medium text-white">
                      {formatQuantity(order.quantity)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-white font-medium">
                      {formatPrice(order.currentPrice)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono">
                      <div className={`font-semibold ${order.profitLoss > 0 ? 'text-[#22c55e]' : order.profitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                        {formatMoney(order.profitLoss)}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${order.profitLossPct > 0 ? 'text-[#22c55e]' : order.profitLossPct < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                        {(order.profitLossPct * 100).toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {order.status === 'OPEN' && (
                          <button
                            title="Close Position"
                            onClick={() => closeOrder(order)}
                            className="p-1.5 rounded-[4px] bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                          >
                            <CheckCircle size={15} className="text-[#22c55e]" />
                          </button>
                        )}
                        <button
                          title="Edit Order"
                          onClick={() => editOrder(order)}
                          className="p-1.5 rounded-[4px] bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.09]"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          title="Delete Record"
                          onClick={() => deleteOrder(order)}
                          className="p-1.5 rounded-[4px] bg-white/[0.04] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all border border-white/[0.09]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      </div>

      <AddOrderModal 
        isOpen={isAddingOrder} 
        onClose={() => setIsAddingOrder(false)} 
        onSuccess={() => mutate()} 
      />
      
      <CloseOrderModal
        isOpen={!!orderToClose}
        onClose={() => setOrderToClose(null)}
        onSuccess={() => mutate()}
        order={orderToClose}
      />

      <EditOrderModal
        isOpen={!!orderToEdit}
        onClose={() => setOrderToEdit(null)}
        onSuccess={() => mutate()}
        order={orderToEdit}
      />
    </motion.div>
  );
}

function Metric({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <motion.div 
      variants={itemFadeInUp}
      className="border border-white/[0.09] rounded-md bg-black p-5 group"
    >
      <div className="text-[11px] text-white/40 font-medium">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold font-mono tracking-tight ${valueClass}`}>{value}</div>
    </motion.div>
  );
}

function formatPrice(value: number): string {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

function formatMoney(value: number): string {
  if (value === 0) return '0.00 EGP';
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value > 0 ? '+' : '-'}${formatted} EGP`;
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
