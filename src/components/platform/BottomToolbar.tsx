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
      <div className="h-[28px] w-full bg-plt-card border-t border-plt-border-soft flex items-center justify-between px-3 select-none text-[11px] font-medium text-plt-text">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-plt-profit animate-pulse" />
            <span className="text-plt-muted">EGX Live</span>
          </div>

          <div className="h-3.5 w-px bg-plt-border-soft shrink-0" />
          <div className="flex items-center space-x-2.5">
            {RANGES.map((range) => {
              const isActive = selectedRange === range.label;
              return (
                <Link
                  key={range.label}
                  href={`?ticker=${symbol}&timeframe=${range.tf}&view=chart${replayQuery}`}
                  onClick={() => handleRangeClick(range)}
                  className={`transition-colors leading-none ${
                    isActive
                      ? 'text-plt-text font-semibold'
                      : 'text-plt-muted hover:text-plt-text'
                  }`}
                >
                  {range.label}
                </Link>
              );
            })}
          </div>

          <div className="h-3.5 w-px bg-plt-border-soft shrink-0" />

          {/* Strategy Report Button */}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 text-plt-subtle hover:text-plt-text transition-colors font-medium cursor-pointer"
            title="Open Strategy Performance Report"
          >
            <FileText size={13} className="text-plt-muted" />
            <span>Strategy Report</span>
          </button>
        </div>

        {/* Right Section: Time UTC+3 (No ADJ button) */}
        <div className="flex items-center">
          <div className="tabular-nums text-plt-muted font-mono text-[11px] leading-none">
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
