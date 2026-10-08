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

// Stylized silhouette of Egypt (Mediterranean North, Sinai East, Red Sea Coast, Western Desert)
const EGYPT_BOUNDS_SVG_PATH =
  'M 200,60 L 350,55 L 450,50 L 530,52 L 600,75 L 610,120 L 560,180 L 520,170 L 560,250 L 540,340 L 450,370 L 200,370 L 200,60 Z';

export default function AcquisitionGeoMap({ geoData, onSelectRegion }: GeoMapProps) {
  const [isZoomedToEgypt, setIsZoomedToEgypt] = useState(false);
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

  // Egypt zoomed-in projection (800x420 focused tightly on Egypt's 22°-32°N and 25°-36°E)
  const egyptProjection = useMemo(() => {
    return geoMercator().center([30.8, 27.5]).scale(2400).translate([400, 220]);
  }, []);

  // Egyptian country node
  const egyptCountry = useMemo(() => {
    return geoData.countries.find((c) => c.code === 'EG');
  }, [geoData]);

  // Handle drilldown toggle
  const toggleEgyptZoom = () => {
    setIsZoomedToEgypt((prev) => !prev);
    setHoveredLocation(null);
  };

  return (
    <div className="w-full bg-surface-base border border-border-default rounded-none overflow-hidden relative font-sans select-none">
      {/* Map Header & Toolbar */}
      <div className="px-5 py-3.5 border-b border-border-default flex flex-wrap items-center justify-between gap-3 bg-surface-base shrink-0">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-text-muted" />
          <div>
            <h3 className="text-xs font-semibold text-text-primary tracking-tight">
              {isZoomedToEgypt ? 'Egypt Regional Concentration' : 'Global Geolocation & Target Reach'}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isZoomedToEgypt
                ? 'Governorates, metro districts, and radius-level density for ad retargeting'
                : 'Click Egypt to drill down into governorates, cities, and trading hubs'}
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {isZoomedToEgypt ? (
            <button
              type="button"
              onClick={toggleEgyptZoom}
              className="px-2.5 py-1 text-xs rounded-md bg-surface-raised border border-border-hover text-text-primary hover:bg-surface-hover-subtle transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
              <span>← Back to Global Map</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsZoomedToEgypt(true)}
              className="px-2.5 py-1 text-xs rounded-md bg-surface-raised border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <Target className="w-3.5 h-3.5 text-brand-blue" />
              <span>Drill into Egypt</span>
              <ChevronRight className="w-3 h-3 text-text-muted" />
            </button>
          )}

          <div className="hidden sm:inline-flex items-center p-0.5 rounded-md bg-surface-input border border-border-subtle">
            <button
              type="button"
              onClick={() => setIsZoomedToEgypt(false)}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                !isZoomedToEgypt ? 'bg-surface-active text-text-primary font-medium' : 'text-text-muted'
              }`}
            >
              World
            </button>
            <button
              type="button"
              onClick={() => setIsZoomedToEgypt(true)}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                isZoomedToEgypt ? 'bg-surface-active text-text-primary font-medium' : 'text-text-muted'
              }`}
            >
              Egypt
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
          {!isZoomedToEgypt && (
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
                      if (isEg) setIsZoomedToEgypt(true);
                      onSelectRegion?.(country.name);
                    }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)?.getBoundingClientRect();
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
          {/* VIEW 2: EGYPT DRILLDOWN VIEW */}
          {/* ======================================================== */}
          {isZoomedToEgypt && egyptCountry && (
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
                d="M 430,370 Q 425,240 435,170 Q 440,110 435,75 M 435,75 L 390,55 M 435,75 L 475,55"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />

              {/* City & District Bubble Markers */}
              {egyptCountry.cities.map((city) => {
                const projected = egyptProjection([city.lng, city.lat]);
                if (!projected) return null;
                const [cx, cy] = projected;

                const radius = Math.max(6, Math.min(26, Math.sqrt(city.count) * 6));
                const sharePct = Math.round((city.count / egyptCountry.count) * 100);

                return (
                  <g
                    key={city.name}
                    className="city-marker cursor-pointer group"
                    onClick={() => onSelectRegion?.(city.name)}
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
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />

                    {/* Center core */}
                    <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />

                    {/* City Name label */}
                    <text
                      x={cx}
                      y={cy - radius - 5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="600"
                      className="pointer-events-none select-none drop-shadow-md"
                    >
                      {city.name}
                    </text>
                    <text
                      x={cx}
                      y={cy + radius + 11}
                      textAnchor="middle"
                      fill="#787b86"
                      fontSize="8.5"
                      className="pointer-events-none select-none tabular-nums"
                    >
                      {city.count} {city.count === 1 ? 'user' : 'users'} · {city.adRadiusKm}km rad
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
