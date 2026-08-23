'use client';

import React from 'react';
import Link from 'next/link';
import { Landmark } from '@/components/ui/icon-library';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type MonthlyFlowPoint = {
  month: string;
  inflows: number;
  outflows: number;
  net: number;
};

const CHART_AXIS_COLOR = 'var(--chart-axis)';
const COLOR_PROFIT = '#10b981';
const COLOR_RISK = '#ef4444';

interface CashFlowBarChartProps {
  data: MonthlyFlowPoint[];
}

export default function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="card-widget select-none h-full flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="widget-title">
          Monthly Cash Flow Activity
        </h3>
        <p className="widget-subtitle mt-0.5">
          Deposits & income vs expenses & outflows
        </p>
      </div>

      {data.length === 0 ? (
        <div className="h-[320px] flex flex-col items-center justify-center text-xs text-plt-muted space-y-2 font-sans">
          <Landmark size={32} className="text-plt-faint" />
          <p>No transaction history logged yet.</p>
          <Link
            href="/wallet?tab=banks"
            className="text-white/60 hover:text-white hover:underline font-semibold"
          >
            Log transactions in Wallet &rarr;
          </Link>
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }} barCategoryGap="20%">
              <XAxis
                dataKey="month"
                stroke={CHART_AXIS_COLOR}
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--palette-chart-grid)' }}
              />
              <YAxis
                stroke={CHART_AXIS_COLOR}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (isPrivacy ? '***' : `${(v / 1000).toFixed(0)}k`)}
                width={42}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--plt-bg-surface-elevated)',
                  borderColor: 'var(--plt-border)',
                  borderRadius: 'var(--radius-surface)',
                  fontSize: 'var(--text-12)',
                  fontFamily: 'var(--font-sans-token)',
                }}
                formatter={(val: any, name: any) => [isPrivacy ? '****** £' : `${Number(val).toLocaleString()} £`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'var(--font-sans-token)' }} iconType="circle" iconSize={8} />
              <Bar dataKey="inflows" name="Inflows (Income/Deposits)" fill={COLOR_PROFIT} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="outflows" name="Outflows (Expenses/Injections)" fill={COLOR_RISK} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
