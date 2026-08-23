'use client';

import React from 'react';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';

interface NetWorthHeaderProps {
  currencyMode: 'EGP' | 'USD';
  onCurrencyModeChange: (mode: 'EGP' | 'USD') => void;
}

export default function NetWorthHeader({
  currencyMode,
  onCurrencyModeChange,
}: NetWorthHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-plt-border-soft select-none">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-white/60" />
          <h1 className="page-title">
            Net Worth & Inflation
          </h1>
        </div>
        <p className="page-subtitle">
          Total wealth aggregation & currency-weighted inflation deflator
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <PrivacyToggleButton />

        <div className="pill-switch">
          <button
            type="button"
            onClick={() => onCurrencyModeChange('EGP')}
            className={`pill-switch-btn ${
              currencyMode === 'EGP' ? 'pill-switch-btn-active font-semibold' : ''
            }`}
          >
            EGP (£)
          </button>
          <button
            type="button"
            onClick={() => onCurrencyModeChange('USD')}
            className={`pill-switch-btn ${
              currencyMode === 'USD' ? 'pill-switch-btn-active font-semibold' : ''
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>
    </div>
  );
}
