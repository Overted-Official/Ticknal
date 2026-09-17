'use client';

import React, { Fragment, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from '@/components/ui/icon-library';
import { DesktopOrdersSkeleton } from '@/components/platform/OrdersSkeleton';
import { formatUiLabel } from '@/lib/format-ui-label';
import {
  type OrderRow,
  type GroupedOrder,
  type SortField,
  type SortDirection,
  formatPrice,
  formatQuantity,
  formatMoney,
} from './positionsTypes';

function TickerLogo({ symbol, logoUrl, size = 'sm' }: { symbol: string; logoUrl?: string | null; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';

  return (
    <div className={`${sizeClasses} rounded-full bg-plt-card border border-plt-border-soft shrink-0 flex items-center justify-center overflow-hidden`}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image ticker-logo-fill"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-bold font-mono text-plt-text">
          {symbol.replace('.CA', '').slice(0, 2)}
        </span>
      )}
    </div>
  );
}

interface PositionsDataTableWidgetProps {
  loading: boolean;
  sortedGroupedOrders: GroupedOrder[];
  filter: 'ALL' | 'OPEN' | 'CLOSED';
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  deletingId: number | null;
  onConfirmDelete: (id: number) => void;
  onCloseOrder: (order: OrderRow) => void;
  onEditOrder: (order: OrderRow) => void;
  onDeleteOrder: (order: OrderRow) => void;
}

