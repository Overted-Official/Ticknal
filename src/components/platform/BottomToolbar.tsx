'use client';

import { useEffect, useState } from 'react';

export default function BottomToolbar() {
  const [utcTime, setUtcTime] = useState('--:--:--');

  useEffect(() => {
    const updateClock = () => setUtcTime(formatUtcTime());
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
        <div>{utcTime} UTC</div>
        <button type="button" onClick={recenterChart} className="hover:text-tv-text transition-colors">Auto</button>
      </div>
    </div>
  );
}

function formatUtcTime(): string {
  const now = new Date();
  return now.toISOString().slice(11, 19);
}
