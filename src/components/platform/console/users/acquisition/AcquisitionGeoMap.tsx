'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geoMercator } from 'd3-geo';
import { Globe, ZoomIn, ZoomOut, RotateCcw, MapPin, ChevronRight, Layers, Target } from '@/components/ui/icon-library';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface GeoMapProps {
  geoData: ConsoleAcquisitionStats['geoDistribution'];
  onSelectRegion?: (regionName: string) => void;
}

// Simplified continent vector polygons for clean dark terminal background
const WORLD_CONTINENTS_SVG_PATHS = [
  // North America
  'M 120,80 L 160,70 L 220,85 L 250,120 L 220,180 L 180,210 L 140,160 Z',
  // South America
  'M 230,230 L 280,240 L 290,310 L 260,370 L 230,330 L 220,260 Z',
  // Europe
  'M 390,70 L 460,65 L 480,110 L 420,130 L 380,100 Z',
  // Africa
  'M 390,150 L 480,150 L 510,240 L 470,330 L 430,320 L 390,230 Z',
  // Asia
  'M 490,70 L 680,60 L 730,140 L 670,220 L 550,210 L 490,140 Z',
  // Australia
  'M 650,270 L 730,275 L 720,340 L 640,330 Z',
];

type MapViewMode = 'world' | 'egypt' | 'cairo_metro';

// Stylized silhouette of Egypt (Mediterranean North, Sinai East, Red Sea Coast, Western Desert)
const EGYPT_BOUNDS_SVG_PATH =
  'M 200,60 L 350,55 L 450,50 L 530,52 L 600,75 L 610,120 L 560,180 L 520,170 L 560,250 L 540,340 L 450,370 L 200,370 L 200,60 Z';

// Stylized silhouette of Greater Cairo Metro (Giza West, Central Nile, Tagamoa East)
const CAIRO_METRO_BOUNDS_SVG_PATH =
  'M 140,160 L 250,135 L 410,130 L 530,140 L 650,180 L 640,290 L 500,320 L 340,325 L 145,295 Z';

