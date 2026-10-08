'use client';

import React, { useState } from 'react';
import {
  Globe,
  Calendar,
  Share2,
  Smartphone,
  MapPin,
  Sparkles,
  ChevronDown,
} from '@/components/ui/icon-library';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';
import { getAcquisitionStatsAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import AcquisitionGeoMap from './AcquisitionGeoMap';
import GeoRetargetingAudienceTable from './GeoRetargetingAudienceTable';
import AcquisitionChannelsChart from './AcquisitionChannelsChart';
import AcquisitionDeviceDemographics from './AcquisitionDeviceDemographics';
import AcquisitionActiveUsersChart from './AcquisitionActiveUsersChart';

interface AcquisitionSectionProps {
  initialStats: ConsoleAcquisitionStats;
}

type TimeframeOption = '30d' | '90d' | '120d' | 'ytd' | 'custom';

export default function ConsoleUserAcquisitionSection({ initialStats }: AcquisitionSectionProps) {
  const [stats, setStats] = useState<ConsoleAcquisitionStats>(initialStats);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleTimeframeChange = async (tf: TimeframeOption, cStart?: string, cEnd?: string) => {
    setTimeframe(tf);
    if (tf === 'custom' && (!cStart || !cEnd)) {
      setShowCustomPicker(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await getAcquisitionStatsAction({
        timeframe: tf,
        customStart: cStart || customStart,
        customEnd: cEnd || customEnd,
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

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return;
    setShowCustomPicker(false);
    handleTimeframeChange('custom', customStart, customEnd);
  };

  return (
    <section id="section-acquisition-intelligence" className="w-full space-y-6 font-sans">
      {/* 1. Section Header & Timeframe Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border-default/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wider text-text-primary uppercase font-sans">
              Acquisition & Growth Intelligence
            </h2>
            {isLoading && <InlineSpinner className="w-3.5 h-3.5 text-brand-blue" />}
          </div>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Multi-touch attribution, geographic governorate concentrations, hardware demographics, and daily trading cycles.
          </p>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-input border border-border-subtle">
            {(['30d', '90d', '120d', 'ytd'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer font-sans ${
                  timeframe === tf
                    ? 'bg-surface-active text-text-primary font-medium shadow-xs'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomPicker((prev) => !prev)}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer font-sans flex items-center gap-1 ${
                timeframe === 'custom'
                  ? 'bg-surface-active text-text-primary font-medium shadow-xs'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span>Custom</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Popover */}
      {showCustomPicker && (
        <div className="p-4 rounded-lg bg-surface-input border border-border-default flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-surface-base border border-border-subtle rounded px-2.5 py-1 text-text-primary focus:outline-none focus:border-border-hover text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-surface-base border border-border-subtle rounded px-2.5 py-1 text-text-primary focus:outline-none focus:border-border-hover text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustomRange}
            disabled={!customStart || !customEnd}
            className="px-3 py-1 rounded bg-white text-black font-semibold hover:bg-cold-gray-150 transition-colors disabled:opacity-40 cursor-pointer text-xs"
          >
            Apply Range
          </button>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="px-2 py-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 2. Micro-KPI Metric Strips (4 Highlight Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-surface-base border border-border-default rounded-none flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Total Tracked Sessions</span>
            <Globe className="w-3.5 h-3.5 text-brand-blue" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold text-text-primary tabular-nums">
              {stats.microKpis.totalSessions.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-muted tabular-nums mt-0.5">
              {stats.microKpis.uniqueUsers} unique devices
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-surface-base border border-border-default rounded-none flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Primary Growth Channel</span>
            <Share2 className="w-3.5 h-3.5 text-brand-blue" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold text-text-primary truncate">
              {stats.microKpis.topChannel.name}
            </div>
            <div className="text-[10px] text-text-muted tabular-nums mt-0.5">
              {stats.microKpis.topChannel.sharePct}% of inbound traffic
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-surface-base border border-border-default rounded-none flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Top Governorate Hub</span>
            <MapPin className="w-3.5 h-3.5 text-profit-num" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold text-text-primary truncate">
              {stats.microKpis.topGovernorate.name}
            </div>
            <div className="text-[10px] text-text-muted tabular-nums mt-0.5">
              {stats.microKpis.topGovernorate.userCount} active traders
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-surface-base border border-border-default rounded-none flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Mobile Platform Share</span>
            <Smartphone className="w-3.5 h-3.5 text-profit-num" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold text-text-primary tabular-nums">
              {stats.microKpis.mobileSharePct}%
            </div>
            <div className="text-[10px] text-text-muted tabular-nums mt-0.5">
              Mobile first vs {100 - stats.microKpis.mobileSharePct}% desktop
            </div>
          </div>
        </div>
      </div>

      {/* 3. Zone 1: Geolocation Drilldown Map & Ad Retargeting Clusters */}
      <div className="space-y-4">
        <AcquisitionGeoMap geoData={stats.geoDistribution} />
        <GeoRetargetingAudienceTable geoData={stats.geoDistribution} />
      </div>

      {/* 4. Zone 2: Channels, Hardware Demographics, and Active Users Trend (3 Responsive Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="h-full">
          <AcquisitionChannelsChart channels={stats.channels} />
        </div>
        <div className="h-full">
          <AcquisitionDeviceDemographics devices={stats.devices} />
        </div>
        <div className="h-full">
          <AcquisitionActiveUsersChart trendData={stats.activeUsersTrend} />
        </div>
      </div>
    </section>
  );
}
