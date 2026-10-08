'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { BarChart3, Calendar } from '@/components/ui/icon-library';
import type { ConsoleUserRowItem } from '@/lib/server/console-queries';

export type TimeframeOption = '30D' | '90D' | '120D' | 'YTD' | 'Custom';
export type ViewMode = 'cumulative' | 'new';

interface UserTierBarChartProps {
  users: ConsoleUserRowItem[];
}

interface ChartBucket {
  key: string;
  label: string;
  fullLabel: string;
  free: number;
  plus: number;
  elite: number;
  vip: number;
  total: number;
}

export const TIER_COLORS = {
  free: '#787b86',
  plus: '#2962ff',
  elite: '#089981',
  vip: '#9c27b0',
};

function classifyUserTier(u: ConsoleUserRowItem): 'free' | 'plus' | 'elite' | 'vip' {
  const t = (u.subscription?.tier || 'free').toLowerCase();
  if (t === 'vip') return 'vip';
  if (t === 'elite' || t === 'elite_monthly' || t === 'elite_annual') return 'elite';
  if (
    t === 'plus' ||
    t === 'plus_monthly' ||
    t === 'plus_annual' ||
    t === 'pro' ||
    t === 'pro_monthly' ||
    t === 'pro_annual'
  ) {
    return 'plus';
  }
  return 'free';
}

