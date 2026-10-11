'use client';

import React from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface DevicesProps {
  devices: ConsoleAcquisitionStats['devices'];
}

export default function AcquisitionDeviceDemographics({ devices }: DevicesProps) {
  return (
    <div className="w-full h-full bg-surface-base overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base shrink-0">
        <div>
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Device & Platform Demographics
          </h4>
          <span className="text-[10px] text-text-muted">Hardware, OS & Client Environment</span>
        </div>
        <span className="text-[11px] text-text-muted tabular-nums">
          Client Analytics
        </span>
      </div>

      <div className="p-5 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
        {/* 1. Form Factor Breakdown */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            Hardware Form Factor
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {devices.formFactors.map((ff) => (
              <div
                key={ff.name}
                className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-primary">{ff.name}</span>
                  <span className="text-xs font-semibold text-text-primary tabular-nums">
                    {ff.percentage}%
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-text-muted tabular-nums">
                  {ff.count} {ff.count === 1 ? 'session' : 'sessions'} · {ff.userCount} {ff.userCount === 1 ? 'user' : 'users'}
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
                      {os.count} sessions · {os.userCount} {os.userCount === 1 ? 'user' : 'users'}
                    </span>
                    <span className="text-text-primary font-semibold tabular-nums text-xs min-w-[28px] text-right">
                      {os.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-surface-input rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all duration-300"
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {devices.clientPlatforms.map((cp) => (
              <div key={cp.name} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
                <span className="text-text-secondary text-[11px]">{cp.name}:</span>
                <span className="text-text-primary font-semibold tabular-nums text-xs">
                  {cp.percentage}%
                </span>
                <span className="text-text-muted text-[10.5px] tabular-nums">
                  ({cp.count} sess · {cp.userCount} {cp.userCount === 1 ? 'user' : 'users'})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
