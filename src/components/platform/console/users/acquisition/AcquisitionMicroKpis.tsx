'use client';

import React from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface AcquisitionMicroKpisProps {
  microKpis: ConsoleAcquisitionStats['microKpis'];
}

export default function AcquisitionMicroKpis({ microKpis }: AcquisitionMicroKpisProps) {
  const cards = [
    {
      title: 'Total Sessions',
      value: microKpis.totalSessions.toLocaleString(),
      badgeText: `${microKpis.uniqueUsers} ${microKpis.uniqueUsers === 1 ? 'User' : 'Users'}`,
      badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      metaText: 'Tracked Sessions',
      metaClass: 'text-cold-gray-450',
    },
    {
      title: 'Primary Channel',
      value: microKpis.topChannel.name,
      badgeText: `${microKpis.topChannel.sharePct}% Share`,
      badgeClass: 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: 'Inbound Growth Source',
      metaClass: 'text-cold-gray-450',
    },
    {
      title: 'Top Governorate',
      value: microKpis.topGovernorate.name,
      badgeText: `${microKpis.topGovernorate.userCount} ${microKpis.topGovernorate.userCount === 1 ? 'User' : 'Users'}`,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      metaText: 'Cairo Metro Hub',
      metaClass: 'text-profit-num',
    },
    {
      title: 'Mobile Share',
      value: `${microKpis.mobileSharePct}%`,
      badgeText: `${microKpis.mobileSharePct}% Mobile`,
      badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      metaText: `${100 - microKpis.mobileSharePct}% Desktop`,
      metaClass: 'text-cold-gray-450',
    },
  ];

  return (
    <div className="kpi-grid-4 w-full">
      {cards.map((card) => (
        <div key={card.title} className="tv-kpi-card w-full">
          {/* Row 1: Title (left) + Badge pill (right) */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span
              className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight"
              title={card.title}
            >
              {card.title}
            </span>
            <span
              className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${card.badgeClass}`}
            >
              {card.badgeText}
            </span>
          </div>

          {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight truncate pr-2">
              {card.value}
            </span>
            <span
              className={`text-[10px] sm:text-[11px] truncate max-w-[90px] sm:max-w-[130px] text-right font-medium leading-none ${card.metaClass}`}
            >
              {card.metaText}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
