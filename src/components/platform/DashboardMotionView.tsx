'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Landmark, ShieldCheck } from 'lucide-react';
import { ChevronDown } from '@/components/ui/icons';
import { containerStagger, itemFadeInUp, hoverLift } from '@/lib/motion';
import TestNotificationButton from '@/components/platform/TestNotificationButton';
import DashboardCharts from '@/components/platform/DashboardCharts';
import OpportunityTable, { Opportunity } from '@/components/platform/OpportunityTable';
import { SectorDataItem } from '@/components/platform/SectorDonutChart';
import { MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';

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
  avgAdverseExcursion: number;
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
  const router = useRouter();
  const [statsBarExpandedMobile, setStatsBarExpandedMobile] = useState(false);
  const [openPositionsExpandedMobile, setOpenPositionsExpandedMobile] = useState(false);
  const [buyOpportunitiesExpandedMobile, setBuyOpportunitiesExpandedMobile] = useState(false);
  const [exitSignalsExpandedMobile, setExitSignalsExpandedMobile] = useState(false);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerStagger}
      className="flex-1 h-full w-full min-h-0 flex flex-col overflow-hidden bg-transparent text-white relative z-10"
    >
      {/* 1. Mobile / Desktop Top Rail */}
      <SubNavTopRail
        activeTab="investments"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      <div className="flex-1 h-full w-full min-h-0 overflow-y-auto pb-20">
        {/* Top Header Banner */}
        <div className="border-b border-white/[0.09] px-6 py-5 shrink-0">
        <motion.div variants={itemFadeInUp} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-plt-orange" />
              <h1 className="text-lg font-medium tracking-[-0.02em] text-white">Dashboard</h1>
            </div>
            <p className="mt-0.5 text-[13px] text-white/30">Portfolio performance and real-time PSI trading intelligence</p>
          </div>

          <div className="flex items-center gap-2">
            <TestNotificationButton />
            <Link
              href="/positions"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
            >
              <span>Manage Positions</span>
              <span className="text-plt-orange">→</span>
            </Link>
            <Link
              href="/charts"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all"
            >
              <span>Open Charts</span>
              <span className="text-plt-orange">→</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Main Canvas Space */}
      <div className="p-4 md:p-6 space-y-2">
        {/* 1. Core Portfolio KPIs Grid (6 Tiles) */}
        <motion.div 
          variants={itemFadeInUp}
          className="grid grid-cols-2 lg:grid-cols-6 border border-white/[0.09] rounded-md bg-black divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]"
        >
          {/* Cell 1: Portfolio Value */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Portfolio Value</div>
            <div className="mt-2">
              <div className="text-xl font-semibold font-mono tracking-tight text-white">
                {formatMoney(orderStats.openMarketValue)}
              </div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                Total market holdings
              </div>
            </div>
          </div>

          {/* Cell 2: Unrealized P/L */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Unrealized P/L</div>
            <div className="mt-2">
              <div className={`text-xl font-semibold font-mono tracking-tight ${orderStats.unrealized >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {formatMoney(orderStats.unrealized, true)}
              </div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                Open positions
              </div>
            </div>
          </div>

          {/* Cell 3: Realized P/L */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Realized P/L</div>
            <div className="mt-2">
              <div className={`text-xl font-semibold font-mono tracking-tight ${orderStats.realized >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {formatMoney(orderStats.realized, true)}
              </div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                Net closed gain/loss
              </div>
            </div>
          </div>

          {/* Cell 4: Open Positions Count */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Open Positions</div>
            <div className="mt-2">
              <div className="text-xl font-semibold font-mono tracking-tight text-white">{orderStats.openOrders.length}</div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                <span className="text-[#22c55e]">{orderStats.openWinning}W</span> · <span className="text-[#ef4444]">{orderStats.openLosing}L</span>
              </div>
            </div>
          </div>

          {/* Cell 5: Closed Positions Count */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Closed Positions</div>
            <div className="mt-2">
              <div className="text-xl font-semibold font-mono tracking-tight text-white">{orderStats.closedCount}</div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                <span className="text-[#22c55e]">{orderStats.closedWinning}W</span> · <span className="text-[#ef4444]">{orderStats.closedLosing}L</span>
              </div>
            </div>
          </div>

          {/* Cell 6: Active Alerts */}
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium">Active Alerts</div>
            <div className="mt-2">
              <div className="text-xl font-semibold font-mono tracking-tight text-white">{activeAlertCount}</div>
              <div className="mt-1 text-[11px] font-mono text-white/30">Market triggers</div>
            </div>
          </div>
        </motion.div>

        {/* 2. Extended Portfolio Stats Bar (Collapsible on mobile, default collapsed) */}
        <motion.div 
          variants={itemFadeInUp}
          className="border border-white/[0.09] rounded-md bg-black overflow-hidden"
        >
          {/* Mobile Collapsible Header Toggle */}
          <button
            type="button"
            onClick={() => setStatsBarExpandedMobile(!statsBarExpandedMobile)}
            className="md:hidden w-full px-4 py-3 flex items-center justify-between text-xs text-white/60 hover:text-white transition-colors bg-white/[0.015]"
          >
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Extended Performance</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white text-[11px] font-semibold">{orderStats.winRate.toFixed(1)}% Win Rate</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${statsBarExpandedMobile ? 'rotate-180 text-white' : ''}`} />
            </div>
          </button>

          {/* Metrics Content (Visible on desktop, toggleable on mobile) */}
          <div className={`${statsBarExpandedMobile ? 'flex' : 'hidden'} md:flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/[0.06] p-4 md:p-5 gap-3 md:gap-0 ${statsBarExpandedMobile ? 'border-t md:border-t-0 border-white/[0.06]' : ''}`}>
            <div className="flex-1 md:px-5 first:pl-0 flex flex-col justify-center">
              <div className="text-[11px] text-white/40 font-medium mb-1">Win Rate</div>
              <div className="text-lg font-semibold font-mono text-white">{orderStats.winRate.toFixed(1)}%</div>
            </div>
            <div className="flex-1 md:px-5 flex flex-col justify-center pt-2 md:pt-0">
              <div className="text-[11px] text-white/40 font-medium mb-1">Avg. Bars / Trade</div>
              <div className="text-lg font-semibold font-mono text-white">{Math.round(orderStats.avgBarsPerTrade)}</div>
            </div>
            <div className="flex-1 md:px-5 flex flex-col justify-center pt-2 md:pt-0">
              <div className="text-[11px] text-white/40 font-medium mb-1">Avg. Adverse Excursion</div>
              <div className={`text-lg font-semibold font-mono ${orderStats.avgAdverseExcursion < 0 ? 'text-[#ef4444]' : 'text-white/30'}`}>
                {orderStats.avgAdverseExcursion !== 0 ? `${orderStats.avgAdverseExcursion.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div className="flex-1 md:px-5 last:pr-0 flex flex-col justify-center pt-2 md:pt-0">
              <div className="text-[11px] text-white/40 font-medium mb-1">Max Trade Loss</div>
              <div className={`text-lg font-semibold font-mono ${orderStats.maxDrawdownPct < 0 ? 'text-[#ef4444]' : 'text-white'}`}>
                {orderStats.maxDrawdownPct < 0 ? '' : '+'}{orderStats.maxDrawdownPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Analytics Charts Module */}
        <motion.div variants={itemFadeInUp}>
          <DashboardCharts sectorData={orderStats.sectorData} monthlyData={orderStats.monthlyData} />
        </motion.div>

        {/* 4. Two-Column Grid: Left (Open Positions) / Right (Signals) */}
        <motion.div variants={containerStagger} className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {/* Open Positions Card */}
          <motion.section variants={itemFadeInUp} className="border border-white/[0.09] rounded-md bg-black overflow-hidden flex flex-col">
            <div 
              className="border-b border-white/[0.09] px-4 md:px-6 py-3.5 md:py-4 bg-transparent flex items-center justify-between cursor-pointer md:cursor-default select-none"
              onClick={() => setOpenPositionsExpandedMobile(!openPositionsExpandedMobile)}
            >
              <div>
                <h2 className="text-[13px] font-medium text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-plt-orange" />
                  Active Positions
                  <span className="md:hidden text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60">
                    {orderStats.openOrders.length}
                  </span>
                </h2>
                <p className="text-[12px] text-white/30 mt-0.5">Summary of currently open portfolio holdings</p>
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  href="/positions" 
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-medium text-white/60 hover:text-white px-3 py-1 rounded-md bg-white/[0.03] border border-white/[0.09] hover:border-white/[0.18] transition-all"
                >
                  All Positions →
                </Link>
                <button
                  type="button"
                  className="md:hidden p-1 text-white/40 hover:text-white"
                  aria-label="Toggle active positions"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openPositionsExpandedMobile ? 'rotate-180 text-white' : ''}`} />
                </button>
              </div>
            </div>

            <div className={`${openPositionsExpandedMobile ? 'block' : 'hidden'} md:block flex-1 overflow-x-auto`}>
              {/* Desktop View */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.09] bg-transparent text-[11px] font-medium text-white/30">
                    <tr>
                      <th className="px-6 py-3.5">Symbol</th>
                      <th className="px-6 py-3.5 text-right">Entry</th>
                      <th className="px-6 py-3.5 text-right">Current</th>
                      <th className="px-6 py-3.5 text-right">Position Value</th>
                      <th className="px-6 py-3.5 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {orderStats.openOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-white/40 text-xs">No active open positions</td>
                      </tr>
                    ) : (
                      orderStats.openOrders.slice(0, 8).map((order) => (
                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.09]">
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
                          <td className="px-6 py-3.5 text-right font-mono">
                            <div className="text-white text-xs">{formatPrice(order.entryPrice)}</div>
                            <div className="text-[10px] text-white/40">{order.entryDate}</div>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">
                            <div className="text-white text-xs">{formatPrice(order.currentPrice)}</div>
                            <div className="text-[10px] text-white/40">{order.quantity} shares</div>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-white text-xs">
                            {formatPrice(order.currentPrice * order.quantity)}
                          </td>
                          <td className={`px-6 py-3.5 text-right font-mono text-xs ${order.profitLoss > 0 ? 'text-[#22c55e]' : order.profitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                            <div className="font-semibold">{formatMoney(order.profitLoss, true)}</div>
                            <div className="text-[10px] opacity-80">{order.profitLossPct > 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%</div>
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
                    <div key={order.id} className="bg-transparent rounded-md border border-white/[0.09] p-3 flex justify-between items-center">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.09]">
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
                        <div className={`text-[11px] font-semibold ${order.profitLoss > 0 ? 'text-[#22c55e]' : order.profitLoss < 0 ? 'text-[#ef4444]' : 'text-white/80'}`}>
                          {formatMoney(order.profitLoss, true)} ({order.profitLossPct > 0 ? '+' : ''}{order.profitLossPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>

          {/* Opportunities Column (Buy & Exit signals separated by 12px) */}
          <div className="flex flex-col gap-3">
            {/* Buy Opportunities */}
            <motion.div variants={itemFadeInUp} className="border border-white/[0.09] rounded-md bg-black overflow-hidden">
              <div 
                className="border-b border-white/[0.09] px-4 md:px-6 py-3.5 md:py-4 bg-transparent flex items-center justify-between cursor-pointer md:cursor-default select-none"
                onClick={() => setBuyOpportunitiesExpandedMobile(!buyOpportunitiesExpandedMobile)}
              >
                <div>
                  <h2 className="text-[13px] font-medium text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                    Buy Opportunities
                    <span className="md:hidden text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e]">
                      {buyOpportunities.length}
                    </span>
                  </h2>
                  <p className="text-[12px] text-white/30 mt-0.5">Top buy signals triggered across the market</p>
                </div>
                <button
                  type="button"
                  className="md:hidden p-1 text-white/40 hover:text-white"
                  aria-label="Toggle buy opportunities"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${buyOpportunitiesExpandedMobile ? 'rotate-180 text-white' : ''}`} />
                </button>
              </div>
              <div className={`${buyOpportunitiesExpandedMobile ? 'block' : 'hidden'} md:block p-0`}>
                <OpportunityTable opportunities={buyOpportunities} emptyText="No buy opportunities in the last 5 bars" compact />
              </div>
            </motion.div>

            {/* Exit Signals */}
            <motion.div variants={itemFadeInUp} className="border border-white/[0.09] rounded-md bg-black overflow-hidden">
              <div 
                className="border-b border-white/[0.09] px-4 md:px-6 py-3.5 md:py-4 bg-transparent flex items-center justify-between cursor-pointer md:cursor-default select-none"
                onClick={() => setExitSignalsExpandedMobile(!exitSignalsExpandedMobile)}
              >
                <div>
                  <h2 className="text-[13px] font-medium text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    Exit & Stop Alerts
                    <span className="md:hidden text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444]">
                      {exitSignals.length}
                    </span>
                  </h2>
                  <p className="text-[12px] text-white/30 mt-0.5">Exit notifications for your current positions</p>
                </div>
                <button
                  type="button"
                  className="md:hidden p-1 text-white/40 hover:text-white"
                  aria-label="Toggle exit signals"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${exitSignalsExpandedMobile ? 'rotate-180 text-white' : ''}`} />
                </button>
              </div>
              <div className={`${exitSignalsExpandedMobile ? 'block' : 'hidden'} md:block p-0`}>
                <OpportunityTable opportunities={exitSignals} emptyText="No exit signals in the last 5 bars" compact />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
      </div>
    </motion.div>
  );
}

function formatMoney(value: number, showSign: boolean = false): string {
  if (value === 0) return '0.00 EGP';
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted} EGP`;
}

function formatPrice(value: number): string {
  return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}
