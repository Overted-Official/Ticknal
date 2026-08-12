'use client';

import { useEffect, useState } from 'react';

export default function BottomToolbar() {
  const [cairoTime, setCairoTime] = useState('--:--:--');

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
    <div className="h-8 w-full bg-tv-base border-t border-tv-border flex items-center justify-between px-4 font-weight-medium select-none text-[0.75rem]">
      <div className="text-tv-muted">EGX</div>
      
      <div className="flex items-center space-x-4 text-tv-muted">
        <div>{cairoTime} Cairo</div>
        <button type="button" onClick={recenterChart} className="hover:text-tv-text transition-colors">Auto</button>
      </div>
    </div>
  );
}

function formatCairoTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
}
