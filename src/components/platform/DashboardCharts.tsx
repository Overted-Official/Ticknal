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
    <div className="w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-full flex items-center justify-between rounded-full glass-pill px-4 py-2.5 text-sm font-medium text-white transition-colors mb-2"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-plt-orange" />
          Analytics & Allocations
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div className={`grid-cols-1 gap-2 lg:grid-cols-2 ${isOpen ? 'grid' : 'hidden md:grid'}`}>
        {/* Sector Distribution Donut */}
        <div className="glass-panel rounded-xl p-6 shadow-xl">
          <SectorDonutChart data={sectorData} />
        </div>

        {/* Monthly Investment Bar Chart */}
        <div className="glass-panel rounded-xl p-6 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white tracking-[-0.02em]">Monthly Investment</h2>
            <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-white/40 font-mono">Cost basis / mo</span>
          </div>
          <div style={{ height: 240 }}>
            <MonthlyInvestmentChart data={monthlyData} />
          </div>
        </div>
      </div>
    </div>
  );
}
