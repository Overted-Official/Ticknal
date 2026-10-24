'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CompanyBacktestDetail } from '../../../../lib/strategies/server/project-company-backtest-detail';
import { summarizeCompanyTrades } from './strategy-company-trade-metrics';

export default function StrategyCompanyAdvancedResults({ detail, locale, privateValues }: {
  readonly detail: CompanyBacktestDetail;
  readonly locale: 'en' | 'ar';
  readonly privateValues: boolean;
}) {
  const isAr = locale === 'ar';
  const metrics = useMemo(() => summarizeCompanyTrades(detail.trades), [detail.trades]);
  const chart = useMemo(() => {
    const stride = Math.max(1, Math.ceil(detail.equity.length / 400));
    const points = detail.equity.filter((_, index) => index % stride === 0);
    const last = detail.equity.at(-1);
    if (last && points.at(-1) !== last) points.push(last);
    return points.map((point) => ({ date: String(point.time).slice(0, 10), value: point.value }));
  }, [detail.equity]);
  const percent = (value: number | null) => value === null ? '—' : privateValues ? '••••' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return <div className="mt-5 border-t border-plt-border pt-4" data-testid="advanced-company-analytics">
    <h4 className="text-xs font-semibold text-plt-text">{isAr ? 'منحنى رأس المال' : 'Equity curve'}</h4>
    <p className="mt-1 text-[10px] text-plt-muted">{isAr ? 'القيمة اليومية بعد التكاليف، حسب إعدادات الاختبار أعلاه.' : 'Daily marked-to-market value after costs, using the assumptions above.'}</p>
    <div className="mt-3 h-52 w-full" role="img" aria-label={isAr ? 'منحنى رأس المال المحسوب' : 'Calculated equity curve'}>
      {privateValues ? <div className="flex h-full items-center justify-center border border-plt-border text-xs text-plt-muted">{isAr ? 'القيم مخفية بوضع الخصوصية' : 'Values hidden in privacy mode'}</div>
        : chart.length < 2 ? <div className="flex h-full items-center justify-center border border-plt-border text-xs text-plt-muted">{isAr ? 'لا توجد نقاط كافية للرسم' : 'Not enough points to chart'}</div>
          : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={40} tick={{ fill: 'var(--plt-text-muted)', fontSize: 10 }} tickFormatter={(value: string) => value.slice(0, 7)} />
            <YAxis dataKey="value" orientation="right" axisLine={false} tickLine={false} width={56} tick={{ fill: 'var(--plt-text-muted)', fontSize: 10 }} tickFormatter={(value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} />
            <Tooltip contentStyle={{ background: '#3D3D3D', border: 0, color: '#fff', fontSize: 11 }} formatter={(value) => [`${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP`, isAr ? 'رأس المال' : 'Equity']} />
            <Area type="monotone" dataKey="value" stroke="var(--color-profit-chart)" fill="var(--color-profit-chart)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
          </AreaChart></ResponsiveContainer>}
    </div>
    <div className="strategy-analytics-kpis mt-4">
      <TradeMetric label={isAr ? 'متوسط عائد الصفقة' : 'Avg return / trade'} value={percent(metrics.averageReturnPct)} />
      <TradeMetric label={isAr ? 'متوسط التحرك العكسي (MAE)' : 'Avg adverse move (MAE)'} value={percent(metrics.averageMaePct)} />
      <TradeMetric label={isAr ? 'متوسط التحرك المواتي (MFE)' : 'Avg favorable move (MFE)'} value={percent(metrics.averageMfePct)} />
      <TradeMetric label={isAr ? 'متوسط الاحتفاظ' : 'Avg hold'} value={metrics.averageHoldDays === null ? '—' : privateValues ? '••••' : `${metrics.averageHoldDays.toFixed(1)} ${isAr ? 'يوم تقويمي' : 'calendar days'}`} />
    </div>
    {detail.openPosition && <p className="mt-4 border-y border-plt-border py-3 text-[11px] text-plt-muted tabular-nums">{isAr ? 'مركز مفتوح' : 'Open position'} · {String(detail.openPosition.entryTime).slice(0, 10)} · {isAr ? 'عائد غير محقق' : 'Unrealized'} <span className="text-plt-text">{percent(detail.openPosition.unrealizedReturnPct)}</span></p>}
    <h4 className="mt-5 text-xs font-semibold text-plt-text">{isAr ? 'الصفقات المغلقة' : 'Closed trades'}</h4>
    {detail.trades.length === 0 ? <p className="mt-2 text-xs text-plt-muted">{isAr ? 'لا توجد صفقات مغلقة في هذه الفترة.' : 'No closed trades in this period.'}</p> : <div className="mt-2 max-h-72 overflow-auto custom-scrollbar"><table className="data-table min-w-[440px] text-[10px]" aria-label={isAr ? 'قائمة الصفقات المحسوبة' : 'Calculated trade list'}>
      <thead><tr><th className="text-start">{isAr ? 'دخول' : 'Entry'}</th><th className="text-start">{isAr ? 'خروج' : 'Exit'}</th><th className="text-end">{isAr ? 'العائد' : 'Return'}</th><th className="text-end">MAE</th><th className="text-end">MFE</th></tr></thead>
      <tbody>{detail.trades.map((trade, index) => <tr key={`${trade.entryTime}-${trade.exitTime}-${index}`}><td>{String(trade.entryTime).slice(0, 10)}</td><td>{String(trade.exitTime).slice(0, 10)}</td><td className={`text-end ${trade.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{percent(trade.returnPct)}</td><td className="text-end">{percent(trade.maePct)}</td><td className="text-end">{percent(trade.mfePct)}</td></tr>)}</tbody>
    </table></div>}
  </div>;
}

function TradeMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="strategy-analytics-kpi"><span className="text-[11px] text-plt-muted">{label}</span><strong className="mt-2 block text-base font-semibold tabular-nums text-plt-text">{value}</strong></div>;
}
