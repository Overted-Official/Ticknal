'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from '@/components/ui/icons';
import { BarChart3 } from 'lucide-react';
import { useAlerts } from './AlertProvider';
import StrategyReportDrawer from './StrategyReportDrawer';

interface BottomToolbarProps {
  symbol?: string;
  timeframe?: string;
  replay?: boolean;
  chartData?: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export default function BottomToolbar({
  symbol = 'COMI.CA',
  timeframe = 'D',
  replay = false,
  chartData = [],
}: BottomToolbarProps) {
  const [cairoTime, setCairoTime] = useState('--:--:--');
  const [reportOpen, setReportOpen] = useState(false);
  const { isAlerted, toggleAlert } = useAlerts();

  const timeframes = ['D', 'W', 'M'];
  const replayQuery = replay ? '&replay=1' : '';
  const alertEnabled = isAlerted(symbol);

  useEffect(() => {
    const updateClock = () => setCairoTime(formatCairoTime());
    window.setTimeout(updateClock, 0);
    const intervalId = window.setInterval(() => {
      updateClock();
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const recenterChart = () => {
    window.dispatchEvent(new CustomEvent('quantegx:chart-recenter'));
  };

  return (
    <>
      <div className="h-8 w-full bg-black/60 backdrop-blur-xl border-t border-white/[0.09] flex items-center justify-between px-3 font-medium select-none text-[0.75rem] text-white">
        {/* Left Section: Timeframe Switcher, Strategy Report Button & Alert Button */}
        <div className="flex items-center space-x-2">
          {/* Segmented Timeframe Switch */}
          <div className="flex items-center bg-white/[0.02] border border-white/[0.09] rounded-md p-0.5 gap-0.5">
            {timeframes.map((tf) => (
              <Link
                key={tf}
                href={`?ticker=${symbol}&timeframe=${tf}&view=chart${replayQuery}`}
                className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-all ${
                  tf === timeframe 
                    ? 'bg-white/[0.08] text-plt-orange font-medium' 
                    : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tf}
              </Link>
            ))}
          </div>

          {/* TradingView-Style Strategy Report Button */}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.08] text-white/70 hover:text-white text-[11px] font-medium transition-all group active:scale-[0.98]"
            title="Open Strategy Performance Report & Trade Ledger"
          >
            <BarChart3 className="w-3.5 h-3.5 text-plt-orange group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Strategy Report</span>
          </button>

          <div className="h-3.5 w-px bg-white/[0.08] shrink-0" />

          {/* Bell Icon Alert */}
          <button
            type="button"
            onClick={() => toggleAlert(symbol)}
            className={`flex items-center justify-center w-6 h-6 rounded-md transition-all ${
              alertEnabled 
                ? 'text-plt-orange bg-plt-orange/15 border border-plt-orange/30' 
                : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
            }`}
            title={alertEnabled ? "Disable Alert" : "Set Price Alert"}
          >
            <Bell size={13} fill={alertEnabled ? 'currentColor' : 'none'} />
          </button>
        </div>
        
        {/* Right Section: Time & Chart Controls */}
        <div className="flex items-center space-x-3 text-white/40 font-mono text-[11px]">
          <div>{cairoTime} Cairo</div>
          <button 
            type="button" 
            onClick={recenterChart} 
            className="hover:text-white font-sans text-xs px-2 py-0.5 rounded-md hover:bg-white/[0.06] transition-colors text-white/60"
          >
            Auto
          </button>
        </div>
      </div>

      {/* Strategy Report Slide-Over Drawer */}
      <StrategyReportDrawer
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        symbol={symbol}
        chartData={chartData}
      />
    </>
  );
}

function formatCairoTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
}
