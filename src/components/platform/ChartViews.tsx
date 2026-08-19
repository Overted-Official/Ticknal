'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LineChart, LayoutGrid } from 'lucide-react';
import SubNavTopRail, { type SubNavTabItem } from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

interface ChartViewsProps {
  children: React.ReactNode; // The ChartReplayWorkspace + BottomToolbar (Tickers view)
  sectorsView?: React.ReactNode; // The SectorsHeatmapView component
  rightSidebar?: React.ReactNode; // The RightSidebar component
  initialView?: 'sectors' | 'chart';
}

const CHART_VIEWS_TABS = ['sectors', 'chart'] as const;

export default function ChartViews({ children, sectorsView, rightSidebar, initialView = 'sectors' }: ChartViewsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const rawView = searchParams.get('view');
  const initialResolvedView = (rawView === 'chart' ? 'chart' : initialView) as 'sectors' | 'chart';
  
  const [currentView, setCurrentView] = useState<'sectors' | 'chart'>(initialResolvedView);
  const [hasVisitedSectors, setHasVisitedSectors] = useState<boolean>(initialResolvedView === 'sectors');

  useEffect(() => {
    if (rawView === 'chart' || rawView === 'sectors') {
      setCurrentView(rawView);
      if (rawView === 'sectors') setHasVisitedSectors(true);
    }
  }, [rawView]);

  const setView = (newView: string) => {
    const validView = newView === 'chart' ? 'chart' : 'sectors';
    setCurrentView(validView);
    if (validView === 'sectors') setHasVisitedSectors(true);

    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('view', validView);
    const newUrl = `${pathname}?${params.toString()}`;
    
    // Shallow URL update to keep URL in sync without triggering full Next.js server component reload
    window.history.replaceState(null, '', newUrl);
  };

  const { swipeHandlers } = useSwipeableTabs({
    tabs: CHART_VIEWS_TABS,
    activeTab: currentView,
    onTabChange: setView,
  });

  const navItems: SubNavTabItem[] = [
    { label: 'Sectors', value: 'sectors', icon: LayoutGrid },
    { label: 'Tickers', value: 'chart', icon: LineChart },
  ];

  return (
    <div className="flex-1 h-full w-full flex flex-row bg-plt-base text-plt-text overflow-hidden">
      <div {...swipeHandlers} className="flex-1 flex flex-col min-w-0 relative bg-plt-base h-full overflow-hidden touch-pan-y">
        {/* Standardized Mobile SubNav Top Rail */}
        <SubNavTopRail
          items={navItems}
          activeTab={currentView}
          onChange={setView}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
          <div className={`absolute inset-0 flex flex-col bg-plt-base transition-opacity duration-150 ${currentView === 'sectors' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
            {hasVisitedSectors ? sectorsView : null}
          </div>
          <div className={`absolute inset-0 flex flex-col transition-opacity duration-150 ${currentView === 'chart' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Right Sidebar - preserved in DOM and shown when on chart view */}
      {rightSidebar && (
        <div className={`hidden lg:flex h-full shrink-0 transition-opacity duration-150 ${currentView === 'chart' ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 overflow-hidden'}`}>
          {rightSidebar}
        </div>
      )}
    </div>
  );
}
