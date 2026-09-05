'use client';

import React, { useState } from 'react';
import { ChevronDown, Zap, ShieldAlert } from '@/components/ui/icon-library';
import OpportunityTable, { type Opportunity } from '@/components/platform/OpportunityTable';

interface DashboardSignalsCardProps {
  buyOpportunities: Opportunity[];
  exitSignals: Opportunity[];
  isLoadingBuyOpportunities?: boolean;
}

export default function DashboardSignalsCard({
  buyOpportunities,
  exitSignals,
  isLoadingBuyOpportunities = false,
}: DashboardSignalsCardProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'exit'>('buy');
  const [isExpandedMobile, setIsExpandedMobile] = useState(true);

  const currentOpportunities = activeTab === 'buy' ? buyOpportunities : exitSignals;
  const emptyText = activeTab === 'buy'
    ? isLoadingBuyOpportunities
      ? 'Scanning live market opportunities...'
      : 'No buy opportunities in the last 5 bars'
    : 'No exit signals in the last 5 bars';

  return (
    <div className="card-widget select-none flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-3 border-b border-plt-border-soft cursor-pointer md:cursor-default"
        onClick={() => setIsExpandedMobile(!isExpandedMobile)}
      >
        <div>
          <h2 className="widget-title flex items-center gap-2">
            Market Signals & Alerts
            <span className="md:hidden text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-plt-hover text-plt-muted font-sans font-normal">
              {currentOpportunities.length}
            </span>
          </h2>
          <p className="widget-subtitle mt-0.5">
            Real-time algorithmic Buy triggers and Exit risk alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Tab Switcher */}
          <div className="pill-switch" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveTab('buy')}
              className={`pill-switch-btn text-[11px] gap-1.5 ${activeTab === 'buy' ? 'pill-switch-btn-active text-plt-profit' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'buy' ? 'bg-plt-profit' : 'bg-plt-muted'}`} />
              <span>Buy ({isLoadingBuyOpportunities && buyOpportunities.length === 0 ? '...' : buyOpportunities.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('exit')}
              className={`pill-switch-btn text-[11px] gap-1.5 ${activeTab === 'exit' ? 'pill-switch-btn-active text-plt-risk' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'exit' ? 'bg-plt-risk' : 'bg-plt-muted'}`} />
              <span>Exit ({exitSignals.length})</span>
            </button>
          </div>

          <button
            type="button"
            className="md:hidden p-1 text-plt-muted hover:text-plt-text"
            aria-label="Toggle signals"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpandedMobile ? 'rotate-180 text-plt-text' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className={`${isExpandedMobile ? 'block' : 'hidden'} md:flex flex-col flex-1 min-h-0 overflow-hidden pt-2`}>
        <OpportunityTable
          opportunities={currentOpportunities}
          emptyText={emptyText}
          compact
          showFilter={false}
        />
      </div>
    </div>
  );
}
