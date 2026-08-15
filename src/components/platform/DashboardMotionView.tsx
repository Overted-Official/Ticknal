'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { containerStagger, itemFadeInUp, hoverLift } from '@/lib/motion';
import TestNotificationButton from '@/components/platform/TestNotificationButton';
import DashboardCharts from '@/components/platform/DashboardCharts';
import OpportunityTable, { Opportunity } from '@/components/platform/OpportunityTable';
import { SectorDataItem } from '@/components/platform/SectorDonutChart';
import { MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';

export type DashboardOrder = {
  id: number;
  tickerSymbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

export type OrderStats = {
  openOrders: DashboardOrder[];
  openMarketValue: number;
  unrealized: number;
  realized: number;
  totalRoi: number;
  sectorData: SectorDataItem[];
  monthlyData: MonthlyDataItem[];
  winRate: number;
  avgBarsPerTrade: number;
  maxDrawdownPct: number;
  openWinning: number;
  openLosing: number;
  closedWinning: number;
  closedLosing: number;
  closedCount: number;
};

interface DashboardMotionViewProps {
  orderStats: OrderStats;
  buyOpportunities: Opportunity[];
  exitSignals: Opportunity[];
  activeAlertCount: number;
}

export default function DashboardMotionView({
  orderStats,
  buyOpportunities,
  exitSignals,
  activeAlertCount
}: DashboardMotionViewProps) {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerStagger}
      className="flex h-full min-h-0 flex-col overflow-auto bg-transparent text-white pb-8 relative z-10"
    >
      <div className="px-4 pt-5 pb-0 md:px-6">
        {/* Header Title & Actions */}
        <motion.div variants={itemFadeInUp} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-plt-orange shadow-[0_0_8px_#ff640d]" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            </div>
            <p className="mt-0.5 text-xs text-white/50">Portfolio performance and real-time PSI trading intelligence</p>
          </div>
          <div className="flex items-center gap-2.5">
            <TestNotificationButton />
            <Link
              href="/charts"
              className="glass-pill rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-all hover:text-white shadow-sm flex items-center gap-1.5"
            >
              <span>Open Charts</span>
              <span className="text-plt-orange">→</span>
            </Link>
          </div>
        </motion.div>

        {/* Top Metric Cards */}
        <motion.div variants={containerStagger} className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-1">
            <MetricCard
              label="Net Worth"
              value={formatMoney(orderStats.openMarketValue, false)}
              subtitle={`ROI ${orderStats.totalRoi >= 0 ? '+' : ''}${orderStats.totalRoi.toFixed(2)}%`}
              subtitleClass={orderStats.totalRoi >= 0 ? 'text-[#00e676] bg-[#00e676]/10 border-[#00e676]/20' : 'text-[#ff4d58] bg-[#ff4d58]/10 border-[#ff4d58]/20'}
            />
          </div>
          <MetricCard 
            label="Unrealized P/L" 
            value={formatMoney(orderStats.unrealized, true)} 
            valueClass={orderStats.unrealized >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'} 
          />
          <MetricCard 
            label="Realized P/L" 
            value={formatMoney(orderStats.realized, true)} 
            valueClass={orderStats.realized >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'} 
          />
          <MetricCard 
            label="Open Positions" 
            value={String(orderStats.openOrders.length)} 
            subtitle={`${orderStats.openWinning} Win · ${orderStats.openLosing} Loss`}
            subtitleClass="text-white/40"
          />
          <MetricCard 
            label="Closed Positions" 
            value={String(orderStats.closedCount)} 
            subtitle={`${orderStats.closedWinning} Win · ${orderStats.closedLosing} Loss`}
            subtitleClass="text-white/40"
          />
          <MetricCard label="Active Alerts" value={String(activeAlertCount)} />
        </motion.div>

        {/* Extended Portfolio Stats Bar */}
        <motion.div 
          variants={itemFadeInUp}
          className="mt-4 glass-panel rounded-2xl p-4 md:p-5 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/[0.06] gap-4 md:gap-0"
        >
          <div className="flex-1 md:px-5 first:pl-0 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Win Rate</div>
            <div className="text-xl font-bold font-mono text-white">{orderStats.winRate.toFixed(1)}%</div>
          </div>
          <div className="flex-1 md:px-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Avg. Bars / Trade</div>
            <div className="text-xl font-bold font-mono text-white">{Math.round(orderStats.avgBarsPerTrade)}</div>
          </div>
          <div className="flex-1 md:px-5 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Avg. Adverse Excursion</div>
            <div className="text-xl font-bold font-mono text-white/30">N/A</div>
          </div>
          <div className="flex-1 md:px-5 last:pr-0 flex flex-col justify-center">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mb-1">Max Trade Loss</div>
            <div className={`text-xl font-bold font-mono ${orderStats.maxDrawdownPct < 0 ? 'text-[#ff4d58]' : 'text-white'}`}>
              {orderStats.maxDrawdownPct < 0 ? '' : '+'}{orderStats.maxDrawdownPct.toFixed(2)}%
            </div>
          </div>
        </motion.div>
      </div>

      {/* Analytics Charts Module */}
      <motion.div variants={itemFadeInUp} className="border-b border-white/[0.06] pb-5">
        <DashboardCharts sectorData={orderStats.sectorData} monthlyData={orderStats.monthlyData} />
      </motion.div>

      {/* Two-Column Grid: Left (Open Positions) / Right (Signals) */}
      <motion.div variants={containerStagger} className="mt-5 grid grid-cols-1 gap-5 px-4 md:px-6 xl:grid-cols-2">
        {/* Open Positions Card */}
        <motion.section variants={itemFadeInUp} className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.01] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-plt-orange shadow-[0_0_8px_rgba(255,100,13,0.4)]" />
                Active Positions
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">Summary of currently open portfolio holdings</p>
            </div>
            <Link 
              href="/positions" 
              className="text-[11px] font-semibold text-white/60 hover:text-white px-2.5 py-1 rounded-lg glass-pill transition-all"
            >
              All Orders →
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {/* Desktop View */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase font-semibold text-white/40 tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Symbol</th>
                    <th className="px-4 py-2.5 text-right">Entry</th>
                    <th className="px-4 py-2.5 text-right">Current</th>
                    <th className="px-4 py-2.5 text-right">Position Value</th>
                    <th className="px-4 py-2.5 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {orderStats.openOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-white/40 text-xs">No active open positions</td>
                    </tr>
                  ) : (
                    orderStats.openOrders.slice(0, 8).map((order) => (
                      <tr key={order.id} className="hover:bg-white/[0.04] transition-colors group">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.08]">
                              {order.logoUrl ? (
                                <img src={order.logoUrl} alt={order.tickerSymbol} className="w-full h-full object-contain bg-transparent" />
                              ) : (
                                <span className="text-[9px] font-bold text-white">
                                  {order.tickerSymbol.substring(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-semibold text-xs text-white group-hover:text-plt-orange transition-colors">
                                {order.tickerSymbol}
                              </Link>
                              <span className="text-[10px] text-white/40 truncate max-w-[120px]">{order.companyName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          <div className="text-white text-xs">{formatPrice(order.entryPrice)}</div>
                          <div className="text-[10px] text-white/40">{order.entryDate}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          <div className="text-white text-xs">{formatPrice(order.currentPrice)}</div>
                          <div className="text-[10px] text-white/40">{order.quantity} shares</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-white text-xs">
                          {formatPrice(order.currentPrice * order.quantity)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${order.profitLoss >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                          <div className="font-semibold">{formatMoney(order.profitLoss, true)}</div>
                          <div className="text-[10px] opacity-80">{order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col space-y-2 p-3">
              {orderStats.openOrders.length === 0 ? (
                <div className="p-6 text-center text-white/40 text-xs">No active open positions</div>
              ) : (
                orderStats.openOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3 flex justify-between items-center">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.08]">
                        {order.logoUrl ? (
                          <img src={order.logoUrl} alt={order.tickerSymbol} className="w-full h-full object-contain bg-transparent" />
                        ) : (
                          <span className="text-[9px] font-bold text-white">
                            {order.tickerSymbol.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link href={`/charts?ticker=${order.tickerSymbol}&timeframe=D`} className="font-semibold text-xs text-white hover:text-plt-orange">
                          {order.tickerSymbol}
                        </Link>
                        <span className="text-[10px] text-white/40 truncate max-w-[120px]">{order.companyName}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs text-white">{formatPrice(order.currentPrice * order.quantity)}</div>
                      <div className={`text-[11px] font-semibold ${order.profitLoss >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                        {formatMoney(order.profitLoss, true)} ({order.profitLossPct >= 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>

        {/* Opportunities Card */}
        <div className="space-y-4">
          {/* Buy Opportunities */}
          <motion.div variants={itemFadeInUp} className="glass-panel rounded-2xl overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.01] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]" />
                  Buy Opportunities
                </h2>
                <p className="text-[11px] text-white/40 mt-0.5">Top buy signals triggered across the market</p>
              </div>
            </div>
            <div className="p-0">
              <OpportunityTable opportunities={buyOpportunities} emptyText="No buy opportunities in the last 5 bars" compact />
            </div>
          </motion.div>

          {/* Exit Signals */}
          <motion.div variants={itemFadeInUp} className="glass-panel rounded-2xl overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 bg-white/[0.01] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff4d58] shadow-[0_0_8px_#ff4d58]" />
                  Exit & Stop Alerts
                </h2>
                <p className="text-[11px] text-white/40 mt-0.5">Exit notifications for your current positions</p>
              </div>
            </div>
            <div className="p-0">
              <OpportunityTable opportunities={exitSignals} emptyText="No exit signals in the last 5 bars" compact />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricCard({ 
  label, 
  value, 
  valueClass = 'text-white', 
  subtitle, 
  subtitleClass = 'text-white/40' 
}: { 
  label: string; 
  value: string; 
  valueClass?: string; 
  subtitle?: string; 
  subtitleClass?: string;
}) {
  return (
    <motion.div 
      variants={itemFadeInUp}
      whileHover={hoverLift}
      className="glass-panel glass-panel-hover rounded-2xl p-3.5 md:p-4 group cursor-default"
    >
      <div className="text-[10px] uppercase font-semibold tracking-wider text-white/45">{label}</div>
      <div className={`mt-1.5 text-lg md:text-xl font-bold font-mono tracking-tight ${valueClass}`}>{value}</div>
      {subtitle && (
        <div className="mt-1">
          <span className={`inline-block px-1.5 py-0.5 rounded border border-white/[0.06] text-[10px] font-mono ${subtitleClass}`}>
            {subtitle}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function formatMoney(value: number, showSign: boolean): string {
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted} EGP`;
}

function formatPrice(value: number): string {
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}
