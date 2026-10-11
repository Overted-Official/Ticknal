'use client';

import React, { useState } from 'react';

export type TimeframeOption = '30d' | '90d' | '120d' | 'ytd' | 'custom';

interface AcquisitionTimeframeToolbarProps {
  timeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption, customStart?: string, customEnd?: string) => void;
}

export default function AcquisitionTimeframeToolbar({
  timeframe,
  onTimeframeChange,
}: AcquisitionTimeframeToolbarProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const options: TimeframeOption[] = ['30d', '90d', '120d', 'ytd'];

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    setShowCustomPicker(false);
    onTimeframeChange('custom', customStart, customEnd);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Segmented Control matching UserTierBarChart */}
      <div className="seg-control seg-control-compact">
        {options.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => {
              setShowCustomPicker(false);
              onTimeframeChange(tf);
            }}
            className={`seg-control-btn ${timeframe === tf ? 'seg-control-btn-active' : ''}`}
          >
            {tf.toUpperCase()}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowCustomPicker((prev) => !prev)}
          className={`seg-control-btn ${timeframe === 'custom' ? 'seg-control-btn-active' : ''}`}
        >
          Custom
        </button>
      </div>

      {/* Custom Date Range Popover */}
      {showCustomPicker && (
        <div className="p-3 bg-surface-raised border border-border-subtle rounded-xl flex flex-wrap items-center gap-3 text-xs shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[11px]">Start:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-surface-input border border-border-subtle rounded-lg px-2.5 py-1 text-text-primary focus:outline-none focus:border-border-hover text-xs tabular-nums"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[11px]">End:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-surface-input border border-border-subtle rounded-lg px-2.5 py-1 text-text-primary focus:outline-none focus:border-border-hover text-xs tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={!customStart || !customEnd}
            className="px-3 py-1 rounded-lg bg-white text-black font-semibold hover:bg-cold-gray-150 transition-colors disabled:opacity-40 cursor-pointer text-xs"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="px-2.5 py-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
