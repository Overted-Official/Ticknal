'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Calendar, TrendingUp } from '@/components/ui/icon-library';
import type { SubscriptionItemEnriched } from '@/lib/server/console-queries';

export type RevenueTimeframe = '30D' | '90D' | '120D' | 'YTD' | 'All' | 'Custom';

interface CompoundingRevenueChartProps {
  subscriptions: SubscriptionItemEnriched[];
  currentMrr: number;
}

interface RevenuePoint {
  date: string;
  label: string;
  fullDate: string;
  cumulativeRevenue: number;
  periodAdd: number;
}

export default function CompoundingRevenueChart({
  subscriptions,
  currentMrr,
}: CompoundingRevenueChartProps) {
  const { locale } = useTranslation();
  const { isPrivacy } = usePrivacyMode();
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>('YTD');

  // Custom date range inputs
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const TIMEFRAMES: RevenueTimeframe[] = ['30D', '90D', '120D', 'YTD', 'All', 'Custom'];

  // Calculate compounding revenue buckets across selected timeframe
  const chartData = useMemo<RevenuePoint[]>(() => {
    const now = new Date();
    const paidSubs = subscriptions.filter(
      (s) => s.status.toLowerCase() === 'active' && s.priceEgp > 0
    );

    // Helper: cumulative revenue recognized up to a timestamp
    const getCumulativeRevenueAt = (targetDate: Date): number => {
      let total = 0;
      for (const s of paidSubs) {
        const created = s.createdAt ? new Date(s.createdAt) : new Date(s.currentPeriodStart);
        if (created <= targetDate) {
          total += s.priceEgp;
        }
      }
      return total;
    };

    if (timeframe === '30D') {
      const points: RevenuePoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        d.setHours(23, 59, 59, 999);
        const dayStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'numeric',
          day: 'numeric',
        });
        const fullDate = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const cum = getCumulativeRevenueAt(d);
        points.push({
          date: dayStr,
          label,
          fullDate,
          cumulativeRevenue: cum,
          periodAdd: 0,
        });
      }
      return points;
    }

    if (timeframe === '90D' || timeframe === '120D') {
      const days = timeframe === '120D' ? 120 : 90;
      const step = timeframe === '120D' ? 5 : 3; // group every few days
      const points: RevenuePoint[] = [];

      for (let i = days; i >= 0; i -= step) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        d.setHours(23, 59, 59, 999);
        const dayStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
        });
        const fullDate = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const cum = getCumulativeRevenueAt(d);
        points.push({
          date: dayStr,
          label,
          fullDate,
          cumulativeRevenue: cum,
          periodAdd: 0,
        });
      }
      return points;
    }

    if (timeframe === 'YTD') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const points: RevenuePoint[] = [];

      for (let m = 0; m <= currentMonth; m++) {
        const endOfMonth = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);
        const boundedDate = endOfMonth > now ? now : endOfMonth;
        const monthStart = new Date(currentYear, m, 1);
        const label = monthStart.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
        });
        const fullDate = monthStart.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'long',
          year: 'numeric',
        });
        const cum = getCumulativeRevenueAt(boundedDate);
        points.push({
          date: `${currentYear}-${String(m + 1).padStart(2, '0')}`,
          label,
          fullDate,
          cumulativeRevenue: cum,
          periodAdd: 0,
        });
      }
      return points;
    }

    if (timeframe === 'All') {
      // Find earliest subscription or default 6 months ago
      let earliest = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      for (const s of subscriptions) {
        const c = s.createdAt ? new Date(s.createdAt) : new Date(s.currentPeriodStart);
        if (c < earliest) earliest = c;
      }

      const points: RevenuePoint[] = [];
      const cur = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
      const endLimit = new Date(now.getFullYear(), now.getMonth(), 1);

      while (cur <= endLimit) {
        const y = cur.getFullYear();
        const m = cur.getMonth();
        const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
        const label = cur.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          year: '2-digit',
        });
        const fullDate = cur.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'long',
          year: 'numeric',
        });
        const cum = getCumulativeRevenueAt(endOfMonth > now ? now : endOfMonth);
        points.push({
          date: `${y}-${String(m + 1).padStart(2, '0')}`,
          label,
          fullDate,
          cumulativeRevenue: cum,
          periodAdd: 0,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      return points;
    }

    // Custom timeframe
    let startDate = new Date(customStart ? `${customStart}T00:00:00.000Z` : Date.now() - 90 * 86400000);
    let endDate = new Date(customEnd ? `${customEnd}T23:59:59.999Z` : Date.now());
    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const spanDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const points: RevenuePoint[] = [];

    if (spanDays <= 45) {
      // Daily points
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const d = new Date(cur);
        d.setHours(23, 59, 59, 999);
        const dayStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'numeric',
          day: 'numeric',
        });
        const fullDate = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const cum = getCumulativeRevenueAt(d);
        points.push({
          date: dayStr,
          label,
          fullDate,
          cumulativeRevenue: cum,
          periodAdd: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Chunked steps across custom range
      const stepDays = Math.max(1, Math.ceil(spanDays / 8));
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const next = new Date(cur.getTime() + stepDays * 24 * 60 * 60 * 1000);
        const chunkEnd = next > endDate ? endDate : next;
        const label = chunkEnd.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
        });
        const fullDate = chunkEnd.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const cum = getCumulativeRevenueAt(chunkEnd);
        points.push({
          date: chunkEnd.toISOString().slice(0, 10),
          label,
          fullDate,
          cumulativeRevenue: cum,
          periodAdd: 0,
        });
        cur = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    return points;
  }, [timeframe, customStart, customEnd, subscriptions, locale]);

  // Latest cumulative revenue point
  const latestCumRevenue =
    chartData.length > 0 ? chartData[chartData.length - 1].cumulativeRevenue : currentMrr;

  // Custom presets quick handler
  const handleApplyPreset = (preset: '30D' | '90D' | 'YTD') => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    setCustomEnd(endStr);

    if (preset === '30D') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setCustomStart(d.toISOString().slice(0, 10));
    } else if (preset === '90D') {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setCustomStart(d.toISOString().slice(0, 10));
    } else if (preset === 'YTD') {
      const d = new Date(now.getFullYear(), 0, 1);
      setCustomStart(d.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="bg-transparent space-y-4 select-none">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {locale === 'ar' ? 'الإيرادات التراكمية الإجمالية' : 'Compounding Total Revenue'}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400 tabular-nums">
              ({isPrivacy ? '••••' : `EGP ${latestCumRevenue.toLocaleString()}`} {locale === 'ar' ? 'إجمالي تراكمي' : 'Cumulative'}
              )
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {locale === 'ar'
              ? 'تطور إجمالي إيرادات الاشتراكات التراكمية عبر الفترة الزمنية المختارة'
              : 'Cumulative platform subscription revenue progression across selected timeframe'}
          </p>
        </div>

        {/* Timeframe Switcher */}
        <div className="seg-control seg-control-compact self-start sm:self-auto">
          {TIMEFRAMES.map((tf) => {
            const isSelected = timeframe === tf;
            const displayLabel =
              tf === 'Custom' && locale === 'ar'
                ? 'مخصص'
                : tf === 'All' && locale === 'ar'
                ? 'الكل'
                : tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Date Range Pickers (Active when timeframe === 'Custom') */}
      {timeframe === 'Custom' && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-lg bg-black/60 border border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 font-medium">
                {locale === 'ar' ? 'من تاريخ:' : 'From:'}
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-black border border-white/15 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-medium">
                {locale === 'ar' ? 'إلى تاريخ:' : 'To:'}
              </span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-black border border-white/15 text-white text-xs tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">
              {locale === 'ar' ? 'فترات سريعة:' : 'Presets:'}
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('30D')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('90D')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
            >
              90D
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('YTD')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
            >
              YTD
            </button>
          </div>
        </div>
      )}

      {/* 3. Area Chart Display (No Card Border, Transparent Surface) */}
      <div className="w-full h-[260px] sm:h-[300px] relative pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 60, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="compoundingRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#089981" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#089981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2 2"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              stroke="#787b86"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />

            <YAxis
              orientation="right"
              stroke="#787b86"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (isPrivacy ? '•••' : `${v.toLocaleString()}`)}
              dx={8}
              domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.15) : 100)]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as RevenuePoint;
                return (
                  <div className="p-3 rounded-xl bg-[#3D3D3D] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl border border-white/10">
                    <div className="font-semibold text-white border-b border-white/15 pb-1">
                      {d.fullDate}
                    </div>
                    <div className="flex items-center justify-between gap-4 text-emerald-400">
                      <span>{locale === 'ar' ? 'الإيراد التراكمي:' : 'Compounding Total:'}</span>
                      <strong className="text-white">
                        {isPrivacy ? '••••••••' : `EGP ${d.cumulativeRevenue.toLocaleString()}`}
                      </strong>
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="cumulativeRevenue"
              stroke="#089981"
              strokeWidth={2}
              fill="url(#compoundingRevenueGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
