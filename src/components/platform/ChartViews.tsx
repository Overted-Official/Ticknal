'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LineChart, LayoutGrid } from 'lucide-react';
import SubNavTopRail, { type SubNavTabItem } from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

interface ChartViewsProps {
  children: React.ReactNode; // The ChartReplayWorkspace + BottomToolbar (Tickers view)
  sectorsView?: React.ReactNode; // The SectorsHeatmapView component
}

const CHART_VIEWS_TABS = ['sectors', 'chart'] as const;

export default function ChartViews({ children, sectorsView }: ChartViewsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const rawView = searchParams.get('view');
  // Default to 'sectors' unless view=chart is explicitly set or if a ticker query exists
  const currentView = (rawView === 'chart' ? 'chart' : 'sectors') as 'sectors' | 'chart';

  const setView = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', newView);
    router.push(`${pathname}?${params.toString()}`);
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
    <div {...swipeHandlers} className="flex-1 flex flex-col min-w-0 relative bg-plt-base h-full overflow-hidden touch-pan-y">
      {/* Standardized Mobile SubNav Top Rail */}
      <SubNavTopRail
        items={navItems}
        activeTab={currentView}
        onChange={setView}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        <div className={`absolute inset-0 flex flex-col bg-plt-base ${currentView === 'sectors' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {sectorsView}
        </div>
        <div className={`absolute inset-0 flex flex-col ${currentView === 'chart' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
