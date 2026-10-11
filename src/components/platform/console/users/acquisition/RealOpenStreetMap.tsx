'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';
import {
  MAP_PRESETS,
  TILE_URLS,
  type MapPresetView,
  type MapLayerTheme,
  createMarkerPinIcon,
  createMarkerPopupHtml,
} from './map-helpers';
import RealOpenStreetMapToolbar from './RealOpenStreetMapToolbar';

interface RealOpenStreetMapProps {
  geoData: ConsoleAcquisitionStats['geoDistribution'];
  onSelectRegion?: (regionName: string) => void;
  metricMode?: 'users' | 'sessions';
  onMetricModeChange?: (mode: 'users' | 'sessions') => void;
}

export default function RealOpenStreetMap({
  geoData,
  onSelectRegion,
  metricMode = 'users',
  onMetricModeChange,
}: RealOpenStreetMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);

  const [activePreset, setActivePreset] = useState<MapPresetView>('cairo_metro');
  const [mapTheme, setMapTheme] = useState<MapLayerTheme>('dark');

  const totalUsersAcrossGeo = useMemo(() => {
    return (
      geoData.countries.reduce((acc, c) => {
        return acc + c.cities.reduce((cAcc, city) => cAcc + (city.userCount || 1), 0);
      }, 0) || 1
    );
  }, [geoData]);

  const totalSessionsAcrossGeo = useMemo(() => {
    return (
      geoData.countries.reduce((acc, c) => {
        return acc + c.cities.reduce((cAcc, city) => cAcc + (city.sessionCount || city.count || 1), 0);
      }, 0) || 1
    );
  }, [geoData]);

  // 1. Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_PRESETS.cairo_metro.center,
      zoom: MAP_PRESETS.cairo_metro.zoom,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
    });

    tileLayerGroupRef.current = L.layerGroup().addTo(map);
    circlesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Sync Tile Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const tileGroup = tileLayerGroupRef.current;
    if (!map || !tileGroup) return;

    tileGroup.clearLayers();

    if (mapTheme === 'dark') {
      const baseLayer = L.tileLayer(TILE_URLS.esriBase, {
        attribution: '&copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a> &mdash; Dark Gray Canvas',
        maxZoom: 16,
      });
      const labelsLayer = L.tileLayer(TILE_URLS.esriLabels, {
        maxZoom: 16,
      });
      tileGroup.addLayer(baseLayer);
      tileGroup.addLayer(labelsLayer);
    } else {
      const osmLayer = L.tileLayer(TILE_URLS.osm, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      });
      tileGroup.addLayer(osmLayer);
    }
  }, [mapTheme]);

  // 3. Sync Markers and Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const circlesLayer = circlesLayerRef.current;
    if (!map || !markersLayer || !circlesLayer) return;

    markersLayer.clearLayers();
    circlesLayer.clearLayers();

    const allCities = geoData.countries.flatMap((country) =>
      country.cities.map((city) => ({
        ...city,
        countryName: country.name,
        countryCode: country.code,
      }))
    );

    // Resolve brand blue hex from DOM or token
    const brandBlueColor =
      typeof window !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue('--color-brand-blue').trim() || '#2962ff'
        : '#2962ff';

    allCities.forEach((city) => {
      const displayCount =
        metricMode === 'users' ? city.userCount || 1 : city.sessionCount || city.count || 1;
      const totalDenominator =
        metricMode === 'users' ? totalUsersAcrossGeo : totalSessionsAcrossGeo;
      const sharePct = Math.round((displayCount / totalDenominator) * 100);
      const radiusMeters = (city.adRadiusKm || 10) * 1000;
      const profiles = city.userProfiles || [];

      // Ad radius perimeter circle
      const radiusCircle = L.circle([city.lat, city.lng], {
        radius: radiusMeters,
        color: brandBlueColor,
        weight: 1.5,
        opacity: 0.8,
        dashArray: '4, 4',
        fillColor: brandBlueColor,
        fillOpacity: 0.1,
      });
      radiusCircle.addTo(circlesLayer);

      // Pin marker
      const marker = L.marker([city.lat, city.lng], {
        icon: createMarkerPinIcon(displayCount),
      });

      // Hover Tooltip
      const metricLabel =
        metricMode === 'users'
          ? `${city.userCount || 1} ${city.userCount === 1 ? 'user' : 'users'}`
          : `${city.sessionCount || city.count || 1} sessions`;
      marker.bindTooltip(`<strong>${city.name}</strong> · ${metricLabel}`, {
        direction: 'top',
        offset: [0, -14],
        className: 'bg-black text-white text-[10px] border border-border-default px-2 py-0.5 rounded-none shadow-lg',
      });

      // Popup
      const popupHtml = createMarkerPopupHtml({
        cityName: city.name,
        regionName: city.region,
        countryName: city.countryName,
        countryCode: city.countryCode,
        lat: city.lat,
        lng: city.lng,
        userCount: city.userCount || 1,
        sessionCount: city.sessionCount || city.count || 1,
        adRadiusKm: city.adRadiusKm,
        sharePct,
        metricMode,
        userProfiles: profiles,
      });

      marker.bindPopup(popupHtml, {
        className: 'ticknal-osm-popup',
        maxWidth: 320,
      });

      marker.on('click', () => {
        onSelectRegion?.(city.name);
      });

      marker.addTo(markersLayer);
    });
  }, [geoData, totalUsersAcrossGeo, totalSessionsAcrossGeo, metricMode, onSelectRegion]);

  const handleFlyTo = (preset: MapPresetView) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.closePopup();
    setActivePreset(preset);
    const target = MAP_PRESETS[preset];
    map.setView(target.center, target.zoom);
  };

  return (
    <div className="w-full bg-surface-base overflow-hidden relative font-sans select-none flex flex-col">
      {/* Header Toolbar */}
      <RealOpenStreetMapToolbar
        activePreset={activePreset}
        onFlyTo={handleFlyTo}
        mapTheme={mapTheme}
        onThemeChange={setMapTheme}
        metricMode={metricMode}
        onMetricModeChange={onMetricModeChange}
      />

      {/* Map Canvas */}
      <div className="relative w-full aspect-[16/9] min-h-[440px] max-h-[540px] bg-black overflow-hidden">
        <div ref={containerRef} className="w-full h-full z-10" />

        {/* Minimal Scale Legend */}
        <div className="absolute bottom-3 left-4 z-20 bg-black/90 backdrop-blur-md border border-border-subtle px-3 py-1.5 rounded-lg text-[10px] text-text-muted flex items-center gap-3 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-blue inline-block border border-white/30" />
            <span className="text-text-primary font-medium">
              {metricMode === 'users' ? 'User Cluster' : 'Session Cluster'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-brand-blue border-dashed bg-brand-blue/20 inline-block" />
            <span className="text-text-primary font-medium">Ad Targeting Radius</span>
          </div>
          <span className="text-text-faint">| Powered by Esri & OpenStreetMap</span>
        </div>
      </div>
    </div>
  );
}
