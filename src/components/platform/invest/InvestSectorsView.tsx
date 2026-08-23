'use client';

import React from 'react';
import SectorsHeatmapView from '@/components/platform/sectors/SectorsHeatmapView';

interface InvestSectorsViewProps {
  onOpenTickerChart?: (symbol: string) => void;
}

export default function InvestSectorsView({ onOpenTickerChart }: InvestSectorsViewProps) {
  return <SectorsHeatmapView onOpenTickerChart={onOpenTickerChart} />;
}
