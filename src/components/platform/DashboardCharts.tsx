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
        className="md:hidden w-full flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-plt-orange" />
          Analytics & Allocations
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div className={`grid-cols-1 gap-5 lg:grid-cols-2 ${isOpen ? 'grid mt-4 md:mt-0' : 'hidden md:grid'}`}>
        {/* Sector Distribution Donut */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-5 shadow-xl">
          <SectorDonutChart data={sectorData} />
        </div>

        {/* Monthly Investment Bar Chart */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-tight">Monthly Investment</h2>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Cost basis / mo</span>
          </div>
          <div style={{ height: 240 }}>
            <MonthlyInvestmentChart data={monthlyData} />
          </div>
        </div>
      </div>
    </div>
  );
}
