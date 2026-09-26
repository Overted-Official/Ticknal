'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type NetWorthHistoryPoint } from '@/lib/portfolio-finance';
import { type BankAccount } from '@/types/bank';
import { type HomeInvestmentOrder } from '../../homeInvestmentsTypes';

export type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'All';

interface NetWorthProgressionChartProps {
  netWorthHistory?: NetWorthHistoryPoint[];
  inflationSeries?: Array<{ yearMonth: string; cbeHeadlineInflation: string; usCpiInflation?: string }>;
  cbeAnnualInflation?: number;
  accounts?: BankAccount[];
  openOrders?: HomeInvestmentOrder[];
  usdRate?: number;
}

const TIMEFRAMES: Timeframe[] = ['1M', '3M', '6M', '1Y', 'All'];

export default function NetWorthProgressionChart({
  netWorthHistory = [],
  inflationSeries = [],
  cbeAnnualInflation = 14.9,
  accounts = [],
  openOrders = [],
  usdRate = 50.20,
}: NetWorthProgressionChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('All');
  const { isPrivacy } = usePrivacyMode();

  // 1. Calculate current asset-weighted inflation rate and monthly series deflators
  const chartPoints = useMemo(() => {
    // Current allocation weights
    let egpCash = 0;
    let usdCashInEgp = 0;
    for (const acc of accounts) {
      const bal = Number(acc.balance || 0);
      if (acc.currency === 'USD') {
        usdCashInEgp += bal * usdRate;
      } else {
        egpCash += bal;
      }
    }

    const investedEgp = openOrders.reduce(
      (sum, o) => sum + (Number(o.currentPrice || 0) * Number(o.quantity || 0)),
      0
    );

    const totalWealth = Math.max(1, egpCash + usdCashInEgp + investedEgp);
    const wEgp = (egpCash + investedEgp) / totalWealth;
    const wUsd = usdCashInEgp / totalWealth;

    // Build rate lookup from inflationSeries
    const cbeRateMap = new Map<string, number>();
    const usCpiRateMap = new Map<string, number>();
    for (const s of inflationSeries) {
      const cVal = parseFloat(s.cbeHeadlineInflation);
      if (!isNaN(cVal) && cVal > 0) cbeRateMap.set(s.yearMonth, cVal);
      if (s.usCpiInflation) {
        const uVal = parseFloat(s.usCpiInflation);
        if (!isNaN(uVal) && uVal > 0) usCpiRateMap.set(s.yearMonth, uVal);
      }
    }

    const headlineCbe = cbeAnnualInflation > 0 ? cbeAnnualInflation : 14.9;
    const headlineUs = 2.8;

    const getMonthlyRate = (yearMonth: string) => {
      const cbe = cbeRateMap.get(yearMonth) ?? headlineCbe;
      const us = usCpiRateMap.get(yearMonth) ?? headlineUs;
      return Math.max(0, (wEgp * cbe) + (wUsd * us)) / 100 / 12;
    };

    // If we have history points from server
    if (netWorthHistory && netWorthHistory.length >= 2) {
      const deflators = new Array(netWorthHistory.length).fill(1) as number[];
      for (let i = netWorthHistory.length - 2; i >= 0; i--) {
        deflators[i] = deflators[i + 1] * (1 + getMonthlyRate(netWorthHistory[i + 1].yearMonth));
      }

      return netWorthHistory.map((pt, idx) => {
        const nominal = Math.round(pt.nominalEgp);
        const realValue = Math.round(pt.nominalEgp / deflators[idx]);
        const drag = Math.max(0, nominal - realValue);
        return {
          month: pt.month,
          fullDate: pt.yearMonth,
          nominal,
          realValue,
          drag,
        };
      });
    }

    // Fallback: Generate trailing 12 months based on current snapshot and official deflators
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const points = [];
    const monthlyRate = ((wEgp * headlineCbe) + (wUsd * headlineUs)) / 100 / 12;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;

      const deflator = Math.pow(1 + monthlyRate, i);
      const nominal = Math.round(totalWealth);
      const realValue = Math.round(totalWealth / deflator);
      const drag = Math.max(0, nominal - realValue);

      points.push({
        month: label,
        fullDate: ym,
        nominal,
        realValue,
        drag,
      });
    }

    return points;
  }, [netWorthHistory, inflationSeries, cbeAnnualInflation, accounts, openOrders, usdRate]);

  // Filter Data by Timeframe
  const filteredData = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return [];
    if (timeframe === '1M') return chartPoints.slice(-2);
    if (timeframe === '3M') return chartPoints.slice(-3);
    if (timeframe === '6M') return chartPoints.slice(-6);
    if (timeframe === '1Y') return chartPoints.slice(-12);
    return chartPoints;
  }, [chartPoints, timeframe]);

  const formatPriceValue = (val: number) => {
    if (isPrivacy) return '••••';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}M`;
    if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(0)}k`;
    return `${sign}${absVal.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-[#18181b] border border-white/10 text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl">
        <div className="font-semibold text-text-primary mb-1 border-b border-white/10 pb-1">
          {pt.fullDate || label}
        </div>
        <div className="flex justify-between gap-4 text-[#089981]">
          <span>Nominal Net Worth:</span>
          <strong className="text-text-primary">
            {isPrivacy ? '•••••••• £' : `${pt.nominal.toLocaleString('en-US')} £`}
          </strong>
        </div>
        <div className="flex justify-between gap-4 text-[#2962ff]">
          <span>Real Purchasing Power:</span>
          <strong className="text-text-primary">
            {isPrivacy ? '•••••••• £' : `${pt.realValue.toLocaleString('en-US')} £`}
          </strong>
        </div>
        <div className="flex justify-between gap-4 text-[#f23645]">
          <span>Inflation Drag:</span>
          <strong className="text-text-primary">
            {isPrivacy ? '•••••••• £' : `-${pt.drag.toLocaleString('en-US')} £`}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col justify-start select-none bg-surface-base rounded-2xl p-3.5 sm:p-4 space-y-2.5">
      {/* 1. Header with Title & Legends on Left, Square Timeframe Controls on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="text-[13px] font-semibold text-text-primary tracking-tight mr-0.5">
            Net Worth vs Inflation
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#089981]" />
            <span>Nominal</span>
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#2962ff]" />
            <span>Real Deflated</span>
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#f23645]" />
            <span>Drag</span>
          </span>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 select-none">
          <div className="seg-control">
            {TIMEFRAMES.map((tf) => {
              const isSelected = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Compact TradingView Chart Canvas */}
      <div className="w-full h-[210px] relative">
        {filteredData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            Historical net worth progression is not available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="nominalNetWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#089981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#089981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatPriceValue}
                orientation="right"
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              <Area
                type="monotone"
                dataKey="nominal"
                stroke="#089981"
                strokeWidth={2}
                fill="url(#nominalNetWorthGrad)"
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="realValue"
                stroke="#2962ff"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="drag"
                stroke="#f23645"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
