'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';
import InlineSpinner from '@/components/ui/InlineSpinner';

interface GeoMapProps {
  geoData: ConsoleAcquisitionStats['geoDistribution'];
  onSelectRegion?: (regionName: string) => void;
  metricMode?: 'users' | 'sessions';
  onMetricModeChange?: (mode: 'users' | 'sessions') => void;
}

// Dynamically import RealOpenStreetMap with SSR disabled to prevent Leaflet window reference errors
const RealOpenStreetMap = dynamic(
  () => import('./RealOpenStreetMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full bg-surface-base overflow-hidden relative font-sans flex items-center justify-center aspect-[16/9] min-h-[460px]">
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <InlineSpinner className="w-5 h-5" />
          <span className="text-xs font-sans">Loading OpenStreetMap cartography...</span>
        </div>
      </div>
    ),
  }
);

export default function AcquisitionGeoMap({
  geoData,
  onSelectRegion,
  metricMode = 'users',
  onMetricModeChange,
}: GeoMapProps) {
  return (
    <RealOpenStreetMap
      geoData={geoData}
      onSelectRegion={onSelectRegion}
      metricMode={metricMode}
      onMetricModeChange={onMetricModeChange}
    />
  );
}
