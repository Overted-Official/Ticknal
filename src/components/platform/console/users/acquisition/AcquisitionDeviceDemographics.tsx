'use client';

import React from 'react';
import { Smartphone, Monitor, Tablet, Cpu, Layers } from '@/components/ui/icon-library';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface DevicesProps {
  devices: ConsoleAcquisitionStats['devices'];
}

export default function AcquisitionDeviceDemographics({ devices }: DevicesProps) {
  const getDeviceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return <Smartphone className="w-3.5 h-3.5 text-brand-blue" />;
    if (n.includes('tablet') || n.includes('ipad')) return <Tablet className="w-3.5 h-3.5 text-profit-num" />;
    return <Monitor className="w-3.5 h-3.5 text-text-secondary" />;
  };

  return (
    <div className="w-full h-full bg-surface-base border border-border-default rounded-none overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-blue" />
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Device & Platform Demographics
          </h4>
        </div>
        <span className="text-[10px] text-text-muted">Hardware & OS</span>
      </div>

      <div className="p-5 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
        {/* 1. Form Factor Breakdown */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            Hardware Form Factor
          </div>
          <div className="grid grid-cols-3 gap-2">
            {devices.formFactors.map((ff) => (
              <div
                key={ff.name}
                className="p-2.5 rounded-lg bg-surface-input border border-border-subtle flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  {getDeviceIcon(ff.name)}
                  <span className="text-xs font-semibold text-text-primary tabular-nums">
                    {ff.percentage}%
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-medium text-text-primary truncate">{ff.name}</div>
                  <div className="text-[10px] text-text-muted tabular-nums mt-0.5">
                    {ff.count} {ff.count === 1 ? 'user' : 'users'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Operating Systems Distribution */}
        <div className="space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            Operating Systems
          </div>
          <div className="space-y-2">
            {devices.operatingSystems.map((os) => (
              <div key={os.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">{os.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-[11px] tabular-nums">
                      {os.count} sessions
                    </span>
                    <span className="text-text-primary font-semibold tabular-nums text-xs min-w-[28px] text-right">
                      {os.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-surface-input rounded-full overflow-hidden">
                  <div
                    className="h-full bg-surface-active rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(4, os.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Client Environment (Web vs PWA / App) */}
        <div className="pt-2 border-t border-border-subtle/50 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            Client Environment
          </div>
          <div className="flex items-center justify-between text-xs">
            {devices.clientPlatforms.map((cp) => (
              <div key={cp.name} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                <span className="text-text-secondary text-[11px]">{cp.name}:</span>
                <span className="text-text-primary font-semibold tabular-nums text-xs">
                  {cp.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
