'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { LineChart, LayoutGrid } from '@/components/ui/icon-library';
import SubNavTopRail, { type SubNavTabItem } from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

interface InvestClientViewProps {
  sectorsView: React.ReactNode;
  tickersView: React.ReactNode;
  initialView?: 'sectors' | 'chart';
}

const INVEST_TABS = ['sectors', 'chart'] as const;

export default function InvestClientView({
  sectorsView,
  tickersView,
  initialView = 'sectors',
}: InvestClientViewProps) {
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

    window.history.replaceState(null, '', newUrl);
  };

  const { swipeHandlers } = useSwipeableTabs({
    tabs: INVEST_TABS,
    activeTab: currentView,
    onTabChange: setView,
  });

  const navItems: SubNavTabItem[] = [
    { label: 'Sectors', value: 'sectors', icon: LayoutGrid },
    { label: 'Tickers', value: 'chart', icon: LineChart },
  ];

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden select-none">
      {/* Mobile Top Rail */}
      <SubNavTopRail
        items={navItems}
        activeTab={currentView}
        onChange={setView}
      />

      {/* Main Tab Canvas */}
      <div {...swipeHandlers} className="flex-1 overflow-hidden relative flex flex-col min-h-0 touch-pan-y">
        <div className={`absolute inset-0 flex flex-col bg-plt-base transition-opacity duration-150 ${currentView === 'sectors' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {sectorsView}
        </div>
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-150 ${currentView === 'chart' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {tickersView}
        </div>
      </div>
    </div>
  );
}
