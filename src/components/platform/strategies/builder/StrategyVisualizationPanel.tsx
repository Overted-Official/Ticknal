'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { StrategyVisualizationModel } from './strategy-visualization-model';

interface StrategyVisualizationPanelProps {
  readonly model: StrategyVisualizationModel | null;
  readonly ticker: string;
  readonly focusedBlockId: string | null;
  readonly locale: 'en' | 'ar';
  readonly onTickerChange: (ticker: string) => void;
  readonly onFocusBlock: (blockId: string) => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

const TICKERS = ['COMI', 'SWDY', 'EAST'] as const;

export default function StrategyVisualizationPanel({ model, ticker, focusedBlockId, locale, onTickerChange, onFocusBlock, onBack, onContinue }: StrategyVisualizationPanelProps) {
  const isAr = locale === 'ar';
  if (!model) return (
    <section className="bg-black px-4 py-6 sm:px-6" aria-label={isAr ? 'تصور الاستراتيجية' : 'Strategy visualization'}>
      <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-white/15 px-6 text-center">
        <h2 className="text-base font-semibold text-white">{isAr ? 'الاستراتيجية غير مكتملة' : 'Complete the strategy first'}</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-[#787b86]">{isAr ? 'أضف قاعدة شراء واحدة وقاعدة بيع واحدة على الأقل لرؤية الاستراتيجية على الرسم البياني.' : 'Add at least one Buy rule and one Sell rule to see the strategy on a chart.'}</p>
        <button type="button" onClick={onBack} className="mt-5 min-h-11 border border-white/15 px-4 text-xs font-semibold text-white hover:bg-white/[0.04]">{isAr ? 'العودة إلى البناء' : 'Return to Build'}</button>
      </div>
    </section>
  );

  return (
    <section className="bg-black px-4 py-5 sm:px-6" aria-label={isAr ? 'تصور الاستراتيجية' : 'Strategy visualization'}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div><h2 className="text-base font-semibold text-white">{isAr ? 'تصور الاستراتيجية' : 'Visualize the strategy'}</h2><p className="mt-1 text-xs text-[#787b86]">{isAr ? 'افحص الإشارات والحسابات على سهم واحد قبل الاختبار.' : 'Inspect signals and calculations on one ticker before testing.'}</p></div>
        <div className="flex items-center gap-2">
          <select value={ticker} onChange={(event) => onTickerChange(event.target.value)} aria-label={isAr ? 'اختر السهم' : 'Select ticker'} className="min-h-11 rounded-none border border-white/10 bg-black px-3 font-sans text-xs font-semibold text-white outline-none">{TICKERS.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="flex border border-white/10 p-0.5" aria-label={isAr ? 'الفترة الزمنية' : 'Chart timeframe'}>{['6M', '1Y', 'ALL'].map((item) => <button key={item} type="button" aria-pressed={item === '1Y'} className={`min-h-10 px-3 text-[10px] font-semibold ${item === '1Y' ? 'border border-white/25 text-white' : 'text-[#787b86]'}`}>{item}</button>)}</div>
        </div>
      </header>

      <div className="mt-4 border border-white/10 p-3" role="img" aria-label={`${ticker} price chart`}>
        <div className="mb-3 flex items-center gap-4 text-[9px] text-[#787b86]"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#089981]" />{isAr ? 'إشارة شراء' : 'Buy signal'}</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#f23645]" />{isAr ? 'إشارة بيع' : 'Sell signal'}</span></div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={model.points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}><defs><linearGradient id="strategy-price" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2962ff" stopOpacity={0.28}/><stop offset="100%" stopColor="#2962ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="date" tick={{ fill: '#787b86', fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={28}/><YAxis domain={['auto', 'auto']} tick={{ fill: '#787b86', fontSize: 9 }} tickLine={false} axisLine={false} width={42}/><Tooltip contentStyle={{ background: '#000', border: '1px solid rgba(255,255,255,.12)', borderRadius: 0, fontSize: 11 }} /><Area type="monotone" dataKey="close" stroke="#2962ff" fill="url(#strategy-price)" strokeWidth={2}/>{model.markers.map((marker) => <ReferenceDot key={`${marker.date}-${marker.side}`} x={marker.date} y={marker.price} r={4} fill={marker.side === 'buy' ? '#089981' : '#f23645'} stroke="#000" />)}</AreaChart></ResponsiveContainer>
        </div>
        <ul className="sr-only">{model.markers.map((marker) => <li key={`${marker.date}-${marker.side}`}>{marker.date}: {marker.label}</li>)}</ul>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {model.panes.map((pane) => {
          const active = focusedBlockId === pane.id;
          const Chart = pane.presentation === 'bar' ? BarChart : LineChart;
          return <button key={pane.id} type="button" aria-pressed={active} onClick={() => onFocusBlock(pane.id)} className={`min-w-0 border bg-black p-3 text-start ${active ? 'border-white/35' : 'border-white/10 hover:border-white/20'}`}>
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-white">{pane.name}</span><span className="text-[9px] text-[#787b86]">{pane.presentation}</span></div>
            <div className="h-32"><ResponsiveContainer width="100%" height="100%"><Chart data={pane.values}><CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/><XAxis dataKey="date" hide/><YAxis hide domain={['auto', 'auto']}/>{pane.presentation === 'bar' ? <Bar dataKey="value" fill={pane.color} opacity={0.7}/> : <Line type="monotone" dataKey="value" stroke={pane.color} dot={false} strokeWidth={1.7}/>}</Chart></ResponsiveContainer></div>
          </button>;
        })}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><button type="button" onClick={onBack} className="min-h-11 border border-white/15 px-4 text-xs font-semibold text-white hover:bg-white/[0.04]">{isAr ? 'العودة إلى البناء' : 'Return to Build'}</button><button type="button" onClick={onContinue} className="min-h-11 bg-white px-4 text-xs font-semibold text-black hover:bg-white/90">{isAr ? 'المتابعة إلى الاختبار' : 'Continue to Backtest'}</button></footer>
    </section>
  );
}
