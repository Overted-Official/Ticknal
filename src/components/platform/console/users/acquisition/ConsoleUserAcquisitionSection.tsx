'use client';

import React, { useState } from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';
import { getAcquisitionStatsAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import AcquisitionTimeframeToolbar, { type TimeframeOption } from './AcquisitionTimeframeToolbar';
import AcquisitionMicroKpis from './AcquisitionMicroKpis';
import AcquisitionGeoMap from './AcquisitionGeoMap';
import GeoRetargetingAudienceTable from './GeoRetargetingAudienceTable';
import AcquisitionChannelsChart from './AcquisitionChannelsChart';
import AcquisitionDeviceDemographics from './AcquisitionDeviceDemographics';
import AcquisitionPlatformActivityChart from './AcquisitionPlatformActivityChart';

interface AcquisitionSectionProps {
  initialStats: ConsoleAcquisitionStats;
}

export default function ConsoleUserAcquisitionSection({ initialStats }: AcquisitionSectionProps) {
  const [stats, setStats] = useState<ConsoleAcquisitionStats>(initialStats);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [metricMode, setMetricMode] = useState<'users' | 'sessions'>('users');
  const [isLoading, setIsLoading] = useState(false);

  const handleTimeframeChange = async (tf: TimeframeOption, customStart?: string, customEnd?: string) => {
    setTimeframe(tf);
    setIsLoading(true);
    try {
      const res = await getAcquisitionStatsAction({
        timeframe: tf,
        customStart,
        customEnd,
      });
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to update acquisition stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="section-acquisition-intelligence" className="section-container space-y-4">
      {/* 1. Standard Section Header matching Sections 1 & 2 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Acquisition & Growth Intelligence</h2>
            {isLoading && <InlineSpinner className="w-3.5 h-3.5 text-brand-blue" />}
          </div>
          <p className="section-subtitle">
            Multi-touch attribution, geographic governorate concentrations, hardware demographics, and daily trading cycles
          </p>
        </div>

        {/* Timeframe Switcher Toolbar */}
        <AcquisitionTimeframeToolbar
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
        />
      </div>

      {/* 2. Micro-KPI Metrics Strip (4 canonical tv-kpi-cards) */}
      <AcquisitionMicroKpis microKpis={stats.microKpis} />

      {/* 3. Zone 1: Geolocation Cartography & Audience Retargeting Table */}
      <div className="space-y-4 pt-2">
        <AcquisitionGeoMap
          geoData={stats.geoDistribution}
          metricMode={metricMode}
          onMetricModeChange={setMetricMode}
        />
        <GeoRetargetingAudienceTable
          geoData={stats.geoDistribution}
          metricMode={metricMode}
        />
      </div>

      {/* 4. Zone 2: Channels & Hardware Demographics (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch pt-2">
        <div className="h-full">
          <AcquisitionChannelsChart channels={stats.channels} />
        </div>
        <div className="h-full">
          <AcquisitionDeviceDemographics devices={stats.devices} />
        </div>
      </div>

      {/* 5. Zone 3: Platform Activity (Dedicated Separate Full-Width Row) */}
      <div className="w-full pt-2">
        <AcquisitionPlatformActivityChart
          activity={stats.platformActivity}
          trendData={stats.activeUsersTrend}
        />
      </div>
    </section>
  );
}
