'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LineChart, Briefcase } from 'lucide-react';
import SubNavTopRail, { type SubNavTabItem } from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

interface ChartViewsProps {
  children: React.ReactNode; // The ChartReplayWorkspace + BottomToolbar
  positionsView: React.ReactNode; // The TickerPositions component
}

const CHART_VIEWS_TABS = ['chart', 'positions'] as const;

export default function ChartViews({ children, positionsView }: ChartViewsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentView = (searchParams.get('view') === 'positions' ? 'positions' : 'chart') as 'chart' | 'positions';

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
    { label: 'Chart', value: 'chart', icon: LineChart },
    { label: 'Positions', value: 'positions', icon: Briefcase },
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
