'use client';

import React, { useState } from 'react';
import { Copy, Check, MapPin, Target, Sparkles } from '@/components/ui/icon-library';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface GeoAudienceTableProps {
  geoData: ConsoleAcquisitionStats['geoDistribution'];
}

export default function GeoRetargetingAudienceTable({ geoData }: GeoAudienceTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyAllStatus, setCopyAllStatus] = useState(false);

  // Flatten all cities across countries and sort by user density
  const allAudienceRegions = geoData.countries.flatMap((country) =>
    country.cities.map((city) => ({
      city: city.name,
      governorate: city.region,
      country: country.name,
      countryCode: country.code,
      count: city.count,
      lat: city.lat,
      lng: city.lng,
      radiusKm: city.adRadiusKm,
    }))
  ).sort((a, b) => b.count - a.count);

  const totalUsers = allAudienceRegions.reduce((acc, r) => acc + r.count, 0) || 1;

  const handleCopySingle = (region: (typeof allAudienceRegions)[0], idx: number) => {
    const text = `${region.city}, ${region.governorate}, ${region.country} [Lat: ${region.lat.toFixed(4)}, Lng: ${region.lng.toFixed(4)}, Radius: ${region.radiusKm}km]`;
    navigator.clipboard?.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const text = allAudienceRegions
      .map(
        (r) =>
          `• ${r.city} (${r.countryCode}): ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)} · Radius: ${r.radiusKm}km (${r.count} users)`
      )
      .join('\n');
    navigator.clipboard?.writeText(text);
    setCopyAllStatus(true);
    setTimeout(() => setCopyAllStatus(false), 2000);
  };

  return (
    <div className="w-full bg-surface-base border border-border-default rounded-none overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base">
        <div className="flex items-center gap-2.5">
          <Target className="w-4 h-4 text-brand-blue" />
          <div>
            <h4 className="text-xs font-semibold text-text-primary tracking-tight">
              Ad Retargeting & Local Campaign Clusters
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              High-conviction geographic clusters formatted for Meta Ads Manager & Google Ads radius targeting
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="px-2.5 py-1 text-xs rounded-md bg-surface-raised border border-border-subtle hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
        >
          {copyAllStatus ? <Check className="w-3.5 h-3.5 text-profit-num" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
          <span>{copyAllStatus ? 'All Targets Copied!' : 'Copy All Targeting Radiuses'}</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-border-subtle/50 text-text-muted text-[10px] uppercase tracking-wider bg-surface-input/30">
              <th className="py-2.5 px-4 font-medium">Target District / City</th>
              <th className="py-2.5 px-3 font-medium">Governorate / State</th>
              <th className="py-2.5 px-3 font-medium text-right">Coordinates</th>
              <th className="py-2.5 px-3 font-medium text-center">Suggested Radius</th>
              <th className="py-2.5 px-3 font-medium text-right">User Concentration</th>
              <th className="py-2.5 px-4 font-medium text-right">Ad Export</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/30">
            {allAudienceRegions.slice(0, 8).map((region, idx) => {
              const sharePct = Math.round((region.count / totalUsers) * 100);
              const isCopied = copiedIndex === idx;

              return (
                <tr key={`${region.city}-${idx}`} className="hover:bg-surface-hover-subtle transition-colors">
                  <td className="py-2.5 px-4 font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                      <span className="font-semibold">{region.city}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-text-muted text-[11px]">
                    {region.governorate} ({region.countryCode})
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary text-[11px]">
                    {region.lat.toFixed(4)}°, {region.lng.toFixed(4)}°
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-input border border-border-subtle text-text-primary tabular-nums">
                      {region.radiusKm} km radius
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-text-primary font-semibold tabular-nums text-xs">
                        {region.count} {region.count === 1 ? 'user' : 'users'}
                      </span>
                      <span className="text-[10px] text-text-muted tabular-nums">({sharePct}%)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopySingle(region, idx)}
                      className="px-2 py-1 rounded border border-border-subtle hover:border-border-hover hover:bg-surface-raised text-[11px] text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-profit-num" />
                          <span className="text-profit-num">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-text-muted" />
                          <span>Copy</span>
                        </>
                      )}
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
