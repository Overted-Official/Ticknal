'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from '@/components/ui/icons';
import { useAlerts } from './AlertProvider';

interface BottomToolbarProps {
  symbol?: string;
  timeframe?: string;
  replay?: boolean;
}

export default function BottomToolbar({
  symbol = 'COMI.CA',
  timeframe = 'D',
  replay = false
}: BottomToolbarProps) {
  const [cairoTime, setCairoTime] = useState('--:--:--');
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
    <div className="h-8 w-full bg-[#0e0e0e] border-t border-white/[0.08] flex items-center justify-between px-3 font-medium select-none text-[0.75rem] text-white">
      {/* Left Section: Timeframe Switcher & Alert Button (replacing EGX) */}
      <div className="flex items-center space-x-2">
        {/* Segmented Timeframe Switch */}
        <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-lg p-0.5">
          {timeframes.map((tf) => (
            <Link
              key={tf}
              href={`?ticker=${symbol}&timeframe=${tf}${replayQuery}`}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                tf === timeframe 
                  ? 'bg-white/[0.1] text-plt-orange shadow-sm' 
                  : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tf}
            </Link>
          ))}
        </div>

        <div className="h-3.5 w-px bg-white/[0.08] shrink-0" />

        {/* Bell Icon Alert */}
        <button
          type="button"
          onClick={() => toggleAlert(symbol)}
          className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all ${
            alertEnabled 
              ? 'text-plt-orange bg-plt-orange/15 border border-plt-orange/30 shadow-[0_0_8px_rgba(255,100,13,0.2)]' 
              : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
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
          className="hover:text-white font-sans text-xs px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-colors"
        >
          Auto
        </button>
      </div>
    </div>
  );
}

function formatCairoTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
}
