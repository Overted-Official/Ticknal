'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface ChartViewsProps {
  children: React.ReactNode; // The ChartReplayWorkspace + BottomToolbar
  positionsView: React.ReactNode; // The TickerPositions component
}

export default function ChartViews({ children, positionsView }: ChartViewsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentView = searchParams.get('view') || 'chart';

  const setView = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', newView);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative bg-plt-base">
      {/* Mobile Tab Rail */}
      <div className="lg:hidden flex items-center p-2 bg-plt-surface border-b border-plt-border space-x-2 shrink-0">
        <button
          onClick={() => setView('chart')}
          className={`flex-1 py-1.5 text-xs font-weight-bold rounded-tv-full transition-colors ${
            currentView === 'chart' 
              ? 'bg-plt-card border border-plt-border text-plt-text shadow-sm' 
              : 'bg-plt-surface text-plt-muted hover:text-plt-text'
          }`}
        >
          Chart
        </button>
        <button
          onClick={() => setView('positions')}
          className={`flex-1 py-1.5 text-xs font-weight-bold rounded-tv-full transition-colors ${
            currentView === 'positions' 
              ? 'bg-plt-card border border-plt-border text-plt-text shadow-sm' 
              : 'bg-plt-surface text-plt-muted hover:text-plt-text'
          }`}
        >
          Positions
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        <div className={`absolute inset-0 flex flex-col ${currentView === 'chart' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {children}
        </div>
        <div className={`absolute inset-0 flex flex-col bg-plt-base ${currentView === 'positions' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {positionsView}
        </div>
      </div>
    </div>
  );
}