export default function AcquisitionGeoMap({ geoData, onSelectRegion }: GeoMapProps) {
  const [viewMode, setViewMode] = useState<MapViewMode>('world');
  const [hoveredLocation, setHoveredLocation] = useState<{
    name: string;
    region?: string;
    count: number;
    sharePct: number;
    topChannel?: string;
    coords: string;
    radiusKm?: number;
    x: number;
    y: number;
  } | null>(null);

  const totalUsersAcrossGeo = useMemo(() => {
    return geoData.countries.reduce((acc, c) => acc + c.count, 0) || 1;
  }, [geoData]);

  // World projection (800x420)
  const worldProjection = useMemo(() => {
    return geoMercator().scale(110).translate([400, 240]);
  }, []);

  // Egypt national projection (800x420)
  const egyptProjection = useMemo(() => {
    return geoMercator().center([30.8, 27.0]).scale(2200).translate([400, 220]);
  }, []);

  // Greater Cairo Metro projection (zoomed in tightly on 29.8°-30.2°N and 30.8°-31.6°E)
  const cairoMetroProjection = useMemo(() => {
    return geoMercator().center([31.24, 30.04]).scale(36000).translate([400, 215]);
  }, []);

  // Egyptian country node
  const egyptCountry = useMemo(() => {
    return geoData.countries.find((c) => c.code === 'EG');
  }, [geoData]);

  // Filter cities for views:
  // In 'egypt': consolidate Cairo districts into a regional cluster, show Alexandria, Mansoura, Tanta
  // In 'cairo_metro': show detailed districts (Tagamoa, Maadi, Zayed, October, Nasr City, Heliopolis, Dokki)
  const nationalCitiesList = useMemo(() => {
    if (!egyptCountry) return [];
    const cairoDistricts = egyptCountry.cities.filter(
      (c) => c.region.includes('Cairo') || c.region.includes('Giza')
    );
    const nonCairoCities = egyptCountry.cities
      .filter((c) => !c.region.includes('Cairo') && !c.region.includes('Giza'))
      .map((c) => ({ ...c, isCluster: false }));

    if (cairoDistricts.length === 0) {
      return egyptCountry.cities.map((c) => ({ ...c, isCluster: false }));
    }

    const totalCairoUsers = cairoDistricts.reduce((sum, c) => sum + c.count, 0);
    const consolidatedCairo = {
      name: 'Greater Cairo Metro (Click to Drill Down)',
      region: 'Cairo & Giza Urban Belt',
      lat: 30.0444,
      lng: 31.2357,
      count: totalCairoUsers,
      adRadiusKm: 25,
      isCluster: true,
    };

    return [consolidatedCairo, ...nonCairoCities];
  }, [egyptCountry]);

  const activeCitiesList = useMemo(() => {
    if (!egyptCountry) return [];
    if (viewMode === 'cairo_metro') {
      return egyptCountry.cities.filter(
        (c) =>
          c.name.includes('Cairo') ||
          c.name.includes('Zayed') ||
          c.name.includes('October') ||
          c.name.includes('Maadi') ||
          c.name.includes('Nasr') ||
          c.name.includes('Heliopolis') ||
          c.name.includes('Dokki')
      );
    }
    return egyptCountry.cities;
  }, [egyptCountry, viewMode]);

  return (
    <div className="w-full bg-surface-base border border-border-default rounded-none overflow-hidden relative font-sans select-none">
      {/* Map Header & Toolbar */}
      <div className="px-5 py-3.5 border-b border-border-default flex flex-wrap items-center justify-between gap-3 bg-surface-base shrink-0">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-text-muted" />
          <div>
            <h3 className="text-xs font-semibold text-text-primary tracking-tight">
              {viewMode === 'cairo_metro'
                ? 'Greater Cairo Metro & Urban Clusters'
                : viewMode === 'egypt'
                ? 'Egypt National Governorates'
                : 'Global Geolocation & Target Reach'}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {viewMode === 'cairo_metro'
                ? 'Zayed, Tagamoa, Maadi, and Heliopolis radius targeting'
                : viewMode === 'egypt'
                ? 'Click Cairo cluster to inspect metro districts or use the switcher'
                : 'Click Egypt to drill down into governorates and trading hubs'}
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode !== 'world' && (
            <button
              type="button"
              onClick={() => {
                setViewMode('world');
                setHoveredLocation(null);
              }}
              className="px-2.5 py-1 text-xs rounded-md bg-surface-raised border border-border-hover text-text-primary hover:bg-surface-hover-subtle transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
              <span>← Reset to Global</span>
            </button>
          )}

          <div className="inline-flex items-center p-0.5 rounded-md bg-surface-input border border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setViewMode('world');
                setHoveredLocation(null);
              }}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                viewMode === 'world' ? 'bg-surface-active text-text-primary font-medium' : 'text-text-muted'
              }`}
            >
              World
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('egypt');
                setHoveredLocation(null);
              }}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                viewMode === 'egypt' ? 'bg-surface-active text-text-primary font-medium' : 'text-text-muted'
              }`}
            >
              Egypt
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('cairo_metro');
                setHoveredLocation(null);
              }}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                viewMode === 'cairo_metro' ? 'bg-surface-active text-text-primary font-medium' : 'text-text-muted'
              }`}
            >
              Cairo Metro
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full aspect-[16/9] max-h-[460px] bg-surface-base overflow-hidden">
        <svg
          viewBox="0 0 800 420"
          className="w-full h-full block"
          style={{ background: '#000000' }}
        >
          {/* Subtle Hairline Latitude/Longitude Grid Lines */}
          <g stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3,3">
            <line x1="0" y1="105" x2="800" y2="105" />
            <line x1="0" y1="210" x2="800" y2="210" />
            <line x1="0" y1="315" x2="800" y2="315" />
            <line x1="200" y1="0" x2="200" y2="420" />
            <line x1="400" y1="0" x2="400" y2="420" />
            <line x1="600" y1="0" x2="600" y2="420" />
          </g>

          {/* ======================================================== */}
          {/* VIEW 1: GLOBAL WORLD VIEW */}
          {/* ======================================================== */}
          {viewMode === 'world' && (
            <g className="world-view-group">
              {/* Continents Base Shapes */}
              {WORLD_CONTINENTS_SVG_PATHS.map((path, idx) => (
                <path
                  key={`continent-${idx}`}
                  d={path}
                  fill="#121214"
                  stroke="#222225"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              ))}

              {/* Country Bubble Dots */}
              {geoData.countries.map((country) => {
                const projected = worldProjection([country.lng, country.lat]);
                if (!projected) return null;
                const [cx, cy] = projected;

                const isEg = country.code === 'EG';
                const radius = Math.max(5, Math.min(22, Math.sqrt(country.count) * 4));
                const sharePct = Math.round((country.count / totalUsersAcrossGeo) * 100);

                return (
                  <g
                    key={country.code}
                    className="country-marker cursor-pointer group"
                    onClick={() => {
                      if (isEg) setViewMode('egypt');
                      onSelectRegion?.(country.name);
                    }}
                    onMouseEnter={() => {
                      setHoveredLocation({
                        name: country.name,
                        count: country.count,
                        sharePct,
                        coords: `${country.lat.toFixed(2)}°N, ${country.lng.toFixed(2)}°E`,
                        x: cx,
                        y: cy,
                      });
                    }}
                    onMouseLeave={() => setHoveredLocation(null)}
                  >
                    {/* Pulsing glow ring for high-density countries */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius + 5}
                      fill="none"
                      stroke={isEg ? '#38bdf8' : '#71717a'}
                      strokeWidth="1"
                      opacity="0.25"
                    />

                    {/* Main bubble */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={isEg ? '#0284c7' : '#3f3f46'}
                      stroke={isEg ? '#38bdf8' : '#71717a'}
                      strokeWidth="1.5"
                      className="transition-transform duration-200 group-hover:scale-125 origin-center"
                    />

                    {/* Country label pill */}
                    <text
                      x={cx}
                      y={cy + radius + 11}
                      textAnchor="middle"
                      fill="#d1d4dc"
                      fontSize="9"
                      fontWeight="500"
                      className="pointer-events-none select-none"
                    >
                      {country.name} ({country.count})
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: EGYPT NATIONAL VIEW */}
          {/* ======================================================== */}
          {viewMode === 'egypt' && egyptCountry && (
            <g className="egypt-drilldown-group">
              {/* Egypt Boundary Silhouette */}
              <path
                d={EGYPT_BOUNDS_SVG_PATH}
                fill="#121214"
                stroke="#27272a"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Nile River & Delta stylization indicator */}
              <path
                d="M 430,390 Q 425,280 420,200 Q 418,140 417,104 M 417,104 Q 395,85 370,60 M 417,104 Q 425,85 435,62"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />

              {/* City & Regional Hub Bubble Markers */}
              {nationalCitiesList.map((city) => {
                const projected = egyptProjection([city.lng, city.lat]);
                if (!projected) return null;
                const [cx, cy] = projected;

                const radius = Math.max(7, Math.min(26, Math.sqrt(city.count) * 4));
                const sharePct = Math.round((city.count / egyptCountry.count) * 100);
                const isCairoArea = city.isCluster || city.region.includes('Cairo') || city.region.includes('Giza');

                return (
                  <g
                    key={city.name}
                    className="city-marker cursor-pointer group"
                    onClick={() => {
                      if (isCairoArea) {
                        setViewMode('cairo_metro');
                      }
                      onSelectRegion?.(city.name);
                    }}
                    onMouseEnter={() => {
                      setHoveredLocation({
                        name: city.name,
                        region: city.region,
                        count: city.count,
                        sharePct,
                        coords: `${city.lat.toFixed(4)}°N, ${city.lng.toFixed(4)}°E`,
                        radiusKm: city.adRadiusKm,
                        x: cx,
                        y: cy,
                      });
                    }}
                    onMouseLeave={() => setHoveredLocation(null)}
                  >
                    {/* Ad radius targeting visual perimeter */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius + 8}
                      fill="#0284c7"
                      fillOpacity="0.08"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="3,2"
                    />

                    {/* Main city bubble */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={city.isCluster ? '#0ea5e9' : '#0284c7'}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />

                    {/* Center core */}
                    <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />

                    {/* City Name label with smart quadrant positioning */}
                    <text
                      x={city.name.includes('Tanta') ? cx - radius - 6 : cx}
                      y={
                        city.isCluster
                          ? cy + radius + 13
                          : city.name.includes('Tanta')
                          ? cy + 3
                          : cy - radius - 5
                      }
                      textAnchor={city.name.includes('Tanta') ? 'end' : 'middle'}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="600"
                      className="pointer-events-none select-none drop-shadow-md"
                    >
                      {city.isCluster ? `Cairo Metro · Click to Drill Down (${city.count})` : `${city.name} (${city.count})`}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: GREATER CAIRO METRO URBAN CLUSTERS VIEW */}
          {/* ======================================================== */}
          {viewMode === 'cairo_metro' && (
            <g className="cairo-metro-group">
              {/* Metro Bounds Base Silhouette */}
              <path
                d={CAIRO_METRO_BOUNDS_SVG_PATH}
                fill="#101013"
                stroke="#27272a"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Ring Road (Tariq El Daery) highway stylized loop */}
              <ellipse
                cx="420"
                cy="225"
                rx="140"
                ry="65"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              <text
                x="420"
                y="155"
                textAnchor="middle"
                fill="#52525b"
                fontSize="8"
                letterSpacing="0.08em"
                className="pointer-events-none uppercase"
              >
                Cairo Ring Road Belt
              </text>

              {/* Nile River artery flowing through Cairo & Zamalek */}
              <path
                d="M 395,350 Q 388,270 380,215 Q 375,160 360,80"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3"
                strokeDasharray="3,3"
              />
              <text
                x="370"
                y="100"
                fill="#334155"
                fontSize="8"
                className="pointer-events-none"
              >
                Nile River
              </text>

              {/* District Markers with Precision Radiuses */}
              {activeCitiesList.map((district) => {
                const projected = cairoMetroProjection([district.lng, district.lat]);
                if (!projected) return null;
                const [cx, cy] = projected;

                const radius = Math.max(8, Math.min(28, Math.sqrt(district.count) * 7));
                const sharePct = egyptCountry
                  ? Math.round((district.count / egyptCountry.count) * 100)
                  : 0;

                return (
                  <g
                    key={district.name}
                    className="district-marker cursor-pointer group"
                    onClick={() => onSelectRegion?.(district.name)}
                    onMouseEnter={() => {
                      setHoveredLocation({
                        name: district.name,
                        region: district.region,
                        count: district.count,
                        sharePct,
                        coords: `${district.lat.toFixed(4)}°N, ${district.lng.toFixed(4)}°E`,
                        radiusKm: district.adRadiusKm,
                        x: cx,
                        y: cy,
                      });
                    }}
                    onMouseLeave={() => setHoveredLocation(null)}
                  >
                    {/* Circular targeting coverage area (scaled to ad radius) */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={Math.max(radius + 12, district.adRadiusKm * 4)}
                      fill="#0284c7"
                      fillOpacity="0.08"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />

                    {/* District Bubble */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      className="transition-transform duration-150 group-hover:scale-110 origin-center"
                    />

                    {/* White Bullseye Core */}
                    <circle cx={cx} cy={cy} r="3" fill="#ffffff" />

                    {/* District Label */}
                    <text
                      x={cx}
                      y={cy - radius - 5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="600"
                      className="pointer-events-none select-none drop-shadow-md"
                    >
                      {district.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Hovercard Overlay Tooltip */}
        <AnimatePresence>
          {hoveredLocation && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                left: `${(hoveredLocation.x / 800) * 100}%`,
                top: `${(hoveredLocation.y / 420) * 100}%`,
              }}
              className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-full mb-3 min-w-[190px] bg-surface-raised/95 backdrop-blur-md border border-border-hover p-2.5 rounded-lg shadow-2xl text-xs font-sans text-text-primary"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <span className="font-semibold text-text-primary text-xs">{hoveredLocation.name}</span>
                <span className="text-[10px] text-brand-blue font-semibold tabular-nums">
                  {hoveredLocation.sharePct}% share
                </span>
              </div>
              <div className="pt-1.5 space-y-1 text-[11px] text-text-muted">
                {hoveredLocation.region && (
                  <div className="flex items-center justify-between">
                    <span>Governorate:</span>
                    <span className="text-text-secondary">{hoveredLocation.region}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Tracked Users:</span>
                  <span className="text-text-primary font-medium tabular-nums">{hoveredLocation.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Coordinates:</span>
                  <span className="text-text-muted text-[10px] tabular-nums">{hoveredLocation.coords}</span>
                </div>
                {hoveredLocation.radiusKm && (
                  <div className="flex items-center justify-between text-brand-blue font-medium text-[10px]">
                    <span>Suggested Ad Radius:</span>
                    <span className="tabular-nums">{hoveredLocation.radiusKm} km</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle Map Legend (Bottom Right) */}
        <div className="absolute bottom-3 right-4 bg-surface-input/80 backdrop-blur-xs border border-border-subtle px-2.5 py-1.5 rounded-md text-[10px] text-text-muted flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-blue inline-block" />
            <span>High Density</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-surface-active inline-block" />
            <span>Moderate</span>
          </div>
          <span className="text-text-faint">| Bubble radius ∝ User volume</span>
        </div>
      </div>
    </div>
  );
}