export default function UserTierBarChart({ users }: UserTierBarChartProps) {
  const { locale } = useTranslation();
  const [timeframe, setTimeframe] = useState<TimeframeOption>('YTD');
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative');

  // Custom date range state (default: last 90 days)
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Calculate chart data buckets based on selected timeframe and viewMode
  const chartData = useMemo<ChartBucket[]>(() => {
    const now = new Date();

    if (timeframe === 'YTD') {
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth(); // 0 = Jan
      const buckets: ChartBucket[] = [];

      for (let m = 0; m <= currentMonth; m++) {
        const monthStart = new Date(Date.UTC(currentYear, m, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(currentYear, m + 1, 0, 23, 59, 59, 999));
        const label = monthStart.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        const fullLabel = monthStart.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        let free = 0;
        let plus = 0;
        let elite = 0;
        let vip = 0;

        for (const u of users) {
          const created = new Date(u.createdAt);
          const inWindow =
            viewMode === 'cumulative'
              ? created <= monthEnd
              : created >= monthStart && created <= monthEnd;

          if (inWindow) {
            const tier = classifyUserTier(u);
            if (tier === 'vip') vip++;
            else if (tier === 'elite') elite++;
            else if (tier === 'plus') plus++;
            else free++;
          }
        }

        buckets.push({
          key: `m-${currentYear}-${m}`,
          label,
          fullLabel,
          free,
          plus,
          elite,
          vip,
          total: free + plus + elite + vip,
        });
      }
      return buckets;
    }

    if (timeframe === '120D' || timeframe === '90D') {
      const days = timeframe === '120D' ? 120 : 90;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const buckets: ChartBucket[] = [];
      const cur = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      while (cur <= endMonth) {
        const y = cur.getUTCFullYear();
        const m = cur.getUTCMonth();
        const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const label = monthStart.toLocaleString('en-US', {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        });
        const fullLabel = monthStart.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        let free = 0;
        let plus = 0;
        let elite = 0;
        let vip = 0;

        for (const u of users) {
          const created = new Date(u.createdAt);
          const inWindow =
            viewMode === 'cumulative'
              ? created <= monthEnd
              : created >= monthStart && created <= monthEnd;

          if (inWindow) {
            const tier = classifyUserTier(u);
            if (tier === 'vip') vip++;
            else if (tier === 'elite') elite++;
            else if (tier === 'plus') plus++;
            else free++;
          }
        }

        buckets.push({
          key: `m-${y}-${m}`,
          label,
          fullLabel,
          free,
          plus,
          elite,
          vip,
          total: free + plus + elite + vip,
        });

        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
      return buckets;
    }

    if (timeframe === '30D') {
      const buckets: ChartBucket[] = [];
      for (let w = 4; w >= 0; w--) {
        const startDaysAgo = (w + 1) * 6;
        const endDaysAgo = w * 6;
        const start = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
        const end =
          w === 0
            ? now
            : new Date(now.getTime() - endDaysAgo * 24 * 60 * 60 * 1000);

        const label = `${start.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
        })}-${end.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`;
        const fullLabel = `${start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${end.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;

        let free = 0;
        let plus = 0;
        let elite = 0;
        let vip = 0;

        for (const u of users) {
          const created = new Date(u.createdAt);
          const inWindow =
            viewMode === 'cumulative'
              ? created <= end
              : created >= start && created <= end;

          if (inWindow) {
            const tier = classifyUserTier(u);
            if (tier === 'vip') vip++;
            else if (tier === 'elite') elite++;
            else if (tier === 'plus') plus++;
            else free++;
          }
        }

        buckets.push({
          key: `w-${w}`,
          label,
          fullLabel,
          free,
          plus,
          elite,
          vip,
          total: free + plus + elite + vip,
        });
      }
      return buckets;
    }

    // Custom Timeframe
    let startDate = new Date(customStart ? `${customStart}T00:00:00Z` : Date.now() - 90 * 86400000);
    let endDate = new Date(customEnd ? `${customEnd}T23:59:59.999Z` : Date.now());
    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const spanDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const buckets: ChartBucket[] = [];

    if (spanDays > 45) {
      const cur = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      const endLimit = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

      while (cur <= endLimit) {
        const y = cur.getUTCFullYear();
        const m = cur.getUTCMonth();
        const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const label = monthStart.toLocaleString('en-US', {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        });
        const fullLabel = monthStart.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        let free = 0;
        let plus = 0;
        let elite = 0;
        let vip = 0;

        for (const u of users) {
          const created = new Date(u.createdAt);
          const inWindow =
            viewMode === 'cumulative'
              ? created <= monthEnd
              : created >= monthStart && created <= monthEnd;

          if (inWindow) {
            const tier = classifyUserTier(u);
            if (tier === 'vip') vip++;
            else if (tier === 'elite') elite++;
            else if (tier === 'plus') plus++;
            else free++;
          }
        }

        buckets.push({
          key: `custom-m-${y}-${m}`,
          label,
          fullLabel,
          free,
          plus,
          elite,
          vip,
          total: free + plus + elite + vip,
        });

        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
    } else {
      const stepDays = Math.max(1, Math.ceil(spanDays / 5));
      let cur = new Date(startDate);
      let stepIdx = 0;

      while (cur <= endDate && stepIdx < 8) {
        const next = new Date(cur.getTime() + stepDays * 24 * 60 * 60 * 1000);
        const chunkEnd = next > endDate ? endDate : next;
        const label = `${cur.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
        })}-${chunkEnd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`;
        const fullLabel = `${cur.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${chunkEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`;

        let free = 0;
        let plus = 0;
        let elite = 0;
        let vip = 0;

        for (const u of users) {
          const created = new Date(u.createdAt);
          const inWindow =
            viewMode === 'cumulative'
              ? created <= chunkEnd
              : created >= cur && created <= chunkEnd;

          if (inWindow) {
            const tier = classifyUserTier(u);
            if (tier === 'vip') vip++;
            else if (tier === 'elite') elite++;
            else if (tier === 'plus') plus++;
            else free++;
          }
        }

        buckets.push({
          key: `custom-chunk-${stepIdx}`,
          label,
          fullLabel,
          free,
          plus,
          elite,
          vip,
          total: free + plus + elite + vip,
        });

        cur = new Date(chunkEnd.getTime() + 1);
        stepIdx++;
      }
    }

    return buckets;
  }, [timeframe, viewMode, customStart, customEnd, users]);

  const latestBucket = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const currentTotal = latestBucket ? latestBucket.total : 0;

  const tierSummaries = useMemo(() => {
    const f = latestBucket ? latestBucket.free : 0;
    const p = latestBucket ? latestBucket.plus : 0;
    const e = latestBucket ? latestBucket.elite : 0;
    const v = latestBucket ? latestBucket.vip : 0;
    const tot = currentTotal || 1;

    return [
      {
        id: 'free',
        name: locale === 'ar' ? 'مجاني' : 'Free Member',
        subtitle: '0 EGP',
        count: f,
        percentage: (f / tot) * 100,
        color: TIER_COLORS.free,
      },
      {
        id: 'plus',
        name: locale === 'ar' ? 'بلس' : 'Plus Member',
        subtitle: '99 EGP/mo · 999/yr',
        count: p,
        percentage: (p / tot) * 100,
        color: TIER_COLORS.plus,
      },
      {
        id: 'elite',
        name: locale === 'ar' ? 'إيليت' : 'Elite Member',
        subtitle: '199 EGP/mo · 1999/yr',
        count: e,
        percentage: (e / tot) * 100,
        color: TIER_COLORS.elite,
      },
      {
        id: 'vip',
        name: locale === 'ar' ? 'VIP خاص' : 'VIP Exceptional',
        subtitle: '0 EGP · Family & Friends',
        count: v,
        percentage: (v / tot) * 100,
        color: TIER_COLORS.vip,
      },
    ];
  }, [latestBucket, currentTotal, locale]);

  const TIMEFRAME_OPTIONS: TimeframeOption[] = ['30D', '90D', '120D', 'YTD', 'Custom'];

  return (
    <div className="border border-white/10 rounded-xl p-4 sm:p-5 bg-transparent space-y-4 select-none">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {locale === 'ar'
                ? 'نمو المستخدمين حسب خطة الدفع'
                : 'User Growth by Payment Plan Tier'}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 tabular-nums">
              ({viewMode === 'cumulative'
                ? locale === 'ar'
                  ? 'إجمالي القاعدة'
                  : 'Total User Base'
                : locale === 'ar'
                ? 'تسجيلات جديدة'
                : 'New Signups'}
              )
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {locale === 'ar'
              ? 'توزيع شهري لإجمالي الحسابات عبر باقات Free، Plus (99 EGP)، Elite (199 EGP)، و VIP (0 EGP)'
              : 'Monthly breakdown across Free (0 EGP), Plus (99 EGP/mo), Elite (199 EGP/mo), and VIP (0 EGP)'}
          </p>
        </div>

        {/* Controls Toolbar: Mode switcher + Timeframe switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher: Cumulative vs New Signups */}
          <div className="seg-control seg-control-compact">
            <button
              type="button"
              onClick={() => setViewMode('cumulative')}
              className={`seg-control-btn ${viewMode === 'cumulative' ? 'seg-control-btn-active' : ''}`}
            >
              {locale === 'ar' ? 'إجمالي القاعدة' : 'Total Base'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('new')}
              className={`seg-control-btn ${viewMode === 'new' ? 'seg-control-btn-active' : ''}`}
            >
              {locale === 'ar' ? 'تسجيلات جديدة' : 'New Signups'}
            </button>
          </div>

          {/* Timeframe Switcher: 30D | 90D | 120D | YTD | Custom */}
          <div className="seg-control seg-control-compact">
            {TIMEFRAME_OPTIONS.map((tf) => {
              const isSelected = timeframe === tf;
              const displayLabel =
                tf === 'Custom' && locale === 'ar'
                  ? 'مخصص'
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
      </div>

      {/* 2. Custom Date Range Pickers (rendered when Custom is active) */}
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
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider hidden sm:inline">
              {locale === 'ar' ? 'إعداد سريع:' : 'Presets:'}
            </span>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setCustomStart(d.toISOString().slice(0, 10));
                setCustomEnd(new Date().toISOString().slice(0, 10));
              }}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 transition-colors"
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 90);
                setCustomStart(d.toISOString().slice(0, 10));
                setCustomEnd(new Date().toISOString().slice(0, 10));
              }}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 transition-colors"
            >
              90D
            </button>
            <button
              type="button"
              onClick={() => {
                const y = new Date().getUTCFullYear();
                setCustomStart(`${y}-01-01`);
                setCustomEnd(new Date().toISOString().slice(0, 10));
              }}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 transition-colors"
            >
              YTD
            </button>
          </div>
        </div>
      )}

      {/* 3. Bar Chart Canvas */}
      <div className="w-full h-[280px] sm:h-[320px] relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 28, left: 0, bottom: 8 }}
            barCategoryGap="24%"
          >
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
              dx={6}
              allowDecimals={false}
              domain={[0, 'auto']}
            />

            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ChartBucket;
                const tot = d.total || 1;

                return (
                  <div className="p-3.5 rounded-xl bg-[#3D3D3D] text-xs tabular-nums select-none font-sans space-y-2 shadow-2xl border border-white/10 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
                      <span className="font-semibold text-white">
                        {d.fullLabel || d.label}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-white font-semibold">
                        {d.total.toLocaleString()}{' '}
                        {locale === 'ar' ? 'مستخدم' : 'Users'}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between gap-3 text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: TIER_COLORS.free }}
                          />
                          <span>{locale === 'ar' ? 'مجاني (0 EGP)' : 'Free (0 EGP)'}</span>
                        </div>
                        <span className="text-white font-medium">
                          {d.free.toLocaleString()} (
                          {((d.free / tot) * 100).toFixed(0)}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-blue-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: TIER_COLORS.plus }}
                          />
                          <span>{locale === 'ar' ? 'بلس (99 EGP)' : 'Plus (99 EGP)'}</span>
                        </div>
                        <span className="text-white font-medium">
                          {d.plus.toLocaleString()} (
                          {((d.plus / tot) * 100).toFixed(0)}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-emerald-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: TIER_COLORS.elite }}
                          />
                          <span>{locale === 'ar' ? 'إيليت (199 EGP)' : 'Elite (199 EGP)'}</span>
                        </div>
                        <span className="text-white font-medium">
                          {d.elite.toLocaleString()} (
                          {((d.elite / tot) * 100).toFixed(0)}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-purple-400">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: TIER_COLORS.vip }}
                          />
                          <span>{locale === 'ar' ? 'VIP خاص (0 EGP)' : 'VIP (0 EGP)'}</span>
                        </div>
                        <span className="text-white font-medium">
                          {d.vip.toLocaleString()} (
                          {((d.vip / tot) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Stacked Bars for each Tier */}
            <Bar
              dataKey="free"
              name="Free Member"
              stackId="tiers"
              fill={TIER_COLORS.free}
            />
            <Bar
              dataKey="plus"
              name="Plus Member"
              stackId="tiers"
              fill={TIER_COLORS.plus}
            />
            <Bar
              dataKey="elite"
              name="Elite Member"
              stackId="tiers"
              fill={TIER_COLORS.elite}
            />
            <Bar
              dataKey="vip"
              name="VIP Exceptional"
              stackId="tiers"
              fill={TIER_COLORS.vip}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Legend & Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10">
        {tierSummaries.map((tier) => (
          <div
            key={tier.id}
            className="flex flex-col gap-1 p-2.5 rounded-lg bg-black/40 border border-white/[0.06] hover:border-white/20 transition-colors cursor-default"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="text-xs font-semibold text-white truncate">
                  {tier.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0 ml-1">
                <span className="text-xs font-bold text-white tabular-nums">
                  {tier.count.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400 tabular-nums">
                  ({tier.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">
              {tier.subtitle}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
