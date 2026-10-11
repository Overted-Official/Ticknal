'use client';

import React, { useState } from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface GeoAudienceTableProps {
  geoData: ConsoleAcquisitionStats['geoDistribution'];
  metricMode?: 'users' | 'sessions';
}

export default function GeoRetargetingAudienceTable({
  geoData,
  metricMode = 'users',
}: GeoAudienceTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyAllStatus, setCopyAllStatus] = useState(false);

  // Flatten all cities across countries with explicit userCount and sessionCount
  const allAudienceRegions = geoData.countries
    .flatMap((country) =>
      country.cities.map((city) => ({
        city: city.name,
        governorate: city.region,
        country: country.name,
        countryCode: country.code,
        count: city.count,
        sessionCount: city.sessionCount || city.count || 1,
        userCount: city.userCount || 1,
        lat: city.lat,
        lng: city.lng,
        radiusKm: city.adRadiusKm,
        userProfiles: city.userProfiles || [],
      }))
    )
    .sort((a, b) => {
      if (metricMode === 'users') {
        return b.userCount - a.userCount || b.sessionCount - a.sessionCount;
      }
      return b.sessionCount - a.sessionCount || b.userCount - a.userCount;
    });

  const totalUsers = allAudienceRegions.reduce((acc, r) => acc + r.userCount, 0) || 1;
  const totalSessions = allAudienceRegions.reduce((acc, r) => acc + r.sessionCount, 0) || 1;

  const handleCopySingle = (region: (typeof allAudienceRegions)[0], idx: number) => {
    const text = `${region.city}, ${region.governorate}, ${region.country} [Lat: ${region.lat.toFixed(4)}, Lng: ${region.lng.toFixed(4)}, Radius: ${region.radiusKm}km] · ${region.userCount} unique user(s), ${region.sessionCount} sessions`;
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const text = allAudienceRegions
      .map(
        (r) =>
          `• ${r.city} (${r.countryCode}): ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)} · Radius: ${r.radiusKm}km (${r.userCount} unique user(s) · ${r.sessionCount} sessions)`
      )
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopyAllStatus(true);
    setTimeout(() => setCopyAllStatus(false), 2000);
  };

  return (
    <div className="w-full bg-surface-base overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-default flex flex-wrap items-center justify-between gap-3 bg-surface-base shrink-0">
        <div>
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Ad Retargeting & Local Campaign Clusters
          </h4>
          <p className="text-[11px] text-text-muted mt-0.5">
            Geographic parameters formatted for Meta Ads Manager & Google Ads radius targeting
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="px-3 py-1.5 text-xs rounded-lg bg-surface-input border border-border-subtle hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-sans"
        >
          {copyAllStatus ? 'All Targets Copied' : 'Copy All Targeting Radiuses'}
        </button>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-border-default text-text-muted text-[11px] bg-surface-input/20">
              <th className="py-2.5 px-4 font-medium">Target District</th>
              <th className="py-2.5 px-3 font-medium">Governorate</th>
              <th className="py-2.5 px-3 font-medium text-right">Coordinates</th>
              <th className="py-2.5 px-3 font-medium text-center">Suggested Radius</th>
              <th className={`py-2.5 px-3 font-medium text-right ${metricMode === 'users' ? 'text-brand-blue' : ''}`}>
                Unique Users
              </th>
              <th className={`py-2.5 px-3 font-medium text-right ${metricMode === 'sessions' ? 'text-brand-blue' : ''}`}>
                Total Sessions
              </th>
              <th className="py-2.5 px-4 font-medium text-right">Export</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/60">
            {allAudienceRegions.slice(0, 10).map((region, idx) => {
              const userSharePct = Math.round((region.userCount / totalUsers) * 100);
              const sessionSharePct = Math.round((region.sessionCount / totalSessions) * 100);
              const isCopied = copiedIndex === idx;

              return (
                <tr key={`${region.city}-${idx}`} className="hover:bg-surface-active/20 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-text-primary">
                    {region.city}
                  </td>
                  <td className="py-2.5 px-3 text-text-muted text-[11px]">
                    {region.governorate} ({region.countryCode})
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary text-[11px]">
                    {region.lat.toFixed(4)}°, {region.lng.toFixed(4)}°
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-input border border-border-subtle text-text-secondary tabular-nums">
                      {region.radiusKm} km radius
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`tabular-nums text-xs ${metricMode === 'users' ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {region.userCount} {region.userCount === 1 ? 'user' : 'users'}
                      </span>
                      <span className="text-[10px] text-text-muted tabular-nums">({userSharePct}%)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`tabular-nums text-xs ${metricMode === 'sessions' ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {region.sessionCount} sessions
                      </span>
                      <span className="text-[10px] text-text-muted tabular-nums">({sessionSharePct}%)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopySingle(region, idx)}
                      className="px-2.5 py-1 rounded-md border border-border-subtle hover:border-border-hover hover:bg-surface-raised text-[11px] text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 cursor-pointer font-sans"
                    >
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
