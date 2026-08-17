'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Landmark } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export type MonthlyFlowPoint = {
  month: string;
  inflows: number;
  outflows: number;
  net: number;
};

interface CashFlowBarChartProps {
  data: MonthlyFlowPoint[];
}

export default function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const router = useRouter();

  return (
    <div className="lg:col-span-2 glass-panel rounded-xl p-4 md:p-5 space-y-2 flex flex-col">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Monthly Cash Flow Activity (Inflows vs. Outflows)
        </h3>
        <p className="text-[11px] text-white/40 mt-0.5">
          Comparison of monthly deposits & income vs. withdrawals, expenses, and brokerage injections.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-xs text-white/40 space-y-2">
          <Landmark size={32} className="text-white/20" />
          <p>No transaction history logged yet.</p>
          <button
            type="button"
            onClick={() => router.push('/wallet?tab=banks')}
            className="text-emerald-400 hover:underline font-medium"
          >
            Log transactions in Wallet &rarr;
          </button>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                stroke="#666"
                tick={{ fill: '#888', fontSize: 11 }}
                axisLine={{ stroke: '#333' }}
              />
              <YAxis
                stroke="#666"
                tick={{ fill: '#888', fontSize: 11 }}
                axisLine={{ stroke: '#333' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: 8, fontSize: 12 }}
                formatter={(val: any) => [`${Number(val).toLocaleString()} EGP`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="inflows" name="Inflows (Income/Deposits)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflows" name="Outflows (Expenses/Injections)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
