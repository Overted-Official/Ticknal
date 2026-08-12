'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import SectorDonutChart, { type SectorDataItem } from '@/components/platform/SectorDonutChart';
import MonthlyInvestmentChart, { type MonthlyDataItem } from '@/components/platform/MonthlyInvestmentChart';

export default function DashboardCharts({ 
  sectorData, 
  monthlyData 
}: { 
  sectorData: SectorDataItem[], 
  monthlyData: MonthlyDataItem[] 
}) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // On mobile screens, default to closed to save space.
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, []);

  return (
    <div className="mt-4 px-4 md:px-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between rounded-tv-lg border border-tv-border bg-tv-surface px-4 py-3 text-sm font-medium text-tv-text transition-colors hover:bg-tv-hover"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-tv-accent" />
          Analytics & Allocations
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div className={`grid-cols-1 gap-4 lg:grid-cols-2 ${isOpen ? 'grid mt-4 md:mt-0' : 'hidden md:grid'}`}>
        {/* Sector Distribution Donut */}
        <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-4">
          <SectorDonutChart data={sectorData} />
        </div>

        {/* Monthly Investment Bar Chart */}
        <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-weight-medium">Monthly Investment</h2>
            <span className="text-[11px] text-tv-muted">cost basis per month</span>
          </div>
          <div style={{ height: 240 }}>
            <MonthlyInvestmentChart data={monthlyData} />
          </div>
        </div>
      </div>
    </div>
  );
}
