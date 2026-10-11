'use client';

import React, { useState, useMemo } from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';
import PlatformActivitySvgChart, { type PlatformActivityDataPoint } from './PlatformActivitySvgChart';
import PlatformActivityMetricsRail from './PlatformActivityMetricsRail';

interface PlatformActivityChartProps {
  activity?: ConsoleAcquisitionStats['platformActivity'];
  trendData?: ConsoleAcquisitionStats['activeUsersTrend'];
}

type Granularity = 'daily' | 'monthly' | 'hourly';

export default function AcquisitionPlatformActivityChart({
  activity,
  trendData,
}: PlatformActivityChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily');

  // 1. Resolve dataset based on selected granularity
  const currentDataset: PlatformActivityDataPoint[] = useMemo(() => {
    if (granularity === 'daily') {
      if (activity?.daily && activity.daily.length > 0) {
        return activity.daily.map((d) => ({
          key: d.date,
          label: d.label,
          sublabel: d.date,
          sessions: d.sessions,
          users: d.users,
        }));
      }
      if (trendData && trendData.length > 0) {
        return trendData.map((d) => ({
          key: d.date,
          label: d.label,
          sublabel: d.date,
          sessions: d.sessions,
          users: d.activeUsers,
        }));
      }
      return [];
    }

    if (granularity === 'monthly') {
      if (activity?.monthly && activity.monthly.length > 0) {
        return activity.monthly.map((m) => ({
          key: m.month,
          label: m.label,
          sublabel: `Month of ${m.label}`,
          sessions: m.sessions,
          users: m.users,
        }));
      }
      return [];
    }

    if (granularity === 'hourly') {
      if (activity?.hourly && activity.hourly.length > 0) {
        return activity.hourly.map((h) => ({
          key: `hour-${h.hour}`,
          label: h.label,
          sublabel: `${h.label} (${h.hour.toString().padStart(2, '0')}:00 Cairo Local / UTC+3)`,
          sessions: h.sessions,
          users: h.users,
        }));
      }
      return [];
    }

    return [];
  }, [granularity, activity, trendData]);

  // 2. Summary stats calculation for the rail
  const { maxVal, totalSessions, peakItem, avgVal, activeCount } = useMemo(() => {
    if (!currentDataset || currentDataset.length === 0) {
      return {
        maxVal: 4,
        totalSessions: 0,
        peakItem: null,
        avgVal: 0,
        activeCount: 0,
      };
    }

    const max = Math.max(...currentDataset.map((d) => d.sessions), 4);
    const total = currentDataset.reduce((acc, d) => acc + d.sessions, 0);
    const active = currentDataset.filter((d) => d.sessions > 0).length;
    const avg = active > 0 ? parseFloat((total / active).toFixed(1)) : 0;

    let peak = currentDataset[0];
    for (const item of currentDataset) {
      if (item.sessions > peak.sessions) {
        peak = item;
      }
    }

    return {
      maxVal: max,
      totalSessions: total,
      peakItem: peak,
      avgVal: avg,
      activeCount: active,
    };
  }, [currentDataset]);

  return (
    <div id="card-platform-activity" className="w-full bg-surface-base overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base shrink-0 flex-wrap">
        <div>
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Platform Activity
          </h4>
          <span className="text-[10px] text-text-muted">
            {granularity === 'daily' && 'Daily session volume progression over active timeframe'}
            {granularity === 'monthly' && 'Monthly session run-rate progression'}
            {granularity === 'hourly' && '24-hour intraday trading cycle distribution (Cairo Local / UTC+3)'}
          </span>
        </div>

        {/* Granularity Switcher: Styled with .seg-control matching UserTierBarChart */}
        <div className="seg-control seg-control-compact">
          {(['daily', 'monthly', 'hourly'] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`seg-control-btn ${granularity === g ? 'seg-control-btn-active' : ''}`}
            >
              {g === 'daily' ? 'Daily' : g === 'monthly' ? 'Monthly' : 'Time of Day'}
            </button>
          ))}
        </div>
      </div>

      {/* Body: Full-Bleed End-to-End SVG Chart and Padded Metrics Rail */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="w-full pt-4 pb-1">
          <PlatformActivitySvgChart
            dataset={currentDataset}
            granularity={granularity}
            maxVal={maxVal}
          />
        </div>

        <div className="px-5 pb-5">
          <PlatformActivityMetricsRail
            granularity={granularity}
            totalSessions={totalSessions}
            avgVal={avgVal}
            peakItem={peakItem}
            activeCount={activeCount}
            totalPointsCount={currentDataset.length}
          />
        </div>
      </div>
    </div>
  );
}
