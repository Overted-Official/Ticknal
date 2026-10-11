'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';

interface SubscriptionTierDonutDistributionProps {
  tierSummary: ConsoleSubscriptionsPageData['tierSummary'];
  totalPaidSeats: number;
  totalMrr: number;
}

type DistributionMode = 'members' | 'mrr';

export default function SubscriptionTierDonutDistribution({
  tierSummary,
  totalPaidSeats,
  totalMrr,
}: SubscriptionTierDonutDistributionProps) {
  const { locale } = useTranslation();
  const { isPrivacy } = usePrivacyMode();
  const [mode, setMode] = useState<DistributionMode>('members');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute total seats across all tiers
  const totalAllSeats = useMemo(() => {
    return tierSummary.reduce((sum, t) => sum + t.activeSeats, 0);
  }, [tierSummary]);

  // Transform data for donut chart according to active mode
  const chartSlices = useMemo(() => {
    if (mode === 'members') {
      const denom = totalAllSeats > 0 ? totalAllSeats : 1;
      return tierSummary.map((t, idx) => ({
        id: t.tier,
        idx,
        name: t.name,
        value: t.activeSeats,
        displayValue: `${t.activeSeats} ${locale === 'ar' ? 'عضو' : 'members'}`,
        pct: Number(((t.activeSeats / denom) * 100).toFixed(1)),
        color: t.color,
        monthlyPriceEgp: t.monthlyPriceEgp,
        annualPriceEgp: t.annualPriceEgp,
        mrrContribution: t.mrrContribution,
        seats: t.activeSeats,
      }));
    }

    // MRR mode: only tiers with MRR or non-zero, or show all if total is 0
    const denom = totalMrr > 0 ? totalMrr : 1;
    return tierSummary.map((t, idx) => ({
      id: t.tier,
      idx,
      name: t.name,
      value: t.mrrContribution,
      displayValue: isPrivacy ? '••••' : `EGP ${t.mrrContribution.toLocaleString()}`,
      pct: totalMrr > 0 ? Number(((t.mrrContribution / denom) * 100).toFixed(1)) : 0,
      color: t.color,
      monthlyPriceEgp: t.monthlyPriceEgp,
      annualPriceEgp: t.annualPriceEgp,
      mrrContribution: t.mrrContribution,
      seats: t.activeSeats,
    }));
  }, [mode, tierSummary, totalAllSeats, totalMrr, isPrivacy, locale]);

  // Slices that have > 0 value for rendering the pie (fallback if all 0 to equal share)
  const renderableSlices = useMemo(() => {
    const hasValues = chartSlices.some((s) => s.value > 0);
    if (!hasValues) {
      // If all 0, allocate 1 to each for a placeholder ring
      return chartSlices.map((s) => ({ ...s, pieValue: 1 }));
    }
    return chartSlices.map((s) => ({ ...s, pieValue: s.value > 0 ? s.value : 0 }));
  }, [chartSlices]);

  const activeSlice = hoveredIdx !== null ? chartSlices[hoveredIdx] : null;

  return (
    <div className="bg-transparent space-y-4 select-none">
      {/* 1. Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {locale === 'ar' ? 'توزيع الباقات' : 'Tier Distribution'}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 tabular-nums">
              ({mode === 'members'
                ? `${totalAllSeats} ${locale === 'ar' ? 'إجمالي الأعضاء' : 'Total Members'}`
                : isPrivacy
                ? '••••'
                : `EGP ${totalMrr.toLocaleString()} MRR`}
              )
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {locale === 'ar'
              ? 'توزيع قاعدة الأعضاء وحصيلة الإيرادات الشهرية عبر باقات الاشتراك'
              : 'Active subscriber base and MRR yield across commercial subscription tiers'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="seg-control seg-control-compact self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setMode('members');
              setHoveredIdx(null);
            }}
            className={`seg-control-btn ${mode === 'members' ? 'seg-control-btn-active' : ''}`}
          >
            {locale === 'ar' ? 'حسب الأعضاء' : 'By Members'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('mrr');
              setHoveredIdx(null);
            }}
            className={`seg-control-btn ${mode === 'mrr' ? 'seg-control-btn-active' : ''}`}
          >
            {locale === 'ar' ? 'حسب الإيرادات' : 'By MRR'}
          </button>
        </div>
      </div>

      {/* 2. Donut Chart + Table Breakdown (Zero outer border) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-1">
        {/* Donut Container (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
          <div className="w-full h-[210px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={renderableSlices}
                  dataKey="pieValue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={chartSlices.filter((s) => s.value > 0).length > 1 ? 2 : 0}
                  isAnimationActive={false}
                  onMouseEnter={(_, idx) => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {renderableSlices.map((entry, index) => {
                    const isHighlighted =
                      hoveredIdx === index || (hoveredIdx === null && index === 0);
                    return (
                      <Cell
                        key={entry.id}
                        fill={entry.color}
                        stroke={isHighlighted ? '#ffffff' : 'transparent'}
                        strokeWidth={isHighlighted ? 2 : 0}
                        className="cursor-pointer transition-all duration-150"
                        onClick={() => setHoveredIdx(index)}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Hole Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none tabular-nums">
                {activeSlice
                  ? `${activeSlice.pct}%`
                  : mode === 'members'
                  ? totalAllSeats.toLocaleString()
                  : isPrivacy
                  ? '••••'
                  : `EGP ${totalMrr.toLocaleString()}`}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-1 truncate max-w-[110px] px-1">
                {activeSlice
                  ? activeSlice.name
                  : mode === 'members'
                  ? locale === 'ar'
                    ? 'إجمالي الأعضاء'
                    : 'Total Members'
                  : locale === 'ar'
                  ? 'إجمالي الإيرادات'
                  : 'Total MRR'}
              </span>
            </div>
          </div>
        </div>

        {/* Table / Row Breakdown (7 cols on lg) */}
        <div className="lg:col-span-7 min-w-0 overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[10px] font-medium">
                <th className="pb-2 text-left font-medium">
                  {locale === 'ar' ? 'الباقة' : 'Tier'}
                </th>
                <th className="pb-2 text-left font-medium hidden sm:table-cell">
                  {locale === 'ar' ? 'التسعير' : 'Pricing'}
                </th>
                <th className="pb-2 text-right font-medium">
                  {locale === 'ar' ? 'الأعضاء' : 'Members'}
                </th>
                <th className="pb-2 text-right font-medium">
                  {locale === 'ar' ? 'النسبة' : 'Share'}
                </th>
                <th className="pb-2 text-right font-medium">
                  {locale === 'ar' ? 'حصيلة MRR' : 'MRR Yield'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {chartSlices.map((slice, idx) => {
                const isHovered = hoveredIdx === idx;
                return (
                  <tr
                    key={slice.id}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setHoveredIdx(idx)}
                    className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                      isHovered ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    {/* Tier Name with Color Dot */}
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {slice.name}
                        </span>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="py-2.5 px-2 text-zinc-400 tabular-nums hidden sm:table-cell">
                      {slice.monthlyPriceEgp === 0
                        ? '0 EGP'
                        : `${slice.monthlyPriceEgp} EGP/mo`}
                    </td>

                    {/* Members Count */}
                    <td className="py-2.5 px-2 text-right font-medium text-white tabular-nums">
                      {slice.seats}
                    </td>

                    {/* Share % */}
                    <td className="py-2.5 px-2 text-right text-zinc-300 tabular-nums">
                      {slice.pct}%
                    </td>

                    {/* MRR Contribution */}
                    <td className="py-2.5 pl-2 text-right font-semibold text-white tabular-nums">
                      {isPrivacy
                        ? '••••'
                        : `EGP ${slice.mrrContribution.toLocaleString()}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
