'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface BottomToolbarProps {
  symbol?: string;
  timeframe?: string;
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
  { label: '1D', tf: 'D' },
  { label: '1W', tf: 'W' },
  { label: '1M', tf: 'M' },
  { label: '1Y', tf: '1Y' },
] as const;

export default function BottomToolbar({
  symbol = 'COMI.CA',
  timeframe = 'D',
  strategy,
  companyName,
  logoUrl,
  chartData = [],
}: BottomToolbarProps) {
  const [cairoTime, setCairoTime] = useState('--:--:--');
  const [selectedRange, setSelectedRange] = useState<string>(
    timeframe === 'W' ? '1W' : timeframe === 'M' ? '1M' : timeframe === '1Y' ? '1Y' : '1D'
  );
  const searchParams = useSearchParams();
  const activeStrategy = strategy || searchParams?.get('strategy') || 'psi';

  useEffect(() => {
    if (timeframe === 'W') setSelectedRange('1W');
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
      <div className="h-[28px] shrink-0 w-full bg-black border-t border-border-subtle flex items-center justify-between px-3 select-none text-[11px] font-medium overflow-x-auto no-scrollbar font-sans">
        <div className="flex items-center gap-1 shrink-0">
          {/* Timeframe Range Switcher */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 bg-transparent">
            {RANGES.map((range) => {
              const isActive = selectedRange === range.label;
              return (
                <Link
                  key={range.label}
                  href={`?ticker=${symbol}&timeframe=${range.tf}`}
                  onClick={() => handleRangeClick(range)}
                  className={`text-[11px] px-2 sm:px-2.5 py-0.5 rounded leading-none transition-colors ${
                    isActive
                      ? 'text-white font-semibold bg-white/10'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {range.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Section: Time UTC+3 */}
        <div className="hidden sm:flex items-center shrink-0">
          <div className="tabular-nums text-text-muted font-sans text-[11px] leading-none">
            {cairoTime} UTC+3
          </div>
        </div>
      </div>
    </>
  );
}

function formatCairoTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
}
