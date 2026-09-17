'use client';

import React from 'react';
import SectorsHeatmapView from '@/components/platform/sectors/SectorsHeatmapView';

export interface InvestSectorsPageViewProps {
  onOpenTickerChart?: (symbol: string) => void;
}

export default function InvestSectorsPageView({ onOpenTickerChart }: InvestSectorsPageViewProps) {
  return (
    <div className="w-full h-full min-w-0 relative flex-1 flex flex-col overflow-hidden">
      <SectorsHeatmapView onOpenTickerChart={onOpenTickerChart} />
    </div>
  );
}
