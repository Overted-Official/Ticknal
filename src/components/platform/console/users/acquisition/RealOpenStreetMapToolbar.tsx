'use client';

import React from 'react';
import { MAP_PRESETS, type MapPresetView, type MapLayerTheme } from './map-helpers';

interface RealOpenStreetMapToolbarProps {
  activePreset: MapPresetView;
  onFlyTo: (preset: MapPresetView) => void;
  mapTheme: MapLayerTheme;
  onThemeChange: (theme: MapLayerTheme) => void;
  metricMode: 'users' | 'sessions';
  onMetricModeChange?: (mode: 'users' | 'sessions') => void;
}

export default function RealOpenStreetMapToolbar({
  activePreset,
  onFlyTo,
  mapTheme,
  onThemeChange,
  metricMode,
  onMetricModeChange,
}: RealOpenStreetMapToolbarProps) {
  const title =
    activePreset === 'cairo_metro'
      ? 'Greater Cairo Metro · District Intelligence'
      : activePreset === 'egypt'
      ? 'Egypt Governorates & Trading Hubs'
      : 'Global Geographic Footprint';

  return (
    <div className="px-5 py-3 border-b border-border-default flex flex-wrap items-center justify-between gap-3 bg-surface-base shrink-0">
      <div>
        <h3 className="text-xs font-semibold text-text-primary tracking-tight">
          {title}
        </h3>
        <p className="text-[11px] text-text-muted mt-0.5">
          Cartographic cluster overlay · Showing{' '}
          <span className="text-text-primary font-medium">
            {metricMode === 'users' ? 'unique user distribution' : 'session frequency volume'}
          </span>
        </p>
      </div>

      {/* View & Metric Controls: Styled with .seg-control matching UserTierBarChart */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Metric Mode Pill: Users vs Sessions */}
        {onMetricModeChange && (
          <div className="seg-control seg-control-compact">
            <button
              type="button"
              onClick={() => onMetricModeChange('users')}
              className={`seg-control-btn ${metricMode === 'users' ? 'seg-control-btn-active' : ''}`}
            >
              By Users
            </button>
            <button
              type="button"
              onClick={() => onMetricModeChange('sessions')}
              className={`seg-control-btn ${metricMode === 'sessions' ? 'seg-control-btn-active' : ''}`}
            >
              By Sessions
            </button>
          </div>
        )}

        {/* Map Layer Theme */}
        <div className="seg-control seg-control-compact">
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`seg-control-btn ${mapTheme === 'dark' ? 'seg-control-btn-active' : ''}`}
          >
            Dark Canvas
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('osm')}
            className={`seg-control-btn ${mapTheme === 'osm' ? 'seg-control-btn-active' : ''}`}
          >
            OSM Streets
          </button>
        </div>

        {/* Region Presets */}
        <div className="seg-control seg-control-compact">
          {(['cairo_metro', 'egypt', 'world'] as MapPresetView[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onFlyTo(preset)}
              className={`seg-control-btn ${activePreset === preset ? 'seg-control-btn-active' : ''}`}
            >
              {MAP_PRESETS[preset].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
