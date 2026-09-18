'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText } from '@/components/ui/icon-library';
import StrategyReportDrawer from './StrategyReportDrawer';

interface BottomToolbarProps {
  symbol?: string;
  timeframe?: string;
  replay?: boolean;
  strategy?: string;
  companyName?: string;
  logoUrl?: string | null;
  chartData?: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

const RANGES = [
  { label: '1H', tf: '1H' },
  { label: '1D', tf: 'D' },
  { label: '1W', tf: 'W' },
  { label: '1M', tf: 'M' },
  { label: '1Y', tf: '1Y' },
] as const;

export default function BottomToolbar({
  symbol = 'COMI.CA',
  timeframe = 'D',
  replay = false,
  strategy,
  companyName,
  logoUrl,
  chartData = [],
}: BottomToolbarProps) {
  const [cairoTime, setCairoTime] = useState('--:--:--');
  const [selectedRange, setSelectedRange] = useState<string>(
    timeframe === '1H' || timeframe === '60' ? '1H' : timeframe === 'W' ? '1W' : timeframe === 'M' ? '1M' : timeframe === '1Y' ? '1Y' : '1D'
  );
  const [reportOpen, setReportOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeStrategy = strategy || searchParams?.get('strategy') || 'psi';
  const replayQuery = replay ? '&replay=1' : '';

  useEffect(() => {
    if (timeframe === '1H' || timeframe === '60') setSelectedRange('1H');
    else if (timeframe === 'W') setSelectedRange('1W');
    else if (timeframe === 'M') setSelectedRange('1M');
    else if (timeframe === '1Y') setSelectedRange('1Y');
    else setSelectedRange('1D');
  }, [timeframe]);

  useEffect(() => {
    const updateClock = () => setCairoTime(formatCairoTime());
    window.setTimeout(updateClock, 0);
    const intervalId = window.setInterval(() => {
      updateClock();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleRangeClick = (range: typeof RANGES[number]) => {
    setSelectedRange(range.label);
    window.dispatchEvent(
      new CustomEvent('ticknal:set-range', {
        detail: { range: range.label, timeframe: range.tf },
      })
    );
    window.dispatchEvent(
      new CustomEvent('quantegx:set-range', {
        detail: { range: range.label, timeframe: range.tf },
      })
    );
  };

  return (
    <>
      {/* tv-design §1: bg-[#0d0d0d] border-t border-[#1e222d] */}
      <div className="h-[28px] shrink-0 w-full bg-[#0d0d0d] border-t border-[#1e222d] flex items-center justify-between px-3 select-none text-[11px] font-medium">
        <div className="flex items-center gap-3">
          {/* EGX Live dot — keep green pulse */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-pulse" />
            <span className="text-[#787b86]">EGX Live</span>
          </div>

          <div className="h-3.5 w-px bg-[#1e222d] shrink-0" />

          {/* tv-design §6: pill switcher track */}
          <div className="inline-flex items-center gap-0.5">
            {RANGES.map((range) => {
              const isActive = selectedRange === range.label;
              return (
                <Link
                  key={range.label}
                  href={`?ticker=${symbol}&timeframe=${range.tf}&view=chart${replayQuery}`}
                  onClick={() => handleRangeClick(range)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors leading-none ${
                    isActive
                      ? 'bg-[#2a2e39] text-white font-bold'
                      : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                  }`}
                >
                  {range.label}
                </Link>
              );
            })}
          </div>

          <div className="h-3.5 w-px bg-[#1e222d] shrink-0" />

          {/* Strategy Report Button */}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 text-[#787b86] hover:text-white transition-colors btn-typography cursor-pointer"
            title="Open Strategy Performance Report"
          >
            <FileText size={13} className="text-[#787b86]" />
            <span>Strategy Report</span>
          </button>
        </div>

        {/* Right Section: Time UTC+3 */}
        <div className="flex items-center">
          <div className="tabular-nums text-[#787b86] font-mono text-[11px] leading-none">
            {cairoTime} UTC+3
          </div>
        </div>
      </div>

      {/* Strategy Report Slide-Over Drawer */}
      <StrategyReportDrawer
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        symbol={symbol}
        timeframe={timeframe}
        chartData={chartData}
        activeStrategy={activeStrategy}
        companyName={companyName}
        logoUrl={logoUrl}
      />
    </>
  );
}

function formatCairoTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
}
