'use client';

import React from 'react';
import PageHeader from '@/components/platform/ui/PageHeader';

interface NetWorthHeaderProps {
  currencyMode: 'EGP' | 'USD';
  onCurrencyModeChange: (mode: 'EGP' | 'USD') => void;
}

export default function NetWorthHeader({
  currencyMode,
  onCurrencyModeChange,
}: NetWorthHeaderProps) {
  return (
    <PageHeader
      title="Net Worth & Inflation"
      description="Total wealth, asset allocation, and inflation-adjusted purchasing power."
      actions={(
        <>
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
        </>
      )}
    />
  );
}
