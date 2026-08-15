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
      <div className="lg:hidden flex items-center p-2 bg-black border-b border-white/[0.09] space-x-2 shrink-0">
        <button
          onClick={() => setView('chart')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
            currentView === 'chart' 
              ? 'bg-white/[0.08] border border-white/[0.14] text-white shadow-sm' 
              : 'text-white/40 hover:text-white'
          }`}
        >
          Chart
        </button>
        <button
          onClick={() => setView('positions')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
            currentView === 'positions' 
              ? 'bg-white/[0.08] border border-white/[0.14] text-white shadow-sm' 
              : 'text-white/40 hover:text-white'
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
