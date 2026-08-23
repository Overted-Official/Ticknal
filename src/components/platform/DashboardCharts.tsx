'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BarChart2 } from '@/components/ui/icon-library';
import SectorDonutChart, { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import MonthlyInvestmentChart, { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';

export default function DashboardCharts({
  sectorData,
  monthlyData
}: {
  sectorData: SectorDataItem[];
  monthlyData: MonthlyDataItem[];
}) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // On mobile screens, default to closed to save space.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, []);

  return (
    <div className="w-full select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between rounded-xl bg-plt-card border border-plt-border-soft px-4 py-2.5 text-xs font-semibold text-plt-text transition-colors mb-3 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="text-plt-muted" size={12} />
          <span>Analytics & Allocations</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isOpen ? 'grid' : 'hidden md:grid'}`}>
        {/* Sector Distribution Donut */}
        <div className="card-widget h-full flex flex-col justify-between">
          <SectorDonutChart data={sectorData} />
        </div>

        {/* Monthly Investment Bar Chart */}
        <div className="card-widget h-full flex flex-col justify-between">
          <MonthlyInvestmentChart data={monthlyData} />
        </div>
      </div>
    </div>
  );
}