export default function PositionsDataTableWidget({
  loading,
  sortedGroupedOrders,
  filter,
  sortField,
  sortDirection,
  onSort,
  expandedKeys,
  onToggleExpand,
  deletingId,
  onConfirmDelete,
  onCloseOrder,
  onEditOrder,
  onDeleteOrder,
}: PositionsDataTableWidgetProps) {
  return (
    <div className="hidden md:block w-full min-w-0 relative flex-1 overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
        <thead className="sticky top-0 z-10 bg-plt-surface border-b border-plt-border-soft text-[11px] font-semibold text-plt-muted font-sans uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3.5 cursor-pointer select-none first:rounded-l-lg" onClick={() => onSort('ticker')}>
              <div className="flex items-center gap-1.5">
                <span>Ticker</span>
                {sortField === 'ticker' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => onSort('status')}>
              <div className="flex items-center gap-1.5">
                <span>Status</span>
                {sortField === 'status' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 text-right cursor-pointer select-none" onClick={() => onSort('entry')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>Avg Entry</span>
                {sortField === 'entry' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 text-right cursor-pointer select-none" onClick={() => onSort('target')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>Target / Stop</span>
                {sortField === 'target' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-2.5 px-3 text-right cursor-pointer select-none" onClick={() => onSort('quantity')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>Total Qty</span>
                {sortField === 'quantity' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => onSort('current')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>Current</span>
                {sortField === 'current' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => onSort('mktValue')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>Mkt Value</span>
                {sortField === 'mktValue' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-3 px-3 text-right cursor-pointer select-none" onClick={() => onSort('pl')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>Total P/L</span>
                {sortField === 'pl' ? (
                  sortDirection === 'asc' ? <ArrowUp size={12} className="text-white" /> : <ArrowDown size={12} className="text-white" />
                ) : (
                  <ArrowUpDown size={12} className="opacity-40" />
                )}
              </div>
            </th>
            <th className="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <DesktopOrdersSkeleton />
          ) : sortedGroupedOrders.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-plt-muted text-xs font-sans">
                No {filter !== 'ALL' ? filter.toLowerCase() : ''} positions found
              </td>
            </tr>
          ) : (
            sortedGroupedOrders.map((group) => {
              const isMulti = group.orders.length > 1;
              const isExpanded = expandedKeys.has(group.key);

              return (
                <Fragment key={group.key}>
                  <tr className="hover:bg-plt-hover/60 transition-colors group">
                    <td className="py-2.5 px-3.5 first:rounded-l-xl">
                      <div className="flex items-center gap-2.5">
                        {isMulti ? (
                          <button
                            type="button"
                            onClick={() => onToggleExpand(group.key)}
                            className="p-1 text-plt-muted hover:text-plt-text transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <div className="w-5" />
                        )}
                        <TickerLogo symbol={group.tickerSymbol} logoUrl={group.logoUrl} size="sm" />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/invest?ticker=${group.tickerSymbol}&view=chart&timeframe=D`}
                              className="font-bold text-plt-text hover:text-white text-xs font-sans"
                            >
                              {group.tickerSymbol.replace('.CA', '')}
                            </Link>
                            {isMulti && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-sans bg-plt-hover text-plt-muted border border-plt-border-soft">
                                {group.orders.length} Lots
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-plt-muted truncate max-w-40 font-sans">{group.companyName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span
                        className={`badge font-sans ${
                          group.status === 'OPEN'
                            ? 'badge-profit'
                            : 'badge-muted'
                        }`}
                      >
                        {formatUiLabel(group.status)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right tabular-nums">
                      <div className="text-plt-text font-semibold font-sans">{formatPrice(group.avgEntryPrice)}</div>
                      <div className="text-[10px] text-plt-muted font-sans">
                        {isMulti ? `${group.firstEntryDate} → ${group.lastEntryDate}` : group.orders[0].entryDate}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right tabular-nums">
                      <div className="text-plt-profit font-sans text-xs">
                        {group.targetPrice ? formatPrice(group.targetPrice) : '—'}
                      </div>
                      <div className="text-plt-risk text-[10px] font-sans">
                        {group.stopPrice ? formatPrice(group.stopPrice) : '—'}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right tabular-nums text-plt-text font-sans text-xs font-semibold">
                      {formatQuantity(group.totalQuantity)}
                    </td>

                    <td className="py-2.5 px-3.5 text-right tabular-nums text-plt-text font-sans text-xs font-semibold">
                      {formatPrice(group.currentPrice)}
                    </td>

                    <td className="py-2.5 px-3.5 text-right tabular-nums text-plt-text font-sans text-xs font-semibold">
                      {group.status === 'OPEN' ? formatPrice(group.totalMktValue) : '—'}
                    </td>

                    <td className={`py-2.5 px-3.5 text-right tabular-nums font-sans text-xs font-semibold ${
                      group.totalProfitLoss > 0 ? 'text-plt-profit' : group.totalProfitLoss < 0 ? 'text-plt-risk' : 'text-plt-muted'
                    }`}>
                      <div>{formatMoney(group.totalProfitLoss)}</div>
                      <div className="text-[10px] opacity-80">{group.totalProfitLossPct > 0 ? '+' : ''}{group.totalProfitLossPct.toFixed(2)}%</div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right last:rounded-r-xl">
                      {!isMulti && (
                        <div className="flex items-center justify-end gap-1">
                          {group.orders[0].status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => onCloseOrder(group.orders[0])}
                              className="p-1.5 rounded-lg bg-plt-hover hover:bg-plt-profit/20 text-plt-muted hover:text-plt-profit transition-all cursor-pointer"
                              title="Close Position"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditOrder(group.orders[0])}
                            className="p-1.5 rounded-lg bg-plt-hover hover:bg-plt-hover text-plt-muted hover:text-plt-text transition-all cursor-pointer"
                            title="Edit Position"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (deletingId === group.orders[0].id) {
                                onDeleteOrder(group.orders[0]);
                              } else {
                                onConfirmDelete(group.orders[0].id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-plt-hover hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk transition-all cursor-pointer"
                            title="Delete Position"
                          >
                            {deletingId === group.orders[0].id ? (
                              <span className="text-[10px] text-plt-risk font-bold">Sure?</span>
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Individual Lots */}
                  {isMulti && isExpanded && group.orders.map((subOrder) => (
                    <tr key={subOrder.id} className="hover:bg-plt-hover/40 transition-colors text-plt-muted text-[11px]">
                      <td className="py-2 pl-12 pr-3.5 first:rounded-l-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-plt-border-soft" />
                          <span>Lot #{subOrder.id}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[9px] uppercase font-semibold text-plt-muted">
                          {subOrder.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                        {formatPrice(subOrder.entryPrice)}
                        <div className="text-[9px] text-plt-muted">{subOrder.entryDate}</div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <div className="text-plt-profit text-[10px]">
                          {subOrder.targetPrice ? formatPrice(subOrder.targetPrice) : '—'}
                        </div>
                        <div className="text-plt-risk text-[9px]">
                          {subOrder.stopPrice ? formatPrice(subOrder.stopPrice) : '—'}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                        {formatQuantity(subOrder.quantity)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                        {formatPrice(subOrder.currentPrice)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-plt-text">
                        {subOrder.status === 'OPEN' ? formatPrice(subOrder.currentPrice * subOrder.quantity) : '—'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${
                        subOrder.profitLoss > 0 ? 'text-plt-profit' : subOrder.profitLoss < 0 ? 'text-plt-risk' : 'text-plt-muted'
                      }`}>
                        {formatMoney(subOrder.profitLoss)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {subOrder.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => onCloseOrder(subOrder)}
                              className="p-1 rounded bg-plt-hover hover:bg-plt-profit/20 text-plt-muted hover:text-plt-profit transition-all cursor-pointer"
                              title="Close Position"
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditOrder(subOrder)}
                            className="p-1 rounded bg-plt-hover hover:bg-plt-hover text-plt-muted hover:text-plt-text transition-all cursor-pointer"
                            title="Edit Position"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (deletingId === subOrder.id) {
                                onDeleteOrder(subOrder);
                              } else {
                                onConfirmDelete(subOrder.id);
                              }
                            }}
                            className="p-1 rounded bg-white/[0.04] hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk transition-all cursor-pointer"
                            title="Delete Position"
                          >
                            {deletingId === subOrder.id ? (
                              <span className="text-[9px] text-plt-risk font-bold">Sure?</span>
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
